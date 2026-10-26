<?php
declare(strict_types=1);
ini_set('display_errors', '0');
umask(0077);
require dirname(__DIR__) . '/private/wishes-lib.php';
$configPath = dirname(__DIR__) . '/private/wishes-config.php';
try {
    if (!is_file($configPath)) {
        throw new RuntimeException('config_missing');
    }
    $config = require $configPath;
    if (!is_array($config)) {
        throw new RuntimeException('config_missing');
    }
    // REQUEST_URI 保留 Nginx 内部重写前的原始路径。读取上限同样覆盖分块请求。
    $body = file_get_contents('php://input', false, null, 0, 8193);
    $response = wishesHandle($config, [
        'method' => $_SERVER['REQUEST_METHOD'] ?? 'GET',
        'path' => parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '',
        'query' => $_GET,
        'origin' => $_SERVER['HTTP_ORIGIN'] ?? '',
        'authorization' => $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '',
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? '',
        'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? '',
        'body' => $body === false ? '' : $body,
    ]);
} catch (Throwable $error) {
    error_log('[wishes] config_load_error');
    $response = [503, ['Content-Type' => 'application/json; charset=utf-8', 'Cache-Control' => 'no-store', 'X-Content-Type-Options' => 'nosniff'], ['error' => 'config_missing']];
}
http_response_code($response[0]);
foreach ($response[1] as $name => $value) {
    header($name . ': ' . $value);
}
if ($response[2] !== null) {
    echo json_encode($response[2], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
