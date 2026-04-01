const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT = 5500;

const ROUTES = {
  '/api/cad':    'https://ssd-api.jpl.nasa.gov/cad.api?date-min=now&date-max=%2B30&dist-max=0.05&neo=true&fullname=true&diameter=true',
  '/api/sentry': 'https://ssd-api.jpl.nasa.gov/sentry.api',
};

function proxy(res, url) {
  https.get(url, { headers: { 'User-Agent': 'neo-dashboard/1.0' } }, upstream => {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    upstream.pipe(res);
  }).on('error', e => {
    res.writeHead(502);
    res.end(JSON.stringify({ error: e.message }));
  });
}

http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (ROUTES[url]) return proxy(res, ROUTES[url]);

  // Serve static files
  const file = url === '/' ? '/index.html' : url;
  const full = path.join(__dirname, file);

  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(full);
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`NEO Dashboard running at http://localhost:${PORT}`));
