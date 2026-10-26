/* =====================================================================
   中文可修改资料区：正式使用前优先修改本区。日期与时刻均使用北京时间。
   静态部署：请同时上传 HTML、CSS、JS 和 assets；不依赖 Tailwind CDN。
   照片可以填写 HTTPS URL、同目录路径或 data:image/... 内嵌图片。
   姓名与婚期已填写真实信息；流程时刻可按实际情况修改。
===================================================================== */
const CONFIG = {
  groom: "刁勇辰", // 可修改：新郎姓名
  bride: "李汝静", // 可修改：新娘姓名
  date: "2026-11-04T11:28:00+08:00", // 可修改：婚礼日期及开始时间，保留 +08:00 时区
  timeLabel: "中午11点28分", // 可修改：时间展示文案；留空时自动显示婚期中的小时和分钟
  lunarDate: "丙午年九月廿六", // 可修改：农历日期；更换婚期时请同步修改
  venue: "海岱禧合酒店·十里红妆厅", // 可修改：婚宴地点
  venueFull: "海岱禧合婚礼艺术中心", // 可修改：酒店完整名称
  address: "山东省潍坊市青州市王府街道后营子街808号（西苑小学对面）· 十里红妆厅", // 可修改：完整地址
  longitude: 118.457025,
  latitude: 36.694075, // 可修改：经纬度；本示例按 GCJ-02 处理，高德/苹果使用该值，百度转换 BD-09
  wechat: {
    // 此接口为当前网页生成 JS-SDK 签名；AppID 由接口返回，无需在前端重复填写。
    signatureEndpoint: "https://wxapi.xxcfun.cn/wechat-signature.php", // 仅公开签名接口；公众号密钥保留在服务器
  },
  audio: "assets/island-bgm-lite.mp3", // 背景音乐：默认自动播放，受浏览器限制时在首次交互后播放
  agenda: [
    {
      time: "11:00",
      title: "宾朋莅座",
      note: "亲朋相聚，静候幸福开场",
    },
    { time: "11:28", title: "吉时肇礼", note: "以爱之名，许下余生" },
    { time: "12:08", title: "喜筵开酌", note: "把祝福藏进每一次碰杯" },
    { time: "13:00", title: "华堂留影", note: "带着笑容，留下今日份合照" },
    { time: "14:00", title: "茶点叙欢", note: "一盏清茶，共叙欢喜时光" },
  ],
  photos: [
    // 六张婚照按上传顺序展示。
    {
      src: "assets/wedding-album-01.webp",
      title: "花海里的我们",
      icon: "flower",
      palette: "garden",
    },
    {
      src: "assets/wedding-album-02.webp",
      title: "花路与飞纱",
      icon: "shell",
      palette: "garden",
    },
    {
      src: "assets/wedding-album-03.webp",
      title: "晴日里的誓言",
      icon: "sun",
      palette: "garden",
    },
    {
      src: "assets/wedding-album-04.webp",
      title: "牵手，走向余生",
      icon: "heart",
      palette: "garden",
    },
    {
      src: "assets/wedding-album-05.webp",
      title: "把幸福举高高",
      icon: "rings",
      palette: "garden",
    },
    {
      src: "assets/wedding-album-06.webp",
      title: "阳光下的我们",
      icon: "camera",
      palette: "garden",
    },
  ],
  wishes: {
    // 留空时使用同源 /api/wishes；本地预览可用 ?wishesApi 覆盖仅回环地址。
    endpoint: "https://wxapi.xxcfun.cn/api/wishes",
  },
  sampleWishes: [
    // 根据角色特点创作的婚礼祝福，并非游戏原台词。
    {
      name: "西施惠",
      text: "各位居民请注意，今天岛上有一件特别幸福的事！恭喜两位结婚！那个……光是看着你们，我也忍不住笑起来了呢！",
    },
    {
      name: "狸克",
      text: "两位的新生活计划，今天正式开工了呢！祝你们把小家经营得暖暖的，幸福的利息每天都在增加，是说！",
    },
    {
      name: "傅达",
      text: "呼呼！如此珍贵的幸福时刻，真想好好珍藏起来呢。愿两位共同发现生活中的美好，让回忆的馆藏越来越丰富！",
    },
  ],
  share: {
    title: "叮～有一封布吉岛来信📩",
    description:
      "2026年11月4日 · 中午11点28分｜诚邀您相聚青州海岱禧合酒店·十里红妆厅，见证我们的幸福时刻",
    image: "https://wedding.xxcfun.cn/assets/island-share-hd.jpg", // 当前高清封面制作的 1200px 分享图；用于网页预览元信息
    link: "https://wedding.xxcfun.cn", // 可修改：线上请柬网址，邀请卡二维码指向该地址
    poster: "assets/island-invitation-hd.jpg", // 当前高清封面制作的 1080×1620 邀请图卡；修改资料后运行 scripts/build-share-assets.cjs 重建
  },
};
/* =====================================================================
   以下为交互逻辑。所有访客文本均用 textContent 创建，防止 HTML 注入。
===================================================================== */
(() => {
  "use strict";
  // DOM 查询约定：$ 取单个节点，$$ 转成数组，便于统一使用数组遍历方法。
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  // 统一封装本机存储：隐私模式、配额不足或旧数据格式错误时，页面仍能继续工作。
  const storage = {
    get(key, fallback) {
      try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
  // 从 index.html 的 SVG symbol 图标库引用图案；使用 SVG 命名空间创建节点。
  const icon = (name, cls = "icon") => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    el.setAttribute("class", cls);
    el.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(el.namespaceURI, "use");
    use.setAttribute("href", "#i-" + name);
    el.append(use);
    return el;
  };
  // 动态文本统一写入 textContent；访客留言等输入不会被解析为 HTML。
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  // 同时识别手机 UA 和使用桌面 UA 的触屏 iPad，供导航入口选择使用。
  const isMobile = () =>
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  // 动效总开关由系统偏好与页面手动暂停共同决定，任一要求暂停即停止装饰动画。
  const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches,
    manualPause = false;
  const motionPaused = () => reduced || manualPause;
  let toastTimer;
  // 复用同一个短提示节点；新提示会重置隐藏计时，避免旧计时提前关闭新消息。
  function toast(text) {
    $("#toast").textContent = text;
    $("#toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3400);
  }
  // 将配置婚期解析为绝对时间；显示部分强制使用北京时间，不随访客设备时区变化。
  const weddingDate = new Date(CONFIG.date),
    validDate = Number.isFinite(weddingDate.getTime());
  const parts = validDate
    ? new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(weddingDate)
    : [];
  const part = (t) => parts.find((p) => p.type === t)?.value || "";
  // 今日播报使用打开页面时的北京时间，与下方婚礼日期分别计算。
  const todayParts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "long",
  }).formatToParts(new Date());
  const todayPart = (type) =>
    todayParts.find((p) => p.type === type)?.value || "";
  $("#broadcast-today").textContent =
    `${todayPart("year")}年${todayPart("month")}月${todayPart("day")}日，${todayPart("weekday")}`;
  const broadcastWeddingDate = $("#broadcast-wedding-date");
  if (broadcastWeddingDate) {
    broadcastWeddingDate.textContent = validDate
      ? `${part("year")}年${Number(part("month"))}月${Number(part("day"))}日，${part("weekday")}`
      : "婚期敬请期待";
  }
  const shortDate = validDate
    ? `${part("year")}.${part("month")}.${part("day")}`
    : "婚期敬请期待";
  const dateWeek = validDate
    ? `${part("weekday")} · ${CONFIG.timeLabel || `${part("hour")}:${part("minute")}`}`
    : "时间待定";
  // 公历、时间与农历分别展示，避免在手机端挤成一行。
  $$("[data-lunar]").forEach((n) => {
    n.textContent = CONFIG.lunarDate ? `农历${CONFIG.lunarDate}` : "";
    n.hidden = !CONFIG.lunarDate;
  });
  // HTML 的 data-bind 值对应 CONFIG 的字段名；集中填充姓名、酒店、地址等重复内容。
  $$("[data-bind]").forEach(
    (n) => (n.textContent = CONFIG[n.dataset.bind] || ""),
  );
  // 同一婚期按 data-date 选择短日期、星期时间或带“开始”的完整文案。
  $$("[data-date]").forEach(
    (n) =>
      (n.textContent =
        n.dataset.date === "short"
          ? shortDate
          : n.dataset.date === "week"
            ? dateWeek
            : dateWeek + " 开始"),
  );
  document.title = CONFIG.share.title;
  // 按配置顺序创建婚礼流程；逐项设置延迟，让滚动入场形成轻微错落。
  CONFIG.agenda.forEach((s, i) => {
    const task = el("li", "task reveal");
    task.style.setProperty("--delay", i * 45 + "ms");
    const check = el("span", "task-check");
    check.append(icon("check"));
    const body = el("div", "task-body");
    body.append(el("h3", "task-name", s.title), el("p", "task-note", s.note));
    task.append(check, body, el("span", "task-time", s.time));
    $("#task-list").append(task);
  });
  // 原创静态位置示意图，仅用于装饰和地标阅读，不宣称为精确街区比例。
  // 将动态酒店名插入 SVG 字符串前转义 XML 特殊字符，避免破坏图片结构。
  const escapeXML = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
  const mapSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 370"><defs><pattern id="wave" width="40" height="25" patternUnits="userSpaceOnUse"><path d="M0 13q10-6 20 0t20 0" fill="none" stroke="#fff" opacity=".25"/></pattern><pattern id="grass" width="32" height="30" patternUnits="userSpaceOnUse"><path d="m5 8 3-5 3 5m12 17 3-5 3 5" fill="none" stroke="#9bbd7e" opacity=".3"/><circle cx="16" cy="17" r="1" fill="#faf5d5"/></pattern><filter id="sh"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#758f5a" flood-opacity=".22"/></filter></defs><rect width="440" height="370" fill="#b9ddcf"/><rect width="440" height="370" fill="url(#wave)"/><path d="M-10 50Q45 20 85 42T187 21 304 35 445 20V322Q370 339 320 321T210 341 106 320 0 337Z" fill="#ebdeb2"/><path d="M-10 39Q45 9 85 31T187 10 304 24 445 9V305Q370 322 320 304T210 324 106 303 0 320Z" fill="#c7dba0"/><path d="M-10 39Q45 9 85 31T187 10 304 24 445 9V305Q370 322 320 304T210 324 106 303 0 320Z" fill="url(#grass)"/><path d="M220 15V312" stroke="#b4bd94" stroke-width="33"/><path d="M220 15V312" stroke="#fbf3d8" stroke-width="29"/><path d="M-10 207H450" stroke="#b4bd94" stroke-width="45"/><path d="M-10 207H450" stroke="#fbf3d8" stroke-width="41"/><path d="M-10 207H440" stroke="#d8d5b2" stroke-width="2" stroke-dasharray="8 9"/><g fill="#91b57d" filter="url(#sh)"><circle cx="39" cy="85" r="22"/><circle cx="76" cy="55" r="18"/><circle cx="383" cy="48" r="21"/><circle cx="404" cy="92" r="18"/><circle cx="46" cy="267" r="20"/><circle cx="384" cy="280" r="25"/></g><g fill="#d6e3b3"><circle cx="33" cy="78" r="12"/><circle cx="71" cy="50" r="11"/><circle cx="377" cy="41" r="12"/><circle cx="378" cy="273" r="13"/></g><g filter="url(#sh)"><rect x="266" y="104" width="101" height="58" rx="9" fill="#faf0d1"/><path d="m253 108 63-36 64 36Z" fill="#be9471"/><path d="m258 105 58-32 58 32Z" fill="#d6b18b"/><rect x="306" y="131" width="21" height="31" rx="10" fill="#9eb295"/><g fill="#b7cbbc"><rect x="278" y="123" width="14" height="14" rx="3"/><rect x="341" y="123" width="14" height="14" rx="3"/></g></g><path d="M315 160v25" stroke="#fcf5dc" stroke-width="16"/><g filter="url(#sh)"><rect x="98" y="247" width="81" height="37" rx="6" fill="#fff3d1"/><path d="m90 248 49-23 49 23Z" fill="#8faea1"/><g fill="#b3c9b6"><rect x="108" y="257" width="12" height="13" rx="2"/><rect x="133" y="257" width="12" height="13" rx="2"/><rect x="157" y="257" width="12" height="13" rx="2"/></g></g><g font-family="sans-serif" text-anchor="middle" fill="#506344"><text x="138" y="303" font-size="13">西苑小学</text><text x="95" y="212" font-size="13">后 营 子 街</text><text x="316" y="65" font-size="13" font-weight="bold">${escapeXML(CONFIG.venue)}</text><text x="355" y="233" font-size="11">808号</text></g><g transform="translate(306 108)" filter="url(#sh)"><path d="M0 17v-48" stroke="#795f42" stroke-width="3"/><path d="M2-31q15-7 29 0v21q-14-7-29 0" fill="#da8d78"/><path d="m13-24 3 3 3-3" stroke="#fff4d9" fill="none" stroke-width="2"/></g><g transform="translate(33 28)" font-family="sans-serif" text-anchor="middle" fill="#64805e"><text y="0" font-size="11">北</text><path d="m0 8-5 13h10Z" fill="#64805e"/></g><g fill="#fff5de"><circle cx="51" cy="162" r="4"/><circle cx="60" cy="167" r="4"/><circle cx="59" cy="157" r="4"/><circle cx="371" cy="168" r="4"/><circle cx="380" cy="163" r="4"/><circle cx="381" cy="173" r="4"/></g><g fill="#e4bd74"><circle cx="57" cy="162" r="3"/><circle cx="377" cy="168" r="3"/></g></svg>`;
  // 把自包含 SVG 转成可赋给 img.src 的 data URL，无需额外请求图片服务。
  const svgURL = (svg) =>
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  $("#location-map").src = svgURL(mapSVG);
  // 原创回忆插画占位：替换 src 后，宫格和大图自动使用真实婚照。
  const placeholderPalettes = {
    sea: ["#dbeee9", "#a4cfbc", "#84b4a5"],
    garden: ["#e7ead7", "#b3c18e", "#8da775"],
    peach: ["#f0dfd1", "#c7ceaa", "#aaa975"],
    sunset: ["#f4d9b9", "#d5be9c", "#b1af83"],
    sage: ["#e2e7d2", "#b2c5a1", "#83a37c"],
    cream: ["#f6ebce", "#c4cdac", "#9bad84"],
  };
  // 根据照片主题生成本地插画占位；未配置图片或加载失败时都使用同一套降级方案。
  function photoPlaceholder(p, i) {
    const c = placeholderPalettes[p.palette] || placeholderPalettes.sea;
    return svgURL(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480"><defs><linearGradient id="b" x2="0" y2="1"><stop stop-color="${c[0]}"/><stop offset="1" stop-color="#fff6df"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#6c855b" flood-opacity=".17"/></filter></defs><rect width="400" height="480" fill="url(#b)"/><circle cx="300" cy="83" r="30" fill="#fff4c7"/><path d="M-20 311Q80 245 180 293T420 277V480H0Z" fill="${c[1]}"/><path d="M-20 369Q110 308 240 350T420 334V480H0Z" fill="${c[2]}" opacity=".52"/><g fill="#fffbec" opacity=".7"><rect x="33" y="88" width="98" height="17" rx="9"/><circle cx="75" cy="84" r="18"/><circle cx="97" cy="88" r="13"/></g><g filter="url(#s)"><path d="M124 320V213a76 76 0 0 1 152 0v107" fill="none" stroke="#fdf4d6" stroke-width="15"/><path d="M133 319V214a67 67 0 0 1 134 0v105" fill="none" stroke="#d3c5a7" stroke-width="2"/><g fill="#7fa37b"><ellipse cx="136" cy="190" rx="13" ry="27" transform="rotate(-40 136 190)"/><ellipse cx="154" cy="155" rx="13" ry="27" transform="rotate(15 154 155)"/><ellipse cx="257" cy="170" rx="14" ry="27" transform="rotate(40 257 170)"/><ellipse cx="274" cy="210" rx="14" ry="27"/></g><g fill="#fff9e7"><circle cx="144" cy="171" r="16"/><circle cx="180" cy="143" r="14"/><circle cx="242" cy="153" r="16"/><circle cx="271" cy="192" r="12"/></g><g fill="#dfbd80"><circle cx="144" cy="171" r="6"/><circle cx="180" cy="143" r="5"/><circle cx="242" cy="153" r="6"/><circle cx="271" cy="192" r="5"/></g><path d="M175 250c-18-27-51 0-22 24l22 18 23-18c29-24-5-51-23-24Z" fill="#e8ad96" transform="translate(25 -5)"/></g><g fill="#fff9e8"><circle cx="71" cy="350" r="9"/><circle cx="59" cy="359" r="9"/><circle cx="72" cy="368" r="9"/><circle cx="84" cy="358" r="9"/></g><circle cx="72" cy="359" r="7" fill="#e0bd79"/><path d="M290 340q10-40 35-25t-13 35Z" fill="#7d9e74"/><g fill="#fff9e7" opacity=".7"><circle cx="50" cy="420" r="2"/><circle cx="330" cy="393" r="3"/><circle cx="280" cy="430" r="2"/></g><rect x="118" y="402" width="164" height="32" rx="16" fill="#fff8e9bb"/><text x="200" y="423" text-anchor="middle" font-family="sans-serif" font-size="13" letter-spacing="3" fill="#627455">回忆照片</text></svg>`,
    );
  }
  // 预先规范化照片数据；placeholder 标记同时影响卡片和大图中的无障碍说明。
  const photos = CONFIG.photos.map((p, i) => ({
    ...p,
    src: p.src || photoPlaceholder(p, i),
    placeholder: !p.src,
  }));
  // 构建懒加载相册卡片，并绑定对应索引；错误处理只触发一次，避免占位图失败时循环赋值。
  photos.forEach((p, i) => {
    const btn = el("button", "photo-card press reveal");
    btn.type = "button";
    btn.setAttribute(
      "aria-label",
      `放大照片：${p.title}${p.placeholder ? "（插画占位）" : ""}`,
    );
    const img = el("img");
    img.src = p.src;
    img.alt = p.placeholder ? `${p.title}，待替换的原创婚礼插画` : p.title;
    img.draggable = false;
    img.loading = "lazy";
    img.width = 320;
    img.height = 360;
    img.addEventListener(
      "error",
      () => {
        img.src = photoPlaceholder(p, i);
      },
      { once: true },
    );
    btn.append(
      img,
      el("span", "photo-label", p.title),
    );
    btn.addEventListener("click", () => openPhoto(i));
    $("#photo-grid").append(btn);
  });
  // 限制婚照的常规保存操作；保留相册点击、滑动和键盘浏览。
  const protectedPhotoSelector =
    ".photo-card, #lightbox-image, .wedding-portrait-image";
  for (const eventName of ["contextmenu", "dragstart"]) {
    document.addEventListener(eventName, (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(protectedPhotoSelector)
      ) {
        event.preventDefault();
      }
    });
  }
  document
    .querySelectorAll("#lightbox-image, .wedding-portrait-image")
    .forEach((img) => {
      img.draggable = false;
    });
  // 微信使用内置地图位置页；其他手机浏览器保留高德原生导航。
  const { longitude: lng, latitude: lat } = CONFIG;
  const name = encodeURIComponent(CONFIG.venueFull);
  const inWeChat = /MicroMessenger/i.test(navigator.userAgent);
  // 签名必须与当前网页地址一致；保留微信分享附加的查询参数及原始编码，只移除 hash。
  // 在初始化时保存，避免访客随后点击页内锚点影响本次签名使用的地址。
  const wechatPageURL = location.href.split("#")[0];
  // idle：未开始；loading：请求签名或等待 SDK；ready：鉴权完成；error：可点击重试。
  let wechatMapState = "idle";
  // 复用正在加载的 SDK，避免多个调用同时插入相同脚本。
  let wechatSDKPromise;
  function loadWeChatSDK() {
    if (window.wx?.config) return Promise.resolve(window.wx);
    if (wechatSDKPromise) return wechatSDKPromise;
    wechatSDKPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      // 网络一直没有响应时也要结束等待，让下一次点击有机会重试。
      const timer = setTimeout(() => finish(new Error("sdk_timeout")), 12000);
      function finish(error) {
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if (error) {
          // 清理失败的脚本节点；重试时重新插入官方 SDK。
          script.remove();
          reject(error);
        } else resolve(window.wx);
      }
      script.src = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js";
      script.async = true;
      script.onload = () =>
        finish(window.wx?.config ? null : new Error("sdk_missing"));
      script.onerror = () => finish(new Error("sdk_load_error"));
      document.head.append(script);
    }).catch((error) => {
      // 不缓存失败的 Promise，否则后续调用只会重复收到同一个错误。
      wechatSDKPromise = null;
      throw error;
    });
    return wechatSDKPromise;
  }
  async function prepareWeChatMap() {
    // 初始化过程中重复点击不再发请求；已经鉴权成功则直接复用。
    if (wechatMapState === "loading" || wechatMapState === "ready") return;
    wechatMapState = "loading";
    try {
      if (!/^https?:$/.test(location.protocol))
        throw new Error("https_required");
      const endpoint = new URL(CONFIG.wechat.signatureEndpoint);
      // 用查询参数传完整网页地址，编码交给 URL API；签名计算及公众号密钥均留在服务端。
      endpoint.searchParams.set("url", wechatPageURL);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      let signature;
      try {
        const response = await fetch(endpoint.href, {
          signal: controller.signal,
          // 跨域签名服务无需登录 Cookie；每次初始化重新请求，避免复用过期签名。
          credentials: "omit",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("signature_request_failed");
        signature = await response.json();
      } finally {
        // 无论成功或失败，都释放请求超时计时器。
        clearTimeout(timer);
      }
      // 先检查必要字段，避免把错误响应当成签名继续提交给微信。
      if (
        !signature.appId ||
        !signature.nonceStr ||
        !signature.timestamp ||
        !signature.signature
      )
        throw new Error("signature_invalid");
      const wx = await loadWeChatSDK();
      await new Promise((resolve, reject) => {
        // SDK 文件加载成功不等于鉴权成功；必须等微信触发 ready 后才能打开地图。
        const timer = setTimeout(
          () => reject(new Error("config_timeout")),
          12000,
        );
        wx.ready(() => {
          clearTimeout(timer);
          resolve();
        });
        wx.error(() => {
          clearTimeout(timer);
          reject(new Error("config_failed"));
        });
        wx.config({
          debug: false,
          appId: signature.appId,
          timestamp: signature.timestamp,
          nonceStr: signature.nonceStr,
          signature: signature.signature,
          // 地图和分享共用同一次签名鉴权；分享接口需公众号开通相应权限。
          jsApiList: [
            "openLocation",
            "updateAppMessageShareData",
            "updateTimelineShareData",
          ],
        });
      });
      wechatMapState = "ready";
      // 在用户打开分享菜单前设置；单个分享接口失败不影响酒店导航。
      const shareData = {
        title: CONFIG.share.title,
        desc: CONFIG.share.description,
        link: CONFIG.share.link,
        imgUrl: CONFIG.share.image,
      };
      for (const api of [
        "updateAppMessageShareData",
        "updateTimelineShareData",
      ]) {
        try {
          if (typeof wx[api] === "function") wx[api]({ ...shareData });
        } catch (error) {
          console.warn("微信分享设置失败：", api, error);
        }
      }
    } catch {
      // 后台初始化失败时不打断阅读；访客点击导航时再显示提示并发起重试。
      wechatMapState = "error";
    }
  }
  // 提前完成签名和鉴权，让正式点击时可以直接调用地图；其他浏览器不请求微信服务。
  if (inWeChat && isMobile()) void prepareWeChatMap();
  // iPad 桌面模式可能使用 Macintosh UA，同时检查触摸能力以识别 iPad。
  const isiOS =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  // 高德的 dev=0 表示传入的已是 GCJ-02 坐标，不再进行 GPS 坐标转换。
  const amapAppURL = `${isiOS ? "iosamap" : "androidamap"}://navi?sourceApplication=bujiWedding&poiname=${name}&lat=${lat}&lon=${lng}&dev=0&style=2`;
  $$("[data-navigate]").forEach((link) => {
    link.href = amapAppURL;
    link.removeAttribute("target");
    link.removeAttribute("rel");
    link.addEventListener("click", (event) => {
      if (!isMobile()) {
        event.preventDefault();
        toast("请在已安装高德地图的手机上打开请柬进行导航");
        return;
      }
      if (inWeChat) {
        // 阻止默认的高德 Scheme 跳转，改由微信 SDK 打开位置页。
        event.preventDefault();
        if (wechatMapState !== "ready") {
          const failed = wechatMapState === "error";
          void prepareWeChatMap();
          toast(
            failed
              ? "地图暂未连接，正在重试；也可在地图中搜索酒店名称"
              : "地图正在准备，请稍后再点一次导航前往",
          );
          // 不在异步初始化结束后自动打开；让访客再次点击，保留明确的用户操作时机。
          return;
        }
        try {
          // 此处与点击同步执行：先打开酒店位置页，后续由访客在微信中选择导航。
          window.wx.openLocation({
            // 微信位置页同样使用 GCJ-02；latitude 是纬度，longitude 是经度。
            latitude: lat,
            longitude: lng,
            name: CONFIG.venueFull,
            address: CONFIG.address,
            // 位置页初始缩放级别和附带的请柬链接。
            scale: 16,
            infoUrl: CONFIG.share.link,
            fail: () =>
              toast(
                "地图打开失败，可在地图中搜索酒店名称，或在浏览器打开请柬",
              ),
          });
        } catch {
          // 兼容 SDK 调用同步抛错的情况；异步失败由上面的 fail 回调处理。
          toast("地图打开失败，可在地图中搜索酒店名称，或在浏览器打开请柬");
        }
      }
      // 微信外由原生链接唤起高德；返回请柬后不执行延时跳转。
    });
  });
  // 弹窗共享状态：记录当前弹窗和打开前的焦点，保证切换弹窗与关闭后键盘导航连续。
  let lastFocus = null,
    activeDialog = null;
  // 打开新弹窗前关闭旧弹窗，页面同一时刻只维护一个活动对话框。
  function rememberFocus(dialog) {
    if (activeDialog && activeDialog !== dialog) closeActive();
    lastFocus = document.activeElement;
    activeDialog = dialog;
  }
  // 关闭弹窗后回到触发控件；preventScroll 避免恢复焦点时让长页面突然跳动。
  function restoreFocus() {
    activeDialog = null;
    lastFocus?.focus({ preventScroll: true });
  }
  // 倒计时仅更新变化的数字；不每秒向读屏器播报。
  function updateCountdown() {
    if (!validDate) {
      $("#count-title").textContent = "婚期，敬请期待";
      return;
    }
    // 每次根据当前时间重算剩余值，不靠递减计数，避免后台计时器节流造成累计误差。
    const delta = Math.max(0, weddingDate - Date.now()),
      seconds = Math.floor(delta / 1000);
    const values = [
      Math.floor(seconds / 86400),
      Math.floor(seconds / 3600) % 24,
      Math.floor(seconds / 60) % 60,
      seconds % 60,
    ];
    ["days", "hours", "minutes", "seconds"].forEach((id, i) => {
      const n = $("#" + id),
        value = i === 0 ? String(values[i]) : String(values[i]).padStart(2, "0");
      if (n.textContent !== value) {
        n.textContent = value;
        n.classList.remove("tick");
        if (!motionPaused()) {
          // 强制完成一次布局读取，确保重复添加 tick 类能重新触发数字弹跳动画。
          void n.offsetWidth;
          n.classList.add("tick");
        }
      }
    });
    if (delta === 0) {
      $("#count-title").textContent = "幸福故事，已经启程";
      $("#countdown-note").textContent = "谢谢你，来见证我们的幸福。";
    }
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);
  // 音频淡入淡出：快速切换时取消上一帧任务，保持最终意图一致。
  const audio = $("#bgm"),
    musicBtn = $("#music-btn");
  // musicWanted 保存最新播放意图；musicVersion 区分异步 play 请求，防止较早的结果覆盖较新的操作。
  let musicWanted = false,
    musicVersion = 0,
    volumeFrame = 0;
  audio.preload = "none";
  if (CONFIG.audio) audio.src = CONFIG.audio;
  // 同步按钮读屏状态和音乐装饰类；播放失败时也统一从这里恢复界面。
  function musicUI(on) {
    document.body.classList.toggle("music-on", on);
    musicBtn.setAttribute("aria-pressed", String(on));
    musicBtn.setAttribute("aria-label", on ? "暂停背景音乐" : "开启背景音乐");
  }
  // 从当前音量插值到目标值；先取消旧帧，快速开关音乐时不会同时运行两条渐变。
  function fadeVolume(target, ms, done) {
    cancelAnimationFrame(volumeFrame);
    const initial = audio.volume,
      start = performance.now();
    function frame(t) {
      const p = Math.min(1, (t - start) / ms);
      audio.volume = Math.max(0, Math.min(1, initial + (target - initial) * p));
      if (p < 1) volumeFrame = requestAnimationFrame(frame);
      else done?.();
    }
    volumeFrame = requestAnimationFrame(frame);
  }
  let autoMusicPending = false;
  // 播放成功或用户主动操作后解除自动重试监听，避免后续点击又把已暂停的音乐开启。
  function clearAutoMusic() {
    autoMusicPending = false;
    document.removeEventListener("click", retryAutoMusic);
    document.removeEventListener("touchend", retryAutoMusic);
    document.removeEventListener("keydown", retryAutoMusic);
    document.removeEventListener("WeixinJSBridgeReady", retryAutoMusic);
  }
  // 只在等待自动播放授权时重试；音乐按钮保留自身切换逻辑，键盘仅响应确认键。
  function retryAutoMusic(event) {
    if (!autoMusicPending || musicBtn.contains(event.target)) return;
    if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
    clearAutoMusic();
    setMusic(true, true);
  }
  // 浏览器拒绝自动播放后，等待首次点击、触摸、确认键或微信桥接就绪再尝试。
  function waitForMusicGesture() {
    autoMusicPending = true;
    document.addEventListener("click", retryAutoMusic);
    document.addEventListener("touchend", retryAutoMusic);
    document.addEventListener("keydown", retryAutoMusic);
    document.addEventListener("WeixinJSBridgeReady", retryAutoMusic);
  }
  // 统一处理自动播放与手动切换；automatic 决定失败时是否静默等待授权或提示访客。
  async function setMusic(on, automatic = false) {
    if (!CONFIG.audio) {
      if (!automatic) toast("海岛音乐还在路上，请先配置音频文件");
      return;
    }
    const version = ++musicVersion;
    musicWanted = on;
    if (musicWanted) {
      musicBtn.setAttribute("aria-busy", "true");
      cancelAnimationFrame(volumeFrame);
      audio.volume = 0;
      audio.muted = false;
      try {
        await audio.play();
        // 等待 play 完成期间可能发生新操作；过期结果不再更新 UI 或启动音量渐变。
        if (version !== musicVersion) return;
        clearAutoMusic();
        musicUI(true);
        fadeVolume(0.48, 1000);
        if (!automatic) toast("海风有了旋律");
      } catch (error) {
        if (version !== musicVersion) return;
        musicWanted = false;
        musicUI(false);
        if (automatic && error.name === "NotAllowedError") {
          waitForMusicGesture();
        } else if (!automatic) {
          toast("音乐暂时无法播放，请检查音频地址后重试");
        }
      } finally {
        if (version === musicVersion) musicBtn.removeAttribute("aria-busy");
      }
    } else {
      musicBtn.removeAttribute("aria-busy");
      musicUI(false);
      // 淡出完成才真正暂停；回调再次检查意图，避免中途重新开启时被旧操作暂停。
      fadeVolume(0, 650, () => {
        if (!musicWanted) {
          audio.pause();
          audio.muted = true;
        }
      });
    }
  }
  musicBtn.addEventListener("click", () => {
    clearAutoMusic();
    setMusic(!musicWanted);
  });
  audio.addEventListener("error", () => {
    clearAutoMusic();
    ++musicVersion;
    musicWanted = false;
    cancelAnimationFrame(volumeFrame);
    audio.pause();
    musicUI(false);
    musicBtn.removeAttribute("aria-busy");
    toast("音乐暂时无法播放，请检查音频文件");
  });
  // 自动音乐等待封面完成解码；慢网不设超时抢占带宽，主动点击仍立即响应。
  if (CONFIG.audio) {
    const initialMusicVersion = musicVersion;
    $("#hero-image")
      .decode()
      .catch(() => {})
      .then(() => {
        if (musicVersion === initialMusicVersion) setMusic(true, true);
      });
  }
  // 图片邀请分享：微信原生长按保存，不依赖公众号或微信 JS-SDK。
  const inWechat = /MicroMessenger/i.test(navigator.userAgent);
  const sharePoster = $("#share-poster");
  const shareSave = $("#share-save");
  // 分享不占用首屏带宽：点击打开时才请求原图；离线或原图请求失败时再读取备用脚本。
  let posterRequested = false;
  let posterFallbackPromise;
  function loadPosterFallback() {
    if (window.BUJI_INVITATION_POSTER)
      return Promise.resolve(window.BUJI_INVITATION_POSTER);
    if (posterFallbackPromise) return posterFallbackPromise;
    posterFallbackPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const timer = setTimeout(
        () => finish(new Error("poster_timeout")),
        12000,
      );
      function finish(error) {
        clearTimeout(timer);
        script.onload = script.onerror = null;
        script.remove();
        if (error) reject(error);
        else resolve(window.BUJI_INVITATION_POSTER);
      }
      script.src = "assets/island-invitation-fallback.js";
      script.onload = () =>
        finish(
          window.BUJI_INVITATION_POSTER ? null : new Error("poster_missing"),
        );
      script.onerror = () => finish(new Error("poster_load_failed"));
      document.head.append(script);
    }).catch((error) => {
      posterFallbackPromise = null;
      throw error;
    });
    return posterFallbackPromise;
  }
  async function usePosterFallback() {
    try {
      const source = await loadPosterFallback();
      sharePoster.src = source;
      shareSave.href = source;
    } catch {
      // 下次打开分享可重新尝试；不影响关闭弹窗或继续阅读请柬。
      posterRequested = false;
      toast("邀请图片暂未加载成功，请关闭后重新打开分享");
    }
  }
  function ensureSharePoster() {
    if (posterRequested) return;
    posterRequested = true;
    if (!/^https?:$/.test(location.protocol)) {
      void usePosterFallback();
      return;
    }
    const posterURL = new URL(CONFIG.share.poster, location.href).href;
    sharePoster.onerror = () => {
      // 切备用图片前移除错误回调，避免备用数据解码失败时形成循环。
      sharePoster.onerror = null;
      void usePosterFallback();
    };
    sharePoster.src = posterURL;
    shareSave.href = posterURL;
  }
  // 普通浏览器提供下载；微信直接长按图片，避免误认为按钮能唤起系统保存菜单。
  shareSave.hidden = inWechat;
  $("#share-instructions").textContent = inWechat
    ? "长按下方图片，把这份幸福邀请存进相册"
    : "保存下方邀请图片，把这份幸福邀请寄给朋友";
  $("#share-save-tip").textContent = inWechat
    ? "长按图片 · 选择「保存图片」"
    : "点击「保存邀请图片」，即可下载高清原图";
  $("#share-btn").onclick = () => {
    ensureSharePoster();
    openLayer($("#share-guide"), "#share-close");
    $("#share-guide").scrollTop = 0;
  };
  $("#share-close").onclick = () => closeLayer($("#share-guide"));
  $("#share-guide").addEventListener("click", (event) => {
    if (event.target === $("#share-guide")) closeLayer($("#share-guide"));
  });
  // 相册对话框与手势。不监听主页面滚轮，不改变原生页面滚动。
  let photoIndex = 0;
  const lightbox = $("#lightbox");
  // 只更新当前照片、标题与序号；切图始终复用同一个弹窗节点。
  function renderPhoto() {
    const p = photos[photoIndex];
    $("#lightbox-image").src = p.src;
    $("#lightbox-image").alt = p.placeholder
      ? `${p.title}（原创插画占位，待替换婚照）`
      : p.title;
    $("#lightbox-caption").textContent = p.title;
    $("#lightbox-count").textContent =
      `${photoIndex + 1} / ${photos.length}${p.placeholder ? " · 回忆插画" : ""}`;
  }
  $("#lightbox-image").addEventListener("error", () => {
    $("#lightbox-image").src = photoPlaceholder(photos[photoIndex], photoIndex);
  });
  // 先解除 hidden，再在下一帧添加 open 类，确保 CSS 能从初始状态执行入场过渡。
  function openLayer(layer, focusSelector) {
    rememberFocus(layer);
    layer.hidden = false;
    requestAnimationFrame(() => {
      if (activeDialog === layer && !layer.hidden) layer.classList.add("open");
    });
    layer
      .querySelector(focusSelector || "button")
      ?.focus({ preventScroll: true });
  }
  // 先移除入场类执行退场，过渡结束再隐藏；再次打开时旧的关闭计时不会误隐藏它。
  function closeLayer(layer) {
    if (layer.hidden) return;
    layer.classList.remove("open");
    restoreFocus();
    setTimeout(
      () => {
        if (!layer.classList.contains("open")) layer.hidden = true;
      },
      motionPaused() ? 0 : 220,
    );
  }
  // 先确定要展示的照片，再打开弹窗并把键盘焦点送到关闭按钮。
  function openPhoto(i) {
    photoIndex = i;
    renderPhoto();
    openLayer(lightbox, "#photo-close");
  }
  // 通过取模实现首尾循环；先加照片数量，避免向前切换时得到负索引。
  function changePhoto(delta) {
    photoIndex = (photoIndex + delta + photos.length) % photos.length;
    renderPhoto();
  }
  $("#photo-prev").onclick = () => changePhoto(-1);
  $("#photo-next").onclick = () => changePhoto(1);
  $("#photo-close").onclick = () => closeLayer(lightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLayer(lightbox);
  });
  // 只在相册弹窗内拦截滚轮，使用幅度阈值和 350ms 间隔防止触控板一次滑动连翻多张。
  let wheelStamp = 0;
  lightbox.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) > 12 && performance.now() - wheelStamp > 350) {
        wheelStamp = performance.now();
        changePhoto(e.deltaY > 0 ? 1 : -1);
      }
    },
    { passive: false },
  );
  // 只记录单指手势；结束时要求横向位移明显大于纵向位移，避免上下滑动被误判为切图。
  let touchStart = null;
  $("#lightbox-image").addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 1)
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      else touchStart = null;
    },
    { passive: true },
  );
  $("#lightbox-image").addEventListener(
    "touchend",
    (e) => {
      if (!touchStart || !e.changedTouches[0]) return;
      const dx = e.changedTouches[0].clientX - touchStart.x,
        dy = e.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3)
        changePhoto(dx < 0 ? 1 : -1);
      touchStart = null;
    },
    { passive: true },
  );
  // 公共留言以服务端为准；旧 buji-wishes 不自动上传。
  const wishForm = $("#wish-form"), nameInput = $("#guest-name"), textInput = $("#guest-wish");
  const sendButton = wishForm.querySelector('[type="submit"]');
  const statusNode = $("#wish-status"), moreButton = $("#wish-more"), refreshButton = $("#wish-refresh");
  let wishes = [], cursor = null, loadingWishes = false, sendingWish = false, pendingWish = null;
  let endpoint = CONFIG.wishes.endpoint || "/api/wishes";
  if (["localhost", "127.0.0.1"].includes(location.hostname)) {
    const override = new URLSearchParams(location.search).get("wishesApi");
    if (override) {
      try {
        const url = new URL(override);
        if (["localhost", "127.0.0.1"].includes(url.hostname) && ["http:", "https:"].includes(url.protocol)) endpoint = url.href;
      } catch { /* 无效的本地调试地址使用正式配置。 */ }
    }
  }
  const rememberedName = storage.get("buji-guest-name", "");
  if (typeof rememberedName === "string") nameInput.value = rememberedName.slice(0, 20);
  const draft = storage.get("buji-wish-draft", null);
  if (draft && typeof draft.name === "string" && typeof draft.text === "string") {
    nameInput.value = draft.name.slice(0, 20); textInput.value = draft.text.slice(0, 160);
    if (typeof draft.requestId === "string") pendingWish = draft;
  }
  function saveWishDraft() {
    const name = nameInput.value.trim(), text = textInput.value.trim();
    if (pendingWish && (pendingWish.name !== name || pendingWish.text !== text)) pendingWish = null;
    storage.set("buji-wish-draft", { name, text, requestId: pendingWish?.requestId });
  }
  nameInput.addEventListener("input", saveWishDraft);
  textInput.addEventListener("input", saveWishDraft);
  function wishNode(w, fresh = false) {
    const n = el("article", "note" + (fresh ? " new-note" : ""));
    const time = new Date(w.createdAt);
    n.append(el("p", "", w.text), el("div", "note-author", "— " + w.name));
    if (Number.isFinite(time.getTime())) {
      const date = el("time", "note-date", time.toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" }));
      date.dateTime = w.createdAt; n.append(date);
    }
    return n;
  }
  function renderWishes(freshId) {
    $("#notes").replaceChildren(...wishes.map(w => wishNode(w, w.id === freshId)));
  }
  // 示例与公开留言分开，不伪装成真人提交。
  $("#islander-notes").replaceChildren(...CONFIG.sampleWishes.map(w => wishNode(w)));
  async function wishRequest(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal, credentials: "omit", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        const messages = { invalid_name: "名字请填写 1–20 字。", invalid_text: "祝福请填写 1–160 字。", request_conflict: "提交标识冲突，请修改内容后重试。", rate_limited: "留言有些频繁，请稍后再试。" };
        throw new Error(messages[data.error] || "留言服务暂时不可用，请稍后重试。");
      }
      return data;
    } catch (error) {
      if (error.name === "AbortError" || error instanceof TypeError) throw new Error(options.method === "POST" ? "暂未确认提交结果，请保留内容并重试，不会重复发布。" : "留言加载失败，请检查网络后重试。");
      throw error;
    } finally { clearTimeout(timer); }
  }
  async function loadWishes(reset = false) {
    if (loadingWishes) return;
    const priorIds = new Set(wishes.map(w => w.id));
    loadingWishes = true; moreButton.disabled = true; refreshButton.disabled = true;
    $("#notes").setAttribute("aria-busy", "true"); statusNode.textContent = "正在收集小岛上的祝福…";
    try {
      const url = new URL(endpoint, location.href); url.searchParams.set("limit", "6");
      if (!reset && cursor) url.searchParams.set("before", cursor);
      const data = await wishRequest(url.href);
      if (!Array.isArray(data.items)) throw new Error("留言数据暂时无法读取，请重试。");
      const incoming = data.items.filter(w => w && Number.isSafeInteger(w.id) && typeof w.name === "string" && typeof w.text === "string");
      const merged = reset ? [...incoming, ...wishes.filter(w => !priorIds.has(w.id))] : [...wishes, ...incoming];
      wishes = [...new Map(merged.map(w => [w.id, w])).values()].sort((a, b) => b.id - a.id);
      cursor = data.nextCursor; renderWishes(); moreButton.hidden = !cursor;
      statusNode.textContent = wishes.length ? "每一份祝福，都留在这里。" : "还没有公开留言，来留下第一份祝福吧。";
      refreshButton.textContent = "刷新祝福";
    } catch (error) {
      statusNode.textContent = error.message; refreshButton.textContent = "重试加载";
    } finally {
      loadingWishes = false; moreButton.disabled = false; refreshButton.disabled = false; $("#notes").setAttribute("aria-busy", "false");
    }
  }
  moreButton.addEventListener("click", () => loadWishes());
  refreshButton.addEventListener("click", () => loadWishes(true));
  if ("IntersectionObserver" in window) {
    const wishObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { wishObserver.disconnect(); loadWishes(true); }
    }, { rootMargin: "300px" });
    wishObserver.observe($("#wishes"));
  } else loadWishes(true);
  function validateField(input, errorID, message) {
    const value = input.value.trim();
    const valid = value.length > 0 && value.length <= input.maxLength;
    $("#" + errorID).textContent = valid ? "" : message;
    input.setAttribute("aria-invalid", String(!valid)); return valid;
  }
  // 输入修正时立即消除已有错误，避免点击提交时 blur 清错导致按钮移位。
  nameInput.addEventListener("input", () => { if (nameInput.getAttribute("aria-invalid") === "true") validateField(nameInput, "name-error", "请留下 1–20 字的称呼。"); });
  textInput.addEventListener("input", () => { if (textInput.getAttribute("aria-invalid") === "true") validateField(textInput, "wish-error", "请写下 1–160 字的祝福。"); });
  nameInput.addEventListener("blur", () => validateField(nameInput, "name-error", "请留下 1–20 字的称呼。"));
  textInput.addEventListener("blur", () => validateField(textInput, "wish-error", "请写下 1–160 字的祝福。"));
  wishForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (sendingWish) return;
    const nameOK = validateField(nameInput, "name-error", "请留下 1–20 字的称呼。"), textOK = validateField(textInput, "wish-error", "请写下 1–160 字的祝福。");
    if (!nameOK || !textOK) { (!nameOK ? nameInput : textInput).focus(); return; }
    if (!pendingWish) pendingWish = { name: nameInput.value.trim(), text: textInput.value.trim(), requestId: crypto.randomUUID() };
    saveWishDraft();
    sendingWish = true; sendButton.disabled = true; nameInput.readOnly = true; textInput.readOnly = true;
    wishForm.setAttribute("aria-busy", "true"); sendButton.textContent = "正在贴上小岛…"; $("#form-error").textContent = "";
    try {
      const data = await wishRequest(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pendingWish) });
      if (!data.item || !Number.isSafeInteger(data.item.id)) throw new Error("暂未确认提交结果，请重试。");
      const item = data.item;
      if (item.status === "published") {
        wishes = [item, ...wishes.filter(w => w.id !== item.id)]; renderWishes(item.id);
        statusNode.textContent = "祝福已保存到小岛，其他访客也能看到。";
      }
      storage.set("buji-guest-name", pendingWish.name); storage.set("buji-wish-draft", null);
      pendingWish = null; textInput.value = "";
      nameInput.removeAttribute("aria-invalid"); textInput.removeAttribute("aria-invalid");
      toast(item.status === "hidden" ? "这条祝福已收到，目前未公开展示。" : "祝福已贴上小岛，谢谢你的心意！");
    } catch (error) { $("#form-error").textContent = error.message; }
    finally {
      sendingWish = false; sendButton.disabled = false; nameInput.readOnly = false; textInput.readOnly = false;
      wishForm.setAttribute("aria-busy", "false"); sendButton.textContent = "把祝福贴上小岛";
    }
  });
  // 每个模块的末尾进入视野，视为浏览完成；IO 观察轻量哨兵，快速滚动仍可继续浏览。
  const stickerDefs = [
    ["leaf", "登岛叶片"],
    ["flower", "来信小花"],
    ["heart", "心动印记"],
    ["flag", "幸福小旗"],
    ["shell", "海边贝壳"],
    ["star", "期待星星"],
    ["rings", "约定对戒"],
    ["camera", "回忆相机"],
    ["mail", "祝福信封"],
    ["butterfly", "温暖蝴蝶"],
  ];
  // 每次打开 / 刷新都开启新一轮图鉴；不使用 localStorage 或 sessionStorage 记忆进度。
  const collected = new Set();
  try {
    localStorage.removeItem("buji-stickers");
  } catch {
    /* 浏览器禁用存储也可收集。 */
  }
  let stickerIO = null;
  // 收集事实立即写入 Set；视觉反馈单独排队，避免动画时序影响实际图鉴进度。
  let pendingCollections = [],
    collectionBusy = false,
    collectionWakePending = false;
  const collectionTimers = new Set();
  // 集中登记收集动画的延迟任务，暂停动效、切后台或重开图鉴时可以一次清理。
  function collectionLater(callback, ms) {
    const timer = setTimeout(() => {
      collectionTimers.delete(timer);
      callback();
    }, ms);
    collectionTimers.add(timer);
  }
  // 清除排队任务与临时动画节点，但不删除 collected 中已经获得的贴纸。
  function stopCollectionAnimation() {
    collectionTimers.forEach(clearTimeout);
    collectionTimers.clear();
    pendingCollections = [];
    collectionBusy = false;
    collectionWakePending = false;
    $$(".collect-notice,.collection-fly,.collection-plus").forEach((n) =>
      n.remove(),
    );
    $("#atlas-btn").classList.remove("collect-caught");
  }
  // 从 collected 统一刷新工具按钮计数、读屏标签、进度与图鉴锁定样式。
  function updateAtlas() {
    const count = collected.size;
    $("#sticker-count").textContent = count;
    $("#atlas-btn").setAttribute(
      "aria-label",
      `打开小岛贴纸图鉴，已收集${count}枚`,
    );
    $("#atlas-progress").textContent =
      `已收藏 ${count} / ${stickerDefs.length} 枚小岛心意`;
    $("#atlas-grid").replaceChildren();
    stickerDefs.forEach(([name, title], i) => {
      const item = el(
        "div",
        "atlas-item" + (collected.has(i) ? "" : " locked"),
      );
      item.append(
        icon(name, "scene-icon icon"),
        el("span", "", collected.has(i) ? title : "未发现"),
      );
      $("#atlas-grid").append(item);
    });
  }
  updateAtlas();
  // 串行播放“发现、飞入、计数”反馈；暂停或后台状态下不创建新的装饰节点。
  function animateCollection() {
    if (
      collectionBusy ||
      !pendingCollections.length ||
      motionPaused() ||
      document.hidden
    )
      return;
    // 首次开场尚未结束时稍后展示，避免收集动画被欢迎加载层遮住。
    if (!$("#loader").hidden) {
      if (!collectionWakePending) {
        collectionWakePending = true;
        collectionLater(() => {
          collectionWakePending = false;
          animateCollection();
        }, 250);
      }
      return;
    }
    collectionBusy = true;
    // 快速滚动时合并待播放的反馈，避免十个提示层叠加或长时间排队。
    const batch = pendingCollections.splice(0);
    const [name, title] = stickerDefs[batch[0]];
    const notice = el("div", "collect-notice");
    notice.setAttribute("aria-hidden", "true");
    const emblem = el("span", "collect-emblem");
    emblem.append(icon(name));
    const text = el("div");
    text.append(
      el("span", "collect-kicker", "发现一份小岛心意"),
      el(
        "strong",
        "collect-name",
        batch.length === 1 ? title : `新增 ${batch.length} 枚小岛贴纸`,
      ),
    );
    notice.append(emblem, text);
    document.body.append(notice);
    collectionLater(() => {
      // 使用视口坐标计算飞行起点和工具按钮终点，交给 CSS 自定义属性执行位移动画。
      const start = emblem.getBoundingClientRect();
      const dest = $("#atlas-btn").getBoundingClientRect();
      const fly = el("span", "collection-fly");
      fly.setAttribute("aria-hidden", "true");
      fly.append(icon(name));
      fly.style.left = start.left + "px";
      fly.style.top = start.top + "px";
      fly.style.setProperty(
        "--fly-x",
        dest.left + dest.width / 2 - start.left - 28 + "px",
      );
      fly.style.setProperty(
        "--fly-y",
        dest.top + dest.height / 2 - start.top - 28 + "px",
      );
      document.body.append(fly);
      notice.classList.add("leaving");
      collectionLater(() => notice.remove(), 200);
      collectionLater(() => {
        fly.remove();
        const atlas = $("#atlas-btn");
        atlas.classList.remove("collect-caught");
        void atlas.offsetWidth;
        atlas.classList.add("collect-caught");
        const box = atlas.getBoundingClientRect();
        const plus = el("span", "collection-plus", "+" + batch.length);
        plus.setAttribute("aria-hidden", "true");
        plus.style.left = Math.max(8, box.left - 42) + "px";
        plus.style.top = box.top - 7 + "px";
        document.body.append(plus);
        collectionLater(() => atlas.classList.remove("collect-caught"), 750);
        collectionLater(() => plus.remove(), 950);
        collectionBusy = false;
        animateCollection();
      }, 750);
    }, 800);
  }
  // Set 保证同一个模块只计数一次；关闭动效时照常更新图鉴与读屏提示。
  function collectSticker(i) {
    if (collected.has(i)) return;
    collected.add(i);
    updateAtlas();
    $("#collection-status").textContent =
      `收集到${stickerDefs[i][1]}，本次已收藏 ${collected.size} / ${stickerDefs.length} 枚贴纸`;
    if (motionPaused() || document.hidden) return;
    pendingCollections.push(i);
    animateCollection();
  }
  // 恢复初始收藏状态并重新观察模块哨兵，用于浏览器后退缓存恢复后的新一轮收集。
  function resetStickerCollection() {
    stopCollectionAnimation();
    collected.clear();
    updateAtlas();
    $("#collection-status").textContent =
      "新一轮小岛图鉴已开启，慢慢逛，重新收集十枚贴纸吧。";
    if (stickerIO) {
      stickerIO.disconnect();
      $$("[data-collect]").forEach((n) => stickerIO.observe(n));
    }
  }
  // 浏览器后退缓存恢复时也重开一轮，不改变页面原生滚动位置。
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) resetStickerCollection();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopCollectionAnimation();
  });
  $("#atlas-btn").onclick = () => {
    updateAtlas();
    openLayer($("#atlas-dialog"), "#atlas-close");
  };
  $("#atlas-close").onclick = () => closeLayer($("#atlas-dialog"));
  $("#atlas-dialog").addEventListener("click", (e) => {
    if (e.target === $("#atlas-dialog")) closeLayer($("#atlas-dialog"));
  });
  if ("IntersectionObserver" in window) {
    document.documentElement.classList.add("motion-ready");
    // 入场效果只执行一次：元素进入视口后解除观察，减少长页面持续计算。
    const revealIO = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            revealIO.unobserve(e.target);
          }
        }),
      { threshold: 0.08, rootMargin: "0px 0px -10px 0px" },
    );
    $$(".reveal").forEach((n) => revealIO.observe(n));
    // 贴纸观察独立于入场动画：以模块底部的细小哨兵进入视口为完成阅读的信号。
    stickerIO = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            collectSticker(Number(e.target.dataset.collect));
            stickerIO.unobserve(e.target);
          }
        }),
      { threshold: 0, rootMargin: "0px 0px -16px 0px" },
    );
    $$("[data-sticker]").forEach((s) => {
      // 哨兵绝对定位在模块底部，不占布局、不拦截点击，也不暴露给读屏。
      const sent = el("span");
      sent.dataset.collect = s.dataset.sticker;
      sent.style.cssText =
        "display:block;position:absolute;left:40px;right:40px;bottom:25px;height:2px;pointer-events:none";
      sent.setAttribute("aria-hidden", "true");
      s.append(sent);
      stickerIO.observe(sent);
    });
  } else {
    $$(".reveal").forEach((n) => n.classList.add("visible"));
  }
  // 前景粒子按硬件 / 省流量降级；动画仅使用 transform 和 opacity。
  const limited =
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    navigator.connection?.saveData;
  const particleCount = limited ? 7 : 14,
    particleTypes = [
      "petal",
      "star",
      "shell",
      "dandelion",
      "butterfly",
      "heart",
    ];
  // 通过索引分散位置、时长和负延迟，让粒子初次显示就处于不同动画阶段。
  for (let i = 0; i < particleCount; i++) {
    const n = el(
      "span",
      "particle" + (i >= Math.ceil(particleCount / 2) ? " extra" : ""),
    );
    n.style.setProperty("--x", ((i * 37 + 11) % 96) + "%");
    n.style.setProperty("--duration", 18 + (i % 5) * 3 + "s");
    n.style.setProperty("--delay", -i * 3.7 + "s");
    n.style.setProperty(
      "--particle-color",
      ["#d8a68f", "#d9c48d", "#d2b496", "#a3b68b", "#8fa99a", "#dda793"][i % 6],
    );
    n.append(icon(particleTypes[i % 6]));
    $("#particles").append(n);
  }
  const heroScene = $("#hero-scene");
  const heroImage = $("#hero-image");
  let heroMotion = null;
  // 滚动只更新目标进度；连续插值和局部形变由独立的 GPU 动画负责。
  function updateHeroWave() {
    if (!heroMotion) return;
    const progress = Math.max(
      0,
      Math.min(1, scrollY / Math.min(innerHeight * 0.55, 420)),
    );
    heroMotion.setPaused(motionPaused());
    heroMotion.setProgress(progress);
  }
  // 静图与动画共用同一张高清纹理，避免启动时变糊或切换不同构图。
  // 高清资源或 WebGL 不可用时仍可完整阅读请柬。
  heroImage
    .decode()
    .catch(() => {
      heroImage.src = "assets/island-cover.jpg";
      return heroImage.decode();
    })
    .then(() => {
      if (
        !window.createHeroMotion ||
        /\/island-cover\.jpg(?:$|\?)/.test(heroImage.src)
      )
        return;
      heroMotion = window.createHeroMotion({
        canvas: $("#hero-motion"),
        image: heroImage,
        onReady: () => heroScene.classList.add("hero-motion-ready"),
        onError: () => heroScene.classList.remove("hero-motion-ready"),
      });
      updateHeroWave();
    })
    .catch(() => {});
  window.addEventListener("resize", updateHeroWave, { passive: true });
  // 统一同步 CSS 装饰、收集反馈与 WebGL 状态；手动暂停按钮与系统偏好共用这条路径。
  const syncMotion = () => {
    document.body.classList.toggle("no-motion", motionPaused());
    if (motionPaused()) stopCollectionAnimation();
    updateHeroWave();
    $("#ambient-toggle").setAttribute("aria-pressed", String(manualPause));
    $("#ambient-toggle").textContent = manualPause
      ? "开启装饰动效"
      : "暂停装饰动效";
  };
  $("#ambient-toggle").onclick = () => {
    manualPause = !manualPause;
    syncMotion();
  };
  motionQuery.addEventListener?.("change", (e) => {
    reduced = e.matches;
    syncMotion();
  });
  syncMotion();
  const particles = $("#particles");
  const pennants = $$(".pennants");
  const clouds = $$(".cloud");
  // 滚动事件可能一帧触发多次，用 requestAnimationFrame 合并更新；监听器保持 passive。
  let scrollTick = false;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTick || motionPaused()) return;
      scrollTick = true;
      requestAnimationFrame(() => {
        const y = Math.min(24, scrollY * 0.012);
        particles.style.setProperty("--particle-parallax", y + "px");
        const heroTop = Math.min(scrollY, 700);
        if (heroScene)
          heroScene.style.transform = `translateY(${heroTop * 0.025}px)`;
        updateHeroWave();
        const mid = Math.min(10, scrollY * 0.008) + "px";
        const far = Math.min(15, scrollY * 0.004) + "px";
        pennants.forEach((n) => n.style.setProperty("--mid-parallax", mid));
        clouds.forEach((n) => n.style.setProperty("--far-parallax", far));
        scrollTick = false;
      });
    },
    { passive: true },
  );
  // 草地彩蛋仅响应空白区域下部，避开链接与按钮；临时气泡显示后自动移除。
  $("#lawn").addEventListener("click", (e) => {
    if (e.target.closest("button,a")) return;
    const box = $("#lawn").getBoundingClientRect();
    if (e.clientY < box.top + box.height * 0.25) return;
    const b = el(
      "span",
      "easter-bubble",
      ["捡到一份小幸福", "今天也要开心呀", "海风说：欢迎你", "送你一朵小花"][
        Math.floor(Math.random() * 4)
      ],
    );
    b.style.left =
      Math.min(box.width - 80, Math.max(80, e.clientX - box.left)) + "px";
    b.style.top = e.clientY - box.top + "px";
    $("#lawn").append(b);
    setTimeout(() => b.remove(), 1200);
  });
  // 让 Escape 和弹窗切换共用关闭入口，无需分别判断每一种对话框。
  function closeActive() {
    if (activeDialog) closeLayer(activeDialog);
  }
  // 键盘交互集中处理：Escape 关闭，相册方向键切图，Tab 在活动弹窗的首尾控件间循环。
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeActive();
    }
    if (
      activeDialog === lightbox &&
      ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)
    ) {
      e.preventDefault();
      changePhoto(["ArrowRight", "ArrowDown"].includes(e.key) ? 1 : -1);
    }
    if (e.key === "Tab" && activeDialog) {
      const controls = [
        ...activeDialog.querySelectorAll(
          'button,a[href],input,textarea,[tabindex="0"]',
        ),
      ].filter((n) => !n.disabled);
      const first = controls[0],
        last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  });
  // 首次开场至少展示 2 秒；图片等待仍有上限，异常由独立脚本与 CSS 退场。
  async function finishLoading() {
    const loader = $("#loader");
    if (loader.hidden) return;
    await Promise.all([
      Promise.race([
        $("#hero-image")
          .decode()
          .catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]),
      new Promise((resolve) =>
        setTimeout(
          resolve,
          Math.max(
            0,
            2000 -
              (performance.now() -
                (window.invitationLoadingStarted ?? performance.now())),
          ),
        ),
      ),
    ]);
    loader.classList.add("hidden-loader");
    try {
      sessionStorage.setItem("buji-visited", "1");
    } catch {}
    setTimeout(() => (loader.hidden = true), 250);
  }
  finishLoading();
  // 页面进入后台时暂停纯装饰 CSS 动画，音频按用户开启状态继续。
  document.addEventListener("visibilitychange", () => {
    $$(".particle,.floating,.cloud,.pennants").forEach(
      (n) => (n.style.animationPlayState = document.hidden ? "paused" : ""),
    );
  });
})();
