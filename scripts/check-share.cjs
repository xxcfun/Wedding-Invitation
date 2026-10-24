/* 图片分享集成检查：不使用微信账号，不发送真实消息。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
// 读取原始邀请图片作为下载字节比对基准，验证下载内容确实是完整原图。
const poster = fs.readFileSync(path.join(root, 'assets/island-invitation-hd.jpg'));
// 临时静态服务器绑定本机回环地址；端口由系统分配，测试结束后统一关闭。
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  // 把请求路径限制在项目根目录内，避免测试服务器意外提供项目外文件。
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.jpg':'image/jpeg', '.webp':'image/webp', '.ttf':'font/ttf'};
  try { res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
(async () => {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}`;
  // 使用本机 Chrome 无头运行；可通过 CHROME_PATH 指定其他 Chrome 可执行文件。
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true});
  try {
    // 覆盖两类手机微信、普通浏览器、图片加载失败与直接打开本地 HTML。
    for (const mode of ['wechat-ios', 'wechat-android', 'browser', 'image-error', 'offline']) {
      const wechat = mode.startsWith('wechat');
      const page = await browser.newPage({viewport:{width:390,height:844}, reducedMotion:'reduce',
        userAgent:wechat ? `Mozilla/5.0 (${mode === 'wechat-ios' ? 'iPhone' : 'Linux; Android 16'}) MicroMessenger/8.0.79` : 'Mozilla/5.0'});
      // 同时记录浏览器异常与微信服务请求，确认图片分享不需要加载微信 SDK。
      const errors = [], sdkRequests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (/wxapi\.|res\d?\.wx\.qq\.com/.test(request.url())) sdkRequests.push(request.url()); });
      await page.addInitScript(() => sessionStorage.setItem('buji-visited', '1'));
      // 隔离地图签名服务；地图请求失败不得影响图片分享。
      await page.route('https://wxapi.xxcfun.cn/**', route => route.fulfill({status:503, contentType:'application/json', body:'{}', headers:{'Access-Control-Allow-Origin':'*'}}));
      // 主动阻断独立图片，验证页面可以回退到 HTML 中内嵌的相同邀请卡。
      if (mode === 'image-error') await page.route('**/assets/island-invitation-hd.jpg', route => route.abort());
      await page.goto(mode === 'offline' ? 'file://' + path.join(root, 'index.html') : base + '/?wechat_debug=1');
      await page.locator('#share-btn').click();
      await page.waitForFunction(() => document.querySelector('#share-poster').naturalWidth === 1080);
      assert.equal(await page.locator('#share-poster').isVisible(), true);
      assert.equal(await page.locator('#share-save').isVisible(), !wechat);
      assert.match(await page.locator('#share-instructions').textContent(), wechat ? /长按下方图片/ : /保存下方邀请图片/);
      assert.equal(await page.locator('#share-card-title, #share-status, #share-retry, #wechat-diagnostics').count(), 0);
      assert.equal(sdkRequests.some(url => /res\d?\.wx\.qq\.com/.test(url)), false);
      assert.equal(sdkRequests.filter(url => url.includes('wxapi.')).length, wechat ? 1 : 0);
      // 失败或离线时必须使用 data URL，保存链接也必须与实际展示的图片来源一致。
      const expectedFallback = ['image-error', 'offline'].includes(mode);
      const source = await page.locator('#share-poster').getAttribute('src');
      assert.equal(source.startsWith('data:image/jpeg;base64,'), expectedFallback);
      assert.equal(await page.locator('#share-save').getAttribute('href'), source);
      // 仅普通浏览器验证下载事件与文件内容；微信长按菜单属于原生界面，留给真机检查。
      if (!wechat) {
        const download = page.waitForEvent('download');
        await page.locator('#share-save').click();
        const result = await download;
        assert.equal(result.suggestedFilename(), '布吉岛来信-邀请图片.jpg');
        assert.deepEqual(fs.readFileSync(await result.path()), poster);
      }
      // 使用一个微信场景覆盖窄屏、横屏和桌面宽度，检查分享弹窗无溢出且始终能关闭。
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
      // 关闭后检查焦点回到分享按钮，再次打开应重置弹窗滚动位置。
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
