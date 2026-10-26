<?php
declare(strict_types=1);
umask(0077);
require dirname(__DIR__) . '/private/wishes-lib.php';
require dirname(__DIR__) . '/private/wishes-backup.php';
$directory = sys_get_temp_dir() . '/wishes-test-' . bin2hex(random_bytes(6));
mkdir($directory, 0700, true);
$config = [
    'database_path' => $directory . '/wishes.sqlite',
    'admin_token' => str_repeat('test-secret-', 4),
    'allowed_origins' => ['https://wedding.example', 'https://wxapi.example'],
];
$count = 0;
function check($actual, $expected, string $label): void
{
    global $count;
    if ($actual !== $expected) {
        throw new RuntimeException($label . ': expected ' . json_encode($expected) . ', got ' . json_encode($actual));
    }
    $count++;
}
function uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
}
function invoke(string $path = '/api/wishes', string $method = 'GET', $body = null, array $extra = [], ?array $customConfig = null): array
{
    global $config;
    return wishesHandle($customConfig ?? $config, array_merge([
        'path' => $path, 'method' => $method, 'query' => [],
        'origin' => 'https://wedding.example', 'content_type' => 'application/json',
        'body' => is_string($body) ? $body : json_encode($body), 'remote_addr' => '127.0.0.1',
    ], $extra));
}
function payload(string $text = '新婚快乐！'): array
{
    return ['name' => '亲友', 'text' => $text, 'requestId' => uuid()];
}
try {
    check(invoke()[2], ['items' => [], 'nextCursor' => null], '空列表');
    check(invoke('/api/health')[2], ['ok' => true], '健康检查');
    $body = payload('<script>alert(1)</script>' . "\n永结同心");
    $result = invoke('/api/wishes', 'POST', $body);
    check($result[0], 201, '提交');
    $id = $result[2]['item']['id'];
    check($result[2]['item']['text'], $body['text'], '纯文本');
    check(is_int($id), true, 'ID 类型');
    check(strtotime($result[2]['item']['createdAt']) !== false, true, '服务端时间');
    check(invoke()[2]['items'][0]['id'], $id, '跨请求读取');
    check(isset(invoke()[2]['items'][0]['requestId']), false, '私有字段不公开');
    for ($i = 0; $i < 5; $i++) {
        $duplicate = invoke('/api/wishes', 'POST', $body);
        check($duplicate[0], 200, '重复请求状态');
        check($duplicate[2]['item']['id'], $id, '重复请求 ID');
    }
    $changed = $body;
    $changed['text'] = '不同内容';
    check(invoke('/api/wishes', 'POST', $changed)[0], 409, '标识冲突');
    foreach ([['name' => '  '], ['name' => str_repeat('a', 21)], ['name' => "a\nb"], ['name' => "\u{00a0}\u{3000}"], ['text' => ' '], ['text' => "\0"], ['text' => str_repeat('😀', 81)], ['requestId' => 'invalid']] as $change) {
        check(invoke('/api/wishes', 'POST', array_merge(payload(), $change))[0], 400, '输入边界');
    }
    check(invoke('/api/wishes', 'POST', payload(str_repeat('😀', 80)))[0], 201, 'emoji 上限');
    check(invoke('/api/wishes', 'POST', '{')[0], 400, '非法 JSON');
    check(invoke('/api/wishes', 'POST', '[]')[0], 400, '数组 JSON');
    check(invoke('/api/wishes', 'POST', '{"text":"\ud800"}')[0], 400, '非法 Unicode');
    check(invoke('/api/wishes', 'POST', str_repeat('x', 8193))[0], 413, '请求上限');
    check(invoke('/api/wishes', 'POST', payload(), ['content_type' => 'text/plain'])[0], 400, '内容类型');
    check(invoke('/api/wishes', 'GET', null, ['origin' => 'https://evil.example'])[0], 403, '来源白名单');
    check(invoke('/api/wishes', 'OPTIONS')[0], 204, '跨域预检');
    check(invoke()[1]['Access-Control-Allow-Origin'], 'https://wedding.example', '跨域响应');
    check(invoke('/api/wishes', 'DELETE')[0], 405, '方法限制');
    check(invoke('/private/wishes-config.php')[0], 404, '私有文件路由');
    for ($i = 0; $i < 7; $i++) {
        check(invoke('/api/wishes', 'POST', payload('祝福' . $i))[0], 201, '分页种子');
    }
    $first = invoke()[2];
    $second = invoke('/api/wishes', 'GET', null, ['query' => ['before' => (string) $first['nextCursor']]])[2];
    check(count($first['items']), 6, '第一页');
    check(count($second['items']), 3, '第二页');
    check(count(array_unique(array_column(array_merge($first['items'], $second['items']), 'id'))), 9, '分页无重复');
    foreach ([['limit' => '0'], ['limit' => '51'], ['limit' => ['6']], ['before' => 'no'], ['before' => '9007199254740992']] as $query) {
        check(invoke('/api/wishes', 'GET', null, ['query' => $query])[0], 400, '分页参数');
    }
    $auth = ['authorization' => 'Bearer ' . $config['admin_token'], 'origin' => 'https://wxapi.example'];
    check(invoke('/api/admin/wishes')[0], 401, '管理鉴权');
    check(invoke('/api/admin/wishes', 'GET', null, $auth)[0], 200, '管理列表');
    foreach (['hidden', 'published'] as $status) {
        check(invoke('/api/admin/wishes/' . $id, 'PATCH', ['status' => $status], $auth)[0], 200, '修改状态');
        $all = invoke('/api/wishes', 'GET', null, ['query' => ['limit' => '50']])[2]['items'];
        check(in_array($id, array_column($all, 'id'), true), $status === 'published', '公开列表状态');
        check(invoke('/api/wishes', 'POST', $body)[2]['item']['status'], $status, '隐藏后重试');
    }
    check(invoke('/api/admin/wishes/99999', 'PATCH', ['status' => 'hidden'], $auth)[0], 404, '管理不存在记录');
    check(invoke('/api/admin/wishes/1', 'PATCH', ['status' => 'bad'], $auth)[0], 400, '管理非法状态');
    // 每次请求重开 PDO；模拟进程重启后仍从磁盘读取。
    $db = wishesOpen($config);
    check((int) $db->query('SELECT count(*) FROM wishes')->fetchColumn(), 9, '重开数据库持久化');
    check($db->query('PRAGMA integrity_check')->fetchColumn(), 'ok', '数据库完整性');
    $db = null;
    $backupPath = $directory . '/backup.sqlite';
    check(wishesBackup($config['database_path'], $backupPath), $backupPath, '实际备份函数');
    $restored = new SQLite3($backupPath);
    check($restored->querySingle('SELECT count(*) FROM wishes'), 9, '恢复备份读取');
    check($restored->querySingle('PRAGMA integrity_check'), 'ok', '备份完整性');
    $restored->close();
    $rejected = false;
    try { wishesBackup($config['database_path'], $backupPath); } catch (RuntimeException $error) { $rejected = true; }
    check($rejected, true, '拒绝覆盖已有备份');
    $limited = $config;
    $limited['database_path'] = $directory . '/limited.sqlite';
    $limited['rate_limit_max'] = 1;
    $limitedBody = payload();
    check(invoke('/api/wishes', 'POST', $limitedBody, [], $limited)[0], 201, '首条限流');
    check(invoke('/api/wishes', 'POST', $limitedBody, [], $limited)[0], 200, '重试不占额度');
    $blocked = invoke('/api/wishes', 'POST', payload(), ['x_forwarded_for' => '8.8.8.8'], $limited);
    check($blocked[0], 429, '限流持久化');
    check((int) $blocked[1]['Retry-After'] > 0, true, '限流等待');
    $db = wishesOpen($limited);
    $db->exec('UPDATE rate_limits SET expires_at=0');
    $db = null;
    check(invoke('/api/wishes', 'POST', payload(), [], $limited)[0], 201, '限流过期');
    $bad = $config;
    $bad['admin_token'] = '';
    check(invoke('/api/wishes', 'GET', null, [], $bad)[0], 503, '配置缺失');
    echo 'PASS ' . $count . ' assertions; PHP ' . PHP_VERSION . '; SQLite ' . SQLite3::version()['versionString'] . PHP_EOL;
} finally {
    foreach (glob($directory . '/*') as $file) {
        unlink($file);
    }
    rmdir($directory);
}
