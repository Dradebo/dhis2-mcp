// Helpers for scripts/setup-credentials.mjs (kept separate so they can be tested).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';

export function checkLogin(baseUrl, username, password) {
  return new Promise(resolve => {
    const url = new URL(`${baseUrl}/api/me?fields=id,username,displayName`);
    const req = https.get(url, {
      headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`, Accept: 'application/json' },
      timeout: 20000,
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', d => { if (body.length < 100000) body += d; });
      res.on('end', () => {
        if (res.statusCode === 401 || res.statusCode === 403) return resolve({ ok: false, retry: true, why: 'The username or password was not accepted.' });
        if (res.statusCode !== 200) return resolve({ ok: false, why: `The server answered HTTP ${res.statusCode}${res.headers.location ? ' (a redirect — check the URL)' : ''}.` });
        if (!String(res.headers['content-type'] || '').includes('json')) return resolve({ ok: false, why: 'The server did not return DHIS2 JSON — check the URL.' });
        try {
          const me = JSON.parse(body);
          if (!me.id) return resolve({ ok: false, why: 'The server response did not identify a DHIS2 user.' });
          resolve({ ok: true, me });
        } catch { resolve({ ok: false, why: 'The server response was not valid JSON.' }); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', e => resolve({ ok: false, why: `Could not reach the server (${e.code || e.message}).` }));
  });
}

// python-dotenv (and Hermes' loader) expand ${VAR} in every value, quoted or not,
// with no escape syntax, so values containing "${" cannot be stored faithfully.
// Single quotes are otherwise literal; double quotes need \\ and \" escaped.
export function dotenvQuote(value) {
  if (/[\r\n]/.test(value) || value.includes('${')) return null;
  if (!value.includes("'")) return `'${value}'`;
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function saveEnv(file, profile, values, remove) {
  const exists = fs.existsSync(file);
  const original = exists ? fs.readFileSync(file, 'utf8') : '';
  const eol = original.includes('\r\n') ? '\r\n' : os.EOL;
  const lines = original.length ? original.split(/\r?\n/) : [];
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  const keys = new Set([...Object.keys(values), ...remove]);
  const kept = lines.filter(line => {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    return !(m && keys.has(m[1]));
  });
  kept.push(`# dhis2-mcp connection profile "${profile}" (written by setup-credentials.mjs)`);
  for (const [k, v] of Object.entries(values)) kept.push(`${k}=${v}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.dhis2-mcp-tmp`;
  fs.writeFileSync(tmp, kept.join(eol) + eol, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, file);
}

