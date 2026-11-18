'use strict';

const http = require('node:http');
const path = require('node:path');
const { readFile } = require('node:fs/promises');
const contactHandler = require('./api/contact.js');

const root = path.join(__dirname, 'public');
const port = Number(process.env.PORT) || 3000;
const maxBodyBytes = 64 * 1024;
const publicFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/portfolio', ['portfolio.html', 'text/html; charset=utf-8']],
  ['/portfolio.html', ['portfolio.html', 'text/html; charset=utf-8']],
  ['/case-studies/kairon', ['case-studies/kairon.html', 'text/html; charset=utf-8']],
  ['/case-studies/kairon.html', ['case-studies/kairon.html', 'text/html; charset=utf-8']],
  ['/case-studies/janus', ['case-studies/janus.html', 'text/html; charset=utf-8']],
  ['/case-studies/janus.html', ['case-studies/janus.html', 'text/html; charset=utf-8']],
  ['/case-studies/hive', ['case-studies/hive.html', 'text/html; charset=utf-8']],
  ['/case-studies/hive.html', ['case-studies/hive.html', 'text/html; charset=utf-8']],
  ['/directory', ['directory.html', 'text/html; charset=utf-8']],
  ['/directory.html', ['directory.html', 'text/html; charset=utf-8']],
  ['/directory.css', ['directory.css', 'text/css; charset=utf-8']],
  ['/lab', ['lab.html', 'text/html; charset=utf-8']],
  ['/lab.html', ['lab.html', 'text/html; charset=utf-8']],
  ['/lab.css', ['lab.css', 'text/css; charset=utf-8']],
  ['/journey', ['journey.html', 'text/html; charset=utf-8']],
  ['/journey.html', ['journey.html', 'text/html; charset=utf-8']],
  ['/journey.css', ['journey.css', 'text/css; charset=utf-8']],
  ['/certifications', ['certifications.html', 'text/html; charset=utf-8']],
  ['/certifications.html', ['certifications.html', 'text/html; charset=utf-8']],
  ['/certifications.css', ['certifications.css', 'text/css; charset=utf-8']],
  ['/now', ['now.html', 'text/html; charset=utf-8']],
  ['/now.html', ['now.html', 'text/html; charset=utf-8']],
  ['/now.css', ['now.css', 'text/css; charset=utf-8']],
  ['/resume', ['resume.html', 'text/html; charset=utf-8']],
  ['/resume.html', ['resume.html', 'text/html; charset=utf-8']],
  ['/resume.css', ['resume.css', 'text/css; charset=utf-8']],
  ['/404', ['404.html', 'text/html; charset=utf-8']],
  ['/404.html', ['404.html', 'text/html; charset=utf-8']],
  ['/404.css', ['404.css', 'text/css; charset=utf-8']],
  ['/case-studies/case-study.css', ['case-studies/case-study.css', 'text/css; charset=utf-8']],
  ['/landing.css', ['landing.css', 'text/css; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/script.js', ['script.js', 'application/javascript; charset=utf-8']],
  ['/signal-lab.js', ['signal-lab.js', 'application/javascript; charset=utf-8']],
  ['/data/prices.json', ['data/prices.json', 'application/json; charset=utf-8']],
  ['/data/prices.example.json', ['data/prices.example.json', 'application/json; charset=utf-8']],
  ['/robots.txt', ['robots.txt', 'text/plain; charset=utf-8']],
  ['/sitemap.xml', ['sitemap.xml', 'application/xml; charset=utf-8']],
  ['/JAL_PATEL_RESUME.pdf', ['JAL_PATEL_RESUME.pdf', 'application/pdf']],
  ['/assets/hero-signal-map.svg', ['assets/hero-signal-map.svg', 'image/svg+xml; charset=utf-8']],
  ['/assets/landing-ai-mesh.svg', ['assets/landing-ai-mesh.svg', 'image/svg+xml; charset=utf-8']],
  ['/assets/jp-mark.svg', ['assets/jp-mark.svg', 'image/svg+xml; charset=utf-8']],
  ['/assets/project-hive.svg', ['assets/project-hive.svg', 'image/svg+xml; charset=utf-8']],
  ['/assets/project-janus.svg', ['assets/project-janus.svg', 'image/svg+xml; charset=utf-8']],
  ['/assets/project-kairon.svg', ['assets/project-kairon.svg', 'image/svg+xml; charset=utf-8']],
  ['/assets/og-card.png', ['assets/og-card.png', 'image/png']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml; charset=utf-8']],
  ['/favicon-32x32.png', ['favicon-32x32.png', 'image/png']],
  ['/apple-touch-icon.png', ['apple-touch-icon.png', 'image/png']],
  ['/site.webmanifest', ['site.webmanifest', 'application/manifest+json']]
]);

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

async function handleContact(req, res) {
  if (req.method !== 'POST') {
    return contactHandler(req, res);
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      req.resume();
      return sendJson(res, 413, { error: 'The message is too large.' });
    }
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString('utf8');
  const contentType = String(req.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
  if (contentType === 'application/x-www-form-urlencoded') {
    req.body = Object.fromEntries(new URLSearchParams(body));
  } else {
    try {
      req.body = JSON.parse(body);
    } catch (error) {
      req.body = body;
    }
  }

  return contactHandler(req, res);
}

const server = http.createServer(async function (req, res) {
  let pathname;
  try {
    pathname = new URL(req.url, 'http://localhost').pathname;
  } catch (error) {
    return sendJson(res, 400, { error: 'Invalid request path.' });
  }

  if (pathname === '/api/contact') {
    return handleContact(req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const asset = publicFiles.get(pathname);
  if (!asset) {
    return sendJson(res, 404, { error: 'Not found.' });
  }

  try {
    const file = path.join(root, asset[0]);
    const content = await readFile(file);
    res.writeHead(200, {
      'Content-Type': asset[1],
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self' https://fonts.gstatic.com; form-action 'self' https://mail.google.com; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      'X-Frame-Options': 'DENY',
      'Cache-Control': 'no-store'
    });
    return res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return sendJson(res, 404, { error: 'Not found.' });
    }
    console.error(`Unable to serve ${asset[0]}:`, error.message);
    return sendJson(res, 500, { error: 'Unable to serve this page.' });
  }
});

server.listen(port, function () {
  console.log(`Portfolio preview is available at http://localhost:${port}`);
});
