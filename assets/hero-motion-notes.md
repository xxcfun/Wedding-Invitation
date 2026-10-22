# 高清封面与连续局部动画素材

## 来源与画质

- 编辑目标：用户原封面 `assets/island-cover.jpg`，1254 × 1254。
- 工具：内置 ImageGen，`precise-object-edit`；未使用 CLI/API 回退。
- 无损输出：`assets/island-cover-hd.png`，1254 × 1254。
- 网页输出：`assets/island-cover-hd.webp`，1254 × 1254，cwebp quality 96、method 6；未缩放。
- 提示词要求 2048 × 2048 或以上，但工具实际沿用输入的 1254 × 1254。保留原生输出，不把插值放大描述为新增细节。
- 旧 4 × 2 帧图每帧 443 × 443。新单图边长是原帧的 2.83 倍、像素数约 8 倍。人物、花拱和背景维持稳定，不通过切换低分辨率整幅画面制造动作。
- 原封面、旧帧图、旧分层图均保留。

## 姿势与建议形变区域

输出为单张完整画面：新郎画面右侧手臂自然举起，连续肩部、上臂、肘部、西装袖、手腕与张开的手掌；左侧手臂仍牵着新娘。新娘原有手捧花和其他场景保留。连续局部网格形变产生小幅挥手与捧花摆动，不再轮换不同的整幅画面。

以下是目视量取的局部控制点，坐标原点为左上，UV = 像素 / 1254；实际网格过渡范围应通过手机截图确认：

| 控制点 | 像素约值 | UV |
| --- | --- | --- |
| 新郎画面右侧肩部固定点 | (810, 588) | (0.646, 0.469) |
| 肘部旋转点 | (880, 591) | (0.702, 0.471) |
| 手腕中心 | (936, 539) | (0.746, 0.430) |
| 手掌中心 | (955, 503) | (0.762, 0.401) |
| 手部最高边缘 | (951, 461) | (0.758, 0.368) |
| 捧花花冠中心 | (434, 675) | (0.346, 0.538) |
| 捧花握持处/旋转点 | (469, 726) | (0.374, 0.579) |
| 捧花茎部下端 | (475, 766) | (0.379, 0.611) |

挥手建议以肘部为轴不超过 ±7°，肩部固定；手臂影响区域约 x=0.63–0.80、y=0.36–0.51。捧花建议围绕握持处轻摆，花冠主要影响区域约 x=0.28–0.41、y=0.49–0.64。边界应平滑衰减，保持脸部、身体、牵手及背景不动。

## 连续动画实现

- `hero-motion.js` 使用 WebGL 1 和一次上传的 80×80 网格；每帧仅更新角度，始终采样同一张完整高清纹理，不拆分手臂。
- 手臂上限 ±7°、捧花上限 ±4°。捧花上方增加固定区域，防止形变影响新娘眼睛与额发。
- 滚动目标经时间插值，最大追赶速度限制为每秒 0.8 个完整进度，避免快速甩动时跨越多个挥手相位；停下后收敛并停止渲染。
- 画布按实际设备像素比设置，最高 DPR 3 且不超过原图像素；390px/DPR 3 时为 1170×1170，480px 时为 1254×1254。
- 离屏、后台、手动暂停或系统减少动态时停止更新；图形上下文丢失时展示同一高清静图，恢复后重建纹理。高清文件下载失败时回落原封面。

## 验证

本机 Chrome、390×844、DPR 3：画布 1170×1170，不请求旧帧图。160 帧往返滚动检查中连续绘制 156 帧，帧间隔中位数约 16.7ms、95 分位约 16.8ms；这是桌面浏览器模拟结果。暂停、减少动态、离屏停止、上下文丢失后静图回退及恢复、WebGL 不可用、高清资源失败均通过。截图像素对比确认新郎面部、新娘眼睛、新郎身体不随局部动作发生变化；320、375、480px、横屏与桌面无横向溢出。

## 最终生成提示词

```text
Use case: precise-object-edit.
Asset type: one high-resolution square hero illustration for an existing mobile wedding invitation.
Input image: /Users/xxcfun/Project/weddingInvitation/assets/island-cover.jpg is the edit target. It is the original full-resolution cover, not an animation atlas.
Primary request: Produce ONE complete square image at 2048 x 2048 pixels or higher, with crisp high-quality original detail. Preserve the exact original framing and scene, identities, cheerful faces, clothes, bride's bouquet and hand, couple holding hands, floral arch, side characters, sea, sky, trees, flowers, lighting, colors, materials and camera. Change ONLY the groom's arm on the RIGHT SIDE OF THE IMAGE: naturally raise it into a friendly greeting, bend the elbow, open the hand with visible fingers. Make a complete anatomically connected shoulder-to-upper-arm-to-elbow-to-sleeve-to-wrist-to-open-palm chain, with continuous dark blue suit fabric. The shoulder must remain firmly connected to the existing body. The upper arm extends gently toward the right, elbow sits about (0.72, 0.51), forearm goes upward, open palm around (0.75, 0.39), leaving the face fully unobscured. His left-side arm continues holding the bride's hand exactly as in the original. This raised greeting pose will be gently animated later by small ±7 degree elbow motion, so keep the elbow and wrist readable and do not stretch or disconnect any limb.
Composition/framing: exactly the same square full scene; no crop and no camera movement. ONE SINGLE image, NOT a sprite sheet, NOT an atlas, NOT a sequence, NOT multiple panels.
Constraints: preserve the bride's existing original bouquet size, position and flower arrangement, preserve both original faces and eyes, preserve all background composition. No new objects. No lettering, text, logo, watermark, border or grid. Retain fine crisp hair strands, lace, petals, floral detail and suit texture. Do not blur, downsample, simplify or upscale a low-resolution sprite.
```
