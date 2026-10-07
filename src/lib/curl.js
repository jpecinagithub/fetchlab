// Lightweight cURL import / export. No dependencies.

let rowId = 0;
function newRow(key = '', value = '') {
  rowId += 1;
  return { id: `r${Date.now()}_${rowId}`, enabled: true, key, value };
}

/** Split a command line into tokens, respecting quotes and backslashes. */
export function tokenizeCurl(input) {
  const tokens = [];
  let current = '';
  let quote = null; // "'" or '"'
  let escaped = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}

function nextArg(tokens, i) {
  if (i + 1 >= tokens.length) throw new Error('Missing argument value');
  return tokens[i + 1];
}

/**
 * Parse a curl command into a partial request object.
 * Throws with a short message when it cannot be parsed.
 */
export function parseCurl(input) {
  const text = String(input || '').trim().replace(/\\\n/g, ' ');
  if (!/^curl\b/i.test(text)) throw new Error('Not a curl command');
  const tokens = tokenizeCurl(text);
  if (tokens.length < 2) throw new Error('Empty curl command');

  const req = {
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    auth: { type: 'none' },
    body: { type: 'none', json: '', text: '', form: [], urlencoded: [] },
    timeout: 30,
  };
  let methodExplicit = false;
  let dataPayload = null;
  let dataIsUrlencoded = false;

  for (let i = 1; i < tokens.length; i += 1) {
    const tok = tokens[i];
    switch (tok) {
      case '-X':
      case '--request': {
        req.method = nextArg(tokens, i).toUpperCase();
        methodExplicit = true;
        i += 1;
        break;
      }
      case '-H':
      case '--header': {
        const raw = nextArg(tokens, i);
        i += 1;
        const idx = raw.indexOf(':');
        if (idx > 0) {
          const name = raw.slice(0, idx).trim();
          const value = raw.slice(idx + 1).trim();
          if (/^authorization$/i.test(name)) {
            const m = /^Bearer\s+(.+)$/i.exec(value);
            if (m) req.auth = { type: 'bearer', bearer: m[1] };
            else {
              const b = /^Basic\s+(.+)$/i.exec(value);
              if (b) {
                try {
                  const decoded = atob(b[1]);
                  const sep = decoded.indexOf(':');
                  req.auth = {
                    type: 'basic',
                    basicUser: sep >= 0 ? decoded.slice(0, sep) : decoded,
                    basicPass: sep >= 0 ? decoded.slice(sep + 1) : '',
                  };
                } catch {
                  req.headers.push(newRow(name, value));
                }
              } else req.headers.push(newRow(name, value));
            }
          } else {
            req.headers.push(newRow(name, value));
          }
        }
        break;
      }
      case '-d':
      case '--data':
      case '--data-raw':
      case '--data-binary':
      case '--data-ascii': {
        dataPayload = nextArg(tokens, i);
        i += 1;
        break;
      }
      case '--data-urlencode': {
        dataPayload = nextArg(tokens, i);
        dataIsUrlencoded = true;
        i += 1;
        break;
      }
      case '-u':
      case '--user': {
        const creds = nextArg(tokens, i);
        i += 1;
        const sep = creds.indexOf(':');
        req.auth = {
          type: 'basic',
          basicUser: sep >= 0 ? creds.slice(0, sep) : creds,
          basicPass: sep >= 0 ? creds.slice(sep + 1) : '',
        };
        break;
      }
      case '-G':
      case '--get':
        req.method = 'GET';
        methodExplicit = true;
        break;
      default: {
        if (tok.startsWith('-')) break; // ignore unknown flags
        if (!req.url) req.url = tok;
        break;
      }
    }
  }

  if (!req.url) throw new Error('No URL found');

  // Pull query string into params rows
  try {
    const u = new URL(req.url);
    req.params = [];
    u.searchParams.forEach((value, key) => {
      req.params.push(newRow(key, value));
    });
    u.search = '';
    req.url = u.toString();
  } catch {
    // keep url as-is; params stay empty
  }

  if (dataPayload !== null) {
    const contentType = req.headers.find((h) => /^content-type$/i.test(h.key))?.value || '';
    const looksJson = /json/i.test(contentType) || /^[\s]*[{\[]/.test(dataPayload);
    if (dataIsUrlencoded || (/urlencoded/i.test(contentType) && !looksJson)) {
      req.body.type = 'urlencoded';
      req.body.urlencoded = String(dataPayload)
        .split('&')
        .filter(Boolean)
        .map((pair) => {
          const eq = pair.indexOf('=');
          return newRow(
            decodeURIComponent(eq >= 0 ? pair.slice(0, eq) : pair),
            decodeURIComponent(eq >= 0 ? pair.slice(eq + 1) : '')
          );
        });
      if (!methodExplicit) req.method = 'POST';
    } else if (looksJson) {
      req.body.type = 'json';
      try {
        req.body.json = JSON.stringify(JSON.parse(dataPayload), null, 2);
      } catch {
        req.body.json = dataPayload;
      }
      if (!methodExplicit) req.method = 'POST';
    } else {
      req.body.type = 'text';
      req.body.text = dataPayload;
      if (!methodExplicit) req.method = 'POST';
    }
  }

  return req;
}

function shellQuote(s) {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/**
 * Convert a live request into a copy-pasteable curl command.
 * Uses the *effective* headers/body the app would send.
 */
export function requestToCurl(req, effective) {
  const lines = [];
  lines.push(`curl -X ${req.method} \\`);
  lines.push(`  ${shellQuote(effective.url)} \\`);
  for (const [k, v] of effective.headers) {
    if (/^content-length$/i.test(k)) continue;
    lines.push(`  -H ${shellQuote(`${k}: ${v}`)} \\`);
  }
  if (effective.bodyText != null) {
    lines.push(`  -d ${shellQuote(effective.bodyText)}`);
  } else {
    // remove trailing backslash from last line
    lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\$/, '');
  }
  return lines.join('\n');
}
