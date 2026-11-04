/**
 * Live login check used by `dhis2-mcp login`: HTTPS GET /api/me with basic auth.
 * No redirects are followed; a DHIS2 JSON user with an id is required.
 */
import https from 'node:https';

export type LoginCheck =
  | { ok: true; me: { id: string; username?: string; displayName?: string } }
  | { ok: false; retry?: boolean; why: string };

export function validateInstanceUrl(raw: string): { ok: true; url: string } | { ok: false; why: string } {
  const url = raw.trim().replace(/\/+$/, '');
  let parsed: URL;
  try { parsed = new URL(url); } catch { return { ok: false, why: 'That is not a valid web address. It should look like https://dhis2.example.org' }; }
  if (parsed.protocol !== 'https:') return { ok: false, why: 'The address must start with https://' };
  if (parsed.username || parsed.password || parsed.search || parsed.hash) return { ok: false, why: 'Type only the address, without a username, password, ? or #.' };
  return { ok: true, url };
}

export function checkLogin(baseUrl: string, username: string, password: string, opts: { ca?: Buffer } = {}): Promise<LoginCheck> {
  return new Promise(resolve => {
    const url = new URL(`${baseUrl}/api/me?fields=id,username,displayName`);
    const req = https.get(url, {
      headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`, Accept: 'application/json' },
      timeout: 20000,
      ...(opts.ca ? { ca: opts.ca } : {}),
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', d => { if (body.length < 100000) body += d; });
      res.on('end', () => {
        if (res.statusCode === 401 || res.statusCode === 403) return resolve({ ok: false, retry: true, why: 'The username or password was not accepted.' });
        if (res.statusCode !== 200) return resolve({ ok: false, why: `The server answered with an error (HTTP ${res.statusCode})${res.headers.location ? ' and tried to redirect, so the address may be wrong' : ''}.` });
        if (!String(res.headers['content-type'] || '').includes('json')) return resolve({ ok: false, why: 'That address did not answer like a DHIS2 server. Please check it.' });
        try {
          const me = JSON.parse(body);
          if (!me?.id) return resolve({ ok: false, why: 'The server did not identify a DHIS2 user.' });
          resolve({ ok: true, me });
        } catch { resolve({ ok: false, why: 'The server sent an unreadable answer.' }); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (e: NodeJS.ErrnoException) => resolve({ ok: false, why: `Could not reach the server (${e.code || e.message}). Check the address and your internet connection.` }));
  });
}
