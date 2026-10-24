<?php
// Website document root MUST be this public/ directory. Credentials stay in ../private/.
declare(strict_types=1);

// 统一返回 JSON 并禁用浏览器缓存；PHP 内部错误不直接输出给访客，避免泄露服务器信息。
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Vary: Origin');

// 所有响应使用同一出口，输出状态码与 JSON 后立即结束请求。
function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// 仅请求固定的微信 API 域名；GET 用于票据，JSON POST 用于稳定版 access_token。
function wechatRequest(string $path, array $query, bool $post = false): array
{
    $url = 'https://api.weixin.qq.com' . $path;
    if (!$post) {
        $url .= '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }
    $handle = curl_init($url);
    // 设置连接和总请求超时，验证 HTTPS 证书，且不跟随上游重定向。
    curl_setopt_array($handle, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => false,
    ]);
    if ($post) {
        curl_setopt_array($handle, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($query),
        ]);
    }
    $body = curl_exec($handle);
    $status = curl_getinfo($handle, CURLINFO_HTTP_CODE);
    curl_close($handle);
    if (!is_string($body) || $status !== 200) {
        throw new RuntimeException('wechat_network_error');
    }
    $data = json_decode($body, true);
    if (!is_array($data)) {
        throw new RuntimeException('wechat_response_error');
    }
    // 微信可能用 HTTP 200 返回业务错误，所以还需单独检查 errcode。
    if (!empty($data['errcode'])) {
        // Log only the numeric error code: never log upstream URLs, tokens or secrets.
        throw new RuntimeException('wechat_error_' . (int) $data['errcode']);
    }
    return $data;
}

// 先写同目录临时文件再原子重命名，避免进程中断时留下半份 token/ticket 缓存。
function saveCache(string $path, array $cache): void
{
    $temporary = tempnam(dirname($path), '.wechat-');
    if ($temporary === false) {
        throw new RuntimeException('cache_write_error');
    }
    $json = json_encode($cache);
    if ($json === false || file_put_contents($temporary, $json) !== strlen($json) || !rename($temporary, $path)) {
        @unlink($temporary);
        throw new RuntimeException('cache_write_error');
    }
}

try {
    // 部署要求 Web 根目录仅为 public；真实密钥和缓存留在其同级 private 目录。
    $private = dirname(__DIR__) . '/private';
    if (!is_file($private . '/config.php')) {
        respond(503, ['error' => 'config_missing']);
    }
    $config = require $private . '/config.php';
    if (!is_array($config) || empty($config['app_id']) || empty($config['app_secret']) ||
        strpos($config['app_id'], 'REPLACE_') === 0 || strpos($config['app_secret'], 'REPLACE_') === 0) {
        respond(503, ['error' => 'config_incomplete']);
    }
    // 仅为请柬域名放行浏览器跨域请求；无 Origin 的服务器终端检查仍可进入后续 URL 校验。
    $allowedOrigin = 'https://wedding.xxcfun.cn';
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && $origin !== $allowedOrigin) {
        respond(403, ['error' => 'origin_not_allowed']);
    }
    if ($origin === $allowedOrigin) {
        header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    }
    // 支持读取签名与跨域预检，其他请求方法明确返回 405。
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'OPTIONS') {
        header('Access-Control-Allow-Methods: GET, OPTIONS');
        http_response_code(204);
        exit;
    }
    if ($method !== 'GET') {
        header('Allow: GET, OPTIONS');
        respond(405, ['error' => 'method_not_allowed']);
    }
    // 限制签名地址长度和字符；后面还会校验协议、域名、端口及是否夹带用户凭证。
    $url = $_GET['url'] ?? '';
    if (!is_string($url) || $url === '' || strlen($url) > 4096 || preg_match('/[\x00-\x20\x7f\\\\]/', $url)) {
        respond(400, ['error' => 'invalid_url']);
    }
    // Preserve the original URL, including query order, encoding and trailing slash.
    $url = explode('#', $url, 2)[0];
    // 仅允许为 HTTPS 请柬域名签名，不能把接口当作任意网站的公众号鉴权服务。
    $parts = parse_url($url);
    if ($parts === false || ($parts['scheme'] ?? '') !== 'https' ||
        ($parts['host'] ?? '') !== 'wedding.xxcfun.cn' ||
        (isset($parts['port']) && $parts['port'] !== 443) || isset($parts['user']) || isset($parts['pass'])) {
        respond(400, ['error' => 'url_not_allowed']);
    }
    if (!function_exists('curl_init')) {
        respond(503, ['error' => 'php_curl_missing']);
    }
    // 缓存包含敏感凭据，新文件默认只允许 PHP 运行用户访问。
    umask(0077);
    $directory = $private . '/cache';
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('cache_directory_error');
    }
    // One file shared by PHP workers. Changing credentials starts a fresh cache.
    // 以公众号配置的哈希区分缓存文件；切换密钥后不会读到之前账号的票据。
    $key = hash('sha256', $config['app_id'] . ':' . $config['app_secret']);
    $path = $directory . '/' . $key . '.json';
    // 刷新凭据前持有进程间排他锁，防止并发访问时重复请求微信或相互覆盖缓存。
    $lock = fopen($directory . '/' . $key . '.lock', 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        throw new RuntimeException('cache_lock_error');
    }
    try {
        $cache = is_file($path) ? json_decode((string) file_get_contents($path), true) : [];
        if (!is_array($cache)) {
            $cache = [];
        }
        // 票据未过期则直接复用；只有需要新 ticket 时，才进一步检查 access_token 是否需要刷新。
        if (empty($cache['ticket']) || ($cache['ticket_expires_at'] ?? 0) <= time()) {
            if (empty($cache['access_token']) || ($cache['token_expires_at'] ?? 0) <= time()) {
                $started = time();
                // 稳定版 token 不强制刷新，避免使同一公众号其他正在使用的凭据失效。
                $token = wechatRequest('/cgi-bin/stable_token', [
                    'grant_type' => 'client_credential',
                    'appid' => $config['app_id'],
                    'secret' => $config['app_secret'],
                    'force_refresh' => false,
                ], true);
                if (empty($token['access_token']) || ($token['expires_in'] ?? 0) <= 300) {
                    throw new RuntimeException('wechat_token_response_error');
                }
                $cache['access_token'] = $token['access_token'];
                // 以请求开始时间计算到期点并提前 300 秒失效，为网络等待与时钟偏差留出余量。
                $cache['token_expires_at'] = $started + (int) $token['expires_in'] - 300;
                saveCache($path, $cache);
            }
            $started = time();
            try {
                $ticket = wechatRequest('/cgi-bin/ticket/getticket', [
                    'access_token' => $cache['access_token'], 'type' => 'jsapi',
                ]);
            } catch (RuntimeException $error) {
                // Discard invalid tokens so the next request can refresh them.
                if (in_array($error->getMessage(), ['wechat_error_40001', 'wechat_error_40014', 'wechat_error_42001'], true)) {
                    unset($cache['access_token'], $cache['token_expires_at']);
                    saveCache($path, $cache);
                }
                throw $error;
            }
            if (empty($ticket['ticket']) || ($ticket['expires_in'] ?? 0) <= 300) {
                throw new RuntimeException('wechat_ticket_response_error');
            }
            $cache['ticket'] = $ticket['ticket'];
            // JSAPI 票据也提前 300 秒刷新；缓存的是服务端 ticket，不把它返回给网页。
            $cache['ticket_expires_at'] = $started + (int) $ticket['expires_in'] - 300;
            saveCache($path, $cache);
        }
        $ticketValue = $cache['ticket'];
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
    // 按微信签名字段顺序拼接原始 URL；每次签名使用新的随机 nonce，输出只包含前端鉴权所需字段。
    $timestamp = time();
    $nonce = bin2hex(random_bytes(16));
    $signature = sha1('jsapi_ticket=' . $ticketValue . '&noncestr=' . $nonce . '&timestamp=' . $timestamp . '&url=' . $url);
    respond(200, [
        'appId' => $config['app_id'], 'timestamp' => $timestamp,
        'nonceStr' => $nonce, 'signature' => $signature,
    ]);
// 对外仅返回受控错误代号；未知错误统一转成 internal_error，日志也不包含密钥或上游请求地址。
} catch (Throwable $error) {
    $code = $error->getMessage();
    if (!preg_match('/^(wechat_[a-z_]+(?:\d+)?|cache_[a-z_]+)$/', $code)) {
        $code = 'internal_error';
    }
    error_log('[wechat-signature] ' . $code);
    respond(503, ['error' => $code]);
}
