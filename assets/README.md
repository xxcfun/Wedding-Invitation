# 小岛请柬素材

本次使用内置 ImageGen 工具生成原创婚礼岛屿插画，没有使用游戏官方角色、商标、贴图或音频。地图、贴纸和结构图标为源码中的原创 SVG。相册的六个位置是可替换的原创插画占位。

- `island-hero.png`：ImageGen 原始输出。
- `island-hero.webp`：用于页面内嵌的 1024px WebP。
- `island-share.jpg`：600×600 微信分享封面，使用同一岛屿插画和 HTML 绘制的木质标题牌。
- `island-font-OFL.txt`：ZCOOL KuaiLe 标题字体的 SIL OFL 许可；HTML 同时保留许可文本。

## 最终生成提示词

模式：内置 ImageGen，生成原创位图；未使用 API / CLI 回退。

Use case: stylized-concept. Asset type: hero illustration for an original mobile island wedding invitation website. Create a premium, richly detailed cozy life-simulation videogame 3D illustration, square composition, no text anywhere. A tiny idyllic wedding island seen from a slightly elevated isometric camera with a soft orthographic lens. Center of composition: curved cream wooden wedding arch covered in white daisies, small peach and pale yellow flowers and greenery, two little empty cream chairs and a tiny table, curving stepping stone path across a lush sculpted rounded grassy island, cream beaches, a wooden dock extending toward foreground turquoise sea, lily-like flowers, rounded bushes, distinctive low-poly round trees on left and right, white picket fences, small terracotta pots and a watering can. A tiny pastel coral mailbox, pale teal and apricot balloons, miniature fabric pennant garlands. Island fills lower 80% of image, very pale sky blue with fluffy clouds fills upper 20%. Soft warm daylight from top left, ambient occlusion, lush matte tactile materials, grass has tiny triangular patterns, wood has organic grain, soft diffuse shadows, collectible handcrafted diorama quality, editorial beautiful composition, creamy sage green cyan sky muted peach warm sand palette. Bottom corners sea with little scallop shells and a starfish. No characters, no people, no lettering, no logo, no official game assets, no strong outlines, no red-gold style, no plastic gloss, no watermark. Beautiful finished game key art, sophisticated and healing, not children's drawing.

## 使用说明

页面基础素材已经内嵌；部署页面只需 `index.html`。微信抓取缩略图需要另外上传 `island-share.jpg` 并填写公网 HTTPS URL。音乐需自行准备，照片可在 `CONFIG.photos` 逐项替换。项目中原有的其他素材为旧版保留文件，当前页面未使用。
