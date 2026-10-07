// Formatting helpers: sizes, status text, content-type detection.

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

const STATUS_TEXT = {
  100: 'Continue', 101: 'Switching Protocols', 102: 'Processing',
  200: 'OK', 201: 'Created', 202: 'Accepted', 203: 'Non-Authoritative Information',
  204: 'No Content', 205: 'Reset Content', 206: 'Partial Content', 207: 'Multi-Status',
  300: 'Multiple Choices', 301: 'Moved Permanently', 302: 'Found', 303: 'See Other',
  304: 'Not Modified', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
  400: 'Bad Request', 401: 'Unauthorized', 402: 'Payment Required', 403: 'Forbidden',
  404: 'Not Found', 405: 'Method Not Allowed', 406: 'Not Acceptable',
  407: 'Proxy Authentication Required', 408: 'Request Timeout', 409: 'Conflict',
  410: 'Gone', 411: 'Length Required', 412: 'Precondition Failed', 413: 'Payload Too Large',
  414: 'URI Too Long', 415: 'Unsupported Media Type', 416: 'Range Not Satisfiable',
  417: 'Expectation Failed', 418: "I'm a teapot", 422: 'Unprocessable Entity',
  425: 'Too Early', 426: 'Upgrade Required', 428: 'Precondition Required',
  429: 'Too Many Requests', 431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error', 501: 'Not Implemented', 502: 'Bad Gateway',
  503: 'Service Unavailable', 504: 'Gateway Timeout', 505: 'HTTP Version Not Supported',
};

export function statusTextFor(status, fallback = '') {
  if (fallback) return fallback;
  return STATUS_TEXT[status] || '';
}

export function statusClass(status) {
  if (status >= 200 && status < 300) return 'ok';
  if (status >= 300 && status < 400) return 'redirect';
  if (status >= 400) return 'error';
  return 'neutral';
}

/**
 * Decide how to render a response body. Never returns anything executable.
 * @returns {'json'|'html'|'xml'|'text'}
 */
export function detectBodyKind(contentType, bodyText) {
  const ct = (contentType || '').toLowerCase();
  const trimmed = (bodyText || '').trim();
  if (ct.includes('json') || looksLikeJson(trimmed)) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // fall through to text
    }
  }
  if (ct.includes('html')) return 'html';
  if (ct.includes('xml') || trimmed.startsWith('<?xml') || (trimmed.startsWith('<') && !trimmed.startsWith('<!DOCTYPE html'))) {
    if (/<[a-zA-Z][^>]*>/.test(trimmed)) return 'xml';
  }
  return 'text';
}

function looksLikeJson(s) {
  return (s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'));
}

export function tryPrettyJson(text) {
  try {
    return { ok: true, value: JSON.parse(text), pretty: JSON.stringify(JSON.parse(text), null, 2) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatTimestamp(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}
