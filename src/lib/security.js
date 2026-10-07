// Sensitive-data redaction before anything touches IndexedDB history.

export const REDACTED = '[REDACTED]';

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'proxy-authorization',
  'proxy-authenticate',
]);

const SENSITIVE_PARAM_NAMES = new Set([
  'api_key',
  'apikey',
  'api-key',
  'access_token',
  'token',
  'auth',
  'auth_token',
  'secret',
  'password',
]);

export function isSensitiveHeader(name) {
  return SENSITIVE_HEADERS.has(String(name || '').trim().toLowerCase());
}

function redactHeaderList(headers) {
  return (headers || []).map((h) => ({
    ...h,
    value: isSensitiveHeader(h.key) ? REDACTED : h.value,
  }));
}

function redactParams(params) {
  return (params || []).map((p) => ({
    ...p,
    value: SENSITIVE_PARAM_NAMES.has(String(p.key || '').trim().toLowerCase())
      ? REDACTED
      : p.value,
  }));
}

function redactAuth(auth) {
  if (!auth || auth.type === 'none') return { type: 'none' };
  const out = { type: auth.type };
  if (auth.type === 'bearer') out.bearer = auth.bearer ? REDACTED : '';
  if (auth.type === 'basic') {
    out.basicUser = auth.basicUser || '';
    out.basicPass = auth.basicPass ? REDACTED : '';
  }
  if (auth.type === 'apikey') {
    out.apiKeyName = auth.apiKeyName || 'X-API-Key';
    out.apiKeyIn = auth.apiKeyIn || 'header';
    out.apiKey = auth.apiKey ? REDACTED : '';
  }
  return out;
}

function redactResponseHeaders(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers || {})) {
    out[k] = isSensitiveHeader(k) ? REDACTED : v;
  }
  return out;
}

const MAX_STORED_BODY = 500 * 1024; // 500 KB cap per stored response body

/**
 * Deep-clone a history entry with every secret replaced by [REDACTED].
 * Never call this on the live request — only on the object being persisted.
 */
export function sanitizeForHistory(entry) {
  const clone = JSON.parse(JSON.stringify(entry));
  clone.request.headers = redactHeaderList(clone.request.headers);
  clone.request.params = redactParams(clone.request.params);
  clone.request.auth = redactAuth(clone.request.auth);
  if (clone.request.body) {
    if (Array.isArray(clone.request.body.form)) {
      clone.request.body.form = redactParams(clone.request.body.form);
    }
    if (Array.isArray(clone.request.body.urlencoded)) {
      clone.request.body.urlencoded = redactParams(clone.request.body.urlencoded);
    }
  }
  clone.response.headers = redactResponseHeaders(clone.response.headers);
  if (typeof clone.response.body === 'string' && clone.response.body.length > MAX_STORED_BODY) {
    clone.response.body = clone.response.body.slice(0, MAX_STORED_BODY);
    clone.response.truncated = true;
  }
  return clone;
}
