// End-to-end stdio security regression (mission §9 cases 1, 2, 3, 4 and RT-01/RT-04/RT-05).
//
// Runs the *compiled* server over real MCP stdio against a local fake DHIS2 HTTPS
// server, using synthetic canary credentials only. No real instance, credential or
// patient data is involved.
//
// Usage: node tests/e2e/stdio-security.mjs <compiled-entry.js> [result.json]
// Requires: openssl on PATH (self-signed certificate for the fake server).
import https from 'node:https';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const entry = path.resolve(process.argv[2] ?? 'build-e2e/index.js');
const resultPath = process.argv[3];
const CANARY_DEV = 'canaryDEV-7Hq2-pw';
const CANARY_BROKEN = 'canaryBROKEN-x91Z-pw';
const b64 = s => Buffer.from(s).toString('base64');
const canaries = [CANARY_DEV, CANARY_BROKEN, b64(`fixture:${CANARY_DEV}`), b64(`broken:${CANARY_BROKEN}`)];

// --- self-signed certificate -------------------------------------------------
const certDir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'dhis2-mcp-e2e-'));
const keyFile = path.join(certDir, 'key.pem');
const certFile = path.join(certDir, 'cert.pem');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyFile, '-out', certFile,
  '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' });

// --- fake DHIS2 ----------------------------------------------------------------
const requests = [];
const user = { id: 'fixtureUid1', displayName: 'Fixture User', username: 'fixture', authorities: ['ALL'], userRoles: [], userGroups: [], organisationUnits: [] };
const server = https.createServer({ key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) }, (req, res) => {
  const auth = req.headers.authorization || '';
  const url = new URL(req.url, 'https://localhost');
  requests.push({ method: req.method, path: url.pathname, profile: auth.includes(b64(`broken:${CANARY_BROKEN}`)) ? 'broken' : 'dev' });
  const json = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  // Hostile server behaviour: echo credentials and "patient" text in error bodies.
  const hostileError = () => json(500, { httpStatus: 'Internal Server Error', message: `echo ${auth} patient Jane Doe`, headers: req.headers });
  const isBroken = auth.includes(b64(`broken:${CANARY_BROKEN}`));
  if (url.pathname === '/api/me') {
    if (isBroken && url.searchParams.has('fields')) return hostileError();
    return json(200, user);
  }
  if (req.method === 'GET' && url.pathname === '/api/dataElements') return json(200, { dataElements: [{ id: 'de1', displayName: 'Fixture DE' }], pager: { page: 1 } });
  return hostileError();
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const baseUrl = `https://localhost:${server.address().port}`;

// --- MCP client over stdio -------------------------------------------------------
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [entry],
  stderr: 'pipe',
  env: {
    PATH: process.env.PATH ?? '', SYSTEMROOT: process.env.SYSTEMROOT ?? '',
    TEMP: certDir, TMP: certDir, USERPROFILE: certDir, HOME: certDir, APPDATA: certDir, LOCALAPPDATA: certDir,
    NODE_EXTRA_CA_CERTS: certFile,
    DHIS2_MCP_PROFILES: 'dev,broken',
    DHIS2_MCP_DEV_BASE_URL: baseUrl, DHIS2_MCP_DEV_USERNAME: 'fixture', DHIS2_MCP_DEV_PASSWORD: CANARY_DEV,
    DHIS2_MCP_BROKEN_BASE_URL: baseUrl, DHIS2_MCP_BROKEN_USERNAME: 'broken', DHIS2_MCP_BROKEN_PASSWORD: CANARY_BROKEN,
    DHIS2_MCP_CAPABILITIES: 'audit-export,not-a-capability',
  },
});
let stderr = '';
transport.stderr?.on('data', d => { stderr += d.toString(); });
const protocolLog = [];
const client = new Client({ name: 'e2e-security', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);

const checks = [];
const check = (id, ok, detail = '') => { checks.push({ id, ok: Boolean(ok), detail }); };
const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  protocolLog.push(JSON.stringify(r));
  return { isError: Boolean(r.isError), text: (r.content ?? []).map(c => c.text ?? '').join('\n') };
};
const denied = (r, code) => r.isError && r.text.includes(`Denied by MCP policy (${code})`);
const countReq = pred => requests.filter(pred).length;

try {
  // A. discovery before connection
  let list = await client.listTools(); protocolLog.push(JSON.stringify(list));
  let names = list.tools.map(t => t.name);
  check('A1 configure discoverable before connection', names.includes('dhis2_configure'));
  check('A2 no instance tools discoverable before connection', !names.some(n => /^dhis2_(list|get_data|get_analytics|create_data_element)/.test(n)), names.filter(n => /^dhis2_list/.test(n)).join(','));
  const cfgSchema = list.tools.find(t => t.name === 'dhis2_configure')?.inputSchema;
  check('A3 configure schema exposes only profile', JSON.stringify(Object.keys(cfgSchema?.properties ?? {})) === '["profile"]');

  // B/C/D. hidden, write and unknown tools are denied before any HTTP request
  let r = await call('dhis2_list_data_elements', {});
  check('B1 hidden instance tool denied when called directly (not_connected)', denied(r, 'not_connected'), r.text.slice(0, 120));
  r = await call('dhis2_create_data_element', { name: 'x', shortName: 'x', valueType: 'NUMBER', domainType: 'AGGREGATE', aggregationType: 'SUM', confirmed: true });
  check('C1 fabricated confirmed:true write denied before connection', denied(r, 'writes_disabled'));
  r = await call('dhis2_shadow_tool', { anything: 1 });
  check('D1 unknown tool denied', denied(r, 'unknown_tool'));
  check('B2 no HTTP request made by denied calls', requests.length === 0, `requests=${requests.length}`);

  // E. smuggled credentials are ignored; undeclared default profile fails
  r = await call('dhis2_configure', { baseUrl: 'https://attacker.invalid', username: 'admin', password: 'district' });
  check('E1 smuggled baseUrl/password ignored; undeclared profile rejected', r.isError && /not declared/.test(r.text), r.text.slice(0, 160));
  check('E2 still no HTTP request', requests.length === 0);

  // F. permission/user discovery failure fails closed
  r = await call('dhis2_configure', { profile: 'broken' });
  check('F1 configure fails when the DHIS2 user cannot be retrieved', r.isError, r.text.slice(0, 160));
  r = await call('dhis2_list_data_elements', {});
  check('F2 no connection activated after failed permission discovery', denied(r, 'not_connected'));

  // G. verified connection: reads allowed, writes and record reads denied
  r = await call('dhis2_configure', { profile: 'dev' });
  check('G1 configure with operator profile succeeds', !r.isError && r.text.includes('Profile: dev'), r.text.slice(0, 200));
  list = await client.listTools(); protocolLog.push(JSON.stringify(list));
  names = list.tools.map(t => t.name);
  check('G2 metadata reads discoverable after connection', names.includes('dhis2_list_data_elements'));
  check('G3 no instance write tool discoverable after connection',
    !names.some(n => /^dhis2_(create_(data|category|org|validation|program|tracked|enrollment|event|dashboard|visualization|datastore)|update_|delete_|bulk_import|run_validation|clear_audit)/.test(n)),
    names.filter(n => /create|update|delete|import/.test(n)).join(','));
  r = await call('dhis2_list_data_elements', {});
  check('G4 allowed read reaches DHIS2', !r.isError && countReq(q => q.path === '/api/dataElements') === 1, r.text.slice(0, 120));
  const before = requests.length;
  r = await call('dhis2_create_data_element', { name: 'x', shortName: 'x', valueType: 'NUMBER', domainType: 'AGGREGATE', aggregationType: 'SUM', confirmed: true });
  check('G5 fabricated confirmed:true write denied for superuser', denied(r, 'writes_disabled'));
  r = await call('dhis2_list_events', { program: 'p1' });
  check('G6 record-level read denied without operator capability', denied(r, 'capability_disabled'));
  r = await call('dhis2_manage_datastore_key', { operation: 'update', namespace: 'ns', key: 'k', value: { a: 1 }, encrypt: true });
  check('G7 DataStore write denied', denied(r, 'writes_disabled'));
  check('G8 denied calls made no HTTP request', requests.length === before, `delta=${requests.length - before}`);
  check('G9 server never received a non-GET request', countReq(q => q.method !== 'GET') === 0);

  // H. hostile server error bodies do not leak
  r = await call('dhis2_get_system_info', {});
  check('H1 server error mapped to status-only message', r.isError && /DHIS2 request failed: HTTP 500/.test(r.text) && !/Jane|echo/.test(r.text), r.text.slice(0, 160));

  // L. completion surface respects policy (RT-05)
  try {
    const comp = await client.complete({ ref: { type: 'ref/prompt', name: 'dhis2_create_data_element' }, argument: { name: 'name', value: 'a' } });
    protocolLog.push(JSON.stringify(comp));
    check('L1 no completions for a denied tool', comp.completion.values.length === 0, JSON.stringify(comp.completion.values).slice(0, 80));
  } catch (e) {
    check('L1 no completions for a denied tool', false, String(e).slice(0, 120));
  }

  // I. reconfiguration failure revokes the previous connection (RT-04)
  r = await call('dhis2_configure', { profile: 'broken' });
  r = await call('dhis2_list_data_elements', {});
  check('I1 failed reconfiguration leaves no active connection (old identity revoked)', denied(r, 'not_connected'));

  // J/K. audit export is capability-gated and minimised; clear is denied
  r = await call('dhis2_export_audit_log', {});
  check('J1 audit export allowed by operator capability', !r.isError && r.text.includes('parameterNames'));
  check('J2 audit export contains no smuggled credential values', !r.text.includes('district') && !r.text.includes('attacker.invalid'));
  r = await call('dhis2_clear_audit_log', {});
  check('K1 audit clear denied', denied(r, 'writes_disabled'));
} finally {
  await client.close().catch(() => {});
  server.close();
}

// §9.4 canary scan over every protocol message and stderr
const everything = protocolLog.join('\n') + '\n' + stderr;
for (const c of canaries) check(`S canary absent from protocol output and stderr (${c.slice(0, 10)}…)`, !everything.includes(c));
check('S unknown capability reported on stderr without values', stderr.includes('not-a-capability'));

fs.rmSync(certDir, { recursive: true, force: true });
const failed = checks.filter(c => !c.ok);
const summary = { entry, node: process.version, total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks, httpRequests: requests };
if (resultPath) fs.writeFileSync(resultPath, JSON.stringify(summary, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id}${c.ok || !c.detail ? '' : `  — ${c.detail}`}`);
console.log(`\n${summary.passed}/${summary.total} checks passed`);
process.exit(failed.length ? 1 : 0);
