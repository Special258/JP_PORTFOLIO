'use strict';

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 5000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEFAULT_CONTACT_EMAIL = 'jalpatel798@gmail.com';

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function readPayload(req, contentType) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    if (contentType === 'application/x-www-form-urlencoded') {
      const params = new URLSearchParams(req.body);
      const payload = {};
      for (const [key, value] of params.entries()) {
        payload[key] = value;
      }
      return Object.keys(payload).length > 0 ? payload : null;
    }

    try {
      const payload = JSON.parse(req.body);
      return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
    } catch (error) {
      return null;
    }
  }

  return null;
}

function isSameOrigin(req) {
  const origin = req.headers.origin;
  const requestHost = req.headers.host;
  if (!origin || !requestHost) return false;

  try {
    const originUrl = new URL(origin);
    return Boolean(originUrl.host === String(requestHost).toLowerCase() &&
      (originUrl.protocol === 'https:' || originUrl.protocol === 'http:'));
  } catch (error) {
    return false;
  }
}

function getSupabaseEndpoint() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl || !serviceRoleKey) return null;

  try {
    const url = new URL(supabaseUrl);
    const isLocalHttp = url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    if ((url.protocol !== 'https:' && !isLocalHttp) ||
        url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
      return null;
    }

    return {
      url: `${url.origin}/rest/v1/contact_messages`,
      serviceRoleKey: serviceRoleKey
    };
  } catch (error) {
    return null;
  }
}

function getEmailConfiguration() {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const from = (process.env.RESEND_FROM_EMAIL || '').trim();
  const to = (process.env.CONTACT_EMAIL_TO || DEFAULT_CONTACT_EMAIL).trim();
  if (!apiKey || !from || /[\r\n]/.test(from) || /[\r\n]/.test(to)) return null;

  return { apiKey: apiKey, from: from, to: to };
}

function getTimeoutSignal(timeoutMs) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }
  return undefined;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, function (character) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character];
  });
}

async function deliverEmail(configuration, name, email, message) {
  const subjectName = name.replace(/[\r\n]+/g, ' ').slice(0, MAX_NAME_LENGTH);
  const signal = getTimeoutSignal(8000);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${configuration.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: configuration.from,
      to: [configuration.to],
      reply_to: email,
      subject: `Portfolio message from ${subjectName}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
    }),
    ...(signal ? { signal } : {})
  });

  if (!response.ok) {
    console.error(`Contact form email request failed with status ${response.status}.`);
    return false;
  }
  return true;
}

async function storeMessage(database, name, email, message) {
  if (!database) return false;
  try {
    const signal = getTimeoutSignal(8000);
    const response = await fetch(database.url, {
      method: 'POST',
      headers: {
        apikey: database.serviceRoleKey,
        Authorization: `Bearer ${database.serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ name: name, email: email, message: message }),
      ...(signal ? { signal } : {})
    });

    if (!response.ok) {
      console.error(`Contact form database request failed with status ${response.status}.`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Contact form database request failed:', error.message);
    return false;
  }
}

module.exports = async function contactHandler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  if (!isSameOrigin(req)) {
    return sendJson(res, 403, { error: 'This request is not allowed.' });
  }

  const contentType = String(req.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json' && contentType !== 'application/x-www-form-urlencoded') {
    return sendJson(res, 415, { error: 'Send the form using a supported format.' });
  }

  const payload = readPayload(req, contentType);
  if (!payload) {
    return sendJson(res, 400, { error: 'Please submit a valid contact form.' });
  }

  if (typeof payload.website === 'string' && payload.website.trim()) {
    return sendJson(res, 202, { ok: true, ignored: true });
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';

  if (!name || name.length > MAX_NAME_LENGTH ||
      !email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email) ||
      message.length < 10 || message.length > MAX_MESSAGE_LENGTH) {
    return sendJson(res, 400, {
      error: 'Enter a valid name and email, and a message between 10 and 5000 characters.'
    });
  }

  const database = getSupabaseEndpoint();
  const emailConfiguration = getEmailConfiguration();
  if (!database && !emailConfiguration) {
    console.error('Contact form is not configured: set Resend email settings or Supabase storage settings.');
    return sendJson(res, 503, { error: 'The message service is not configured yet. Please use the Gmail link instead.' });
  }

  const outcomes = await Promise.allSettled([
    emailConfiguration
      ? deliverEmail(emailConfiguration, name, email, message)
      : Promise.resolve(false),
    storeMessage(database, name, email, message)
  ]);
  const emailSent = outcomes[0].status === 'fulfilled' && outcomes[0].value === true;
  const stored = outcomes[1].status === 'fulfilled' && outcomes[1].value === true;

  if (outcomes[0].status === 'rejected') {
    console.error('Contact form email request failed:', outcomes[0].reason.message);
  }

  if (emailSent) {
    return sendJson(res, 201, { ok: true, emailSent: true, stored: stored });
  }

  if (stored) {
    return sendJson(res, 201, { ok: true, emailSent: false, stored: true });
  }

  return sendJson(res, 502, {
    error: 'Your message could not be delivered. Please use the Gmail link below to contact me directly.'
  });
};
