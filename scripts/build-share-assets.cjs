/* 用当前高清封面与 CONFIG 重新导出分享素材，同时更新静态 OG 和离线邀请卡。 */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const main = fs.readFileSync(path.join(root, "main.js"), "utf8");
const sandbox = {};
vm.runInNewContext(main.slice(0, main.indexOf("(() => {")) + ";globalThis.config = CONFIG;", sandbox);
const config = sandbox.config;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "wedding-share-"));
const qrFile = path.join(temp, "qr.png");
const swiftArgs = ["-module-cache-path", path.join(temp, "swift-cache"),
  path.join(__dirname, "share-qr.swift"), config.share.link, qrFile];
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));
const assets = path.join(root, "assets");
const dataURL = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;

function artwork(qr) {
  const hero = dataURL(path.join(assets, "island-cover-hd.png"), "image/png");
  const font = dataURL(path.join(assets, "island-round.ttf"), "font/ttf");
  const date = new Intl.DateTimeFormat("zh-CN", {timeZone:"Asia/Shanghai", year:"numeric", month:"2-digit", day:"2-digit"})
    .format(new Date(config.date)).replaceAll("/", ".");
  const weekday = new Intl.DateTimeFormat("zh-CN", {timeZone:"Asia/Shanghai", weekday:"long"}).format(new Date(config.date));
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>
  @font-face{font-family:round;src:url('${font}')}*{box-sizing:border-box;margin:0}
  body{background:#fff;font-family:system-ui,-apple-system,sans-serif;color:#49664f}
  .card{position:relative;overflow:hidden;background:linear-gradient(#dceff0,#eaf0dc 64%,#fff6e2);isolation:isolate}
  .hero{position:absolute;inset:0;width:100%;height:auto;z-index:-1}
  .wood{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;border:4px solid #f8e3b9;border-radius:27px;background:repeating-linear-gradient(0deg,transparent 0 19px,#ac825b0b 20px 21px),linear-gradient(110deg,#e9cca0,#e2bd89);box-shadow:0 5px 0 #b88b59,inset 0 2px 0 #fff3d2;color:#6e5035;transform:rotate(-1.5deg)}
  .names{font-family:round;font-weight:400;white-space:nowrap;letter-spacing:3px}.heart{font-family:system-ui;color:#b78061;margin:0 13px}
  #square{width:600px;height:600px}
  #square .badge{position:absolute;top:20px;left:22px;padding:10px 17px;border-radius:25px;background:#fff9e6ed;font-family:round;font-size:17px;letter-spacing:2px}
  #square .wood{left:42px;right:42px;bottom:24px;height:91px}
  #square .names{font-size:31px}#square .detail{font-size:14px;letter-spacing:2px;margin-top:9px}
  #poster{width:720px;height:1080px;margin-top:30px}
  #poster .hero{mask-image:linear-gradient(transparent,#000 23%,#000 76%,transparent 100%)}
  #poster header{position:absolute;top:29px;width:100%;text-align:center}
  #poster .kicker{font-size:14px;letter-spacing:5px}
  #poster h1{font-family:round;font-size:54px;letter-spacing:3px;font-weight:400;margin-top:22px;color:#4d7753;text-shadow:0 3px #fff9e8}
  #poster .wood{left:60px;right:60px;top:590px;height:91px}
  #poster .names{font-size:36px}
  #poster .date{position:absolute;top:707px;width:100%;font-family:round;font-size:39px;letter-spacing:4px;text-align:center}
  #poster .time{position:absolute;top:766px;width:100%;font-size:19px;letter-spacing:3px;text-align:center}
  #poster .lunar{position:absolute;top:801px;width:100%;font-size:16px;letter-spacing:2px;text-align:center;color:#6a795d}
  #poster .venue{position:absolute;top:842px;width:100%;text-align:center;font-family:round;font-size:23px;letter-spacing:2px}
  #poster .qr{position:absolute;left:282px;top:880px;width:156px;height:156px;background:#fffdf0;padding:14px;box-shadow:0 8px 22px #9ea58016}
  #poster .qr img{width:128px;height:128px;image-rendering:pixelated}
  #poster .caption{position:absolute;top:1049px;width:100%;font-size:13px;letter-spacing:2px;text-align:center;color:#69775e}
  .flower{position:absolute;left:79px;top:879px;width:39px;height:39px;color:#fff8d9}
  .sprig{position:absolute;right:79px;top:903px;width:43px;height:78px;color:#91a477}
  </style><main>
  <section class="card" id="square"><img class="hero" src="${hero}" alt="当前高清婚礼封面">
    <div class="badge">布吉岛来信</div><div class="wood"><div class="names">${escape(config.groom)}<span class="heart">♡</span>${escape(config.bride)}</div><div class="detail">${escape(date)} · 邀你见证我们的幸福</div></div>
  </section>
  <section class="card" id="poster"><img class="hero" src="${hero}" alt="当前高清婚礼封面">
    <header><div class="kicker">一封来自小岛的幸福邀请</div><h1>布吉岛来信</h1></header>
    <div class="wood"><div class="names">${escape(config.groom)}<span class="heart">♡</span>${escape(config.bride)}</div></div>
    <div class="date">${escape(date)}</div><div class="time">${escape(weekday)} · ${escape(config.timeLabel)}</div>
    <div class="lunar">农历${escape(config.lunarDate)}</div><div class="venue">${escape(config.venue)}</div>
    <div class="qr"><img src="${qr}" alt="请柬二维码"></div><div class="caption">长按识别二维码 · 打开完整请柬</div>
    <svg class="flower" viewBox="0 0 40 40"><g fill="currentColor"><circle cx="20" cy="10" r="9"/><circle cx="30" cy="18" r="9"/><circle cx="26" cy="30" r="9"/><circle cx="12" cy="30" r="9"/><circle cx="8" cy="17" r="9"/></g><circle cx="20" cy="20" r="7" fill="#e2c17b"/></svg>
    <svg class="sprig" viewBox="0 0 43 78"><path d="M16 76Q28 38 22 2" fill="none" stroke="currentColor" stroke-width="2"/><g fill="currentColor"><path d="M23 17Q40 15 36 2Q22 1 23 17ZM24 29Q7 30 6 17Q23 15 24 29ZM24 44Q41 43 39 30Q24 28 24 44ZM21 57Q4 58 3 45Q20 42 21 57Z"/></g></svg>
  </section></main></html>`;
}

function meta(html, attribute, key, value) {
  let found = false;
  const result = html.replace(/<meta\b[^>]*>/g, (tag) => {
    if (!tag.includes(`${attribute}="${key}"`)) return tag;
    found = true;
    return tag.replace(/content="[^"]*"/, `content="${escape(value)}"`);
  });
  if (!found) throw new Error(`缺少静态 meta：${key}`);
  return result;
}

(async () => {
  let browser;
  try {
    execFileSync("swift", swiftArgs, {stdio:"inherit"});
    const file = path.join(temp, "share-artwork.html");
    fs.writeFileSync(file, artwork(dataURL(qrFile, "image/png")));
    browser = await chromium.launch({headless:true,
      executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
    const page = await browser.newPage({viewport:{width:740,height:1800},deviceScaleFactor:2});
    await page.goto(pathToFileURL(file).href, {waitUntil:"load"});
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode()));
    });
    await page.waitForTimeout(3000);
    const square = await page.locator("#square").screenshot();
    const poster = await page.locator("#poster").screenshot();
    const shareFile = path.join(assets, "island-share-hd.jpg");
    const posterFile = path.join(assets, "island-invitation-hd.jpg");
    await sharp(square).jpeg({quality:88,mozjpeg:true}).toFile(shareFile);
    await sharp(poster).resize(1080,1620).jpeg({quality:94,mozjpeg:true}).toFile(posterFile);
    execFileSync("swift", [...swiftArgs, posterFile], {stdio:"inherit"});

    const htmlFile = path.join(root, "index.html");
    let html = fs.readFileSync(htmlFile, "utf8");
    for (const [attribute,key,value] of [
      ["name","description",config.share.description],
      ["property","og:title",config.share.title],
      ["property","og:description",config.share.description],
      ["property","og:url",config.share.link],
      ["property","og:image",config.share.image],
      ["property","og:image:secure_url",config.share.image],
      ["property","og:image:type","image/jpeg"],
      ["property","og:image:width","1200"],
      ["property","og:image:height","1200"],
      ["property","og:image:alt","布吉岛来信：新人在海岛花拱下牵手，新郎挥手、新娘手捧鲜花，下方为新人姓名与婚期"],
    ]) html = meta(html, attribute, key, value);
    html = html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/>)/, `$1${escape(config.share.link)}$2`);
    html = html.replace(/<img\b[^>]*\bid="share-poster"[^>]*>/, tag => tag
      .replace(/src="[^"]*"/, `src="${dataURL(posterFile, "image/jpeg")}"`)
      .replace(/width="[^"]*"/, 'width="1080"')
      .replace(/height="[^"]*"/, 'height="1620"'));
    fs.writeFileSync(htmlFile, html);
    console.log(JSON.stringify({source:"assets/island-cover-hd.png",share:await sharp(shareFile).metadata(),poster:await sharp(posterFile).metadata()},null,2));
  } finally {
    await browser?.close();
    fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(error => {console.error(error);process.exitCode=1;});
