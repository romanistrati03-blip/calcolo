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

test('mobile navigation uses a short primary bar and a separate property menu', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /class="mobile-nav"/);
  assert.match(html, /id="property-menu"/);
  assert.equal((html.match(/class="mobile-item/g) || []).length, 5);
  assert.doesNotMatch(html, /id="offline-state"/);
});

test('mobile form controls use 16px text to avoid Safari focus zoom', () => {
  const css = fs.readFileSync('styles.css', 'utf8');
  assert.match(css, /@media\s*\(max-width:\s*700px\)[\s\S]*?\.form-grid input,\.form-grid select,\.data-table input\s*\{[^}]*font-size:\s*16px/);
});
