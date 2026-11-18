'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

async function renderIcons() {
  const tmpDir = path.join(os.tmpdir(), `cdp-favicons-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9225',
    `--user-data-dir=${tmpDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars'
  ]);

  await new Promise((r) => setTimeout(r, 1500));
  const ver = await (await fetch('http://127.0.0.1:9225/json/version')).json();
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

  const svgContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'jp-mark.svg'), 'utf8');

  // Also write public/favicon.svg
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), svgContent, 'utf8');
  console.log('Created public/favicon.svg');

  const targets = [
    { size: 32, file: 'favicon-32x32.png' },
    { size: 180, file: 'apple-touch-icon.png' }
  ];

  for (const t of targets) {
    const s = t.size;
    const inner = Math.round(s * 0.7);
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#11131b;display:flex;align-items:center;justify-content:center;width:${s}px;height:${s}px;overflow:hidden;">
  <div style="width:${inner}px;height:${inner}px;display:flex;align-items:center;justify-content:center;">
    ${svgContent.replace(/<svg\b([^>]*)>/, `<svg width="${inner}" height="${inner}" viewBox="0 0 100 100">`)}
  </div>
</body>
</html>`;

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    const target = await send(ws, 'Target.createTarget', { url: dataUrl });
    const pageWs = new WebSocket(`ws://127.0.0.1:9225/devtools/page/${target.targetId}`);
    await new Promise((resolve) => (pageWs.onopen = resolve));

    await send(pageWs, 'Page.enable');
    await send(pageWs, 'Emulation.setDeviceMetricsOverride', {
      width: s,
      height: s,
      deviceScaleFactor: 1,
      mobile: false
    });
    await new Promise((r) => setTimeout(r, 600));

    const shot = await send(pageWs, 'Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: s, height: s, scale: 1 }
    });

    const outPath = path.join(__dirname, '..', 'public', t.file);
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log(`Generated ${t.file} (${s}x${s})`);

    await send(pageWs, 'Target.closeTarget', { targetId: target.targetId });
    pageWs.close();
  }

  ws.close();
  chrome.kill();
}

renderIcons().catch(console.error);
