// 会话标记由 main.js 完成开场后写入；这里仅读取，连续访问时直接跳过欢迎层。
// 存储访问失败则保持默认开场，后续的独立超时仍会关闭遮罩。
/* 预加载仅本次浏览器会话首次展示；存储被禁用时仍可正常打开。 */ try {
  if (sessionStorage.getItem("buji-visited"))
    document.getElementById("loader").hidden = true;
} catch (e) {}
// 独立于 main.js 的退场保险：即使后续交互脚本未加载，4.5 秒后也开始撤下欢迎层。
setTimeout(() => {
  const l = document.getElementById("loader");
  // 先播放 CSS 淡出，再在 750ms 后设 hidden，保留过渡效果并移除遮罩。
  l.classList.add("hidden-loader");
  setTimeout(() => (l.hidden = true), 750);
}, 4500);
