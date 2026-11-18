'use strict';

const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const viewports = [
  { width: 1440, height: 900, name: '1440x900', mobile: false },
  { width: 1024, height: 768, name: '1024x768', mobile: false },
  { width: 768, height: 1024, name: '768x1024', mobile: true },
  { width: 390, height: 844, name: '390x844', mobile: true }
];

const portfolioSections = [
  { name: 'top', selector: '#top, .hero' },
  { name: 'hero', selector: '.hero' },
  { name: 'proof', selector: '.proof-strip' },
  { name: 'milestones', selector: '.milestone-section' },
  { name: 'work', selector: '#work' },
  { name: 'about', selector: '#about' },
  { name: 'stack', selector: '#stack' },
  { name: 'signal-lab', selector: '#signal-lab' },
  { name: 'experience', selector: '#experience' },
  { name: 'credentials', selector: '#credentials' },
  { name: 'profiles', selector: '#profiles' },
  { name: 'contact', selector: '#contact' },
  { name: 'footer', selector: '.site-footer' }
];

const landingSections = [
  { name: 'header', selector: '.landing-header' },
  { name: 'main', selector: '#main' },
  { name: 'intro', selector: '.intro' },
  { name: 'signal', selector: '.landing__signal' },
  { name: 'footer', selector: '.landing-footer' }
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
    let filePath = path.join(publicDir, reqPath);
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

function sendCDP(ws, idRef, method, params = {}) {
  return new Promise((resolve, reject) => {
    const curId = idRef.id++;
    const onMsg = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === curId) {
        ws.removeEventListener('message', onMsg);
        if (data.error) reject(new Error(`${method}: ${data.error.message}`));
        else resolve(data.result);
      }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });
}

async function captureAll(outputDir = 'baseline') {
  fs.mkdirSync(outputDir, { recursive: true });

  const port = await findAvailablePort();
  const server = await startStaticServer(port);
  console.log(`Static server running at http://127.0.0.1:${port}`);

  const cdpPort = await findAvailablePort();
  const tmpDir = path.join(os.tmpdir(), `cdp-profile-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${tmpDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars'
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  const ver = await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).json();
  const browserWs = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((resolve) => (browserWs.onopen = resolve));

  const bId = { id: 1 };
  const target = await sendCDP(browserWs, bId, 'Target.createTarget', { url: 'about:blank' });
  const pageWs = new WebSocket(`ws://127.0.0.1:${cdpPort}/devtools/page/${target.targetId}`);
  await new Promise((resolve) => (pageWs.onopen = resolve));

  const pId = { id: 1 };
  await sendCDP(pageWs, pId, 'Page.enable');
  await sendCDP(pageWs, pId, 'DOM.enable');
  await sendCDP(pageWs, pId, 'Runtime.enable');

  const pages = [
    { name: 'landing', url: `http://127.0.0.1:${port}/index.html`, sections: landingSections },
    { name: 'portfolio', url: `http://127.0.0.1:${port}/portfolio.html`, sections: portfolioSections }
  ];

  for (const p of pages) {
    for (const vp of viewports) {
      console.log(`Capturing ${p.name} at ${vp.name}...`);
      await sendCDP(pageWs, pId, 'Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile
      });

      await sendCDP(pageWs, pId, 'Emulation.setEmulatedMedia', {
        media: 'screen',
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
      });

      await sendCDP(pageWs, pId, 'Page.navigate', { url: p.url });
      await new Promise((r) => setTimeout(r, 1200));

      await sendCDP(pageWs, pId, 'Runtime.evaluate', {
        expression: 'document.fonts.ready.then(() => true)',
        awaitPromise: true
      });

      await sendCDP(pageWs, pId, 'Runtime.evaluate', {
        expression: `(() => {
          try {
            document.getAnimations().forEach(a => {
              if (a.finish) { try { a.finish(); } catch(e) { a.pause(); } }
              else if (a.pause) a.pause();
            });
          } catch(e) {}
        })()`
      });
      await new Promise((r) => setTimeout(r, 400));

      // 1. Full page screenshot
      const fullShot = await sendCDP(pageWs, pId, 'Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true
      });
      const fullPath = path.join(outputDir, `${p.name}-full-${vp.name}.png`);
      fs.writeFileSync(fullPath, Buffer.from(fullShot.data, 'base64'));

      // 2. Viewport screenshot
      const vpShot = await sendCDP(pageWs, pId, 'Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false
      });
      const vpPath = path.join(outputDir, `${p.name}-viewport-${vp.name}.png`);
      fs.writeFileSync(vpPath, Buffer.from(vpShot.data, 'base64'));

      // 3. Section screenshots
      for (const sec of p.sections) {
        const evalRes = await sendCDP(pageWs, pId, 'Runtime.evaluate', {
          expression: `(() => {
            const el = document.querySelector('${sec.selector}');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
          })()`,
          returnByValue: true
        });

        const box = evalRes.result && evalRes.result.value;
        if (box && box.width >= 1 && box.height >= 1) {
          const clipWidth = Math.max(1, Math.floor(Math.min(vp.width, box.width)));
          const clipHeight = Math.max(1, Math.ceil(box.height));
          const secShot = await sendCDP(pageWs, pId, 'Page.captureScreenshot', {
            format: 'png',
            clip: {
              x: Math.max(0, Math.floor(box.x)),
              y: Math.max(0, Math.floor(box.y)),
              width: clipWidth,
              height: clipHeight,
              scale: 1
            },
            captureBeyondViewport: true
          });
          const secPath = path.join(outputDir, `${p.name}-${sec.name}-${vp.name}.png`);
          fs.writeFileSync(secPath, Buffer.from(secShot.data, 'base64'));
        }
      }
    }
  }

  pageWs.close();
  browserWs.close();
  chrome.kill();
  server.close();

  console.log(`All baseline screenshots successfully captured to ${outputDir}/`);
}

if (require.main === module) {
  const targetDir = process.argv[2] || 'baseline';
  captureAll(targetDir).catch((err) => {
    console.error('Error capturing baseline:', err);
    process.exit(1);
  });
}

module.exports = { captureAll };
