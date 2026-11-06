const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const allowedFiles = new Set(['index.html', 'styles.css', 'calculations.js', 'app.js', 'manifest.webmanifest', 'service-worker.js', 'icon.svg']);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.cjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const requested = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!allowedFiles.has(path.basename(requested))) { res.writeHead(404).end('Not found'); return; }
  if (!requested.startsWith(root + path.sep) && requested !== path.join(root, 'index.html')) { res.writeHead(403).end(); return; }
  fs.readFile(requested, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(requested)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" });
    res.end(data);
  });
}).listen(4173, '127.0.0.1', () => process.stdout.write('iPerito disponibile su http://127.0.0.1:4173\n'));
