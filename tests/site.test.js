'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const publicRoot = path.join(__dirname, '..', 'public');
const pageFiles = [
  'index.html',
  'portfolio.html',
  'case-studies/kairon.html',
  'case-studies/janus.html',
  'case-studies/hive.html',
  'lab.html',
  'journey.html',
  'certifications.html',
  'now.html',
  'resume.html',
  '404.html'
];

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, function (_, code) { return String.fromCodePoint(parseInt(code, 16)); })
    .replace(/&#(\d+);/g, function (_, code) { return String.fromCodePoint(Number(code)); });
}

function attributes(source) {
  const result = {};
  const pattern = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = pattern.exec(source))) {
    result[match[1].toLowerCase()] = decodeHtml(match[2] || match[3] || match[4] || '');
  }
  return result;
}

function findIds(html) {
  const ids = new Set();
  const pattern = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let match;
  while ((match = pattern.exec(html))) ids.add(decodeHtml(match[1] || match[2]));
  return ids;
}

function checkLocalReference(reference, pageFile, ids) {
  const pageUrl = new URL('/' + pageFile.replace(/\\/g, '/'), 'http://portfolio.local');
  const resolved = new URL(reference, pageUrl);

  if (resolved.protocol === 'mailto:' || resolved.protocol === 'tel:') return;
  if (resolved.origin !== pageUrl.origin) {
    assert.ok(/^https?:$/.test(resolved.protocol), `Unsupported URL protocol: ${reference}`);
    assert.notEqual(reference.trim(), '', 'External URLs must not be empty.');
    assert.doesNotMatch(reference.toLowerCase(), /(example\.com|your-domain|placeholder|todo)/,
      `External URLs must not contain placeholders: ${reference}`);
    return;
  }

  if (resolved.hash) {
    const anchor = decodeURIComponent(resolved.hash.slice(1));
    const samePage = resolved.pathname === pageUrl.pathname;
    if (samePage) {
      assert.ok(ids.has(anchor), `Missing #${anchor} anchor in ${pageFile}`);
    } else {
      const target = diskPath(resolved.pathname);
      assert.ok(fs.existsSync(target), `Missing linked file ${resolved.pathname} from ${pageFile}`);
      if (path.extname(target).toLowerCase() === '.html') {
        assert.ok(findIds(fs.readFileSync(target, 'utf8')).has(anchor),
          `Missing #${anchor} anchor in ${resolved.pathname}`);
      }
    }
  }

  const target = diskPath(resolved.pathname);
  assert.ok(fs.existsSync(target), `Missing local file ${resolved.pathname} from ${pageFile}`);
}

function diskPath(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const relative = decoded.replace(/^\/+/, '');
  const target = path.resolve(publicRoot, relative || 'index.html');
  const rootPrefix = publicRoot.endsWith(path.sep) ? publicRoot : publicRoot + path.sep;
  assert.ok(target === publicRoot || target.startsWith(rootPrefix), `Local URL escapes public/: ${urlPath}`);
  return target.endsWith(path.sep) ? path.join(target, 'index.html') : target;
}

test('public pages have complete local links, accessible metadata, and CSP-safe markup', function () {
  const htmlByFile = new Map();

  for (const pageFile of pageFiles) {
    const html = fs.readFileSync(path.join(publicRoot, pageFile), 'utf8');
    htmlByFile.set(pageFile, html);
    const ids = findIds(html);

    assert.equal((html.match(/<h1\b/gi) || []).length, 1, `${pageFile} should have exactly one h1`);
    assert.match(html, /<meta\b[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i,
      `${pageFile} should have a meta description`);
    assert.doesNotMatch(html, /\son[a-z][\w:-]*\s*=/i, `${pageFile} must not use inline event handlers`);

    const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
    let scriptMatch;
    while ((scriptMatch = scriptPattern.exec(html))) {
      const scriptAttributes = attributes(scriptMatch[1]);
      if (scriptAttributes.type === 'application/ld+json') {
        assert.doesNotThrow(function () { JSON.parse(scriptMatch[2]); }, `${pageFile} JSON-LD should be valid`);
      } else {
        assert.ok(scriptAttributes.src, `${pageFile} must not contain inline executable scripts`);
        assert.equal(scriptMatch[2].trim(), '', `${pageFile} external scripts must not include inline code`);
      }
    }

    const referencePattern = /\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
    let referenceMatch;
    while ((referenceMatch = referencePattern.exec(html))) {
      const reference = decodeHtml(referenceMatch[1] || referenceMatch[2]).trim();
      assert.notEqual(reference, '', `${pageFile} contains an empty href or src`);
      checkLocalReference(reference, pageFile, ids);
    }
  }

  for (const pageFile of pageFiles) {
    const html = htmlByFile.get(pageFile);
    const stylesheetPattern = /<link\b([^>]*)>/gi;
    let linkMatch;
    while ((linkMatch = stylesheetPattern.exec(html))) {
      const linkAttributes = attributes(linkMatch[1]);
      if (!/\bstylesheet\b/i.test(linkAttributes.rel || '') || !linkAttributes.href) continue;
      const stylesheetUrl = new URL(linkAttributes.href, new URL('/' + pageFile, 'http://portfolio.local'));
      if (stylesheetUrl.origin !== 'http://portfolio.local') continue;

      const stylesheetPath = diskPath(stylesheetUrl.pathname);
      const css = fs.readFileSync(stylesheetPath, 'utf8');
      const assetPattern = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
      let assetMatch;
      while ((assetMatch = assetPattern.exec(css))) {
        const asset = assetMatch[2].trim();
        if (!asset || asset.startsWith('#') || asset.startsWith('data:')) continue;
        checkLocalReference(asset, path.relative(publicRoot, stylesheetPath), new Set());
      }
    }
  }

  const index = htmlByFile.get('index.html');
  const portfolio = htmlByFile.get('portfolio.html');
  const ogImage = fs.readFileSync(path.join(publicRoot, 'assets', 'og-card.png'));
  assert.equal(ogImage.toString('ascii', 1, 4), 'PNG');
  assert.equal(ogImage.readUInt32BE(16), 1200);
  assert.equal(ogImage.readUInt32BE(20), 630);

  for (const page of [index, portfolio]) {
    assert.match(page, /<meta\b[^>]*property=["']og:image["'][^>]*content=["'][^"']+["']/i);
    assert.match(page, /<meta\b[^>]*name=["']twitter:card["'][^>]*content=["']summary_large_image["']/i);
    assert.match(page, /<script\b[^>]*type=["']application\/ld\+json["']/i);
    const jsonLdMatch = page.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    const person = JSON.parse(jsonLdMatch[1]);
    assert.equal(person.name, 'Jal Patel');
    assert.equal(person.jobTitle, 'Final-year B.Tech CSE (AI & Data Science) student');
    assert.equal(person.affiliation.name, 'Parul University');
    assert.equal(person.sameAs.length, 4);
  }
  assert.match(portfolio, /name=["']description["'][^>]*content=["'][^"']*data science[^"']*AI\/ML[^"']*Vadodara/i);
  assert.equal((portfolio.match(/<ol class=["']milestone-list["'][\s\S]*?<\/ol>/i)[0].match(/<li>/gi) || []).length, 6);
  assert.ok(portfolio.indexOf('id="stack"') < portfolio.indexOf('id="signal-lab"'));
  assert.ok(portfolio.indexOf('id="signal-lab"') < portfolio.indexOf('id="experience"'));
  assert.match(portfolio, /href=["']mailto:jalpatel798@gmail\.com["']/i);
  assert.match(portfolio, /id=["']copy-email["'][^>]*data-email=["']jalpatel798@gmail\.com["']/i);
  for (const project of ['kairon', 'janus', 'hive']) {
    assert.match(portfolio, new RegExp(`href=["']case-studies/${project}\\.html["']`));
  }

  const navLinks = Array.from(portfolio.matchAll(/<a\b([^>]*class=["'][^"']*nav__link[^"']*["'][^>]*)>/gi))
    .map(function (match) { return attributes(match[1]).href; });
  assert.deepEqual(navLinks, ['index.html', '#work', '#about', '#experience', '#stack', '#credentials', '#profiles']);
});
