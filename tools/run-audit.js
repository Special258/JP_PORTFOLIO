'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

async function runAudit() {
  const publicDir = path.resolve('public');
  const htmlFiles = fs.readdirSync(publicDir).filter((f) => f.endsWith('.html'))
    .concat(fs.readdirSync(path.join(publicDir, 'case-studies')).map((f) => 'case-studies/' + f));

  console.log('--- 1. REFERENCED FILES & ANCHORS ---');
  const allIds = {};
  for (const rel of htmlFiles) {
    const content = fs.readFileSync(path.join(publicDir, rel), 'utf8');
    const ids = new Set();
    const idRegex = /id=["']([^"']+)["']/g;
    let m;
    while ((m = idRegex.exec(content))) ids.add(m[1]);
    allIds[rel] = ids;
  }

  const missingFiles = [];
  const brokenAnchors = [];

  for (const rel of htmlFiles) {
    const content = fs.readFileSync(path.join(publicDir, rel), 'utf8');
    const refRegex = /(?:href|src)=["']([^"']+)["']/g;
    let m;
    while ((m = refRegex.exec(content))) {
      const ref = m[1];
      if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('mailto:') || ref.startsWith('tel:') || ref.startsWith('data:')) continue;

      const parts = ref.split('#');
      const filePath = parts[0];
      const anchor = parts[1];

      let resolvedFile = rel;
      if (filePath) {
        resolvedFile = path.normalize(path.join(path.dirname(rel), filePath)).replace(/\\/g, '/');
        const diskTarget = path.join(publicDir, resolvedFile);
        if (!fs.existsSync(diskTarget)) {
          missingFiles.push({ from: rel, ref, missing: resolvedFile });
        }
      }

      if (anchor) {
        const targetHtml = resolvedFile;
        if (allIds[targetHtml] && !allIds[targetHtml].has(anchor)) {
          brokenAnchors.push({ from: rel, ref, targetHtml, anchor });
        }
      }
    }
  }

  console.log('Missing referenced files:', JSON.stringify(missingFiles, null, 2));
  console.log('Broken anchors:', JSON.stringify(brokenAnchors, null, 2));

  console.log('--- 2. REQUIRED SUPPORT FILES ---');
  const requiredSupport = [
    'public/assets/hero-signal-map.svg',
    'public/assets/jp-mark.svg',
    'public/assets/landing-ai-mesh.svg',
    'public/assets/project-hive.svg',
    'public/assets/project-janus.svg',
    'public/assets/project-kairon.svg',
    'api/contact.js',
    'supabase/schema.sql',
    'public/JAL_PATEL_RESUME.pdf',
    '.gitignore',
    '.vercelignore',
    '.env.example'
  ];
  for (const f of requiredSupport) {
    console.log(f, fs.existsSync(f) ? 'EXISTS' : 'ABSENT');
  }

  console.log('--- 3. SECRETS IN GIT HISTORY ---');
  // Check git log without textconv
  const gitLog = spawn('git', ['log', '--no-textconv', '-p']);
  let logData = '';
  gitLog.stdout.on('data', (d) => { logData += d.toString('utf8'); });
  await new Promise((resolve) => gitLog.on('close', resolve));

  const secretPatterns = [
    /(?:api[_-]?key|secret|token|password|service[_-]?role)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})["']?/gi,
    /re_[a-zA-Z0-9]{20,}/g,
    /eyJ[a-zA-Z0-9_\-]{20,}\.eyJ[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]+/g
  ];
  const detectedSecrets = [];
  for (const pat of secretPatterns) {
    let sm;
    while ((sm = pat.exec(logData))) {
      const matchText = sm[0];
      if (matchText.includes('replace-with') || matchText.includes('placeholder')) continue;
      detectedSecrets.push(matchText);
    }
  }
  console.log('Detected secrets in git history:', detectedSecrets.length ? detectedSecrets : 'None found (clean)');

  console.log('--- 4. CSP & CONSOLE / NETWORK AUDIT ---');
  const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const cspHeader = vercel.headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value;
  console.log('CSP in vercel.json:', cspHeader);
}

runAudit().catch(console.error);
