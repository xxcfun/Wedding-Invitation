const assert = require('node:assert/strict');
const { runtime, copySources } = require('./php-wishes-runtime.cjs');
(async () => {
  for (const version of ['7.4', '8.2']) {
    const php = await runtime(version);
    try {
      copySources(php);
      const response = await php.run({ scriptPath: '/app/test/api.php' });
      assert.match(response.text, /^PASS /, response.text + '\n' + response.errors);
      console.log(response.text.trim());
    } finally { php.exit(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
