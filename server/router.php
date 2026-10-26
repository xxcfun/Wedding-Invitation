<?php
// 仅本地 php -S 调试使用；生产通过 Nginx + PHP-FPM。
declare(strict_types=1);
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if ($path === '/admin' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    header('Content-Type: text/html; charset=utf-8');
    header("Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    header('Cache-Control: no-store');
    readfile(__DIR__ . '/public/admin.html');
} elseif ($path === '/admin.js' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    header('Content-Type: application/javascript');
    readfile(__DIR__ . '/public/admin.js');
} else {
    require __DIR__ . '/public/wishes.php';
}
