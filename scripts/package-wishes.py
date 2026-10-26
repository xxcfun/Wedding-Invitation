# -*- coding: utf-8 -*-
"""仅打包明确列出的部署文件，不包含密钥、数据库、依赖和测试。"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
files = {
    'public/wishes.php': root / 'server/public/wishes.php',
    'public/admin.html': root / 'server/public/admin.html',
    'public/admin.js': root / 'server/public/admin.js',
    'private/wishes-config.example.php': root / 'server/private/wishes-config.example.php',
    'private/wishes-lib.php': root / 'server/private/wishes-lib.php',
    'private/wishes-backup.php': root / 'server/private/wishes-backup.php',
    'bin/backup.php': root / 'server/bin/backup.php',
    'README.md': root / 'server/README.md',
    'nginx.conf.example': root / 'deploy/wishes/nginx.conf.example',
}
output = root / 'output/wishes-php-baota.zip'
output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for target, source in files.items():
        archive.write(source, target)
with ZipFile(output) as archive:
    assert set(archive.namelist()) == set(files)
    assert archive.testzip() is None
print(output)
