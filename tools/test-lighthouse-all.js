'use strict';

const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

const pages = [
  'lab.html',
  'journey.html',
  'certifications.html',
  'now.html',
  'resume.html',
  '404.html'
];

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

function startStaticServer(port) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json'
  };

  const server = http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(publicDir, reqPath);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function runLighthouse(url, outputPath) {
  return new Promise((resolve, reject) => {
    const lh = spawn('cmd.exe', [
      '/c', 'npx', '--yes', 'lighthouse',
      url,
      '--output=json',
      `--output-path=${outputPath}`,
      '--chrome-flags=--headless=new',
      '--form-factor=mobile',
      '--screenEmulation.mobile=true',
      '--quiet'
    ]);
    lh.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Lighthouse exited with code ${code}`));
    });
  });
}

async function auditAll() {
  const port = await findAvailablePort();
  const server = await startStaticServer(port);
  console.log(`Static preview running at http://127.0.0.1:${port}`);

  fs.mkdirSync('baseline/lh-new', { recursive: true });
  const summary = {};

  for (const p of pages) {
    const url = `http://127.0.0.1:${port}/${p}`;
    const out = `baseline/lh-new/${p.replace('.html', '')}.json`;
    console.log(`Auditing ${p}...`);
    try {
      await runLighthouse(url, out);
      const res = JSON.parse(fs.readFileSync(out, 'utf8'));
      summary[p] = {
        performance: Math.round(res.categories.performance.score * 100),
        accessibility: Math.round(res.categories.accessibility.score * 100),
        seo: Math.round(res.categories.seo.score * 100),
        bestPractices: Math.round(res.categories['best-practices'].score * 100)
      };
      console.log(`${p} -> Perf: ${summary[p].performance}, A11y: ${summary[p].accessibility}, SEO: ${summary[p].seo}`);
    } catch (e) {
      console.error(`Error auditing ${p}:`, e.message);
    }
  }

  server.close();
  console.log('\n=== LIGHTHOUSE NEW PAGES SUMMARY ===\n', JSON.stringify(summary, null, 2));
}

auditAll().catch(console.error);
