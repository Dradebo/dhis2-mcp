// End-to-end: production is read-only, customisation moves dev → production only via
// an approved package that a production administrator imports. Two local fake DHIS2
// servers; the MCP client plays the host and approves when asked. Synthetic data only.
//
// Usage: node tests/e2e/stdio-transfer.mjs <compiled-entry.js> [result.json]
import https from 'node:https';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const entry = path.resolve(process.argv[2] ?? 'build-e2e/index.js');
const resultPath = process.argv[3];
const CANARY_DEV = 'canaryXfer-dev-pw';
const CANARY_PROD = 'canaryXfer-prod-pw';
const PR = 'prAAAAAAAA1', DE1 = 'deAAAAAAAA1', DE2 = 'deAAAAAAAA2';

const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'dhis2-xfer-'));
const keyFile = path.join(dir, 'k.pem'); const certFile = path.join(dir, 'c.pem');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyFile, '-out', certFile, '-days', '1',
  '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' });
const tls = { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };
const user = { id: 'fixtureUid1', displayName: 'Fixture', username: 'fixture', authorities: ['ALL'], userRoles: [] };

function fakeServer(name, objects, exportsFor) {
  const log = [];
  const server = https.createServer(tls, (req, res) => {
    const url = new URL(req.url, 'https://localhost');
    log.push({ method: req.method, path: url.pathname });
    const json = (s, d) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); };
    if (req.method !== 'GET') return json(405, { message: `${name} refuses ${req.method}` });
    if (url.pathname === '/api/me') return json(200, user);
    let m = /^\/api\/(\w+)\/(\w{11})\/metadata$/.exec(url.pathname);
    if (m) { const e = exportsFor?.(m[1], m[2]); return e ? json(200, e) : json(404, {}); }
    m = /^\/api\/(\w+)\/(\w{11})$/.exec(url.pathname);
    if (m) { const o = objects.get(`${m[1]}/${m[2]}`); return o ? json(200, o) : json(404, { errorCode: 'E1005' }); }
    m = /^\/api\/(\w+)$/.exec(url.pathname);
    if (m) {
      const [field, , value] = (url.searchParams.get('filter') ?? '').split(':');
      const hits = [...objects.entries()].filter(([k, o]) => k.startsWith(`${m[1]}/`) && o[field] === value).map(([, o]) => ({ id: o.id }));
      return json(200, { [m[1]]: hits });
    }
    json(404, {});
  });
  return { server, log, objects };
}

const devObjects = new Map([
  [`programs/${PR}`, { id: PR, name: 'Facility assessment', programStages: [{ id: 'psAAAAAAAA1' }] }],
  [`dataElements/${DE1}`, { id: DE1, name: 'Water source', code: 'WATER', valueType: 'TEXT' }],
  [`dataElements/${DE2}`, { id: DE2, name: 'Staff count', code: 'STAFF', valueType: 'INTEGER' }],
]);
const dev = fakeServer('dev', devObjects, (t, id) => t === 'programs' && id === PR ? {
  system: { id: 'sys' },
  programs: [{ id: PR, name: 'Facility assessment', programStages: [{ id: 'psAAAAAAAA1' }], organisationUnits: [{ id: 'ouDEV000001' }], sharing: { public: 'rw------' } }],
  programStages: [{ id: 'psAAAAAAAA1', name: 'Visit', program: { id: PR } }],
  dataElements: [devObjects.get(`dataElements/${DE1}`), devObjects.get(`dataElements/${DE2}`)],
  users: [{ id: 'uDEV0000001', username: 'dev-admin' }],
} : null);
const prod = fakeServer('prod', new Map([[`dataElements/${DE2}`, { id: DE2, name: 'Staff count', code: 'STAFF', valueType: 'INTEGER' }]]));
await new Promise(r => dev.server.listen(0, '127.0.0.1', r));
await new Promise(r => prod.server.listen(0, '127.0.0.1', r));

const env = {
  PATH: process.env.PATH ?? '', SYSTEMROOT: process.env.SYSTEMROOT ?? '',
  TEMP: dir, TMP: dir, USERPROFILE: dir, HOME: dir, APPDATA: dir, LOCALAPPDATA: dir,
  NODE_EXTRA_CA_CERTS: certFile, DHIS2_MCP_HOME: path.join(dir, 'store'),
  DHIS2_MCP_PROFILES: 'dev,production',
  DHIS2_MCP_DEV_BASE_URL: `https://localhost:${dev.server.address().port}`, DHIS2_MCP_DEV_USERNAME: 'fixture', DHIS2_MCP_DEV_PASSWORD: CANARY_DEV, DHIS2_MCP_DEV_ENVIRONMENT: 'development',
  DHIS2_MCP_PRODUCTION_BASE_URL: `https://localhost:${prod.server.address().port}`, DHIS2_MCP_PRODUCTION_USERNAME: 'fixture', DHIS2_MCP_PRODUCTION_PASSWORD: CANARY_PROD,
};

const transport = new StdioClientTransport({ command: process.execPath, args: [entry], env, stderr: 'pipe' });
let stderr = '';
transport.stderr?.on('data', d => { stderr += d.toString(); });
const prompts = [];
const client = new Client({ name: 'e2e-transfer', version: '1.0.0' }, { capabilities: { elicitation: { form: {} } } });
client.setRequestHandler(ElicitRequestSchema, async r => { prompts.push(r.params.message); return { action: 'accept', content: {} }; });
await client.connect(transport);
const protocol = [];
const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  protocol.push(JSON.stringify(r));
  return { isError: Boolean(r.isError), text: (r.content ?? []).map(c => c.text ?? '').join('\n') };
};
const checks = [];
const check = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail });
const transferIdOf = t => (/Transfer ([0-9a-f-]{36})/.exec(t) || [])[1];

try {
  let r = await call('dhis2_list_data_elements', {});
  check('X1 first use connects to the development server by default', dev.log.some(l => l.path === '/api/me') && !prod.log.length, r.text.slice(0, 100));

  r = await call('dhis2_configure', { profile: 'production' });
  check('X2 production connects, labelled read-only', !r.isError && /PRODUCTION: read-only/.test(r.text), r.text.slice(0, 200));
  const names = (await client.listTools()).tools.map(t => t.name);
  check('X3 no change tools offered while on production', !names.includes('dhis2_plan_metadata_change') && !names.includes('dhis2_apply_plan') && names.includes('dhis2_list_data_elements'));
  r = await call('dhis2_plan_metadata_change', { description: 'x', changes: [{ action: 'update', objectType: 'dataElements', id: DE2, set: { name: 'y' } }] });
  check('X4 planning a change on production is refused', r.isError && /production_read_only/.test(r.text), r.text.slice(0, 120));
  r = await call('dhis2_create_data_element', { name: 'x', shortName: 'x', valueType: 'NUMBER', domainType: 'AGGREGATE', aggregationType: 'SUM', confirmed: true });
  check('X5 legacy write refused on production', r.isError);
  r = await call('dhis2_prepare_transfer', { description: 'x', objects: [{ objectType: 'programs', id: PR }] });
  check('X6 a transfer cannot start from production', r.isError && /source_not_development/.test(r.text), r.text.slice(0, 120));

  await call('dhis2_configure', { profile: 'dev' });
  r = await call('dhis2_prepare_transfer', { description: 'Facility assessment v1', objects: [{ objectType: 'programs', id: PR }] });
  const tid = transferIdOf(r.text);
  check('X7 transfer prepared from development with a production comparison', !r.isError && /State: prepared/.test(r.text) && /3 new/.test(r.text) && /1 already identical/.test(r.text), r.text.slice(0, 300));
  const reviewPath = (/Review: (.+)/.exec(r.text) || [])[1]?.trim();
  check('X8 plain-language review file written', reviewPath && fs.existsSync(reviewPath) && /Nothing will be deleted/.test(fs.readFileSync(reviewPath, 'utf8')));

  r = await call('dhis2_approve_transfer', { transferId: tid });
  check('X9 approval asked in plain language; approved package and admin instructions produced', !r.isError && /State: approved/.test(r.text)
    && /will NOT change production/.test(prompts.at(-1) ?? '') && /Instructions for the production administrator/.test(r.text), r.text.slice(0, 200));

  r = await call('dhis2_verify_transfer', { transferId: tid });
  check('X10 before the admin imports: not-imported', /State: not-imported/.test(r.text), r.text.slice(0, 160));

  // The production administrator imports the approved file (outside the MCP).
  const pkgPath = (/Package: (.+)/.exec(r.text) || [])[1]?.trim();
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  for (const [t, list] of Object.entries(pkg)) for (const o of list) prod.objects.set(`${t}/${o.id}`, o);
  r = await call('dhis2_verify_transfer', { transferId: tid });
  check('X11 after the admin imports: verified by reading production', /State: verified/.test(r.text), r.text.slice(0, 160));
  check('X12 package excludes users, sharing and dev org unit assignments', !pkg.users && !pkg.programs[0].sharing && !pkg.programs[0].organisationUnits);
} finally {
  await client.close().catch(() => {});
}

const prodWrites = prod.log.filter(l => l.method !== 'GET');
check('X13 production server received only GET requests during the whole run', prodWrites.length === 0 && prod.log.length > 0, JSON.stringify(prodWrites));
const all = protocol.join('\n') + prompts.join('\n') + stderr;
check('X14 canaries absent', !all.includes(CANARY_DEV) && !all.includes(CANARY_PROD));
dev.server.close(); prod.server.close();
fs.rmSync(dir, { recursive: true, force: true });
const failed = checks.filter(c => !c.ok);
if (resultPath) fs.writeFileSync(resultPath, JSON.stringify({ total: checks.length, failed: failed.length, checks, prodRequests: prod.log.length }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id}${c.ok || !c.detail ? '' : `  — ${c.detail}`}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
