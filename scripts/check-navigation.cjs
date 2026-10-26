/* 微信地图集成回归：模拟签名服务与 JS-SDK，不使用公众号密钥。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
// 临时静态服务器绑定本机回环地址；端口由系统分配，测试结束后统一关闭。
const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname;
  // 把请求路径限制在项目根目录内，避免测试服务器意外提供项目外文件。
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css'};
  try { res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
// 模拟最小微信 SDK：记录 config 与位置参数，并按场景主动触发 ready、error 或延迟就绪。
const sdk = `
window.mapCalls = [];
window.configCalls = [];
window.shareCalls = [];
let ready, error;
window.releaseMap = () => { window.mapReady = true; ready(); };
window.wx = {
  ready: callback => { ready = callback; },
  error: callback => { error = callback; },
  config: value => {
    configCalls.push(value);
    queueMicrotask(() => {
      if (window.testMode === 'config-error' && configCalls.length === 1) error({errMsg:'config:invalid signature'});
      else if (window.testMode !== 'loading') window.releaseMap();
    });
  },
  updateAppMessageShareData: value => shareCalls.push({api: "friend", ...value}),
  updateTimelineShareData: value => shareCalls.push({api: "timeline", ...value}),
  openLocation: value => {
    const {fail, ...location} = value;
    mapCalls.push(location);
    if (window.testMode === 'open-error') value.fail({errMsg:'openLocation:fail'});
  }
};`;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  // 使用本机 Chrome 无头运行；可通过 CHROME_PATH 指定其他 Chrome 可执行文件。
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true});
  try {
    // 同一套测试覆盖微信两类系统、初始化等待、三类重试、打开失败、普通浏览器和桌面。
    for (const mode of ['ios', 'android', 'loading', 'signature-error', 'sdk-error', 'config-error', 'open-error', 'browser-ios', 'browser-android', 'desktop']) {
      const inWeChat = !mode.startsWith('browser') && mode !== 'desktop';
      const android = mode.includes('android');
      const ua = mode === 'desktop' ? 'Mozilla/5.0 (Macintosh)' : `Mozilla/5.0 (${android ? 'Linux; Android 16' : 'iPhone; CPU iPhone OS 18_0 like Mac OS X'}) Mobile${inWeChat ? ' MicroMessenger/8.0.79' : ''}`;
      const page = await browser.newPage({viewport:{width:390,height:844}, reducedMotion:'reduce', userAgent:ua});
      const errors = [], signatures = [];
      let sdkRequests = 0;
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(mode => { window.testMode = mode; sessionStorage.setItem('buji-visited', '1'); }, mode);
      // 拦截签名请求并记录其原始网页 URL；失败场景只让首次请求失败，以验证下一次点击能恢复。
      await page.route('https://wxapi.xxcfun.cn/**', route => {
        signatures.push(new URL(route.request().url()).searchParams.get('url'));
        return route.fulfill({status:mode === 'signature-error' && signatures.length === 1 ? 503 : 200,
          contentType:'application/json', headers:{'Access-Control-Allow-Origin':'*'},
          body:JSON.stringify({appId:'wx-test', timestamp:1790000000, nonceStr:'test-nonce', signature:'test-signature'})});
      });
      // 用本地模拟 SDK 替代官方脚本，不调用真实微信能力；可单独模拟首次脚本加载失败。
      await page.route('https://res.wx.qq.com/open/js/jweixin-1.6.0.js', route => {
        sdkRequests++;
        return mode === 'sdk-error' && sdkRequests === 1 ? route.abort() : route.fulfill({contentType:'text/javascript', body:sdk});
      });
      // 故意携带查询参数、百分号编码和 hash，验证签名保留前两者且移除 hash。
      await page.goto(base + '/?from=group&value=a%2Fb#info');
      const navigate = page.locator('[data-navigate]').first();
      if (['signature-error', 'sdk-error', 'config-error'].includes(mode)) {
        // 首次初始化失败后，由下一次用户点击触发重试。
        await page.waitForTimeout(150);
        await navigate.click();
        assert.match(await page.locator('#toast').textContent(), /正在重试/);
      }
      // 手动扣住 ready 回调，验证提前点击只显示等待提示；释放后也不能自动弹出地图。
      if (mode === 'loading') {
        await page.waitForFunction(() => window.configCalls?.length === 1);
        await navigate.click();
        assert.match(await page.locator('#toast').textContent(), /地图正在准备/);
        assert.equal(await page.evaluate(() => mapCalls.length), 0);
        await page.evaluate(() => releaseMap());
      }
      // 确认微信鉴权完成后仍需明确点击，再核对酒店名、地址、经纬度及最小接口权限列表。
      if (inWeChat) {
        await page.waitForFunction(() => window.mapReady === true);
        assert.equal(await page.evaluate(() => mapCalls.length), 0, '初始化完成不能自动打开地图');
        await navigate.click();
        const calls = await page.evaluate(() => mapCalls);
        assert.equal(calls.length, 1);
        assert.deepEqual({...calls[0]}, {latitude:36.694075, longitude:118.457025, name:'海岱禧合婚礼艺术中心', address:'山东省潍坊市青州市王府街道后营子街808号（西苑小学对面）· 十里红妆厅', scale:16, infoUrl:'https://wedding.xxcfun.cn'});
        const configs = await page.evaluate(() => configCalls);
        assert.deepEqual(configs.at(-1).jsApiList, ['openLocation', 'updateAppMessageShareData', 'updateTimelineShareData']);
        const shares = await page.evaluate(() => shareCalls);
        assert.deepEqual(shares.map(value => value.api), ['friend', 'timeline']);
        for (const share of shares) {
          assert.equal(share.title, '叮～有一封布吉岛来信📩');
          assert.equal(share.link, 'https://wedding.xxcfun.cn');
          assert.equal(share.imgUrl, 'https://wedding.xxcfun.cn/assets/island-share-hd.jpg');
          assert.ok(share.desc.includes('2026年11月4日'));
        }
        assert.equal(configs.at(-1).debug, false);
        assert.ok(signatures.every(url => url === base + '/?from=group&value=a%2Fb'));
        if (mode === 'open-error') assert.match(await page.locator('#toast').textContent(), /地图打开失败/);
      // 普通浏览器不应请求签名或 SDK，导航仍保留对应系统的高德链接；桌面点击应显示手机提示。
      } else {
        assert.equal(signatures.length, 0);
        assert.equal(sdkRequests, 0);
        assert.ok((await navigate.getAttribute('href')).startsWith(android || mode === 'desktop' ? 'androidamap://' : 'iosamap://'));
        if (mode === 'desktop') {
          await navigate.click();
          assert.match(await page.locator('#toast').textContent(), /手机上打开/);
        }
      }
      // 业务失败通过页面提示处理，不能变成未捕获脚本异常。
      assert.deepEqual(errors, []);
      await page.close();
      console.log('PASS ' + mode);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
