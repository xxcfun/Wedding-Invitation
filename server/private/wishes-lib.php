<?php
declare(strict_types=1);

// 函数只处理受控请求、返回响应，HTTP 入口与测试共用同一逻辑。
final class WishesHttpError extends RuntimeException
{
    public $status;
    public function __construct(int $status, string $code)
    {
        parent::__construct($code);
        $this->status = $status;
    }
}

function wishesFail(int $status, string $code): void
{
    throw new WishesHttpError($status, $code);
}

function wishesOpen(array $config): PDO
{
    if (!extension_loaded('pdo_sqlite')) {
        throw new RuntimeException('pdo_sqlite_missing');
    }
    $path = $config['database_path'] ?? '';
    if (!is_string($path) || $path === '' || $path[0] !== '/') {
        throw new RuntimeException('invalid_database_path');
    }
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('database_directory_error');
    }
    $db = new PDO('sqlite:' . $path, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    // 默认回滚日志兼容旧版 SQLite，不使用 WAL、UPSERT、RETURNING 或 VACUUM INTO。
    $db->exec('PRAGMA busy_timeout=5000');
    $db->exec('PRAGMA foreign_keys=ON');
    $db->exec('PRAGMA synchronous=FULL');
    $version = (int) $db->query('PRAGMA user_version')->fetchColumn();
    if ($version > 1) {
        throw new RuntimeException('schema_too_new');
    }
    if ($version === 0) {
        // 首次启动多个 FPM worker 竞争时，持锁后重新检查版本。
        $db->exec('BEGIN IMMEDIATE');
        try {
            if ((int) $db->query('PRAGMA user_version')->fetchColumn() === 0) {
                $db->exec("CREATE TABLE wishes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 20),
                    text TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 160),
                    created_at TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','hidden')),
                    request_id TEXT NOT NULL UNIQUE
                )");
                $db->exec('CREATE INDEX wishes_status_id ON wishes(status,id DESC)');
                $db->exec('CREATE TABLE rate_limits (key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL)');
                $db->exec('PRAGMA user_version=1');
            }
            $db->exec('COMMIT');
        } catch (Throwable $error) {
            $db->exec('ROLLBACK');
            throw $error;
        }
    }
    if (!chmod($path, 0600)) {
        throw new RuntimeException('database_permission_error');
    }
    return $db;
}

function wishesQuery(PDO $db, string $sql, array $parameters = []): PDOStatement
{
    $statement = $db->prepare($sql);
    foreach (array_values($parameters) as $index => $value) {
        $statement->bindValue($index + 1, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $statement->execute();
    return $statement;
}

function wishesPublic(array $row): array
{
    return [
        'id' => (int) $row['id'], 'name' => $row['name'],
        'text' => $row['text'], 'createdAt' => $row['created_at'],
    ];
}

function wishesPositive($value, int $fallback, int $maximum = 9007199254740991): int
{
    if ($value === null) {
        return $fallback;
    }
    if (!is_string($value) || !preg_match('/^[1-9][0-9]*$/D', $value) || strlen($value) > 16) {
        wishesFail(400, 'invalid_query');
    }
    $number = (int) $value;
    if ($number > $maximum || $number < 1) {
        wishesFail(400, 'invalid_query');
    }
    return $number;
}

function wishesTrim($value): string
{
    if (!is_string($value)) {
        return '';
    }
    // 对齐 JavaScript trim，不依赖 mbstring 扩展。
    return preg_replace('/\A[\p{Z}\x{0009}-\x{000D}\x{FEFF}]+|[\p{Z}\x{0009}-\x{000D}\x{FEFF}]+\z/u', '', $value) ?? '';
}

function wishesLength(string $value): int
{
    // 对齐 HTML maxlength 的 UTF-16 单元数，一个常见 emoji 计为两个。
    $characters = preg_match_all('/./us', $value);
    $astral = preg_match_all('/[\x{10000}-\x{10FFFF}]/u', $value);
    return $characters === false || $astral === false ? PHP_INT_MAX : $characters + $astral;
}

function wishesBody(array $request): stdClass
{
    $type = strtolower(trim(explode(';', $request['content_type'] ?? '')[0]));
    if ($type !== 'application/json') {
        wishesFail(400, 'invalid_body');
    }
    $raw = $request['body'] ?? '';
    if (strlen($raw) > 8192) {
        wishesFail(413, 'body_too_large');
    }
    $body = json_decode($raw);
    if (json_last_error() !== JSON_ERROR_NONE || !$body instanceof stdClass) {
        wishesFail(400, 'invalid_body');
    }
    return $body;
}

// 调用者必须持有 BEGIN IMMEDIATE，避免多个 FPM worker 越过限流。
function wishesRate(PDO $db, array $config, array $request, string $bucket, int $maximum): int
{
    // PHP-FPM 直接使用 REMOTE_ADDR；不信任浏览器传来的 X-Forwarded-For/X-Real-IP。
    $key = hash_hmac('sha256', $bucket . ':' . ($request['remote_addr'] ?? ''), $config['admin_token']);
    $now = time();
    wishesQuery($db, 'DELETE FROM rate_limits WHERE expires_at <= ?', [$now]);
    $row = wishesQuery($db, 'SELECT count,expires_at FROM rate_limits WHERE key=?', [$key])->fetch();
    if ($row && (int) $row['count'] >= $maximum) {
        return max(1, (int) $row['expires_at'] - $now);
    }
    if ($row) {
        wishesQuery($db, 'UPDATE rate_limits SET count=count+1 WHERE key=?', [$key]);
    } else {
        wishesQuery($db, 'INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?)', [$key, $now + (int) ($config['rate_limit_window_seconds'] ?? 600)]);
    }
    return 0;
}

function wishesAuthenticate(PDO $db, array $config, array $request, array &$headers): void
{
    $db->exec('BEGIN IMMEDIATE');
    try {
        $wait = wishesRate($db, $config, $request, 'admin', 120);
        $db->exec('COMMIT');
    } catch (Throwable $error) {
        $db->exec('ROLLBACK');
        throw $error;
    }
    if ($wait > 0) {
        $headers['Retry-After'] = (string) $wait;
        wishesFail(429, 'rate_limited');
    }
    if (!hash_equals('Bearer ' . $config['admin_token'], $request['authorization'] ?? '')) {
        wishesFail(401, 'unauthorized');
    }
}

function wishesHandle(array $config, array $request): array
{
    $headers = [
        'Content-Type' => 'application/json; charset=utf-8',
        'Cache-Control' => 'no-store', 'X-Content-Type-Options' => 'nosniff',
        'Referrer-Policy' => 'no-referrer', 'Vary' => 'Origin',
    ];
    $db = null;
    try {
        if (PHP_INT_SIZE < 8) {
            throw new RuntimeException('php_64bit_required');
        }
        if (!is_string($config['admin_token'] ?? null) || strlen($config['admin_token']) < 32) {
            throw new RuntimeException('config_incomplete');
        }
        $origins = $config['allowed_origins'] ?? [];
        if (!is_array($origins) || !$origins) {
            throw new RuntimeException('invalid_origins');
        }
        foreach (['rate_limit_max' => 20, 'rate_limit_window_seconds' => 600] as $key => $default) {
            if (!is_int($config[$key] ?? $default) || ($config[$key] ?? $default) < 1) {
                throw new RuntimeException('invalid_rate_config');
            }
        }
        $origin = $request['origin'] ?? '';
        if ($origin !== '' && !in_array($origin, $origins, true)) {
            wishesFail(403, 'origin_not_allowed');
        }
        if ($origin !== '') {
            $headers['Access-Control-Allow-Origin'] = $origin;
        }
        $headers['Access-Control-Expose-Headers'] = 'Retry-After';
        $method = $request['method'] ?? 'GET';
        if ($method === 'OPTIONS') {
            $headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, OPTIONS';
            $headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
            return [204, $headers, null];
        }
        $path = $request['path'] ?? '';
        $isPublic = $path === '/api/wishes';
        $isAdmin = $path === '/api/admin/wishes';
        $isItem = preg_match('#^/api/admin/wishes/([1-9][0-9]*)$#D', $path, $matches) === 1;
        if (!$isPublic && !$isAdmin && !$isItem && $path !== '/api/health') {
            wishesFail(404, 'not_found');
        }
        $allowed = $isPublic ? ['GET', 'POST'] : ($isItem ? ['PATCH'] : ['GET']);
        if (!in_array($method, $allowed, true)) {
            $headers['Allow'] = implode(', ', $allowed) . ', OPTIONS';
            wishesFail(405, 'method_not_allowed');
        }
        $db = wishesOpen($config);
        if ($path === '/api/health') {
            $db->query('SELECT 1');
            return [200, $headers, ['ok' => true]];
        }
        if ($isAdmin || $isItem) {
            wishesAuthenticate($db, $config, $request, $headers);
        }
        if (($isPublic || $isAdmin) && $method === 'GET') {
            $query = $request['query'] ?? [];
            $limit = wishesPositive($query['limit'] ?? null, 6, 50);
            $before = wishesPositive($query['before'] ?? null, 9007199254740991);
            $sql = $isAdmin ? 'SELECT * FROM wishes WHERE id < ? ORDER BY id DESC LIMIT ?'
                : "SELECT * FROM wishes WHERE status='published' AND id < ? ORDER BY id DESC LIMIT ?";
            $rows = wishesQuery($db, $sql, [$before, $limit + 1])->fetchAll();
            $items = [];
            foreach (array_slice($rows, 0, $limit) as $row) {
                $item = wishesPublic($row);
                if ($isAdmin) {
                    $item['status'] = $row['status'];
                }
                $items[] = $item;
            }
            return [200, $headers, ['items' => $items, 'nextCursor' => count($rows) > $limit ? $items[count($items) - 1]['id'] : null]];
        }
        $body = wishesBody($request);
        if ($isItem) {
            $id = wishesPositive($matches[1], 1);
            $status = $body->status ?? '';
            if (!in_array($status, ['published', 'hidden'], true)) {
                wishesFail(400, 'invalid_status');
            }
            $result = wishesQuery($db, 'UPDATE wishes SET status=? WHERE id=?', [$status, $id]);
            if ($result->rowCount() === 0) {
                wishesFail(404, 'not_found');
            }
            return [200, $headers, ['ok' => true]];
        }
        $name = wishesTrim($body->name ?? null);
        $text = wishesTrim($body->text ?? null);
        if ($name === '' || wishesLength($name) > 20 || preg_match('/[\x00-\x1f\x7f]/', $name)) {
            wishesFail(400, 'invalid_name');
        }
        if ($text === '' || wishesLength($text) > 160 || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', $text)) {
            wishesFail(400, 'invalid_text');
        }
        $requestId = $body->requestId ?? null;
        if (!is_string($requestId) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iD', $requestId)) {
            wishesFail(400, 'invalid_request_id');
        }
        $db->exec('BEGIN IMMEDIATE');
        try {
            $row = wishesQuery($db, 'SELECT * FROM wishes WHERE request_id=?', [$requestId])->fetch();
            $duplicate = (bool) $row;
            if ($row) {
                if ($row['name'] !== $name || $row['text'] !== $text) {
                    wishesFail(409, 'request_conflict');
                }
            } else {
                $wait = wishesRate($db, $config, $request, 'submit', (int) ($config['rate_limit_max'] ?? 20));
                if ($wait > 0) {
                    $headers['Retry-After'] = (string) $wait;
                    wishesFail(429, 'rate_limited');
                }
                wishesQuery($db, 'INSERT INTO wishes(name,text,created_at,request_id) VALUES (?,?,?,?)', [
                    $name, $text, gmdate('Y-m-d\TH:i:s\Z'), $requestId,
                ]);
                $row = wishesQuery($db, 'SELECT * FROM wishes WHERE id=?', [(int) $db->lastInsertId()])->fetch();
            }
            $db->exec('COMMIT');
        } catch (Throwable $error) {
            $db->exec('ROLLBACK');
            throw $error;
        }
        $item = wishesPublic($row);
        $item['status'] = $row['status'];
        return [$duplicate ? 200 : 201, $headers, ['item' => $item, 'duplicate' => $duplicate]];
    } catch (WishesHttpError $error) {
        return [$error->status, $headers, ['error' => $error->getMessage()]];
    } catch (Throwable $error) {
        // 不输出 SQL、数据库路径、正文或密钥。
        $known = ['pdo_sqlite_missing', 'config_incomplete', 'invalid_database_path', 'database_directory_error', 'database_permission_error', 'schema_too_new', 'invalid_origins', 'invalid_rate_config', 'php_64bit_required'];
        $code = in_array($error->getMessage(), $known, true) ? $error->getMessage() : 'service_unavailable';
        error_log('[wishes] ' . $code);
        return [503, $headers, ['error' => $code]];
    }
}
