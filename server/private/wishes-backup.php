<?php
declare(strict_types=1);

// SQLite online backup API：与 CLI 入口、测试共用，避免复制活跃数据库产生半份快照。
function wishesBackup(string $source, string $target): string
{
    if (!class_exists('SQLite3') || !method_exists('SQLite3', 'backup')) {
        throw new RuntimeException('备份需要 PHP 7.4+ 的 sqlite3 扩展及 SQLite3::backup');
    }
    if ($source === '' || !is_file($source) || $source[0] !== '/' || $target === '' || $target[0] !== '/' || file_exists($target)) {
        throw new RuntimeException('源数据库必须存在，备份目标必须是新的绝对路径');
    }
    if (!is_dir(dirname($target)) && !mkdir(dirname($target), 0700, true) && !is_dir(dirname($target))) {
        throw new RuntimeException('备份目录无法创建');
    }
    $file = fopen($target, 'x');
    if ($file === false) {
        throw new RuntimeException('备份目标无法创建');
    }
    fclose($file);
    $db = null;
    $destination = null;
    $success = false;
    try {
        $db = new SQLite3($source, SQLITE3_OPEN_READONLY);
        $db->busyTimeout(5000);
        $destination = new SQLite3($target, SQLITE3_OPEN_READWRITE);
        $destination->busyTimeout(5000);
        if (!$db->backup($destination) || $destination->querySingle('PRAGMA integrity_check') !== 'ok') {
            throw new RuntimeException('备份失败或完整性检查未通过');
        }
        if (!chmod($target, 0600)) {
            throw new RuntimeException('备份权限设置失败');
        }
        $success = true;
        return $target;
    } finally {
        if ($destination !== null) {
            $destination->close();
        }
        if ($db !== null) {
            $db->close();
        }
        if (!$success) {
            @unlink($target);
        }
    }
}
