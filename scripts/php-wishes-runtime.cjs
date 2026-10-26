// 可选测试适配器：PHP WebAssembly 执行实际 PHP 入口；生产没有 Node 依赖。
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { PHP } = require('@php-wasm/universal');
const { loadNodeRuntime } = require('@php-wasm/node');

async function runtime(version = '8.2') {
  const entry = require.resolve('@php-wasm/node-' + version.replace('.', '-'));
  return new PHP(await loadNodeRuntime(version, { emscriptenOptions: {
    processId: Number(version.replace('.', '')) * 100 + 13,
    locateFile: file => path.isAbsolute(file) ? file : path.join(path.dirname(entry), 'asyncify', file),
  } }));
}
function copySources(php, root = '/app') {
  for (const directory of ['public', 'private', 'bin', 'test']) {
    php.mkdir(root + '/' + directory);
    for (const name of fs.readdirSync(path.join(__dirname, '../server', directory))) {
      const source = path.join(__dirname, '../server', directory, name);
      if (fs.statSync(source).isFile()) php.writeFile(root + '/' + directory + '/' + name, fs.readFileSync(source));
    }
  }
  php.writeFile(root + '/router.php', fs.readFileSync(path.join(__dirname, '../server/router.php')));
}
async function startPhpServer({ origins, token, version = '8.2' }) {
  const php = await runtime(version);
  copySources(php);
  const config = { database_path: '/app/private/data/wishes.sqlite', admin_token: token, allowed_origins: origins };
  const configure = () => php.writeFile('/app/private/wishes-config.php', '<?php return json_decode(' + "'" + JSON.stringify(config).replace(/'/g, "\\'") + "', true);");
  configure();
  let queue = Promise.resolve();
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      queue = queue.then(async () => {
        const result = await php.run({ scriptPath: '/app/router.php', relativeUri: request.url, method: request.method, headers: request.headers, body: Buffer.concat(chunks), $_SERVER: { REMOTE_ADDR: '127.0.0.1' } });
        if (result.errors) throw new Error(result.errors);
        response.writeHead(result.httpStatusCode, result.headers); response.end(Buffer.from(result.bytes));
      }).catch(error => { response.writeHead(500); response.end('PHP test runtime failed'); console.error(error); });
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  config.allowed_origins.push(base); configure();
  return { base, php, close: async () => { await new Promise(resolve => server.close(resolve)); await queue; php.exit(); } };
}
module.exports = { runtime, copySources, startPhpServer };
