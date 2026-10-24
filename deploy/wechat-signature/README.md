# 宝塔部署微信地图导航签名接口

> 当前请柬在手机微信内调用本服务初始化 JS-SDK，使用 `openLocation` 打开酒店位置页。分享仍采用邀请图片，不申请原生分享接口。

适用于当前 CentOS 7.9 + 宝塔 8.0.5 环境，使用宝塔现有 Nginx/Apache + PHP，不需要 Node.js、Composer、数据库或 Redis。使用面板能提供的 PHP 8.x，需开启 cURL 扩展；代码语法兼容 PHP 7.4。接口默认域名使用 `wxapi.xxcfun.cn`，需要你新建该 DNS 记录。

请柬继续由 Vercel 的 `https://wedding.xxcfun.cn` 提供，服务器只运行签名接口。以下路径均为你的服务器路径。

## 1. 解析接口域名

在域名 DNS 后台新增：

| 类型 | 主机记录 | 记录值 |
| --- | --- | --- |
| A | wxapi | 固定公网 IPv4 地址 |

保留 `wedding` 记录原样。若没有配置服务器 IPv6，不要为 `wxapi` 添加 AAAA 记录。

## 2. 在宝塔添加 PHP 站点

在「软件商店」确认已安装 Web 服务与 PHP，PHP 开启 cURL 扩展。在「网站 → 添加站点」填写：

- 域名：`wxapi.xxcfun.cn`
- 网站目录：`/www/wwwroot/wxapi.xxcfun.cn`
- PHP 版本：选择已安装的 PHP 8.x，不能选择「纯静态」
- 不需要创建数据库或 FTP

在宝塔「文件」进入上述网站目录，上传本包的 `public`、`private` 两个目录。最终目录结构：

```text
/www/wwwroot/wxapi.xxcfun.cn/
├── public/
│   └── wechat-signature.php
└── private/
    └── config.example.php
```

然后打开「网站 → 该站点设置 → 网站目录」，把**运行目录设为 `/public`** 并保存。Web 服务器公开的根目录必须是 `/www/wwwroot/wxapi.xxcfun.cn/public`，不要公开整个项目目录。此接口不需要伪静态规则。

## 3. 在服务器填写公众号密钥

在宝塔文件管理器中，将 `private/config.example.php` 复制成同目录的 `config.php`。编辑这个新文件：

```php
<?php
return [
    'app_id' => '填入你的公众号AppID',
    'app_secret' => '填入你的公众号AppSecret',
];
```

密钥只在服务器本地填写；不要上传到 Vercel、Git 仓库或聊天。实际配置文件和缓存已经加入本目录的 `.gitignore`。

给 PHP 运行用户读配置、写缓存的权限。宝塔默认用户一般为 `www`；如果你的站点使用其他用户，相应替换。可在宝塔终端执行：

```bash
mkdir -p /www/wwwroot/wxapi.xxcfun.cn/private/cache
chown -R www:www /www/wwwroot/wxapi.xxcfun.cn/private
chmod 750 /www/wwwroot/wxapi.xxcfun.cn/private
chmod 640 /www/wwwroot/wxapi.xxcfun.cn/private/config.php
chmod 700 /www/wwwroot/wxapi.xxcfun.cn/private/cache
```

接口会把 access_token 和 jsapi_ticket 缓存在 `private/cache`，依据微信返回的有效期提前 300 秒更新，使用文件锁防止 PHP 多进程同时刷新；不需要计划任务。

宝塔的「防跨站攻击（open_basedir）」必须允许 PHP 读取 `public` 的父目录和 `private`。如果 PHP 错误日志出现 `open_basedir restriction in effect`，将该站点的允许范围设为整个项目目录，例如：

```ini
open_basedir=/www/wwwroot/wxapi.xxcfun.cn/:/tmp/
```

保留其他确有需要的已有路径；不要因此关闭全服务器的防跨站保护。

## 4. 开启 HTTPS

确认服务器安全组与防火墙已放行 TCP 80、443。宝塔「网站 → 该站点设置 → SSL」申请受信任证书，确认 HTTPS 可用后启用强制 HTTPS。

官方参考：[创建站点](https://docs.bt.cn/getting-started/create-web/)、[部署 SSL](https://docs.bt.cn/getting-started/deploy-ssl)。当前官方文档的界面可能比宝塔 8.0.5 新；按同名站点设置操作即可。

## 5. 配置微信后台

公众号必须拥有 `openLocation`（使用微信内置地图查看位置接口）权限，无需原生分享接口权限。

- **开发接口的 IP 白名单**：填写本服务器向外请求实际使用的固定公网 IP，不是 Vercel 的 IP。若服务器使用 NAT，以出站 IP 为准。
- **JS 接口安全域名**：填写 `wedding.xxcfun.cn`，这是请柬网页所在域名。无需因为接口域名是 wxapi，就把 JS 安全域名替换成 wxapi。
- 下载的域名验证文件仍应放在请柬项目根目录，部署到 Vercel，使微信能从 `https://wedding.xxcfun.cn/实际验证文件名.txt` 读取。

参考：[微信 JS-SDK 官方文档](https://developers.weixin.qq.com/doc/service/guide/h5/jssdk.html)。

## 6. 测试接口

在电脑或服务器终端执行，先不要改动线上请柬配置：

```bash
curl --get --include \
  'https://wxapi.xxcfun.cn/wechat-signature.php' \
  --data-urlencode 'url=https://wedding.xxcfun.cn/' \
  --header 'Origin: https://wedding.xxcfun.cn'
```

成功时应返回 HTTP 200，响应头包含 `Access-Control-Allow-Origin: https://wedding.xxcfun.cn`，JSON 包含：

```json
{"appId":"wx...","timestamp":1790000000,"nonceStr":"...","signature":"40位SHA1十六进制字符串"}
```

接口不会返回 AppSecret、access_token 或 jsapi_ticket。浏览器直接访问下面地址也能检查 JSON：

```text
https://wxapi.xxcfun.cn/wechat-signature.php?url=https%3A%2F%2Fwedding.xxcfun.cn%2F
```

再确认 `https://wxapi.xxcfun.cn/private/config.php` 与 `/private/cache/` 不能访问到配置或缓存。若能访问，先修正运行目录为 `/public`。

可用宝塔所选 PHP 版本的命令行做语法检查，例如 PHP 8.2：

```bash
/www/server/php/82/bin/php -l /www/wwwroot/wxapi.xxcfun.cn/public/wechat-signature.php
```

### 常见响应

| 响应 | 检查内容 |
| --- | --- |
| `config_missing` | 是否把配置示例复制成了 `private/config.php`，以及 open_basedir 是否允许读取 |
| `config_incomplete` | AppID 和 AppSecret 是否已填写 |
| `php_curl_missing` | 是否给本站选用的 PHP 启用了 cURL 扩展 |
| `cache_directory_error` / `cache_write_error` / `cache_lock_error` | PHP 运行用户是否能写 `private/cache` |
| `wechat_error_40164` | 微信后台 IP 白名单是否包含服务器实际出站 IP |
| `wechat_error_40013` | AppID 是否正确 |
| `wechat_error_40125` | AppSecret 是否正确 |
| `wechat_error_48001` | 公众号是否具备接口权限 |
| `wechat_error_40001` / `40014` / `42001` | 微信凭证失效；服务已清除失效 token，下次请求会重新获取 |
| `wechat_network_error` | 服务器能否访问微信 API，cURL 是否可用，TLS 证书链和系统时间是否正常；不要关闭 TLS 校验 |
| `origin_not_allowed` | 浏览器是否从 `https://wedding.xxcfun.cn` 发起请求 |
| `url_not_allowed` | 签名 URL 是否确实属于 `https://wedding.xxcfun.cn`，使用 HTTPS 且无非标准端口 |
| `internal_error` / HTTP 500 | 看宝塔该站点 PHP 错误日志，尤其是 open_basedir、PHP 版本或文件权限 |

服务使用官方推荐的稳定版 `/cgi-bin/stable_token`，固定设置 `force_refresh: false`，不主动强制刷新并使已有 token 失效。同一公众号若有其他凭证服务，仍应统一管理凭证，避免其他服务强制刷新导致失效。单台服务器上本服务的多个 PHP 进程会共用缓存。[稳定版 token 文档](https://developers.weixin.qq.com/doc/service/api/base/api_getstableaccesstoken.html)

## 7. 接入请柬并重新部署 Vercel

在请柬项目 `main.js` 的 `CONFIG.wechat` 中填写：

```js
wechat: {
  signatureEndpoint: "https://wxapi.xxcfun.cn/wechat-signature.php",
},
```

前端已实现传入实际页面 URL、初始化微信 SDK，并仅申请 `openLocation`。签名接口会保留 URL 中的查询参数、顺序、编码和末尾斜杠，只去掉 `#` 及之后部分；不要在前端改成签固定首页地址。

把修改后的请柬部署到 Vercel，更新 `main.js`。从手机微信内重新打开请柬，点击「导航前往」，确认位置页显示海岱禧合婚礼艺术中心，坐标为纬度 36.694075、经度 118.457025，再选择导航。分别在 iPhone 和 Android 真机验证；网络异常时应提示重试，手绘地图仍可复制酒店名称。

本部署包没有自动修改请柬的签名配置，也没有替你配置 DNS、服务器或公众号后台；上述步骤完成后才会生效。

## 本地验证范围

已在 PHP 7.4、8.2 的 WebAssembly 测试环境中各通过 18 项行为检查，覆盖缓存票据签名、查询参数和编码保留、去除 hash、域名限制、跨域响应、请求方法、配置缺失等。另以模拟微信响应检查稳定版 token 的 POST 请求、原子缓存写入、缓存命中、ticket 到期刷新、token 失效后的下一请求恢复和错误码输出。没有使用真实公众号密钥；CentOS/宝塔的文件权限、TLS、实际出站 IP 和真实微信地图效果需要按上述步骤部署后验证。
