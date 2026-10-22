# 当前高清素材的分享图更新

- 需求：OG 元信息和点击分享后的邀请图卡统一使用当前最新素材。
- 素材：直接复用 `assets/island-cover-hd.png`，不另生成角色，不改变新人和背景。
- 版式：沿用草绿、奶油、木质牌及本地 ZCOOL KuaiLe 字体；保留新人姓名、婚期、酒店及二维码。
- 分享图：`assets/island-share-hd.jpg`，1200×1200；邀请图卡：`assets/island-invitation-hd.jpg`，1080×1620。
- 元信息：同步标题、简介、图片地址、图片尺寸、图片说明及 HTTPS 图片地址；增加中文地区和站点名。
- 缓存：使用新文件名，不复用旧无人岛分享图片 URL；静态 OG 无需执行 JavaScript 即可读取。
- 兜底：HTML 内嵌与公开邀请卡使用同一张图片，下载按钮同样使用当前图卡。
- 重建：`scripts/build-share-assets.cjs` 读取 CONFIG、用 Playwright 导出 HTML/CSS 版式；`scripts/share-qr.swift` 编码并解码校验当前请柬网址。
- 检查：已目视检查两张最终图片，文字、人物完整，无溢出；最终 JPEG 中二维码解码通过。
- 页面验证：390px / DPR 3 下分享弹窗加载 1080×1620 新图；下载按钮与新邀请卡字节一致；图片请求失败及离线打开均使用同一新图；禁用 JavaScript 时 OG 标题和图片仍为最新值，页面无脚本错误。
