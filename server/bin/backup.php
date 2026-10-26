<?php
// CLI only：php bin/backup.php /绝对路径/新备份.sqlite
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
ini_set('display_errors', '0');
umask(0077);
require dirname(__DIR__) . '/private/wishes-backup.php';
try {
    $config = require dirname(__DIR__) . '/private/wishes-config.php';
    $source = $config['database_path'] ?? '';
    $target = $argv[1] ?? dirname(__DIR__) . '/private/backups/wishes-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.sqlite';
    echo 'Backup saved: ' . wishesBackup($source, $target) . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, 'Backup failed: ' . $error->getMessage() . PHP_EOL);
    exit(1);
}
