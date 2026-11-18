'use strict';

const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

const viewports = [320, 360, 390, 768, 1024, 1366, 1920];
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
    '.png': 'image/png'
  };

  const server = http.createServer((req, res) => {
    const p = req.url.split('?')[0];
    const file = path.join(publicDir, p === '/' ? 'index.html' : p);
    if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(file)] || 'text/plain' });
    fs.createReadStream(file).pipe(res);
  });

  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

async function testResponsive() {
  const port = await findAvailablePort();
  const server = await startStaticServer(port);

  const cdpPort = await findAvailablePort();
  const tmpDir = path.join(os.tmpdir(), `cdp-responsive-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${tmpDir}`,
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  await new Promise((r) => setTimeout(r, 1500));
  const ver = await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));

  let id = 1;
  const send = (socket, method, params = {}) =>
    new Promise((resolve, reject) => {
      const curId = id++;
      const onMsg = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === curId) {
          socket.removeEventListener('message', onMsg);
          if (data.error) reject(new Error(data.error.message));
          else resolve(data.result);
        }
      };
      socket.addEventListener('message', onMsg);
      socket.send(JSON.stringify({ id: curId, method, params }));
    });

  let totalChecks = 0;
  let issues = 0;

  for (const p of pages) {
    const target = await send(ws, 'Target.createTarget', { url: 'about:blank' });
    const pageWs = new WebSocket(`ws://127.0.0.1:${cdpPort}/devtools/page/${target.targetId}`);
    await new Promise((resolve) => (pageWs.onopen = resolve));

    await send(pageWs, 'Page.enable');
    await send(pageWs, 'Runtime.enable');

    for (const width of viewports) {
      await send(pageWs, 'Emulation.setDeviceMetricsOverride', {
        width,
        height: 800,
        deviceScaleFactor: 1,
        mobile: width < 768
      });

      await send(pageWs, 'Page.navigate', { url: `http://127.0.0.1:${port}/${p}` });
      await new Promise((r) => setTimeout(r, 500));

      const evalRes = await send(pageWs, 'Runtime.evaluate', {
        expression: `(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          const clientWidth = docEl.clientWidth;
          return { scrollWidth, clientWidth, overflow: scrollWidth > clientWidth };
        })()`,
        returnByValue: true
      });

      const res = evalRes.result && evalRes.result.value;
      totalChecks++;
      if (res && res.overflow) {
        issues++;
        console.error(`OVERFLOW ISSUE: ${p} at ${width}px: scrollWidth (${res.scrollWidth}) > clientWidth (${res.clientWidth})`);
      }
    }

    await send(pageWs, 'Target.closeTarget', { targetId: target.targetId });
    pageWs.close();
  }

  ws.close();
  chrome.kill();
  server.close();

  console.log(`\nResponsive audit complete: ${totalChecks} checks, ${issues} overflow issues.`);
  if (issues > 0) process.exit(1);
}

testResponsive().catch((err) => {
  console.error(err);
  process.exit(1);
});
