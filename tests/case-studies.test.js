'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { test } = require('node:test');
const { setTimeout: delay } = require('node:timers/promises');

const root = path.join(__dirname, '..');

function findAvailablePort() {
  return new Promise(function (resolve, reject) {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', function () {
      const port = probe.address().port;
      probe.close(function (error) {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

function getPage(port, pathname) {
  return new Promise(function (resolve, reject) {
    const request = http.get({ host: '127.0.0.1', port: port, path: pathname }, function (response) {
      const chunks = [];
      response.on('data', function (chunk) { chunks.push(chunk); });
      response.on('end', function () {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks).toString('utf8')
        });
      });
    });
    request.once('error', reject);
  });
}

async function waitForPage(port, pathname, server) {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (server.exitCode !== null) throw new Error('The preview server exited before becoming ready.');
    try {
      return await getPage(port, pathname);
    } catch (error) {
      lastError = error;
      await delay(50);
    }
  }
  throw lastError || new Error('The preview server did not become ready.');
}

test('case study and Signal Lab routes are allowlisted and keep the self-only script policy', async function (t) {
  const port = await findAvailablePort();
  const server = spawn(process.execPath, [path.join(root, 'dev-server.js')], {
    cwd: root,
    env: Object.assign({}, process.env, { PORT: String(port) }),
    stdio: 'ignore'
  });

  t.after(async function () {
    if (server.exitCode !== null) return;
    const exited = new Promise(function (resolve) { server.once('exit', resolve); });
    server.kill();
    await exited;
  });

  const routes = [
    ['/case-studies/kairon.html', 'Kairon: Customer relationship intelligence'],
    ['/case-studies/janus.html', 'Janus: AI-powered task automation'],
    ['/case-studies/hive.html', 'Hive: Community skill exchange']
  ];

  for (const route of routes) {
    const response = await waitForPage(port, route[0], server);
    assert.equal(response.statusCode, 200, `${route[0]} should be served`);
    assert.match(response.headers['content-type'], /text\/html/);
    assert.match(response.headers['content-security-policy'], /script-src 'self'/);
    assert.match(response.body, new RegExp(`<h1>\\s*${route[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h1>`));
    assert.doesNotMatch(response.body, /<script\b/i);
  }

  const scriptResponse = await getPage(port, '/signal-lab.js');
  assert.equal(scriptResponse.statusCode, 200);
  assert.match(scriptResponse.headers['content-type'], /application\/javascript/);
  assert.match(scriptResponse.headers['content-security-policy'], /script-src 'self'/);
  assert.match(scriptResponse.body, /function movingAverage/);

  const exampleResponse = await getPage(port, '/data/prices.example.json');
  assert.equal(exampleResponse.statusCode, 200);
  assert.match(exampleResponse.headers['content-type'], /application\/json/);
  assert.match(exampleResponse.body, /"placeholder": true/);

  const pricesResponse = await getPage(port, '/data/prices.json');
  assert.equal(pricesResponse.statusCode, 200, 'market prices dataset should be served');
  assert.match(pricesResponse.headers['content-type'], /application\/json/);
  assert.match(pricesResponse.body, /"NVDA"/);
  assert.match(pricesResponse.body, /"SPY"/);
  assert.match(pricesResponse.body, /"AAPL"/);

  const supportFiles = [
    ['/robots.txt', /text\/plain/, /TODO: Add a Sitemap directive/],
    ['/sitemap.xml', /application\/xml/, /TODO: Add absolute URLs/],
    ['/assets/og-card.png', /image\/png/, null]
  ];

  for (const route of supportFiles) {
    const response = await getPage(port, route[0]);
    assert.equal(response.statusCode, 200, `${route[0]} should be served`);
    assert.match(response.headers['content-type'], route[1]);
    if (route[2]) assert.match(response.body, route[2]);
  }
});
