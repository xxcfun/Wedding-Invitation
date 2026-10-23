/* 手机首屏回归：模拟样式、脚本请求一直不返回，以及禁用 JavaScript。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.ttf': 'font/ttf' };
  try { res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    for (const mode of ['normal', 'stalled-css', 'stalled-scripts', 'scripts-failed', 'reduced-motion', 'no-js']) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.79',
        javaScriptEnabled: mode !== 'no-js',
        reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference',
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      let release;
      const stalled = new Promise(resolve => { release = resolve; });
      if (mode === 'stalled-css' || mode === 'stalled-scripts') {
        await page.route(mode === 'stalled-css' ? '**/styles.css' : '**/*.js', async route => { await stalled; await route.abort(); });
      }
      if (mode === 'scripts-failed' || mode === 'reduced-motion') await page.route('**/*.js', route => route.abort());
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'commit' });
        await page.locator('#cover-title').waitFor({ state: 'visible', timeout: 3000 });
        await page.waitForTimeout(mode === 'stalled-css' ? 1000 : 5800);
        assert.ok(await page.evaluate(() => performance.getEntriesByType('paint').some(entry => entry.name === 'first-contentful-paint')), mode + ': first paint');
        assert.ok(await page.locator('#loader').isHidden(), mode + ': loader must stop covering content');
        assert.ok(await page.locator('#cover-title').isVisible(), mode + ': readable title');
        assert.ok(await page.locator('.date-number').isVisible(), mode + ': readable wedding date');
        if (mode === 'stalled-css' || mode === 'normal') await page.screenshot({ path: `/tmp/wedding-loading-${mode}.png` });
        if (mode === 'normal') {
          assert.equal(await page.title(), '叮～有一封布吉岛来信📩');
          await page.locator('#share-btn').click();
          assert.ok(await page.locator('#share-guide').isVisible());
        }
        assert.deepEqual(errors, []);
        console.log('PASS ' + mode);
      } finally { release(); await context.close(); }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
