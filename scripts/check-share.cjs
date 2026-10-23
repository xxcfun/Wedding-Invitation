/* 图片分享集成检查：不使用微信账号，不发送真实消息。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const poster = fs.readFileSync(path.join(root, 'assets/island-invitation-hd.jpg'));
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.jpg':'image/jpeg', '.webp':'image/webp', '.ttf':'font/ttf'};
  try { res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
(async () => {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true});
  try {
    for (const mode of ['wechat-ios', 'wechat-android', 'browser', 'image-error', 'offline']) {
      const wechat = mode.startsWith('wechat');
      const page = await browser.newPage({viewport:{width:390,height:844}, reducedMotion:'reduce',
        userAgent:wechat ? `Mozilla/5.0 (${mode === 'wechat-ios' ? 'iPhone' : 'Linux; Android 16'}) MicroMessenger/8.0.79` : 'Mozilla/5.0'});
      const errors = [], sdkRequests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (/wxapi\.|res\d?\.wx\.qq\.com/.test(request.url())) sdkRequests.push(request.url()); });
      await page.addInitScript(() => sessionStorage.setItem('buji-visited', '1'));
      if (mode === 'image-error') await page.route('**/assets/island-invitation-hd.jpg', route => route.abort());
      await page.goto(mode === 'offline' ? 'file://' + path.join(root, 'index.html') : base + '/?wechat_debug=1');
      await page.locator('#share-btn').click();
      await page.waitForFunction(() => document.querySelector('#share-poster').naturalWidth === 1080);
      assert.equal(await page.locator('#share-poster').isVisible(), true);
      assert.equal(await page.locator('#share-save').isVisible(), !wechat);
      assert.match(await page.locator('#share-instructions').textContent(), wechat ? /长按下方图片/ : /保存下方邀请图片/);
      assert.equal(await page.locator('#share-card-title, #share-status, #share-retry, #wechat-diagnostics').count(), 0);
      assert.deepEqual(sdkRequests, []);
      const expectedFallback = ['image-error', 'offline'].includes(mode);
      const source = await page.locator('#share-poster').getAttribute('src');
      assert.equal(source.startsWith('data:image/jpeg;base64,'), expectedFallback);
      assert.equal(await page.locator('#share-save').getAttribute('href'), source);
      if (!wechat) {
        const download = page.waitForEvent('download');
        await page.locator('#share-save').click();
        const result = await download;
        assert.equal(result.suggestedFilename(), '布吉岛来信-邀请图片.jpg');
        assert.deepEqual(fs.readFileSync(await result.path()), poster);
      }
      if (mode === 'wechat-ios') {
        await page.locator('#loader').waitFor({state:'hidden'});
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => getComputedStyle(document.querySelector('#share-guide')).opacity === '1');
        await page.screenshot({path:'/tmp/wedding-image-share-mobile.png', animations:'disabled'});
        for (const [width, height] of [[320,740],[390,844],[480,844],[844,390],[1440,900]]) {
          await page.setViewportSize({width,height});
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          const box = await page.locator('.share-inner').boundingBox();
          assert.ok(box.x >= 0 && box.x + box.width <= width);
          await page.locator('#share-close').scrollIntoViewIfNeeded();
          assert.ok(await page.locator('#share-close').isVisible());
        }
      }
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.querySelector('#share-guide').hidden);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'share-btn');
      await page.locator('#share-btn').click();
      assert.equal(await page.locator('#share-guide').evaluate(node => node.scrollTop), 0);
      await page.locator('#share-close').click();
      await page.waitForFunction(() => document.querySelector('#share-guide').hidden);
      if (mode !== 'offline') assert.deepEqual(errors, []);
      await page.close();
      console.log('PASS ' + mode);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
