/* =====================================================================
   中文可修改资料区：正式使用前优先修改本区。日期与时刻均使用北京时间。
   静态部署：请同时上传 HTML、CSS、JS 和 assets；不依赖 Tailwind CDN。
   照片可以填写 HTTPS URL、同目录路径或 data:image/... 内嵌图片。
   姓名与婚期已填写真实信息；恋爱节点与其余流程时刻仍为示例，可按实际情况修改。
===================================================================== */
const CONFIG = {
  groom: "刁勇辰", // 可修改：新郎姓名
  bride: "李汝静", // 可修改：新娘姓名
  date: "2026-11-04T11:00:00+08:00", // 可修改：婚礼日期及开始时间，保留 +08:00 时区
  timeLabel: "中午11点", // 可修改：时间展示文案；留空时自动显示婚期中的小时和分钟
  lunarDate: "丙午年九月廿六", // 可修改：农历日期；更换婚期时请同步修改
  venue: "海岱禧合酒店", // 可修改：婚宴地点
  venueFull: "海岱禧合婚礼艺术中心", // 可修改：酒店完整名称
  address: "山东省潍坊市青州市王府街道后营子街808号（西苑小学对面）", // 可修改：完整地址
  longitude: 118.457025,
  latitude: 36.694075, // 可修改：经纬度；本示例按 GCJ-02 处理，高德/苹果使用该值，百度转换 BD-09
  audio: "assets/island-bgm.mp3", // 背景音乐：默认自动播放，受浏览器限制时在首次交互后播放
  // 可修改：旅行节点标题、短句与图标；本区域不展示日期。
  story: [
    {
      title: "青岛",
      subtitle: "一起看过海",
      note: "海风作伴，身边是你",
      icon: "waves",
    },
    {
      title: "贵州",
      subtitle: "那远山呼唤我",
      note: "和你赴约，山野之间",
      icon: "mountains",
    },
    {
      title: "天津",
      subtitle: "一起慢慢走",
      note: "大街小巷，都有我们的脚印",
      icon: "footsteps",
    },
    {
      title: "一起安家",
      subtitle: "把未来交给彼此",
      note: "往后的风景，都有你",
      icon: "home",
    },
    {
      title: "幸福靠岸",
      subtitle: "我们的婚礼",
      note: "小岛故事，从此双人续写",
      icon: "wedding-arch",
    },
  ],
  agenda: [
    {
      time: "11:00",
      title: "宾朋莅座",
      note: "亲朋相聚，静候幸福开场",
    },
    { time: "12:00", title: "吉时肇礼", note: "以爱之名，许下余生" },
    { time: "12:30", title: "喜筵开酌", note: "把祝福藏进每一次碰杯" },
    { time: "13:00", title: "华堂留影", note: "带着笑容，留下今日份合照" },
    { time: "14:00", title: "茶点叙欢", note: "一盏清茶，共叙欢喜时光" },
  ],
  photos: [
    // 可修改：6 张婚照；src 留空时为可用的原创插画占位，不加载示例陌生人照片
    { src: "", title: "和你，去看海", icon: "shell", palette: "sea" },
    { src: "", title: "把春天送给你", icon: "flower", palette: "garden" },
    {
      src: "",
      title: "每一天的小欢喜",
      icon: "camera",
      palette: "peach",
    },
    { src: "", title: "一起等一场日落", icon: "sun", palette: "sunset" },
    { src: "", title: "最好的，是我们", icon: "rings", palette: "sage" },
    { src: "", title: "余生请多指教", icon: "heart", palette: "cream" },
  ],
  sampleWishes: [
    // 根据角色特点创作的婚礼祝福，并非游戏原台词。
    {
      name: "狸克",
      text: "两位的新生活计划，今天正式开工了呢！祝你们把小家经营得暖暖的，幸福的利息每天都在增加，是说！",
    },
    {
      name: "傅达",
      text: "呼呼！如此珍贵的幸福时刻，真想好好珍藏起来呢。愿两位共同发现生活中的美好，让回忆的馆藏越来越丰富！",
    },
    {
      name: "西施惠",
      text: "各位居民请注意，今天岛上有一件特别幸福的事！恭喜两位结婚！那个……光是看着你们，我也忍不住笑起来了呢！",
    },
  ],
  share: {
    title: "刁勇辰与李汝静 · 布吉岛来信",
    description:
      "2026年11月4日 · 中午11点｜诚邀您相聚青州海岱禧合酒店，见证我们的幸福时刻",
    image: "https://wedding.xxcfun.cn/assets/island-share-hd.jpg", // 当前高清封面制作的 1200px 分享图；同步用于 OG 与微信配置
    link: "https://wedding.xxcfun.cn", // 可修改：线上请柬网址，邀请卡二维码指向该地址
    poster: "assets/island-invitation-hd.jpg", // 当前高清封面制作的 1080×1620 邀请图卡；修改资料后运行 scripts/build-share-assets.cjs 重建
  },
  wechat: {
    signatureEndpoint: "https://wxapi.xxcfun.cn/wechat-signature.php", // 可修改：服务端微信 JS-SDK 签名接口，例如 /api/wechat-signature；接收 ?url=当前完整无hash URL，返回 appId,timestamp,nonceStr,signature。严禁在 HTML 内存放 appSecret。
  },
};
/* =====================================================================
   以下为交互逻辑。所有访客文本均用 textContent 创建，防止 HTML 注入。
===================================================================== */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
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
  const icon = (name, cls = "icon") => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    el.setAttribute("class", cls);
    el.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(el.namespaceURI, "use");
    use.setAttribute("href", "#i-" + name);
    el.append(use);
    return el;
  };
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const isMobile = () =>
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches,
    manualPause = false;
  const motionPaused = () => reduced || manualPause;
  let toastTimer;
  function toast(text) {
    $("#toast").textContent = text;
    $("#toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3400);
  }
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
  $$("[data-bind]").forEach(
    (n) => (n.textContent = CONFIG[n.dataset.bind] || ""),
  );
  $$("[data-date]").forEach(
    (n) =>
      (n.textContent =
        n.dataset.date === "short"
          ? shortDate
          : n.dataset.date === "week"
            ? dateWeek
            : dateWeek + " 开始"),
  );
  document.title = `${CONFIG.groom}与${CONFIG.bride} · 布吉岛来信`;
  const storyMap = $("#story-map");
  CONFIG.story.forEach((s, i) => {
    const stop = el("div", "story-stop reveal");
    stop.dataset.step = i;
    stop.style.transitionDelay = i * 45 + "ms";
    const mark = el("div", "islet");
    mark.append(icon(s.icon));
    stop.append(
      mark,
      el("h3", "stop-title", s.title),
      el("p", "stop-subtitle", s.subtitle),
      el("p", "stop-note", s.note),
    );
    storyMap.append(stop);
  });
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
  const mapSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 370"><defs><pattern id="wave" width="40" height="25" patternUnits="userSpaceOnUse"><path d="M0 13q10-6 20 0t20 0" fill="none" stroke="#fff" opacity=".25"/></pattern><pattern id="grass" width="32" height="30" patternUnits="userSpaceOnUse"><path d="m5 8 3-5 3 5m12 17 3-5 3 5" fill="none" stroke="#9bbd7e" opacity=".3"/><circle cx="16" cy="17" r="1" fill="#faf5d5"/></pattern><filter id="sh"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#758f5a" flood-opacity=".22"/></filter></defs><rect width="440" height="370" fill="#b9ddcf"/><rect width="440" height="370" fill="url(#wave)"/><path d="M-10 50Q45 20 85 42T187 21 304 35 445 20V322Q370 339 320 321T210 341 106 320 0 337Z" fill="#ebdeb2"/><path d="M-10 39Q45 9 85 31T187 10 304 24 445 9V305Q370 322 320 304T210 324 106 303 0 320Z" fill="#c7dba0"/><path d="M-10 39Q45 9 85 31T187 10 304 24 445 9V305Q370 322 320 304T210 324 106 303 0 320Z" fill="url(#grass)"/><path d="M220 15V312" stroke="#b4bd94" stroke-width="33"/><path d="M220 15V312" stroke="#fbf3d8" stroke-width="29"/><path d="M-10 207H450" stroke="#b4bd94" stroke-width="45"/><path d="M-10 207H450" stroke="#fbf3d8" stroke-width="41"/><path d="M-10 207H440" stroke="#d8d5b2" stroke-width="2" stroke-dasharray="8 9"/><g fill="#91b57d" filter="url(#sh)"><circle cx="39" cy="85" r="22"/><circle cx="76" cy="55" r="18"/><circle cx="383" cy="48" r="21"/><circle cx="404" cy="92" r="18"/><circle cx="46" cy="267" r="20"/><circle cx="384" cy="280" r="25"/></g><g fill="#d6e3b3"><circle cx="33" cy="78" r="12"/><circle cx="71" cy="50" r="11"/><circle cx="377" cy="41" r="12"/><circle cx="378" cy="273" r="13"/></g><g filter="url(#sh)"><rect x="266" y="104" width="101" height="58" rx="9" fill="#faf0d1"/><path d="m253 108 63-36 64 36Z" fill="#be9471"/><path d="m258 105 58-32 58 32Z" fill="#d6b18b"/><rect x="306" y="131" width="21" height="31" rx="10" fill="#9eb295"/><g fill="#b7cbbc"><rect x="278" y="123" width="14" height="14" rx="3"/><rect x="341" y="123" width="14" height="14" rx="3"/></g></g><path d="M315 160v25" stroke="#fcf5dc" stroke-width="16"/><g filter="url(#sh)"><rect x="98" y="247" width="81" height="37" rx="6" fill="#fff3d1"/><path d="m90 248 49-23 49 23Z" fill="#8faea1"/><g fill="#b3c9b6"><rect x="108" y="257" width="12" height="13" rx="2"/><rect x="133" y="257" width="12" height="13" rx="2"/><rect x="157" y="257" width="12" height="13" rx="2"/></g></g><g font-family="sans-serif" text-anchor="middle" fill="#506344"><text x="138" y="303" font-size="13">西苑小学</text><text x="95" y="212" font-size="13">后 营 子 街</text><text x="316" y="65" font-size="13" font-weight="bold">${escapeXML(CONFIG.venue)}</text><text x="355" y="233" font-size="11">808号</text></g><g transform="translate(306 108)" filter="url(#sh)"><path d="M0 17v-48" stroke="#795f42" stroke-width="3"/><path d="M2-31q15-7 29 0v21q-14-7-29 0" fill="#da8d78"/><path d="m13-24 3 3 3-3" stroke="#fff4d9" fill="none" stroke-width="2"/></g><g transform="translate(33 28)" font-family="sans-serif" text-anchor="middle" fill="#64805e"><text y="0" font-size="11">北</text><path d="m0 8-5 13h10Z" fill="#64805e"/></g><g fill="#fff5de"><circle cx="51" cy="162" r="4"/><circle cx="60" cy="167" r="4"/><circle cx="59" cy="157" r="4"/><circle cx="371" cy="168" r="4"/><circle cx="380" cy="163" r="4"/><circle cx="381" cy="173" r="4"/></g><g fill="#e4bd74"><circle cx="57" cy="162" r="3"/><circle cx="377" cy="168" r="3"/></g><rect x="135" y="339" width="170" height="22" rx="11" fill="#fff9e5" opacity=".85"/><text x="220" y="354" text-anchor="middle" font-size="10" font-family="sans-serif" fill="#66765b">手绘位置示意 · 点击开启导航</text></svg>`;
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
  function photoPlaceholder(p, i) {
    const c = placeholderPalettes[p.palette] || placeholderPalettes.sea;
    return svgURL(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480"><defs><linearGradient id="b" x2="0" y2="1"><stop stop-color="${c[0]}"/><stop offset="1" stop-color="#fff6df"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#6c855b" flood-opacity=".17"/></filter></defs><rect width="400" height="480" fill="url(#b)"/><circle cx="300" cy="83" r="30" fill="#fff4c7"/><path d="M-20 311Q80 245 180 293T420 277V480H0Z" fill="${c[1]}"/><path d="M-20 369Q110 308 240 350T420 334V480H0Z" fill="${c[2]}" opacity=".52"/><g fill="#fffbec" opacity=".7"><rect x="33" y="88" width="98" height="17" rx="9"/><circle cx="75" cy="84" r="18"/><circle cx="97" cy="88" r="13"/></g><g filter="url(#s)"><path d="M124 320V213a76 76 0 0 1 152 0v107" fill="none" stroke="#fdf4d6" stroke-width="15"/><path d="M133 319V214a67 67 0 0 1 134 0v105" fill="none" stroke="#d3c5a7" stroke-width="2"/><g fill="#7fa37b"><ellipse cx="136" cy="190" rx="13" ry="27" transform="rotate(-40 136 190)"/><ellipse cx="154" cy="155" rx="13" ry="27" transform="rotate(15 154 155)"/><ellipse cx="257" cy="170" rx="14" ry="27" transform="rotate(40 257 170)"/><ellipse cx="274" cy="210" rx="14" ry="27"/></g><g fill="#fff9e7"><circle cx="144" cy="171" r="16"/><circle cx="180" cy="143" r="14"/><circle cx="242" cy="153" r="16"/><circle cx="271" cy="192" r="12"/></g><g fill="#dfbd80"><circle cx="144" cy="171" r="6"/><circle cx="180" cy="143" r="5"/><circle cx="242" cy="153" r="6"/><circle cx="271" cy="192" r="5"/></g><path d="M175 250c-18-27-51 0-22 24l22 18 23-18c29-24-5-51-23-24Z" fill="#e8ad96" transform="translate(25 -5)"/></g><g fill="#fff9e8"><circle cx="71" cy="350" r="9"/><circle cx="59" cy="359" r="9"/><circle cx="72" cy="368" r="9"/><circle cx="84" cy="358" r="9"/></g><circle cx="72" cy="359" r="7" fill="#e0bd79"/><path d="M290 340q10-40 35-25t-13 35Z" fill="#7d9e74"/><g fill="#fff9e7" opacity=".7"><circle cx="50" cy="420" r="2"/><circle cx="330" cy="393" r="3"/><circle cx="280" cy="430" r="2"/></g><rect x="118" y="402" width="164" height="32" rx="16" fill="#fff8e9bb"/><text x="200" y="423" text-anchor="middle" font-family="sans-serif" font-size="13" letter-spacing="3" fill="#627455">回忆照片 · ${String(i + 1).padStart(2, "0")}</text></svg>`,
    );
  }
  const photos = CONFIG.photos.map((p, i) => ({
    ...p,
    src: p.src || photoPlaceholder(p, i),
    placeholder: !p.src,
  }));
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
      el("span", "photo-number", String(i + 1).padStart(2, "0")),
      el("span", "photo-label", p.title),
    );
    btn.addEventListener("click", () => openPhoto(i));
    $("#photo-grid").append(btn);
  });
  // 地图图片复制完整场地名称，与导航目的地保持一致，供访客粘贴到高德地图中搜索。
  $("[data-copy-address]").addEventListener("click", async () => {
    const address = CONFIG.venueFull;
    let copied = false;
    try {
      await navigator.clipboard.writeText(address);
      copied = true;
    } catch {
      // 兼容不支持 Clipboard API 或禁止剪贴板权限的浏览器。
      const previousFocus = document.activeElement;
      const input = document.createElement("textarea");
      input.value = address;
      input.readOnly = true;
      input.style.cssText = "position:fixed;top:0;left:-9999px;font-size:16px";
      document.body.append(input);
      try {
        input.select();
        input.setSelectionRange(0, input.value.length);
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      } finally {
        input.remove();
        previousFocus?.focus({ preventScroll: true });
      }
    }
    if (copied) {
      toast("场地名称已复制，可粘贴到高德地图中搜索");
    } else {
      window.prompt("自动复制未成功，请长按或选中下方场地名称复制：", address);
    }
  });
  // 婚礼信息中的导航按钮通过高德官方 App Scheme 直接导航。
  const { longitude: lng, latitude: lat } = CONFIG;
  const name = encodeURIComponent(CONFIG.venueFull);
  const isiOS =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
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
      if (/MicroMessenger/i.test(navigator.userAgent)) {
        toast("若未唤起高德，请在右上角选择在浏览器打开后，再点击导航");
      }
      // 点击直接交给系统唤起高德；没有定时网页兜底，返回请柬也不会突然跳页。
    });
  });
  let lastFocus = null,
    activeDialog = null;
  function rememberFocus(dialog) {
    if (activeDialog && activeDialog !== dialog) closeActive();
    lastFocus = document.activeElement;
    activeDialog = dialog;
  }
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
        value = String(values[i]).padStart(i ? 2 : 3, "0");
      if (n.textContent !== value) {
        n.textContent = value;
        n.classList.remove("tick");
        if (!motionPaused()) {
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
  let musicWanted = false,
    musicVersion = 0,
    volumeFrame = 0;
  if (CONFIG.audio) audio.src = CONFIG.audio;
  function musicUI(on) {
    document.body.classList.toggle("music-on", on);
    musicBtn.setAttribute("aria-pressed", String(on));
    musicBtn.setAttribute("aria-label", on ? "暂停背景音乐" : "开启背景音乐");
  }
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
  function clearAutoMusic() {
    autoMusicPending = false;
    document.removeEventListener("click", retryAutoMusic);
    document.removeEventListener("touchend", retryAutoMusic);
    document.removeEventListener("keydown", retryAutoMusic);
    document.removeEventListener("WeixinJSBridgeReady", retryAutoMusic);
  }
  function retryAutoMusic(event) {
    if (!autoMusicPending || musicBtn.contains(event.target)) return;
    if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
    clearAutoMusic();
    setMusic(true, true);
  }
  function waitForMusicGesture() {
    autoMusicPending = true;
    document.addEventListener("click", retryAutoMusic);
    document.addEventListener("touchend", retryAutoMusic);
    document.addEventListener("keydown", retryAutoMusic);
    document.addEventListener("WeixinJSBridgeReady", retryAutoMusic);
  }
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
  // 打开页面即尝试播放；浏览器拦截时，等待首次交互或微信桥接就绪后重试。
  if (CONFIG.audio) {
    audio.preload = "auto";
    setMusic(true, true);
  }
  // 签名使用实际进入页面的 URL，保留 query 和编码，仅去掉 hash。
  const inWechat = /MicroMessenger/i.test(navigator.userAgent);
  const wechatEntryURL = location.href.split("#")[0];
  const shareData = {
    title: CONFIG.share.title,
    desc: CONFIG.share.description,
    link: new URL(CONFIG.share.link || wechatEntryURL, location.href).href,
    imgUrl: new URL(CONFIG.share.image, location.href).href,
  };
  let wechatState = inWechat ? "loading" : "browser";
  let wechatTask = null;
  let sdkTask = null;
  let wechatAttempt = 0;
  const shareStatus = $("#share-status");
  const shareRetry = $("#share-retry");
  // 仅排查链接开启诊断；不输出密钥、票据或签名内容。
  const shareDebug = new URLSearchParams(location.search).get("wechat_debug") === "1";
  const shareDiagnostic = { version: "20261023-2", stage: "initial", results: {} };
  let diagnosticOutput;
  if (shareDebug) {
    const details = el("details", "share-poster-option");
    details.open = true;
    details.append(el("summary", "", "微信分享检查结果"));
    diagnosticOutput = el("pre");
    diagnosticOutput.id = "wechat-diagnostics";
    diagnosticOutput.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.7";
    details.append(diagnosticOutput);
    shareRetry.after(details);
  }
  function recordShareDiagnostic(stage, result) {
    shareDiagnostic.stage = stage;
    if (result !== undefined) {
      shareDiagnostic.results[stage] = String(result).slice(0, 240);
    }
    if (diagnosticOutput) diagnosticOutput.textContent = JSON.stringify(shareDiagnostic, null, 2);
  }
  function shareSDKError(stage, result) {
    const message = result?.errMsg || result?.err_msg || "failed";
    recordShareDiagnostic(stage, message);
    return Error(`${stage}: ${message}`);
  }
  $("#share-card-title").textContent = shareData.title;
  $("#share-card-description").textContent = shareData.desc;
  $("#share-card-image").src = shareData.imgUrl;
  for (const [property, content] of Object.entries({
    "og:title": shareData.title, "og:description": shareData.desc,
    "og:url": shareData.link, "og:image": shareData.imgUrl,
    "og:image:secure_url": shareData.imgUrl,
  })) {
    const meta = document.querySelector(`meta[property="${property}"]`);
    if (meta) meta.content = content;
  }
  function renderWechatState() {
    $("#share-instructions").textContent = inWechat
      ? "点击微信右上角「···」，选择「发送给朋友」或「分享到朋友圈」"
      : "请先在微信中打开请柬，再通过右上角「···」分享";
    const messages = {
      browser: "微信中打开后，可分享带标题和封面的请柬链接。",
      loading: "正在准备微信分享…",
      ready: "分享已准备好，发送给朋友即可打开完整请柬。",
      error: "微信分享暂未准备好，请重试；也可以保存下方邀请卡。",
    };
    shareStatus.textContent = messages[wechatState];
    shareStatus.setAttribute("aria-busy", String(wechatState === "loading"));
    shareRetry.hidden = wechatState !== "error";
  }
  function withShareTimeout(promise, label) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error(label)), 12000);
      }),
    ]).finally(() => clearTimeout(timer));
  }
  function loadWechatSDK() {
    if (window.wx) return Promise.resolve();
    if (sdkTask) return sdkTask;
    const script = el("script");
    script.src = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js";
    script.async = true;
    sdkTask = withShareTimeout(new Promise((resolve, reject) => {
      script.onload = () => window.wx ? resolve() : reject(Error("sdk_missing"));
      script.onerror = () => reject(Error("sdk_load"));
      document.head.append(script);
    }), "sdk_timeout").catch((error) => {
      script.remove();
      sdkTask = null;
      throw error;
    });
    return sdkTask;
  }
  function configureWechat() {
    if (!inWechat || wechatState === "ready") return Promise.resolve();
    if (wechatTask) return wechatTask;
    const attempt = ++wechatAttempt;
    shareDiagnostic.results = {};
    recordShareDiagnostic("signature");
    wechatState = "loading";
    renderWechatState();
    wechatTask = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        if (!CONFIG.wechat.signatureEndpoint) throw Error("signature_endpoint_missing");
        const signatureURL = new URL(CONFIG.wechat.signatureEndpoint, location.href);
        signatureURL.searchParams.set("url", wechatEntryURL);
        const response = await fetch(signatureURL, {
          signal: controller.signal, cache: "no-store", credentials: "omit",
        });
        const data = await response.json();
        if (!response.ok) {
          const code = typeof data.error === "string" && /^[a-z0-9_]+$/.test(data.error)
            ? data.error : "signature_http_" + response.status;
          throw Error(code);
        }
        if (!data.appId || !data.timestamp || !data.nonceStr || !data.signature)
          throw Error("signature_invalid");
        clearTimeout(timer);
        recordShareDiagnostic("signature", "ok");
        recordShareDiagnostic("sdk");
        await loadWechatSDK();
        recordShareDiagnostic("sdk", "ok");
        recordShareDiagnostic("config");
        const wx = window.wx;
        await withShareTimeout(new Promise((resolve, reject) => {
          wx.ready(resolve);
          wx.error((result) => {
            if (attempt === wechatAttempt) {
              wechatState = "error";
              renderWechatState();
            }
            reject(shareSDKError("config", result));
          });
          wx.config({
            debug: false,
            appId: data.appId, timestamp: data.timestamp,
            nonceStr: data.nonceStr, signature: data.signature,
            jsApiList: ["updateAppMessageShareData", "updateTimelineShareData", "showOptionMenu"],
          });
        }), "wx_config_timeout");
        recordShareDiagnostic("config", "ok");
        // wx.ready 仅代表授权完成；两个分享接口均确认成功才显示就绪。
        const setShare = (method, value) => withShareTimeout(new Promise((resolve, reject) => {
          recordShareDiagnostic(method, "pending");
          wx[method]({
            ...value,
            success: (result) => {
              if (attempt === wechatAttempt) recordShareDiagnostic(method, result?.errMsg || "ok");
              resolve();
            },
            fail: (result) => reject(shareSDKError(method, result)),
          });
        }), "wx_share_timeout");
        await Promise.all([
          setShare("updateAppMessageShareData", shareData),
          setShare("updateTimelineShareData", {
            title: shareData.title, link: shareData.link, imgUrl: shareData.imgUrl,
          }),
        ]);
        wx.showOptionMenu();
        wechatState = "ready";
        recordShareDiagnostic("ready");
      } catch (error) {
        wechatState = "error";
        recordShareDiagnostic("error", error.name === "AbortError" ? "signature_timeout" : error.message);
        console.warn("[wechat-share]", error.name === "AbortError" ? "signature_timeout" : error.message);
      } finally {
        clearTimeout(timer);
        renderWechatState();
      }
    })().finally(() => { wechatTask = null; });
    return wechatTask;
  }
  shareRetry.onclick = () => configureWechat();
  renderWechatState();
  configureWechat();
  const sharePoster = $("#share-poster");
  const embeddedPoster = sharePoster.getAttribute("src");
  $("#share-save").href = embeddedPoster;
  // 微信长按使用同源 HTTPS 图片更可靠；离线打开或网络失败则使用内嵌图卡。
  if (/^https?:$/.test(location.protocol) && CONFIG.share.poster) {
    sharePoster.addEventListener(
      "error",
      () => {
        sharePoster.src = embeddedPoster;
      },
      { once: true },
    );
    sharePoster.src = new URL(CONFIG.share.poster, location.href).href;
  }
  $("#share-btn").onclick = () => {
    renderWechatState();
    openLayer($("#share-guide"), "#share-close");
    $("#share-guide").scrollTop = 0;
    if (wechatState === "ready") window.wx.showOptionMenu();
  };
  $("#share-close").onclick = () => closeLayer($("#share-guide"));
  $("#share-guide").addEventListener("click", (event) => {
    if (event.target === $("#share-guide")) closeLayer($("#share-guide"));
  });
  $("#share-save").addEventListener("click", (event) => {
    if (inWechat) {
      event.preventDefault();
      toast("长按上方邀请卡，选择保存图片后即可转发");
    }
  });
  // 相册对话框与手势。不监听主页面滚轮，不改变原生页面滚动。
  let photoIndex = 0;
  const lightbox = $("#lightbox");
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
  function openPhoto(i) {
    photoIndex = i;
    renderPhoto();
    openLayer(lightbox, "#photo-close");
  }
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
  // 祝福公告板：最多 50 条本机留言。明确显示保存范围，未假装存在服务器。
  const savedWishes = storage.get("buji-wishes", []);
  let wishes = (Array.isArray(savedWishes) ? savedWishes : [])
    .filter(
      (x) => x && typeof x.name === "string" && typeof x.text === "string",
    )
    .slice(0, 50)
    .map((x) => ({
      name: x.name.slice(0, 20),
      text: x.text.slice(0, 160),
    }));
  function wishNode(w, fresh = false) {
    const n = el("article", "note" + (fresh ? " new-note" : ""));
    n.append(el("p", "", w.text), el("div", "note-author", "— " + w.name));
    return n;
  }
  function renderWishes() {
    const notes = $("#notes");
    notes.replaceChildren();
    [...wishes, ...CONFIG.sampleWishes]
      .slice(0, 6)
      .forEach((w) => notes.append(wishNode(w)));
  }
  renderWishes();
  function validateField(input, errorID, message) {
    const empty = !input.value.trim();
    $("#" + errorID).textContent = empty ? message : "";
    input.setAttribute("aria-invalid", String(empty));
    return !empty;
  }
  $("#guest-name").addEventListener("blur", () =>
    validateField(
      $("#guest-name"),
      "name-error",
      "请留下你的名字，让我们知道这份心意来自谁。",
    ),
  );
  $("#guest-wish").addEventListener("blur", () =>
    validateField(
      $("#guest-wish"),
      "wish-error",
      "写一句祝福，再把它贴上小岛吧。",
    ),
  );
  $("#wish-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const nameOK = validateField(
        $("#guest-name"),
        "name-error",
        "请留下你的名字，让我们知道这份心意来自谁。",
      ),
      wishOK = validateField(
        $("#guest-wish"),
        "wish-error",
        "写一句祝福，再把它贴上小岛吧。",
      );
    if (!nameOK || !wishOK) {
      (!nameOK ? $("#guest-name") : $("#guest-wish")).focus();
      return;
    }
    const w = {
      name: $("#guest-name").value.trim().slice(0, 20),
      text: $("#guest-wish").value.trim().slice(0, 160),
    };
    wishes.unshift(w);
    wishes = wishes.slice(0, 50);
    const saved = storage.set("buji-wishes", wishes);
    renderWishes();
    $("#notes").firstElementChild.classList.add("new-note");
    $("#wish-form").reset();
    $("#guest-name").removeAttribute("aria-invalid");
    $("#guest-wish").removeAttribute("aria-invalid");
    $("#form-error").textContent = saved
      ? ""
      : "当前浏览器无法保存留言，本次浏览仍可查看。";
    toast(
      saved ? "祝福已经贴上小岛，心意收到啦！" : "祝福已展示，本次浏览可见",
    );
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
  let pendingCollections = [],
    collectionBusy = false,
    collectionWakePending = false;
  const collectionTimers = new Set();
  function collectionLater(callback, ms) {
    const timer = setTimeout(() => {
      collectionTimers.delete(timer);
      callback();
    }, ms);
    collectionTimers.add(timer);
  }
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
  function closeActive() {
    if (activeDialog) closeLayer(activeDialog);
  }
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
  // 加载层不锁定滚动；等待首屏解码，设置上限，加载失败亦可进入。首次以会话为单位。
  async function finishLoading() {
    const loader = $("#loader");
    if (loader.hidden) return;
    const start = performance.now();
    await Promise.race([
      $("#hero-image")
        .decode()
        .catch(() => {}),
      new Promise((r) => setTimeout(r, 2200)),
    ]);
    const elapsed = performance.now() - start;
    setTimeout(
      () => {
        loader.classList.add("hidden-loader");
        try {
          sessionStorage.setItem("buji-visited", "1");
        } catch {}
        setTimeout(() => (loader.hidden = true), 750);
      },
      Math.max(0, 1200 - elapsed),
    );
  }
  finishLoading();
  // 页面进入后台时暂停纯装饰 CSS 动画，音频按用户开启状态继续。
  document.addEventListener("visibilitychange", () => {
    $$(".particle,.floating,.cloud,.pennants").forEach(
      (n) => (n.style.animationPlayState = document.hidden ? "paused" : ""),
    );
  });
})();
