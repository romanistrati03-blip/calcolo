const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('all fixed app.js element references exist in the HTML shell', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const app = fs.readFileSync('app.js', 'utf8');
  const ids = [...app.matchAll(/\$\(['"]#([\w-]+)['"]\)/g)].map(match => match[1]);
  const missing = [...new Set(ids)].filter(id => !html.includes(`id="${id}"`));
  assert.deepEqual(missing, []);
});

test('the app shell does not send application data to remote services', () => {
  const app = fs.readFileSync('app.js', 'utf8');
  assert.doesNotMatch(app, /\b(fetch|XMLHttpRequest|WebSocket)\s*\(/);
});
