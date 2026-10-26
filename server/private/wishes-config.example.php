<?php
// 复制为 wishes-config.php；与微信签名的 config.php 分开，切勿覆盖后者。
return [
    'database_path' => __DIR__ . '/data/wishes.sqlite',
    // 在服务器运行：php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'
    'admin_token' => '',
    'allowed_origins' => [
        'https://wedding.xxcfun.cn',
        'https://wxapi.xxcfun.cn',
    ],
    'rate_limit_max' => 20,
    'rate_limit_window_seconds' => 600,
];
