# 布吉岛来信 · H5 婚礼请柬

入口为 `index.html`，样式位于 `styles.css`，欢迎加载逻辑位于 `loader.js`，配置与主要交互位于 `main.js`。无需安装依赖，保持这些文件的相对位置即可打开；部署时请一并上传这些文件及 `assets` 目录。Tailwind 已离线编译，不依赖 CDN。

手机端为设计基准，桌面居中显示相同的 480px 上限纵向长卷。全页使用浏览器原生滚动，无分页、吸附或整屏切换。

## 修改入口

在 `main.js` 中搜索 **中文可修改资料区** 或 `const CONFIG`。

| 内容 | 配置 |
| --- | --- |
| 新人姓名 | `groom`、`bride` |
| 婚期与时间 | `date`，保留 `+08:00` 北京时间时区 |
| 时间文案与农历 | `timeLabel`、`lunarDate`，更换婚期时同步修改 |
| 酒店、地址、坐标 | `venue`、`venueFull`、`address`、`longitude`、`latitude` |
| 恋爱故事 | `story` |
| 婚礼流程 | `agenda` |
| 六张婚照 | `photos` 各项的 `src` 与 `title` |
| 音乐路径 | `audio`，默认自动播放；浏览器拦截时首次交互后播放，音乐按钮可暂停或继续 |
| 示例祝福 | `sampleWishes` |
| 分享内容 | `share` |
| 微信签名接口 | `wechat.signatureEndpoint` |

新人姓名、婚期、地点及坐标等个性化信息统一在 `CONFIG` 中配置，本文档不展示具体值。恋爱节点、部分流程时刻仍为设计示例；六张相册为原创插画占位，可替换为自己的婚照。

标题、请柬正文与致谢文案可在带有“模块一 / 二 / 十”中文注释的位置修改。个性化字体使用 ZCOOL KuaiLe 完整字库（`assets/island-round.ttf`），覆盖姓名、标题与动态文案，避免子集缺字造成字形混用。字体许可同时保留在 HTML 注释和 `assets/island-font-OFL.txt` 中。

替换照片时，可将图片转为 `data:image/webp;base64,...` 填入 `src`；也可使用同目录文件路径或 HTTPS 图片地址。

## 已实现交互

- 首次加载欢迎动画（以浏览器会话为单位）、平滑淡出；加载不锁定滚动。
- 木质按钮按压反馈、模块入场、云朵彩旗与低密度粒子、有限幅度视差、昼夜色调长卷渐变。
- 低配置设备 / 省流量降低粒子数；系统减少动态效果与页尾动效暂停开关。
- 首屏使用原生 1254×1254 高清单图；挥手与捧花随滚动连续轻摆，时间插值平滑收敛。画布按设备像素比渲染，可见区外和后台停止更新，渲染不可用时展示同一高清静图。
- 草地点击彩蛋、十枚模块贴纸收集；每次打开、刷新或从浏览器后退缓存恢复时重新收集，不保存上次图鉴进度。
- 收集反馈包含大贴纸发现提示、飞入图鉴、图鉴回弹光圈和 `+N`；快速滚动时合并反馈，系统减少动态效果或暂停装饰动效时只更新收集状态。
- 婚礼信息的导航按钮和地图卡片直接唤起高德 App 导航，不跳转网页或其他地图；桌面点击提示使用手机打开。
- 北京时间倒计时；婚期到达自动切换祝福文案。
- 六图相册、磨砂大图弹窗、左右滑动、弹窗内鼠标滚轮、按钮及方向键切换，Escape 关闭。
- 祝福输入校验、纯文本安全显示、贴板动画、最多 50 条本机留言持久化。
- 音频需主动点击开启，淡入淡出、快速切换竞态处理、循环播放且不因页面滚动中断。
- 微信分享按钮引导右上角菜单发送原生链接卡片，展示标题、摘要与封面预览；支持准备状态、失败重试与备用图片邀请卡。

## 邀请图卡与微信分享

默认以**微信原生链接卡片分享**为主。微信中打开请柬，等待“分享已准备好”，点击右上角「···」→「发送给朋友」，接收方看到含标题、摘要和封面的链接卡片，点击进入完整请柬；朋友圈的展示布局由微信决定。直接把网址粘贴到聊天输入框发送，不等同于网页菜单分享。

分享弹窗展示内容预览，实际卡片布局由微信控制。签名、SDK 加载、授权或设置分享失败时会显示重试入口，不将 `wx.ready` 误判为分享设置成功；请求及各 SDK 阶段均有 12 秒超时。备用的图片邀请卡收在“也可以保存图片邀请卡”中，无需公众号，含完整请柬二维码。

- `assets/island-invitation-hd.jpg`：1080×1620 完整邀请图卡，HTML 同时内嵌同一文件的离线兜底版本。
- `assets/island-share-hd.jpg`：1200×1200 高清分享图，使用当前新人挥手封面，供 OG 与微信分享配置使用。
- `CONFIG.share.poster`：微信长按使用的同源图片地址。
- `CONFIG.share.image`、`link` 及 HTML 的 `og:image`、`og:url`、`canonical`：公开的 HTTPS 预览资源与请柬网址。

更换姓名、婚期或线上网址时，在可解析 `playwright` 和 `sharp` 的 Node.js 环境运行 `node scripts/build-share-assets.cjs`。脚本使用本机 Chrome、macOS Swift/Core Image 与 Vision，读取当前 `CONFIG` 和 `assets/island-cover-hd.png`，重新导出两张图片、验证二维码，并同步静态 OG 与 HTML 内嵌邀请卡；可通过 `CHROME_PATH` 指定 Chrome 路径。发布时需同时上传新图、HTML、CSS 和 JS。新素材使用 `-hd` 文件名，避免沿用旧图片地址的缓存。

### 微信公众号签名服务

固定公网 IP 服务器 + 宝塔的可上传 PHP 接口与操作步骤见 [微信签名服务部署说明](deploy/wechat-signature/README.md)。

前端已配置 `https://wxapi.xxcfun.cn/wechat-signature.php` 并接入微信 JS-SDK。正式生效仍依赖签名服务可访问，以及公众号已授权请柬域名；静态 OG 元信息不能替代该授权。部署时检查：

1. 在有相应 JS-SDK 权限的公众号中配置网站的 JS 接口安全域名。
2. 设置 `CONFIG.wechat.signatureEndpoint`。服务端按接收的 `url`（包含 query、不含 hash）生成签名，返回 `appId`、`timestamp`、`nonceStr`、`signature`；公众号密钥仅放在服务端。
3. 页面在微信且填写接口时加载官方 SDK，为好友、朋友圈设置标题、摘要、链接和封面。原生卡片的标题字体与实际展示布局由微信控制。

微信网页无法通过普通按钮强制弹出原生分享菜单，原生链接分享仍通过微信右上角“···”完成。签名服务及真实分享效果需在正式域名、授权账号和实机上联调。

参考：[微信 JS-SDK 官方文档](https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/JS-SDK.html)、[高德 App Scheme 入门指南](https://developer.amap.com/api/amap-mobile/gettingstarted)。

## 地图与留言说明

地图为原创静态手绘位置示意，不加载重型地图 SDK。导航按钮和地图卡片直接调用高德 App 的导航协议：iPhone/iPad 使用 `iosamap://navi`，Android 使用 `androidamap://navi`，以当前位置为起点导航至酒店。

- 点击保留原生链接的真实用户手势，不延迟发起 App 调用。
- 不设置网页或其他地图 App 兜底，返回请柬后不会触发后续自动跳转。
- 电脑点击仅提示在已安装高德地图的手机上打开请柬。

手机需安装高德地图，实际唤起由系统与浏览器处理。微信内置浏览器可能拦截 App 协议，点击时会提示从右上角选择在浏览器打开后重试；不自动改开网页。

给定坐标在代码中按 GCJ-02 处理，调用高德时 `dev=0`。手绘地图不表示精确测绘比例。

祝福当前仅存储在访客设备的 localStorage，其他访客无法看到彼此的新留言。多人共享留言需另接服务端；本页面不会伪装成已经连接了数据库。

## 验收记录

首屏高清与连续动效修复另使用本机 Chrome 的 DPR 3 手机模拟验证：390px 对应 1170px 画布，480px 时保持原图 1254px；不再请求八帧低清资源。慢滑、快滑、反向、暂停、减少动态、离屏停止、WebGL 上下文丢失与恢复、渲染不支持及高清图片请求失败的回退均通过。截图像素对比确认挥手时新人眼睛、脸部与身体稳定。测试覆盖 320、375、390、480px 手机宽度、横屏与 1440px 桌面；无横向溢出。手机浏览器模拟不替代真实手机性能验收。

已使用 Chrome / Playwright 检查 320px、375px、390px 手机屏宽、844×390 横屏、768px 平板、1440px 桌面。均无横向溢出；桌面维持同一单列结构。

交互验证包括：十个模块及六张相片、首次加载、相册按钮 / 触摸手势 / 滚轮 / 键盘、留言验证与刷新保存、文本防注入、十枚贴纸收集、减少动态效果。播放器使用仅存在于测试内存中的静音 WAV 验证淡入淡出和快速切换，交付 HTML 不含测试音频。手机高德 App 的实际唤起与微信长按保存应以实机结果为准。

实际截图：

- `island-preview-mobile.png`
- `island-preview-desktop.png`
- `island-preview-fullpage.png`
- `island-preview-navigation.png`
- `island-preview-share.png`
- `island-preview-collection.png`

## 素材

- 当前首屏：`assets/island-cover-hd.webp`（1254×1254、WebP quality 96）；无损原图为 `assets/island-cover-hd.png`。单张完整场景由 `hero-motion.js` 做局部连续形变，不再使用每帧仅 443px 的八帧图。
- 首屏动效与素材生成说明：`assets/hero-motion-notes.md`。
- 高清 OG / 微信分享图：`assets/island-share-hd.jpg`。
- 可转发的高清邀请图卡：`assets/island-invitation-hd.jpg`，同一文件已内嵌为离线兜底。
- 旧无人岛插画、旧分享图与旧邀请卡保留为历史素材，当前分享功能不再引用。
- 素材来源及最终生成提示词：`assets/README.md`。
- 视觉规范：`DESIGN.md`。

## 微信分享前端检查

在可解析 `playwright` 的 Node.js 环境运行 `node scripts/check-wechat-share.cjs`（可通过 `CHROME_PATH` 指定 Chrome）。模拟签名和微信 SDK，覆盖好友/朋友圈内容、带查询参数 URL 的签名、签名失败重试、无效响应、SDK 加载失败、授权失败、分享 API 失败、超时、非微信浏览器、弹窗关闭与备用图片。此检查不替代正式域名的微信实机验收。

### 分享失败排查

排查时使用 `https://wedding.xxcfun.cn/?wechat_debug=1`，在微信打开后点击页面分享按钮，查看“微信分享检查结果”。仅该参数开启诊断，普通访问不显示；诊断保留签名服务错误码及 SDK 原始 `errMsg`，不包含 AppSecret、access_token、jsapi_ticket 或签名值。`config:invalid signature` 需要核对当前 URL 的签名，`permission denied` 需要核对公众号接口权限和 JS 接口安全域名。两个分享接口成功只能证明分享内容已设置，仍需在目标微信客户端从网页右上角菜单验证实际卡片。

排查代码已使用官方 `jweixin-1.6.0.js` 配合模拟微信桥接验证。可设置 `WECHAT_SDK_PATH=/absolute/path/jweixin-1.6.0.js` 运行 `node scripts/check-wechat-share.cjs`，额外验证官方 SDK 对签名无效和权限不足的回调处理；这仍不代表真实公众号已获授权。
