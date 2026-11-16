'use strict';

const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const contactHandler = require('../api/contact.js');

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
const environmentKeys = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'CONTACT_EMAIL_TO'
];
const originalEnvironment = Object.fromEntries(
  environmentKeys.map(function (key) { return [key, process.env[key]]; })
);

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      this.body = JSON.parse(body);
    }
  };
}

function createRequest(overrides) {
  return Object.assign({
    method: 'POST',
    headers: {
      host: 'portfolio.example',
      origin: 'https://portfolio.example',
      'content-type': 'application/json'
    },
    body: {
      name: 'J. Visitor',
      email: 'visitor@example.com',
      message: 'I would like to discuss a role.'
    }
  }, overrides);
}

function configureResend() {
  process.env.RESEND_API_KEY = 'test-only-key';
  process.env.RESEND_FROM_EMAIL = 'Jal Patel <portfolio@example.com>';
}

function configureSupabase() {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-key';
}

afterEach(function () {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
  environmentKeys.forEach(function (key) {
    if (originalEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnvironment[key];
  });
});

test('emails a valid message and stores a private archive without returning message details', async function () {
  configureResend();
  configureSupabase();
  let emailPayload;
  let storedPayload;
  globalThis.fetch = async function (url, options) {
    if (url === 'https://api.resend.com/emails') {
      assert.equal(options.headers.Authorization, 'Bearer test-only-key');
      emailPayload = JSON.parse(options.body);
      return { ok: true, status: 200 };
    }
    assert.equal(url, 'https://example.supabase.co/rest/v1/contact_messages');
    assert.equal(options.headers.Authorization, 'Bearer test-only-key');
    storedPayload = JSON.parse(options.body);
    return { ok: true, status: 201 };
  };

  const res = createResponse();
  await contactHandler(createRequest({
    body: {
      name: 'J. <Visitor>',
      email: 'visitor@example.com',
      message: 'Please review <script>alert("x")</script>.\nThank you.'
    }
  }), res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { ok: true, emailSent: true, stored: true });
  assert.equal(emailPayload.to[0], 'jalpatel798@gmail.com');
  assert.equal(emailPayload.reply_to, 'visitor@example.com');
  assert.match(emailPayload.subject, /J\. <Visitor>/);
  assert.match(emailPayload.html, /&lt;script&gt;/);
  assert.doesNotMatch(emailPayload.html, /<script>/);
  assert.deepEqual(storedPayload, {
    name: 'J. <Visitor>',
    email: 'visitor@example.com',
    message: 'Please review <script>alert("x")</script>.\nThank you.'
  });
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('rejects invalid input before contacting either service', async function () {
  globalThis.fetch = async function () {
    assert.fail('No service should be called for invalid input.');
  };

  const res = createResponse();
  await contactHandler(createRequest({
    body: { name: 'Visitor', email: 'not-an-email', message: 'Short' }
  }), res);

  assert.equal(res.statusCode, 400);
});

test('rejects cross-origin submissions', async function () {
  const res = createResponse();
  await contactHandler(createRequest({
    headers: {
      host: 'portfolio.example',
      origin: 'https://attacker.example',
      'content-type': 'application/json'
    }
  }), res);

  assert.equal(res.statusCode, 403);
});

test('returns a successful response for honeypot submissions without sending or storing them', async function () {
  globalThis.fetch = async function () {
    assert.fail('Honeypot submissions must not be processed.');
  };

  const res = createResponse();
  await contactHandler(createRequest({
    body: {
      name: 'Bot',
      email: 'bot@example.com',
      message: 'This is a valid enough message.',
      website: 'https://spam.example'
    }
  }), res);

  assert.equal(res.statusCode, 202);
  assert.deepEqual(res.body, { ok: true, ignored: true });
});

test('rejects submissions without an Origin header', async function () {
  const res = createResponse();
  await contactHandler(createRequest({
    headers: {
      host: 'portfolio.example',
      'content-type': 'application/json'
    }
  }), res);

  assert.equal(res.statusCode, 403);
});

test('requires the exact JSON media type', async function () {
  const res = createResponse();
  await contactHandler(createRequest({
    headers: {
      host: 'portfolio.example',
      origin: 'https://portfolio.example',
      'content-type': 'application/jsonp'
    }
  }), res);

  assert.equal(res.statusCode, 415);
});

test('accepts a normal HTML form POST without exposing its fields in the URL', async function () {
  configureResend();
  let emailPayload;
  globalThis.fetch = async function (url, options) {
    assert.equal(url, 'https://api.resend.com/emails');
    emailPayload = JSON.parse(options.body);
    return { ok: true, status: 200 };
  };

  const res = createResponse();
  await contactHandler(createRequest({
    headers: {
      host: 'portfolio.example',
      origin: 'https://portfolio.example',
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: 'name=Jal+Patel&email=jal%40example.com&message=Hello%2C+I+would+like+to+connect.'
  }), res);

  assert.equal(res.statusCode, 201);
  assert.equal(emailPayload.reply_to, 'jal@example.com');
  assert.match(emailPayload.text, /Hello, I would like to connect\./);
});

test('reports an unconfigured message service without attempting requests', async function () {
  environmentKeys.forEach(function (key) { delete process.env[key]; });
  console.error = function () {};
  globalThis.fetch = async function () {
    assert.fail('No service should be called without configuration.');
  };

  const res = createResponse();
  await contactHandler(createRequest(), res);

  assert.equal(res.statusCode, 503);
});

test('rejects a Supabase URL that includes a path', async function () {
  process.env.SUPABASE_URL = 'https://example.supabase.co/unexpected-path';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-key';
  console.error = function () {};
  globalThis.fetch = async function () {
    assert.fail('An invalid Supabase URL must not be contacted.');
  };

  const res = createResponse();
  await contactHandler(createRequest(), res);

  assert.equal(res.statusCode, 503);
});

test('emails the message if optional Supabase archiving is not configured', async function () {
  configureResend();
  let requestUrl;
  globalThis.fetch = async function (url) {
    requestUrl = url;
    return { ok: true, status: 200 };
  };

  const res = createResponse();
  await contactHandler(createRequest(), res);

  assert.equal(requestUrl, 'https://api.resend.com/emails');
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { ok: true, emailSent: true, stored: false });
});

test('reports a saved inquiry when email notifications are not configured', async function () {
  configureSupabase();
  globalThis.fetch = async function () {
    return { ok: true, status: 201 };
  };

  const res = createResponse();
  await contactHandler(createRequest(), res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { ok: true, emailSent: false, stored: true });
});

test('reports that a message was saved if the email provider rejects delivery', async function () {
  configureResend();
  configureSupabase();
  console.error = function () {};
  globalThis.fetch = async function (url) {
    if (url === 'https://api.resend.com/emails') return { ok: false, status: 429 };
    return { ok: true, status: 201 };
  };

  const res = createResponse();
  await contactHandler(createRequest(), res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { ok: true, emailSent: false, stored: true });
});

test('does not report delivery when both the email and archive services fail', async function () {
  configureResend();
  configureSupabase();
  console.error = function () {};
  globalThis.fetch = async function (url) {
    return { ok: false, status: url === 'https://api.resend.com/emails' ? 429 : 503 };
  };

  const res = createResponse();
  await contactHandler(createRequest(), res);

  assert.equal(res.statusCode, 502);
  assert.match(res.body.error, /could not be delivered/);
});
