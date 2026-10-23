/* 浏览器集成检查：模拟微信 SDK 和签名响应，不使用公众号密钥。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const file = path.join(root, new URL(req.url, 'http://localhost').pathname === '/' ? 'index.html' : decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.webp':'image/webp', '.jpg':'image/jpeg', '.ttf':'font/ttf'};
  try { res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true});
  try {
    for (const mode of ['success', 'signature-retry', 'invalid-signature', 'sdk-error', 'config-error', 'api-error', 'timeout', 'browser']) {
      const page = await browser.newPage({viewport:{width:390,height:844}, userAgent:mode === 'browser' ? 'Mozilla/5.0' : 'Mozilla/5.0 MicroMessenger/8.0.50'});
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      let signatures = 0;
      const entry = `${base}/?from=singlemessage&value=a%2Bb#invitation`;
      await page.addInitScript(({mode}) => {
        sessionStorage.setItem("buji-visited", "1");
        window.__shareCalls = {};
        window.__mode = mode;
        if (mode === 'timeout') {
          const original = window.setTimeout;
          window.setTimeout = (cb, ms, ...args) => original(cb, ms === 12000 ? 80 : ms, ...args);
        }
      }, {mode});
      await page.route('https://wedding.xxcfun.cn/assets/**', route => route.fulfill({body:fs.readFileSync(path.join(root, 'assets', path.basename(new URL(route.request().url()).pathname))), contentType:'image/jpeg'}));
      await page.route('https://wxapi.xxcfun.cn/**', async route => {
        signatures++;
        assert.equal(new URL(route.request().url()).searchParams.get('url'), entry.split('#')[0]);
        await route.fulfill({status:mode === 'signature-retry' && signatures === 1 ? 503 : 200,
          contentType:'application/json', headers:{'Access-Control-Allow-Origin':'*'},
          body:JSON.stringify(mode === 'invalid-signature' ? {} : {appId:'wx-test', timestamp:1790000000, nonceStr:'test', signature:'test'})});
      });
      await page.route('https://res.wx.qq.com/**', route => mode === 'sdk-error' ? route.abort() : route.fulfill({contentType:'text/javascript',body:`
        (() => {
          let ready, error;
          window.wx = {
            ready(fn) { ready = fn; }, error(fn) { error = fn; },
            config(data) { window.__shareCalls.config = data; queueMicrotask(() => window.__mode === 'config-error' ? error({errMsg:'invalid signature'}) : ready()); },
            updateAppMessageShareData(data) { window.__shareCalls.friend = data; if (window.__mode !== 'timeout') queueMicrotask(() => window.__mode === 'api-error' ? data.fail() : data.success()); },
            updateTimelineShareData(data) { window.__shareCalls.timeline = data; queueMicrotask(() => data.success()); },
            showOptionMenu() { window.__shareCalls.menu = true; }
          };
        })();` }));
      await page.goto(entry);
      await page.locator('#share-btn').click();
      const expected = ['success'].includes(mode) ? '分享已准备好' : mode === 'browser' ? '微信中打开后' : '暂未准备好';
      await page.waitForFunction(text => document.querySelector('#share-status').textContent.includes(text), expected);
      if (mode === 'signature-retry') {
        await page.locator('#share-retry').click();
        await page.waitForFunction(() => document.querySelector('#share-status').textContent.includes('分享已准备好'));
        assert.equal(signatures, 2);
      }
      if (mode === 'success' || mode === 'signature-retry') {
        const calls = await page.evaluate(() => window.__shareCalls);
        assert.equal(calls.friend.title, '刁勇辰与李汝静 · 布吉岛来信');
        assert.equal(calls.friend.link, 'https://wedding.xxcfun.cn/');
        assert.equal(calls.friend.imgUrl, 'https://wedding.xxcfun.cn/assets/island-share-hd.jpg');
        assert.equal(calls.timeline.title, calls.friend.title);
        assert.equal(calls.menu, true);
        assert.equal(await page.locator('#share-retry').isVisible(), false);
      }
      if (mode === 'browser') assert.equal(signatures, 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      if (mode === 'success') {
        await page.locator('#loader').waitFor({state:'hidden'});
        await page.waitForFunction(() => getComputedStyle(document.querySelector('#share-guide')).opacity === '1');
        await page.screenshot({path:'/tmp/wedding-wechat-share.png', animations:'disabled'});
        for (const width of [320, 480, 768, 1440]) {
          await page.setViewportSize({width, height:844});
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          const box = await page.locator('.share-inner').boundingBox();
          assert.ok(box.x >= 0 && box.x + box.width <= width);
        }
        await page.setViewportSize({width:390,height:844});
      }
      await page.locator('.share-poster-option summary').click();
      assert.equal(await page.locator('#share-poster').isVisible(), true);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.querySelector('#share-guide').hidden);
      await page.close();
      console.log(`PASS ${mode}`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
