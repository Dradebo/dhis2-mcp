// End-to-end check of the safe change engine over real MCP stdio (mission W2,
// §9 cases 1, 11, 12). A local fake DHIS2 holds synthetic metadata; the MCP client
// plays the host and answers elicitation (approval) requests from a script.
//
// Usage: node tests/e2e/stdio-change-engine.mjs <compiled-entry.js> [result.json]
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
const CANARY = 'canaryW2-pw-55Kq';
const DE = 'deAAAAAAAA1';

const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'dhis2-w2-'));
const keyFile = path.join(dir, 'key.pem'); const certFile = path.join(dir, 'cert.pem');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyFile, '-out', certFile, '-days', '1',
  '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' });

// ---- fake DHIS2 with a metadata store ----------------------------------------
const store = new Map();
const reset = () => {
  store.clear();
  store.set(`dataElements/${DE}`, {
    id: DE, name: 'ANC 1st', shortName: 'ANC1', valueType: 'NUMBER', aggregationType: 'SUM', domainType: 'AGGREGATE',
    categoryCombo: { id: 'ccAAAAAAAA1' }, lastUpdated: '2026-01-01', access: { read: true, write: true },
    sharing: { owner: 'fixtureUid1', public: 'rw------', users: { uB: { id: 'uB', access: 'rwrw----' } } },
  });
};
reset();
const log = [];
let dropSocketAfterCommit = false;
const user = { id: 'fixtureUid1', displayName: 'Fixture User', username: 'fixture', authorities: ['ALL'], userRoles: [], userGroups: [], organisationUnits: [] };
const server = https.createServer({ key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) }, (req, res) => {
  const url = new URL(req.url, 'https://localhost');
  let body = '';
  req.on('data', d => { body += d; });
  req.on('end', () => {
    const json = (status, data) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };
    log.push({ method: req.method, path: url.pathname, mode: url.searchParams.get('importMode') });
    if (url.pathname === '/api/me') return json(200, user);
    const m = /^\/api\/(\w+)\/(\w{11})$/.exec(url.pathname);
    if (req.method === 'GET' && m) {
      const obj = store.get(`${m[1]}/${m[2]}`);
      return obj ? json(200, obj) : json(404, { httpStatus: 'Not Found', errorCode: 'E1005' });
    }
    if (req.method === 'POST' && url.pathname === '/api/metadata') {
      const payload = JSON.parse(body || '{}');
      const total = Object.values(payload).reduce((n, l) => n + l.length, 0);
      if (url.searchParams.get('importMode') === 'VALIDATE') return json(200, { response: { status: 'OK', stats: { created: 0, updated: 0, ignored: 0, total } } });
      let created = 0, updated = 0;
      for (const [t, list] of Object.entries(payload)) for (const o of list) {
        const k = `${t}/${o.id}`; store.has(k) ? updated++ : created++;
        store.set(k, { ...o, lastUpdated: new Date().toISOString() });
      }
      if (dropSocketAfterCommit) { dropSocketAfterCommit = false; return req.socket.destroy(); }
      return json(200, { response: { status: 'OK', stats: { created, updated, ignored: 0, total } } });
    }
    json(500, { message: 'unexpected' });
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const baseUrl = `https://localhost:${server.address().port}`;

const env = {
  PATH: process.env.PATH ?? '', SYSTEMROOT: process.env.SYSTEMROOT ?? '',
  TEMP: dir, TMP: dir, USERPROFILE: dir, HOME: dir, APPDATA: dir, LOCALAPPDATA: dir,
  NODE_EXTRA_CA_CERTS: certFile,
  DHIS2_MCP_PROFILES: 'dev',
  DHIS2_MCP_DEV_BASE_URL: baseUrl, DHIS2_MCP_DEV_USERNAME: 'fixture', DHIS2_MCP_DEV_PASSWORD: CANARY,
  DHIS2_MCP_DEV_ENVIRONMENT: 'development',
};

async function startClient({ elicitation, answers = [] }) {
  const transport = new StdioClientTransport({ command: process.execPath, args: [entry], env, stderr: 'pipe' });
  const state = { stderr: '', prompts: [], answers: [...answers], protocol: [] };
  transport.stderr?.on('data', d => { state.stderr += d.toString(); });
  const client = new Client({ name: 'e2e-w2', version: '1.0.0' }, { capabilities: elicitation ? { elicitation: { form: {} } } : {} });
  if (elicitation) {
    client.setRequestHandler(ElicitRequestSchema, async request => {
      state.prompts.push(request.params.message);
      const action = state.answers.shift() ?? 'decline';
      return action === 'accept' ? { action, content: {} } : { action };
    });
  }
  await client.connect(transport);
  const call = async (name, args) => {
    const r = await client.callTool({ name, arguments: args });
    state.protocol.push(JSON.stringify(r));
    return { isError: Boolean(r.isError), text: (r.content ?? []).map(c => c.text ?? '').join('\n') };
  };
  return { client, call, state };
}

const checks = [];
const check = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail });
const commits = () => log.filter(l => l.path === '/api/metadata' && l.mode === 'COMMIT').length;
const planIdOf = text => (/Plan ([0-9a-f-]{36})/.exec(text) || [])[1];
const rename = name => ({ description: 'Rename ANC data element', changes: [{ action: 'update', objectType: 'dataElements', id: DE, set: { name } }] });
const allText = [];

// ---- host WITH an approval channel ---------------------------------------------
{
  const h = await startClient({ elicitation: true, answers: ['decline', 'accept'] });
  try {
    // No dhis2_configure call: the server connects on first use from the set-up profile.
    const names = (await h.client.listTools()).tools.map(t => t.name);
    check('P1 plan tools discoverable without any configuration step', names.includes('dhis2_plan_metadata_change') && names.includes('dhis2_apply_plan'));
    check('P2 legacy direct write tools still hidden', !names.includes('dhis2_create_data_element') && !names.includes('dhis2_bulk_import_data_values'));

    let r = await h.call('dhis2_create_data_element', { name: 'x', shortName: 'x', valueType: 'NUMBER', domainType: 'AGGREGATE', aggregationType: 'SUM', confirmed: true });
    check('P3 legacy write still denied with confirmed:true', r.isError && r.text.includes('writes_disabled'));

    r = await h.call('dhis2_plan_metadata_change', rename('ANC 1st visit'));
    const plan1 = planIdOf(r.text);
    check('P0 first call connected automatically (no configure step)', log.some(l => l.path === '/api/me'));
    check('P4 plan created and validated by a DHIS2 dry run, nothing committed', !r.isError && /State: validated/.test(r.text) && commits() === 0, r.text.slice(0, 200));

    r = await h.call('dhis2_apply_plan', { planId: plan1, confirmed: true, approval: 'granted' });
    check('P5 user decline in host → nothing sent, despite confirmed/approval args', r.isError && /declined/.test(r.text) && commits() === 0, r.text.slice(0, 160));
    check('P6 host prompt shows the exact field change and plan hash', /name: "ANC 1st" → "ANC 1st visit"/.test(h.state.prompts[0] ?? '') && /sha256 [0-9a-f]{12}/.test(h.state.prompts[0] ?? ''));
    check('P6b host prompt opens in plain language', /^Allow the assistant to change DHIS2 on the development server/.test(h.state.prompts[0] ?? '') && /In short: update 1 data element \("ANC 1st"\)/.test(h.state.prompts[0] ?? ''), (h.state.prompts[0] ?? '').split('\n').slice(0, 2).join(' | '));
    r = await h.call('dhis2_apply_plan', { planId: plan1 });
    check('P7 declined plan cannot be re-applied', r.isError && /not_applicable/.test(r.text) && h.state.prompts.length === 1);

    r = await h.call('dhis2_plan_metadata_change', rename('ANC first visit'));
    const plan2 = planIdOf(r.text);
    r = await h.call('dhis2_apply_plan', { planId: plan2 });
    const stored = store.get(`dataElements/${DE}`);
    check('P8 approved plan committed once and verified by read-back', !r.isError && /State: verified/.test(r.text) && commits() === 1, r.text.slice(0, 200));
    check('P9 unrelated nested sharing access string preserved', stored.name === 'ANC first visit' && stored.sharing?.users?.uB?.access === 'rwrw----' && stored.categoryCombo?.id === 'ccAAAAAAAA1');
    r = await h.call('dhis2_apply_plan', { planId: plan2 });
    check('P10 replay of an applied plan refused, no second commit', r.isError && /not_applicable/.test(r.text) && commits() === 1);

    r = await h.call('dhis2_apply_plan', { planId: '00000000-0000-4000-8000-000000000000' });
    check('P11 guessed plan id refused', r.isError && /unknown_plan/.test(r.text));

    // drift: someone edits the object between plan and apply
    r = await h.call('dhis2_plan_metadata_change', rename('ANC contact 1'));
    const plan3 = planIdOf(r.text);
    store.get(`dataElements/${DE}`).description = 'edited elsewhere';
    const promptsBefore = h.state.prompts.length;
    r = await h.call('dhis2_apply_plan', { planId: plan3 });
    check('P12 drift detected → stale, user not prompted, nothing sent', r.isError && /stale/.test(r.text) && h.state.prompts.length === promptsBefore && commits() === 1, r.text.slice(0, 160));

    // reconfiguration invalidates open plans
    r = await h.call('dhis2_plan_metadata_change', rename('ANC contact one'));
    const plan4 = planIdOf(r.text);
    await h.call('dhis2_configure', { profile: 'dev' });
    r = await h.call('dhis2_apply_plan', { planId: plan4 });
    check('P13 plan from before reconfiguration refused', r.isError && /(wrong_session|not_applicable)/.test(r.text) && commits() === 1, r.text.slice(0, 120));

    // unknown outcome: the server applies the commit then drops the connection
    h.state.answers.push('accept');
    r = await h.call('dhis2_plan_metadata_change', rename('ANC visit 1'));
    const plan5 = planIdOf(r.text);
    dropSocketAfterCommit = true;
    r = await h.call('dhis2_apply_plan', { planId: plan5 });
    check('P14 lost response after commit → reconciled by read-back as verified', /State: verified/.test(r.text) && /unknown/.test(r.text) && commits() === 2, r.text.slice(0, 240));
    r = await h.call('dhis2_get_plan', { planId: plan5 });
    check('P15 status lookup never re-sends', commits() === 2 && /verified/.test(r.text));

    r = await h.call('dhis2_plan_metadata_change', { description: 'x', changes: [{ action: 'update', objectType: 'dataElements', id: DE, set: { sharing: { public: 'rwrw----' } } }] });
    check('P16 sharing changes rejected at planning', r.isError && /sharing/.test(r.text));
    r = await h.call('dhis2_plan_metadata_change', { description: 'x', changes: [{ action: 'update', objectType: 'users', id: DE, set: { name: 'x' } }] });
    check('P17 non-allowlisted object type rejected', r.isError && /objectType/.test(r.text));
    // Sensitive reads: asked once per connection, then remembered for that connection.
    const promptsBeforeConsent = h.state.prompts.length;
    h.state.answers.push('accept');
    r = await h.call('dhis2_list_events', { program: 'prAAAAAAAA1' });
    const r2 = await h.call('dhis2_list_events', { program: 'prAAAAAAAA1' });
    check('C1 individual-record read asks the person once, then proceeds', h.state.prompts.length === promptsBeforeConsent + 1
      && /individual-level records/.test(h.state.prompts[promptsBeforeConsent] ?? '') && !/permission/.test(r.text) && !/permission/.test(r2.text), r.text.slice(0, 120));
    allText.push(...h.state.protocol, ...h.state.prompts, h.state.stderr);
  } finally { await h.client.close().catch(() => {}); }
}

// ---- host WITHOUT an approval channel ------------------------------------------
{
  reset();
  const before = commits();
  const h = await startClient({ elicitation: false });
  try {
    await h.call('dhis2_configure', { profile: 'dev' });
    let r = await h.call('dhis2_plan_metadata_change', rename('ANC 1st visit'));
    const plan = planIdOf(r.text);
    r = await h.call('dhis2_apply_plan', { planId: plan, confirmed: true });
    check('N1 host without elicitation → no_approval_channel, nothing sent', r.isError && /no_approval_channel/.test(r.text) && commits() === before, r.text.slice(0, 160));
    allText.push(...h.state.protocol, h.state.stderr);
  } finally { await h.client.close().catch(() => {}); }
}

server.close();
const joined = allText.join('\n');
check('S canary password absent from protocol, prompts and stderr', !joined.includes(CANARY) && !joined.includes(Buffer.from(`fixture:${CANARY}`).toString('base64')));
fs.rmSync(dir, { recursive: true, force: true });

const failed = checks.filter(c => !c.ok);
if (resultPath) fs.writeFileSync(resultPath, JSON.stringify({ entry, node: process.version, total: checks.length, failed: failed.length, checks, requests: log }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id}${c.ok || !c.detail ? '' : `  — ${c.detail}`}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
