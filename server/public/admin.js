'use strict';
let token = '', cursor = null, busy = false, generation = 0;
const $ = s => document.querySelector(s);
async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(response.status === 401 ? '密钥无效，请重新输入。' : response.status === 429 ? '操作过于频繁，请稍后重试。' : '操作失败，请重试。');
  return response.json();
}
function itemNode(item) {
  const article = document.createElement('article');
  const heading = document.createElement('strong'); heading.textContent = item.name;
  const text = document.createElement('p'); text.textContent = item.text;
  const meta = document.createElement('small'); meta.textContent = `#${item.id} · ${new Date(item.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} · ${item.status === 'hidden' ? '已隐藏' : '公开中'}`;
  const button = document.createElement('button'); button.type = 'button'; button.textContent = item.status === 'hidden' ? '恢复展示' : '隐藏留言';
  button.addEventListener('click', async () => {
    button.disabled = true;
    const current = generation;
    try {
      await request('/api/admin/wishes/' + item.id, { method: 'PATCH', body: JSON.stringify({ status: item.status === 'hidden' ? 'published' : 'hidden' }) });
      if (current !== generation) return;
      item.status = item.status === 'hidden' ? 'published' : 'hidden'; article.replaceWith(itemNode(item)); $('#status').textContent = '留言状态已更新。';
    } catch (error) { if (current === generation) $('#status').textContent = error.message; }
    finally { button.disabled = false; }
  });
  article.append(heading, text, meta, document.createElement('br'), button); return article;
}
async function load(reset = false) {
  if (busy || !token) return;
  busy = true;
  const current = generation;
  $('#more').disabled = true; $('#login button').disabled = true; $('#status').textContent = '正在加载…';
  try {
    const data = await request('/api/admin/wishes?limit=20' + (!reset && cursor ? '&before=' + cursor : ''));
    if (current !== generation) return;
    if (reset) $('#items').replaceChildren();
    data.items.forEach(item => $('#items').append(itemNode(item)));
    cursor = data.nextCursor; $('#more').hidden = !cursor;
    $('#status').textContent = $('#items').children.length ? '可隐藏或恢复留言，时间为北京时间。' : '还没有留言。';
  } catch (error) { if (current === generation) $('#status').textContent = error.message; }
  finally { busy = false; $('#more').disabled = false; $('#login button').disabled = false; }
}
$('#login').addEventListener('submit', event => { event.preventDefault(); if (busy) return; token = $('#token').value.trim(); $('#token').value = ''; generation++; load(true); });
$('#more').addEventListener('click', () => load());
$('#logout').addEventListener('click', () => { generation++; token = ''; cursor = null; $('#token').value = ''; $('#items').replaceChildren(); $('#more').hidden = true; $('#status').textContent = '已退出。'; });
