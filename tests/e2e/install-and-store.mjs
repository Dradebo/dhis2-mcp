// End-to-end check of the zero-configuration path (product design phase A):
// `dhis2-mcp install` / `login` / `status` / `logout`, the server-owned credential
// store (DPAPI on Windows), and a host config that contains no secrets at all.
//
// Usage: node tests/e2e/install-and-store.mjs <compiled-dir> [result.json]
import https from 'node:https';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const buildDir = path.resolve(process.argv[2] ?? 'build-e2e');
const resultPath = process.argv[3];
const cli = path.join(buildDir, 'cli.js');
const CANARY = 'canaryStore-Zx81-pw';
const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'dhis2-install-'));
const home = path.join(dir, 'store');
const checks = [];
const check = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail });

// fake DHIS2
const keyFile = path.join(dir, 'k.pem'); const certFile = path.join(dir, 'c.pem');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyFile, '-out', certFile, '-days', '1',
  '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' });
const good = `Basic ${Buffer.from(`fixture:${CANARY}`).toString('base64')}`;
const requests = [];
const server = https.createServer({ key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) }, (req, res) => {
  const url = new URL(req.url, 'https://localhost');
  requests.push(url.pathname);
  if (req.headers.authorization !== good) { res.writeHead(401); return res.end(); }
  const json = d => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); };
  if (url.pathname === '/api/me') return json({ id: 'u1', username: 'fixture', displayName: 'Fixture User', authorities: ['ALL'], userRoles: [] });
  if (url.pathname === '/api/dataElements') return json({ dataElements: [{ id: 'de1', displayName: 'Fixture DE' }] });
  res.writeHead(404); res.end();
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const baseUrl = `https://localhost:${server.address().port}`;

// The store is isolated by DHIS2_MCP_HOME. The user's real home folders stay as they are: the OS secret
// stores belong to them (DPAPI keys under APPDATA, the macOS Keychain under HOME), exactly as when a
// person runs login and their agent host later starts the server. (CI on macOS and Windows caught a
// fake HOME/APPDATA here hiding the saved password from the child processes.)
const keep = (k) => (process.env[k] !== undefined ? { [k]: process.env[k] } : {});
const env = {
  PATH: process.env.PATH ?? '', SYSTEMROOT: process.env.SYSTEMROOT ?? '', TEMP: dir, TMP: dir,
  ...keep('USERPROFILE'), ...keep('HOME'), ...keep('APPDATA'), ...keep('LOCALAPPDATA'), ...keep('USER'), ...keep('LOGNAME'),
  ...keep('DBUS_SESSION_BUS_ADDRESS'), ...keep('XDG_RUNTIME_DIR'),
  NODE_EXTRA_CA_CERTS: certFile, DHIS2_MCP_HOME: home,
};
// Async on purpose: a synchronous spawn would block this process, which also hosts the fake DHIS2.
const run = (...args) => new Promise(resolve => {
  const child = spawn(process.execPath, [cli, ...args], { env, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', d => { stdout += d; });
  child.stderr.on('data', d => { stderr += d; });
  child.stdin.end();
  const timer = setTimeout(() => child.kill(), 60000);
  child.on('close', status => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
});

// 1. agent runs install without a terminal: gets a secret-free host config and the one human step
let r = await run('install');
let cfg = null;
try { cfg = JSON.parse(r.stdout.slice(r.stdout.indexOf('{'), r.stdout.lastIndexOf('}') + 1)); } catch { /* checked below */ }
check('I1 install (no terminal) exits 0 and prints a host config', r.status === 0 && cfg?.mcpServers?.dhis2?.command === 'npx', r.stdout.slice(0, 200));
check('I2 host config contains no credentials or URLs', cfg && !/password|token|https?:/i.test(JSON.stringify(cfg)) && JSON.stringify(cfg.mcpServers.dhis2.args) === '["-y","dhis2-mcp-server"]');
check('I3 install tells the agent the single human step', /npx -y dhis2-mcp-server login/.test(r.stdout));

// 2. login refuses to run without a real terminal (password must be typed by a person)
r = await run('login');
check('L1 login refuses non-terminal input', r.status === 2 && /typed by a person/.test(r.stderr), (r.stderr || r.stdout).slice(0, 160));

// 3. the store (what login writes) — real DPAPI on Windows
const store = await import(pathToFileURL(path.join(buildDir, 'security', 'credential-store.js')).href);
store.saveStoredProfile('default', { baseUrl, username: 'fixture', environment: 'development', displayName: 'Fixture User', verifiedAt: new Date().toISOString() }, CANARY, env);
const secretsRaw = fs.readFileSync(path.join(home, 'secrets.json'), 'utf8');
const profilesRaw = fs.readFileSync(path.join(home, 'profiles.json'), 'utf8');
const scheme = JSON.parse(secretsRaw).scheme;
check(`S1 password not stored in readable form (scheme: ${scheme})`, process.platform !== 'win32' || (scheme === 'dpapi' && !secretsRaw.includes(CANARY) && !secretsRaw.includes(Buffer.from(CANARY).toString('base64'))));
check('S2 profile file holds no secret', !profilesRaw.includes(CANARY));
check('S3 saved password reads back exactly', store.readStoredSecret('default', env) === CANARY);

// 4. status checks the saved login live
r = await run('status');
check('T1 status reports the saved connection as working', r.status === 0 && /working/.test(r.stdout) && !r.stdout.includes(CANARY), r.stdout.slice(0, 200));

// 5. a host launches the server with ONLY the secret-free config; the agent reads data with no setup call
const transport = new StdioClientTransport({ command: process.execPath, args: [cli], env, stderr: 'pipe' });
let stderr = '';
transport.stderr?.on('data', d => { stderr += d.toString(); });
const client = new Client({ name: 'e2e-install', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
const tools = (await client.listTools()).tools.map(t => t.name);
check('M1 instance tools are offered as soon as a login is saved', tools.includes('dhis2_list_data_elements') && tools.includes('dhis2_plan_metadata_change'));
const res = await client.callTool({ name: 'dhis2_list_data_elements', arguments: {} });
const text = (res.content ?? []).map(c => c.text ?? '').join('\n');
check('M2 first read connects automatically and succeeds', !res.isError && /Fixture DE/.test(text), text.slice(0, 160));
await client.close();
check('M3 canary absent from server output', !text.includes(CANARY) && !stderr.includes(CANARY));

// 6. production (or any unrecognised kind) resolves as read-only
store.saveStoredProfile('prod', { baseUrl, username: 'fixture', environment: 'production', verifiedAt: 'x' }, CANARY, env);
store.saveStoredProfile('odd', { baseUrl, username: 'fixture', environment: 'staging-ish', verifiedAt: 'x' }, CANARY, env);
const creds = await import(pathToFileURL(path.join(buildDir, 'security', 'credentials.js')).href);
check('P1 production and unrecognised profiles resolve as production (read-only)',
  creds.resolveProfile('prod', env).environment === 'production' && creds.resolveProfile('odd', env).environment === 'production');
store.deleteStoredProfile('prod', env);
store.deleteStoredProfile('odd', env);

// 7. logout removes the saved login
r = await run('logout');
check('O1 logout removes the saved connection', r.status === 0 && /Removed/.test(r.stdout) && !store.readStoredSecret('default', env));
r = await run('status');
check('O2 status afterwards explains how to log in', r.status === 1 && /npx -y dhis2-mcp-server login/.test(r.stdout));

try { store.deleteStoredProfile('default', env); } catch { /* already removed by O1 */ }
server.close();
fs.rmSync(dir, { recursive: true, force: true });
const failed = checks.filter(c => !c.ok);
if (resultPath) fs.writeFileSync(resultPath, JSON.stringify({ node: process.version, platform: process.platform, total: checks.length, failed: failed.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id}${c.ok || !c.detail ? '' : `  — ${c.detail}`}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
