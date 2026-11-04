// Checks for scripts/credential-store.mjs (used by setup-credentials.mjs).
// Usage: node tests/e2e/credential-store-check.mjs [path-to-python-with-python-dotenv]
// Synthetic values only. Requires openssl for the fake HTTPS server.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import { execFileSync } from 'node:child_process';
import { checkLogin, dotenvQuote, saveEnv } from '../../scripts/credential-store.mjs';

const python = process.argv[2];
const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'dhis2-cred-'));
const results = [];
const check = (id, ok, detail = '') => results.push({ id, ok: Boolean(ok), detail });

// 1. .env writing round-trips through the real python-dotenv parser
const tricky = ['plain', 'sp ace#hash', 'dollar$HOME-and$X', `quote'single`, 'back\\slash"dq', 'é-ünïcødé', '=leading=equals', `mix'back\\sl"dq`];
const envFile = path.join(dir, '.env');
const preamble = 'OPENAI_API_KEY=keep-me\r\n# comment stays\r\nexport OTHER="x"\r\nDHIS2_MCP_DEV_TOKEN=old-token\r\n';
for (const pw of tricky) {
  fs.writeFileSync(envFile, preamble);
  const q = dotenvQuote(pw);
  if (q === null) { check(`quote ${JSON.stringify(pw)}`, false, 'refused'); continue; }
  saveEnv(envFile, 'dev', { DHIS2_MCP_DEV_BASE_URL: `'https://x.example.org'`, DHIS2_MCP_DEV_USERNAME: dotenvQuote('user'), DHIS2_MCP_DEV_PASSWORD: q }, ['DHIS2_MCP_DEV_TOKEN']);
  saveEnv(envFile, 'dev', { DHIS2_MCP_DEV_BASE_URL: `'https://x.example.org'`, DHIS2_MCP_DEV_USERNAME: dotenvQuote('user'), DHIS2_MCP_DEV_PASSWORD: q }, ['DHIS2_MCP_DEV_TOKEN']);
  const text = fs.readFileSync(envFile, 'utf8');
  const count = (text.match(/^DHIS2_MCP_DEV_PASSWORD=/gm) || []).length;
  check(`save twice keeps one entry (${JSON.stringify(pw)})`, count === 1);
  check(`unrelated lines preserved (${JSON.stringify(pw)})`, text.startsWith('OPENAI_API_KEY=keep-me\r\n# comment stays\r\nexport OTHER="x"\r\n'));
  check(`old token removed (${JSON.stringify(pw)})`, !text.includes('old-token'));
  if (python) {
    const out = execFileSync(python, ['-c',
      'import json,sys; from dotenv import dotenv_values; v=dotenv_values(sys.argv[1]); print(json.dumps({k:v.get(k) for k in ["DHIS2_MCP_DEV_PASSWORD","DHIS2_MCP_DEV_USERNAME","DHIS2_MCP_DEV_BASE_URL","OPENAI_API_KEY"]}))',
      envFile], { encoding: 'utf8' });
    const parsed = JSON.parse(out);
    check(`python-dotenv reads the exact password (${JSON.stringify(pw)})`, parsed.DHIS2_MCP_DEV_PASSWORD === pw, `got ${JSON.stringify(parsed.DHIS2_MCP_DEV_PASSWORD)}`);
    check(`python-dotenv reads url/username/other (${JSON.stringify(pw)})`, parsed.DHIS2_MCP_DEV_BASE_URL === 'https://x.example.org' && parsed.DHIS2_MCP_DEV_USERNAME === 'user' && parsed.OPENAI_API_KEY === 'keep-me');
  }
}
check('refuses multi-line password', dotenvQuote('a\nb') === null);
check('refuses password containing ${ (would be expanded by the .env loader)', dotenvQuote('a${B}') === null && dotenvQuote("a'${B}") === null);

// 2. login check against a fake DHIS2
const key = path.join(dir, 'k.pem'); const cert = path.join(dir, 'c.pem');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' });
const good = `Basic ${Buffer.from('fixture:right-pw').toString('base64')}`;
const server = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, (req, res) => {
  if (req.url.startsWith('/redirect/')) { res.writeHead(302, { location: '/login' }); return res.end(); }
  if (req.url.startsWith('/html/')) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<html>login</html>'); }
  if (req.headers.authorization !== good) { res.writeHead(401); return res.end(); }
  res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: 'u1', username: 'fixture', displayName: 'Fixture' }));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `https://localhost:${server.address().port}`;
process.env.NODE_EXTRA_CA_CERTS = cert; // only affects child processes; use agent below instead
const { globalAgent } = https; globalAgent.options.ca = fs.readFileSync(cert);
let r = await checkLogin(base, 'fixture', 'right-pw');
check('login: correct credentials accepted', r.ok && r.me.id === 'u1');
r = await checkLogin(base, 'fixture', 'wrong');
check('login: wrong password rejected and retryable', !r.ok && r.retry === true);
r = await checkLogin(`${base}/redirect`, 'fixture', 'right-pw');
check('login: redirect not followed and not accepted', !r.ok && /redirect/.test(r.why));
r = await checkLogin(`${base}/html`, 'fixture', 'right-pw');
check('login: non-JSON 200 not accepted', !r.ok);
server.close();

fs.rmSync(dir, { recursive: true, force: true });
for (const c of results) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id}${c.ok || !c.detail ? '' : `  — ${c.detail}`}`);
const failed = results.filter(c => !c.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed${python ? '' : ' (python-dotenv round-trip skipped)'}`);
process.exit(failed ? 1 : 0);
