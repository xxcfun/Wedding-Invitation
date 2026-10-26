/* 与 CONFIG 同步无脚本访问使用的日历文件。 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const config = vm.runInNewContext(source.slice(0, source.indexOf('/* =====================================================================', 10)) + '\nCONFIG');
const date = new Date(config.date);
if (!Number.isFinite(date.getTime())) throw new Error('婚期无效');
const escape = value => String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const time = value => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Buji Island//Wedding//ZH', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
  `UID:buji-wedding-${date.getTime()}@invitation`, `DTSTAMP:${time(date)}`, `DTSTART:${time(date)}`,
  `SUMMARY:${escape(config.groom + '与' + config.bride + '的婚礼')}`, `LOCATION:${escape(config.venueFull + '，' + config.address)}`,
  `DESCRIPTION:${escape('诚邀您见证我们的幸福时刻。流程以现场安排为准。完整请柬：' + config.share.link)}`, 'END:VEVENT', 'END:VCALENDAR', ''];
// RFC 5545：每行最多 75 字节，续行空格也计入长度，中文字符不拆分。
const fold = line => {
  let result = '', width = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    if (width + size > 75) { result += '\r\n '; width = 1; }
    result += char; width += size;
  }
  return result;
};
fs.writeFileSync(path.join(root, 'assets/wedding.ics'), lines.map(fold).join('\r\n'));
console.log('已同步 assets/wedding.ics');
