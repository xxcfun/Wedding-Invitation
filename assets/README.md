# 小岛请柬素材

当前首屏使用 `island-cover-hd.webp`：1254×1254、WebP quality 96，保留原生高清细节；无损编辑结果保存为 `island-cover-hd.png`。基于原封面，只将新郎右臂调整为完整举手姿势，由 `hero-motion.js` 连续驱动局部挥手与捧花轻摆。生成提示词与控制点见 `hero-motion-notes.md`。旧八帧图与拆层素材已清理。

本次使用内置 ImageGen 工具生成原创婚礼岛屿插画，首屏封面与背景音乐已替换为用户提供的素材。地图、贴纸和结构图标为源码中的原创 SVG。相册的六个位置是可替换的原创插画占位。

- `island-share-hd.jpg`：1200×1200 当前 OG / 微信分享图，以 `island-cover-hd.png` 为底图，叠加新人姓名、婚期和木质标题牌；文字由 HTML 绘制。
- `island-invitation-hd.jpg`：1080×1620 当前邀请图卡，沿用现有版式，使用当前高清封面、姓名、婚期、酒店及真实请柬二维码，支持保存与转发。
- `island-font-OFL.txt`：ZCOOL KuaiLe 标题字体的 SIL OFL 许可；HTML 同时保留许可文本。

## 最终生成提示词

模式：内置 ImageGen，生成原创位图；未使用 API / CLI 回退。

Use case: stylized-concept. Asset type: hero illustration for an original mobile island wedding invitation website. Create a premium, richly detailed cozy life-simulation videogame 3D illustration, square composition, no text anywhere. A tiny idyllic wedding island seen from a slightly elevated isometric camera with a soft orthographic lens. Center of composition: curved cream wooden wedding arch covered in white daisies, small peach and pale yellow flowers and greenery, two little empty cream chairs and a tiny table, curving stepping stone path across a lush sculpted rounded grassy island, cream beaches, a wooden dock extending toward foreground turquoise sea, lily-like flowers, rounded bushes, distinctive low-poly round trees on left and right, white picket fences, small terracotta pots and a watering can. A tiny pastel coral mailbox, pale teal and apricot balloons, miniature fabric pennant garlands. Island fills lower 80% of image, very pale sky blue with fluffy clouds fills upper 20%. Soft warm daylight from top left, ambient occlusion, lush matte tactile materials, grass has tiny triangular patterns, wood has organic grain, soft diffuse shadows, collectible handcrafted diorama quality, editorial beautiful composition, creamy sage green cyan sky muted peach warm sand palette. Bottom corners sea with little scallop shells and a starfish. No characters, no people, no lettering, no logo, no official game assets, no strong outlines, no red-gold style, no plastic gloss, no watermark. Beautiful finished game key art, sophisticated and healing, not children's drawing.

## 使用说明

当前邀请图卡的离线备用数据放在独立的 `island-invitation-fallback.js` 中，仅在打开分享且原图失败或离线时加载，避免增加首屏 HTML 体积。正式部署时，同时上传 `island-share-hd.jpg` 作为公开分享图片，以及 `island-invitation-hd.jpg` 用于微信长按保存。两张图片均复用现有高清素材，没有重新生成角色或场景。运行 `scripts/build-share-assets.cjs` 可从当前配置重建图片、静态 OG 和备用邀请图脚本；二维码使用 macOS Core Image 标准编码，并通过 Vision 解码验证。没有公众号签名服务时，分享采用图片邀请卡。照片可在 `CONFIG.photos` 逐项替换。

- `island-round.woff2`：从原 TTF 转换的完整压缩字库，优先供网页加载；保留全部字符映射和字体许可。
- `island-round.ttf`：ZCOOL KuaiLe 完整字库，来自 Google Fonts 官方仓库，替代原有内嵌子集；许可见 `island-font-OFL.txt`。

- `island-bgm.mp3`：用户提供的 Nintendo Sound Team - Welcome Horizons，点击跳转请柬正文时开始循环播放；音乐按钮可随时暂停或继续，手动暂停后不会因再次跳转而重启。
