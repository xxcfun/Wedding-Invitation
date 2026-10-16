/* 预加载仅本次浏览器会话首次展示；存储被禁用时仍可正常打开。 */ try {
  if (sessionStorage.getItem("buji-visited"))
    document.getElementById("loader").hidden = true;
} catch (e) {}
setTimeout(() => {
  const l = document.getElementById("loader");
  l.classList.add("hidden-loader");
  setTimeout(() => (l.hidden = true), 750);
}, 4500);
