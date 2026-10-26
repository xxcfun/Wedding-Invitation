/* 真实 PHP/SQLite 与静态前端联调；仅使用临时数据库。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'wishes-ui-'));
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server => new Promise(resolve => server.close(resolve));
(async () => {
  let api, browser;
  const staticServer = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname !== '/' && !/^\/(index\.html|main\.js|loader\.js|hero-motion\.js|styles\.css|assets\/[\w.-]+)$/.test(pathname)) { res.writeHead(404).end(); return; }
    const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
    try { res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
    catch { res.writeHead(404).end(); }
  });
  await listen(staticServer);
  try {
    const origin = `http://127.0.0.1:${staticServer.address().port}`;
    const token = 'browser-test-only-'.repeat(3);
    const { startPhpServer } = require('./php-wishes-runtime.cjs');
    api = await startPhpServer({ origins: [origin], token });
    const apiOrigin = api.base;
    const endpoint = apiOrigin + '/api/wishes';
    const url = origin + '/?wishesApi=' + encodeURIComponent(endpoint) + '#wishes';
    async function countWishes() {
      const response = await fetch(apiOrigin + '/api/admin/wishes?limit=50', { headers: { Authorization: 'Bearer ' + token } });
      assert.equal(response.status, 200); return (await response.json()).items.length;
    }
    for (let i = 0; i < 8; i++) {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '亲友' + i, text: '小岛祝福 ' + i, requestId: randomUUID() }) });
      assert.equal(response.status, 201, await response.text());
    }
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    await context.route('https://**/*', route => route.abort());
    const page = await context.newPage();
    await page.goto(url); await page.locator('#wishes').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelectorAll('#notes .note').length === 6);
    await page.locator('#wish-more').click();
    await page.waitForFunction(() => document.querySelectorAll('#notes .note').length === 8);
    assert.equal(await page.locator('#islander-notes .note').count(), 3);
    await page.locator('#wish-form button').click(); assert.equal(await page.locator('#guest-name').getAttribute('aria-invalid'), 'true');
    await page.locator('#guest-name').fill('小明'); await page.locator('#guest-wish').fill('<img src=x onerror=alert(1)> 新婚快乐！');
    // 服务端已提交，但浏览器丢失响应：重载后必须复用草稿中的请求 ID。
    await page.route(endpoint, async route => {
      if (route.request().method() !== 'POST') return route.continue();
      await route.fetch(); await route.abort();
    });
    await page.locator('#wish-form button').click();
    await page.waitForFunction(() => document.querySelector('#form-error').textContent.includes('重试'));
    assert.equal(await page.locator('#guest-wish').inputValue(), '<img src=x onerror=alert(1)> 新婚快乐！');
    assert.equal(await countWishes(), 9);
    await page.unroute(endpoint);
    await page.reload(); await page.locator('#wishes').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#guest-name').inputValue(), '小明');
    await page.locator('#wish-form button').click();
    await page.waitForFunction(() => document.querySelector('#guest-wish').value === '');
    assert.equal(await countWishes(), 9);
    assert.equal(await page.locator('#notes img').count(), 0);
    assert.ok((await page.locator('#notes').textContent()).includes('<img src=x onerror=alert(1)>'));
    // 第二个独立浏览器会话看到新留言。
    const secondContext = await browser.newContext({ viewport: { width: 320, height: 760 }, reducedMotion: 'reduce' });
    await secondContext.route('https://**/*', route => route.abort());
    const second = await secondContext.newPage(); await second.goto(url); await second.locator('#wishes').scrollIntoViewIfNeeded();
    await second.waitForFunction(() => document.querySelector('#notes').textContent.includes('小明'));
    // 网络读取失败仍保留已加载内容，并可显式重试。
    await page.route(endpoint + '*', route => route.abort()); await page.locator('#wish-refresh').click();
    await page.waitForFunction(() => document.querySelector('#wish-refresh').textContent === '重试加载');
    assert.ok(await page.locator('#notes .note').count()); await page.unroute(endpoint + '*');
    await page.locator('#wish-refresh').click();
    await page.waitForFunction(() => document.querySelector('#wish-refresh').textContent === '刷新祝福');
    // 管理员隐藏 / 恢复，公开列表同步。
    const admin = await context.newPage(); await admin.goto(apiOrigin + '/admin'); await admin.locator('#token').fill(token); await admin.locator('#login button[type=submit]').click();
    await admin.waitForSelector('#items article'); await admin.locator('#items article button').first().click();
    await admin.waitForFunction(() => document.querySelector('#items article small').textContent.includes('已隐藏'));
    await page.locator('#wish-refresh').click(); await page.waitForFunction(() => !document.querySelector('#notes').textContent.includes('小明'));
    await admin.locator('#items article button').first().click();
    await admin.waitForFunction(() => document.querySelector('#items article small').textContent.includes('公开中'));
    // 移动端与桌面无横向溢出。
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 }); await page.locator('#wishes').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(runtime, 'wishes-mobile.png'), fullPage: false });
    assert.deepEqual(errors, []);
    console.log('PASS: 分页、校验、丢失响应后重载重试去重、跨会话共享、纯文本防注入、网络重试、管理隐藏恢复、320/390/1440 布局');
    console.log('Screenshot: ' + path.join(runtime, 'wishes-mobile.png'));
    await secondContext.close(); await context.close();
  } finally {
    if (browser) await browser.close(); if (api) await api.close(); await close(staticServer);
    // 截图保留在临时目录，数据库删除。
    for (const name of fs.readdirSync(runtime)) if (name.startsWith('wishes.sqlite')) fs.rmSync(path.join(runtime, name));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
