# 婚礼共享留言（PHP + SQLite）

复用当前 CentOS 7 + 宝塔已有 PHP 站点，前端继续部署 Vercel。不需要 Node.js、npm、Composer、MySQL 或常驻后台进程。

默认接口 `https://wxapi.xxcfun.cn/api/wishes`、管理入口 `https://wxapi.xxcfun.cn/admin`。前端地址保持不变，姓名手动填写并在本机记住，没有微信登录依赖。旧本机留言不自动上传。

## 1. 确认站点 PHP 与扩展

在宝塔中查看 **wxapi.xxcfun.cn 站点实际选择的 PHP 版本**。优先使用面板可提供的受维护 PHP 8.x；代码语法兼容 PHP 7.4，要求 64 位。系统 `php` 命令可能与站点版本不同，以下用宝塔 PHP 8.2 举例，按实际版本将 `/82/` 改成 `/74/` 等。

```bash
/www/server/php/82/bin/php -v
/www/server/php/82/bin/php -r 'echo "64bit: ", PHP_INT_SIZE === 8 ? "yes" : "no", PHP_EOL; echo "PDO SQLite: ", extension_loaded("pdo_sqlite") ? "yes" : "no", PHP_EOL; echo "SQLite3 backup: ", method_exists("SQLite3", "backup") ? "yes" : "no", PHP_EOL;'
```

需要 `PDO`、`pdo_sqlite`（接口）和 `sqlite3`（备份）扩展，无需 mbstring。缺少扩展时在宝塔对应 PHP 的扩展设置中安装/启用，再重启对应 PHP 服务。部署后还需检查 FPM 的实际模块配置，不能只凭 CLI 结果判断。

## 2. 上传文件，合并到现有微信接口站点

部署包 `output/wishes-php-baota.zip` 直接解压到现有站点项目目录（不是 public 内）。目录示例：

```text
/www/wwwroot/wxapi.xxcfun.cn/
├── public/                         ← 宝塔网站运行目录必须指向这里
│   ├── wechat-signature.php         ← 原有文件，保留
│   ├── wishes.php                  ← 新增 HTTP 入口
│   ├── admin.html
│   └── admin.js
├── private/                        ← 浏览器不可访问
│   ├── config.php                  ← 原有公众号配置，保留
│   ├── cache/                      ← 原有微信缓存，保留
│   ├── wishes-config.example.php
│   ├── wishes-config.php           ← 仅服务器上创建
│   ├── wishes-lib.php
│   ├── wishes-backup.php
│   ├── data/wishes.sqlite          ← 自动创建
│   └── backups/
└── bin/backup.php
```

部署包不包含真实配置或数据库，不会提供同名微信签名文件。使用源码时只需将 `server/public/`、`server/private/`、`server/bin/` 合并到上述位置。不要上传 node_modules、test 或将整个项目目录公开。后续更新保留 wishes-config.php、data、backups 和现有微信配置。

## 3. 创建独立留言配置

在宝塔文件管理中复制 `private/wishes-config.example.php` 为同目录 `wishes-config.php`。**不要覆盖原来公众号用的 `private/config.php`。**

生成管理密钥：

```bash
/www/server/php/82/bin/php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'
```

把输出只填在服务器的 `private/wishes-config.php`：

```php
<?php
return [
    'database_path' => __DIR__ . '/data/wishes.sqlite',
    'admin_token' => '替换为刚才生成的随机密钥',
    'allowed_origins' => [
        'https://wedding.xxcfun.cn',
        'https://wxapi.xxcfun.cn',
    ],
    'rate_limit_max' => 20,
    'rate_limit_window_seconds' => 600,
];
```

两个来源分别对应请柬与管理页面，填写完整 origin，无路径和结尾斜杠。数据库使用服务器持久化本地磁盘，不要放在 Vercel 或公开目录。密钥不得放在前端、URL、仓库或聊天里。

## 4. 设置权限与 open_basedir

以下假设 PHP-FPM 用户和组都是 www，请先核对站点实际配置：

```bash
mkdir -p /www/wwwroot/wxapi.xxcfun.cn/private/data
mkdir -p /www/wwwroot/wxapi.xxcfun.cn/private/backups
chown www:www /www/wwwroot/wxapi.xxcfun.cn/private/data
chown www:www /www/wwwroot/wxapi.xxcfun.cn/private/backups
chmod 700 /www/wwwroot/wxapi.xxcfun.cn/private/data
chmod 700 /www/wwwroot/wxapi.xxcfun.cn/private/backups
chown root:www /www/wwwroot/wxapi.xxcfun.cn/private/wishes-config.php
chmod 640 /www/wwwroot/wxapi.xxcfun.cn/private/wishes-config.php
```

确保 PHP 用户能穿过项目目录、读取 private 下的代码和配置；数据库文件首次访问自动创建，权限 600。不需要在宝塔数据库页面添加数据库。

宝塔站点的防跨站设置（open_basedir）必须覆盖整个项目目录，例如：

```ini
open_basedir=/www/wwwroot/wxapi.xxcfun.cn/:/tmp/
```

仅允许 public 会导致 PHP 无法读取 private。不要因此关闭整台服务器的保护；保持原微信接口确实需要的路径。

## 5. Nginx 路由，不再使用 Node 反向代理

在宝塔「网站 → wxapi.xxcfun.cn → 配置文件」中，将 `deploy/wishes/nginx.conf.example`（部署包根目录 nginx.conf.example）的 location 块放进现有 HTTPS server 块。原有宝塔 PHP include 与微信签名规则保留。如果之前添加过转发到 3001 的同路径 location，替换它，避免重复定义。

核心 API 规则：

```nginx
location /api/ {
    client_max_body_size 8k;
    rewrite ^ /wishes.php last;
}
```

`/api/wishes` 等请求在 Nginx 内部转到 `wishes.php`，PHP 使用原始 REQUEST_URI 匹配路由，参数保留。管理页的 /admin、/admin.html 规则也需一并添加。无需对公网开放新端口，无需进程守护或 systemd。

如管理页输入正确密钥仍返回 401，检查宝塔该站点现有 PHP location 中是否传递 Authorization，必要时补充：

```nginx
fastcgi_param HTTP_AUTHORIZATION $http_authorization;
```

配置测试通过再重载 Nginx。若 shell 找不到 nginx，可用宝塔内置配置测试/重载入口或实际 Nginx 安装路径。不要公开整个 private 目录来解决错误。

## 6. 验证接口与发布前端

```bash
curl -i https://wxapi.xxcfun.cn/api/health
curl -i https://wxapi.xxcfun.cn/api/wishes
curl -i -X OPTIONS https://wxapi.xxcfun.cn/api/wishes \
  -H 'Origin: https://wedding.xxcfun.cn' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

预期依次为：200 `{ok:true}`；200 `{items:[],nextCursor:null}`（已有留言时返回实际列表）；204 且 Access-Control-Allow-Origin 为请柬域名。确认 `/private/wishes-config.php`、`/private/data/wishes.sqlite` 无法下载。

然后发布最新 index.html、main.js、styles.css 到 Vercel。接口地址默认已配置，无需再改。两台手机测试提交、刷新、公开共享，再到管理入口输入密钥验证隐藏和恢复；重新检查原 `/wechat-signature.php` 微信地图功能。

使用 CDN 时对 /api/、wishes.php、/admin、admin.html 绕过缓存。REMOTE_ADDR 用于 IP 限流；PHP 不信任客户端的转发头。若 Nginx 在 CDN 后，应只为受信 CDN 地址配置 real_ip，避免所有访客共享 CDN 节点额度。

## 接口与存储

| 请求 | 结果 |
| --- | --- |
| GET /api/wishes?limit=6&before=123 | `{items:[{id,name,text,createdAt}],nextCursor}`，仅公开留言，每页最多 50 |
| POST /api/wishes | JSON `{name,text,requestId}`；首次 201、同标识同内容重试 200；`{item,duplicate}`，item 含 status |
| GET /api/admin/wishes?limit=20&before=123 | 管理列表，含 status，需要 Authorization: Bearer 管理密钥 |
| PATCH /api/admin/wishes/:id | JSON `{status:"hidden"}` / `{status:"published"}`，需鉴权 |
| GET /api/health | 数据库可读时 `{ok:true}` |

名字最多 20、祝福最多 160，按 HTML maxlength 的 UTF-16 单元计数，一个常见 emoji 占两个。服务器 UTC 时间入库、页面按北京时间显示。只在事务提交后返回成功；同 UUID v4 重试不会重复入库，更换内容却复用 ID 返回 409。

错误为 `{error:"代号"}`。400 校验、401 鉴权、403 来源、404 路由/记录、405 方法、409 冲突、413 体积、429 限流、503 配置/存储故障。请求体上限 8 KiB。默认同 IP 10 分钟 20 条新留言，重试不占额度；管理鉴权每窗口 120 次。限流只存 HMAC 键，不保存原始 IP，过期随请求清理。密钥轮换会改变限流哈希命名空间。

默认 SQLite 回滚日志、短事务、busy_timeout 5 秒；读写与限流使用参数化查询。首次建表通过 PRAGMA user_version 迁移并加事务锁，不依赖 SQLite 新版的 UPSERT/RETURNING。表结构与此前 Koa 草案相同，如已有数据库可停服务后迁移文件并保留配置路径；迁移前务必备份。

## 备份和恢复

接口只要求 pdo_sqlite，在线备份另外需要 PHP 7.4+ 的 sqlite3 扩展及 SQLite3::backup 方法。

以 PHP 运行用户执行，避免创建 root 所有的数据库/备份；下面的 PHP 版本及用户按实际替换：

```bash
su -s /bin/sh -c '/www/server/php/82/bin/php /www/wwwroot/wxapi.xxcfun.cn/bin/backup.php' www
```

默认在 private/backups 创建带时间和随机后缀的快照，并执行 integrity_check，拒绝覆盖已有文件。可传入新的备份绝对路径；不要以其他用户名创建不可访问的快照。宝塔计划任务可每日执行上述命令，建议保留至少 7 份并复制到另一台机器的受保护目录。

恢复：临时关闭该站点留言写入 → 备份现有库 → 用快照替换配置指向的数据库 → 修正 www 所有者及 600 权限 → 恢复写入 → 验证列表与提交。不要在线直接复制或覆盖活跃数据库文件。

## 本地测试

有原生 PHP 和上述扩展时，在仓库根目录执行：

```bash
php server/test/api.php
```

本地预览可复制测试配置、将 allowed_origins 改为 `http://127.0.0.1:8000` 和 `http://127.0.0.1:3001`，然后：

```bash
php -S 127.0.0.1:3001 -t server/public server/router.php
python3 -m http.server 8000 --bind 127.0.0.1
```

两条命令分别在两个终端运行。打开 `http://127.0.0.1:8000/?wishesApi=http://127.0.0.1:3001/api/wishes#wishes`。router.php 只用于开发，不用于生产。

开发机没有原生 PHP 时，`scripts/check-wishes-php.cjs` 使用可选 @php-wasm/node 与 @php-wasm/universal 运行真实 PHP 7.4/8.2 及 SQLite；`scripts/check-wishes.cjs` 再使用 Playwright + 本机 Chrome 验证真实前后端。通过 NODE_PATH 指向这些测试依赖即可，生产包不需要它们。这些 WASM 构建内的 SQLite 是 3.51，未代替线上旧 SQLite、PHP-FPM、Nginx、TLS 和目录权限的部署验收。
