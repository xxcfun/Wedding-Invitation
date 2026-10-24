/* 手机首屏回归：模拟样式、脚本请求一直不返回，以及禁用 JavaScript。 */
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
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
  try { res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  // 使用本机 Chrome 无头运行；可通过 CHROME_PATH 指定其他 Chrome 可执行文件。
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    // 逐个隔离验证正常加载、等待完整样式、脚本悬挂或失败、减少动效与禁用 JS 的首屏表现。
    for (const mode of ['normal', 'stalled-css', 'stalled-hero', 'stalled-scripts', 'scripts-failed', 'reduced-motion', 'no-js']) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.79',
        javaScriptEnabled: mode !== 'no-js',
        reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference',
      });
      const page = await context.newPage();
      const errors = [];
      // 签名服务固定返回失败，首屏检查不依赖真实公众号或外网状态。
      await page.route('https://wxapi.xxcfun.cn/**', route => route.fulfill({status:503, body:'{}', headers:{'Access-Control-Allow-Origin':'*'}}));
      page.on('pageerror', error => errors.push(error.message));
      // 可控悬挂请求在本轮 finally 中释放；测试期间保持请求未完成，模拟连接一直等待。
      const audioRequests = [];
      page.on('request', request => { if (request.url().endsWith('.mp3')) audioRequests.push(request.url()); });
      let release;
      const stalled = new Promise(resolve => { release = resolve; });
      if (mode === 'stalled-css') await page.route('**/styles.css', async route => { await stalled; await route.continue(); });
      if (mode === 'stalled-scripts') await page.route('**/*.js', async route => { await stalled; await route.abort(); });
      // 慢网封面未返回时，文字应先显示，音乐不应抢占最初的下载带宽。
      if (mode === 'stalled-hero') await page.route('**/assets/island-cover-hd.webp', async route => { await stalled; await route.abort(); });
      // 减少动效场景同时阻断脚本，用于验证纯 CSS 的降级展示，不只是 JS 开关。
      if (mode === 'scripts-failed' || mode === 'reduced-motion') await page.route('**/*.js', route => route.abort());
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'commit' });
        if (mode === 'stalled-css') {
          await page.waitForTimeout(1000);
          assert.equal(await page.evaluate(() => performance.getEntriesByType('paint').some(entry => entry.name === 'first-contentful-paint')), false, '完整样式到达前不提前绘制正文');
          release();
          await page.waitForFunction(() => Array.from(document.styleSheets).some(sheet => sheet.href && sheet.href.endsWith('/styles.css')));
        }
        await page.locator('#cover-title').waitFor({ state: 'visible', timeout: 3000 });
        // 给欢迎层的脚本和 CSS 超时路径留足时间，再检查是否真正露出正文。
        await page.waitForTimeout(mode === 'stalled-hero' ? 1100 : 2200);
        // 不仅检查 DOM 存在，还验证发生首次内容绘制、欢迎层隐藏以及标题日期可见。
        assert.ok(await page.evaluate(() => performance.getEntriesByType('paint').some(entry => entry.name === 'first-contentful-paint')), mode + ': first paint');
        if (mode === 'stalled-hero') assert.deepEqual(audioRequests, [], '封面等待期间不下载音乐');
        assert.ok(await page.locator('#loader').isHidden(), mode + ': loader must stop covering content');
        assert.ok(await page.locator('#cover-title').isVisible(), mode + ': readable title');
        assert.ok(await page.locator('.date-number').isVisible(), mode + ': readable wedding date');
        if (mode === 'stalled-css' || mode === 'normal') await page.screenshot({ path: `/tmp/wedding-loading-${mode}.png` });
        // 正常路径额外检查页面标题与分享按钮，确保降级优化没有破坏常规交互。
        if (mode === 'normal') {
          // 确认压缩后的完整字库能通过浏览器解码，而不只是文件生成成功。
          assert.equal(await page.evaluate(async () => { await document.fonts.load('16px IslandRound'); return document.fonts.check('16px IslandRound'); }), true);
          assert.equal(await page.title(), '叮～有一封布吉岛来信📩');
          await page.locator('#share-btn').click();
          assert.ok(await page.locator('#share-guide').isVisible());
        }
        assert.deepEqual(errors, []);
        console.log('PASS ' + mode);
      // 每个场景结束都解除悬挂并销毁浏览器上下文，防止未完成请求影响下一轮。
      } finally { release(); await context.close(); }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
