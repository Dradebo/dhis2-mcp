// End-to-end: offline design check, prompts/resources, discovery tools and change
// packages over MCP stdio against a fake DHIS2 that validates references like DHIS2.
// Builds the 254-object synthetic program in 3 approvals. Synthetic data only.
//
// Usage: node tests/e2e/stdio-packages.mjs <compiled-entry.js> [result.json]
import https from 'node:https';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(process.argv[2] ?? 'build-e2e/index.js');
const resultPath = process.argv[3];
const CANARY = 'canaryPkg-dev-pw';
const fixture = JSON.parse(fs.readFileSync(path.join(here, '..', 'fixtures', 'synthetic-program.json'), 'utf8'));

const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'dhis2-pkg-'));
const keyFile = path.join(dir, 'k.pem'); const certFile = path.join(dir, 'c.pem');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyFile, '-out', certFile, '-days', '1',
  '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' });
const tls = { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };
const user = { id: 'fixtureUid1', displayName: 'Fixture', username: 'fixture', authorities: ['ALL'], userRoles: [] };

const store = new Map(); // `${type}/${id}` -> object
store.set('optionSets/osEXIST0001', { id: 'osEXIST0001', name: 'Yes No', valueType: 'TEXT', options: [] });
const log = [];
let commits = 0;

function refsOf(v, out, top = true) {
  if (Array.isArray(v)) { v.forEach(x => refsOf(x, out, false)); return; }
  if (!v || typeof v !== 'object') return;
  const keys = Object.keys(v);
  if (!top && typeof v.id === 'string' && keys.every(k => ['id', 'name', 'code', 'displayName'].includes(k))) { out.add(v.id); return; }
  for (const [k, x] of Object.entries(v)) if (k !== 'id') refsOf(x, out, false);
}
function inlineIds(v, out, top = true) {
  if (Array.isArray(v)) { v.forEach(x => inlineIds(x, out, false)); return; }
  if (!v || typeof v !== 'object') return;
  if (!top && typeof v.id === 'string' && !Object.keys(v).every(k => ['id', 'name', 'code', 'displayName'].includes(k))) out.add(v.id);
  for (const [k, x] of Object.entries(v)) if (k !== 'id') inlineIds(x, out, false);
}

const server = https.createServer(tls, (req, res) => {
  const url = new URL(req.url, 'https://localhost');
  log.push({ method: req.method, path: url.pathname });
  const json = (s, d) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); };
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    if (url.pathname === '/api/system/info') return json(200, { version: '2.41.10', revision: 'abc1234' });
    if (url.pathname === '/api/me') return json(200, user);
    if (req.method === 'POST' && url.pathname === '/api/metadata') {
      const payload = JSON.parse(body || '{}');
      const total = Object.values(payload).reduce((n, l) => n + l.length, 0);
      const known = new Set([...store.keys()].map(k => k.split('/')[1]));
      for (const list of Object.values(payload)) for (const o of list) { known.add(o.id); inlineIds(o, known); }
      const errs = [];
      for (const [t, list] of Object.entries(payload)) for (const o of list) {
        const r = new Set(); refsOf(o, r);
        for (const id of r) if (!known.has(id)) errs.push({ uid: o.id, errorReports: [{ errorCode: 'E5002', message: `Invalid reference [${id}] on ${t}` }] });
      }
      if (errs.length) return json(409, { response: { status: 'ERROR', stats: { total }, typeReports: [{ klass: 'x.Object', objectReports: errs.slice(0, 20) }] } });
      if (url.searchParams.get('importMode') === 'COMMIT') {
        commits++;
        for (const [t, list] of Object.entries(payload)) for (const o of list) store.set(`${t}/${o.id}`, { ...o, lastUpdated: new Date().toISOString() });
      }
      return json(200, { response: { status: 'OK', stats: { total, created: total } } });
    }
    if (req.method === 'POST' && url.pathname === '/api/programIndicators/expression/description') {
      return body.includes('#{') ? json(200, { status: 'OK', message: 'Valid', description: 'Item functional' }) : json(200, { status: 'ERROR', message: 'Expression is not valid' });
    }
    if (req.method !== 'GET') return json(405, {});
    if (url.pathname === '/api/schemas') return json(200, { schemas: [{ name: 'programRuleAction', plural: 'programRuleActions', displayName: 'Program Rule Action', properties: [
      { name: 'programRuleActionType', fieldName: 'programRuleActionType', propertyType: 'CONSTANT', required: true, writable: true, constants: ['HIDEFIELD', 'ASSIGN', 'SHOWWARNING'] },
      { name: 'content', fieldName: 'content', propertyType: 'TEXT', writable: true, length: 2147483647 },
      { name: 'programRule', fieldName: 'programRule', propertyType: 'REFERENCE', writable: true, owner: true },
    ] }] });
    let m = /^\/api\/identifiableObjects\/(\w{11})$/.exec(url.pathname);
    if (m) return [...store.keys()].some(k => k.endsWith(`/${m[1]}`)) ? json(200, { id: m[1] }) : json(404, {});
    m = /^\/api\/(\w+)\/(\w{11})$/.exec(url.pathname);
    if (m) { const o = store.get(`${m[1]}/${m[2]}`); return o ? json(200, o) : json(404, {}); }
    m = /^\/api\/(\w+)$/.exec(url.pathname);
    if (m) {
      const q = (url.searchParams.get('filter') ?? '').replace('identifiable:token:', '').toLowerCase();
      const hits = [...store.entries()].filter(([k, o]) => k.startsWith(`${m[1]}/`) && String(o.name ?? '').toLowerCase().includes(q)).map(([, o]) => ({ id: o.id, name: o.name, valueType: o.valueType }));
      return json(200, { [m[1]]: hits });
    }
    json(404, {});
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));

const env = {
  PATH: process.env.PATH ?? '', SYSTEMROOT: process.env.SYSTEMROOT ?? '',
  TEMP: dir, TMP: dir, USERPROFILE: dir, HOME: dir, APPDATA: dir, LOCALAPPDATA: dir,
  NODE_EXTRA_CA_CERTS: certFile, DHIS2_MCP_HOME: path.join(dir, 'store'),
  DHIS2_MCP_PROFILES: 'dev,production',
  DHIS2_MCP_DEV_BASE_URL: `https://localhost:${server.address().port}`, DHIS2_MCP_DEV_USERNAME: 'fixture', DHIS2_MCP_DEV_PASSWORD: CANARY, DHIS2_MCP_DEV_ENVIRONMENT: 'development',
  DHIS2_MCP_PRODUCTION_BASE_URL: `https://localhost:${server.address().port}`, DHIS2_MCP_PRODUCTION_USERNAME: 'fixture', DHIS2_MCP_PRODUCTION_PASSWORD: CANARY, DHIS2_MCP_PRODUCTION_ENVIRONMENT: 'production',
};
const transport = new StdioClientTransport({ command: process.execPath, args: [entry], env, stderr: 'pipe' });
let stderr = '';
transport.stderr?.on('data', d => { stderr += d.toString(); });
const prompts = [];
const client = new Client({ name: 'e2e-packages', version: '1.0.0' }, { capabilities: { elicitation: { form: {} } } });
const forms = [];
client.setRequestHandler(ElicitRequestSchema, async r => {
  const props = r.params.requestedSchema?.properties ?? {};
  if (props.q1) { // clarification form: answer q1 with its second option, leave the rest unanswered
    forms.push(r.params);
    return { action: 'accept', content: { q1: props.q1.enum[1] } };
  }
  prompts.push(r.params.message);
  return { action: 'accept', content: {} };
});
await client.connect(transport);
const protocol = [];
const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  protocol.push(JSON.stringify(r));
  return { isError: Boolean(r.isError), text: (r.content ?? []).map(c => c.text ?? '').join('\n') };
};
const checks = [];
const check = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail });
const pkgId = t => (/Package ([0-9a-f-]{36})/.exec(t) || [])[1];

try {
  // --- offline, before any connection -------------------------------------------------
  const ps = await client.listPrompts();
  check('K1 customise_from_documents prompt is offered', ps.prompts.some(p => p.name === 'customise_from_documents'));
  const gp = await client.getPrompt({ name: 'customise_from_documents', arguments: { goal: 'Facility assessment program' } });
  check('K2 prompt carries the staged procedure', /Requirement ledger/.test(gp.messages[0].content.text) && /dhis2_plan_package/.test(gp.messages[0].content.text));
  const rs = await client.listResources();
  const mr = await client.readResource({ uri: 'dhis2://guides/modelling-rules' });
  check('K3 guides are readable resources', rs.resources.length >= 4 && /EVENT_DATE boundaries/.test(mr.contents[0].text));
  let r = await call('dhis2_generate_uids', { count: 5 });
  check('K4 UIDs generated offline', r.text.split('\n').filter(x => /^[A-Za-z][A-Za-z0-9]{10}$/.test(x)).length === 5);
  r = await call('dhis2_check_design', { creates: fixture.packages[0].creates });
  check('K5 design check passes the synthetic package without a connection', !r.isError && /Offline checks passed/.test(r.text) && !log.some(l => !['/api/me', '/api/system/info'].includes(l.path)), r.text.slice(0, 200));
  r = await call('dhis2_check_design', { creates: { dashboards: [{ id: 'dbAAAAAAAA1', name: 'D', dashboardItems: [{ id: 'diAAAAAAAA1', w: 5, h: 5 }] }] } });
  check('K6 design check reports a known silent failure', r.isError && /dashboard-item-size/.test(r.text));

  // --- discovery ---------------------------------------------------------------------
  r = await call('dhis2_get_schema', { objectType: 'programRuleActions' });
  check('K7 schema lookup lists required fields and enums', /programRuleActionType: CONSTANT REQUIRED one of HIDEFIELD\|ASSIGN/.test(r.text), r.text.slice(0, 200));
  r = await call('dhis2_find_reusable', { objectType: 'optionSets', query: 'yes no' });
  check('K8 reuse search finds an existing option set', /osEXIST0001/.test(r.text), r.text.slice(0, 160));
  r = await call('dhis2_validate_expression', { kind: 'programIndicatorExpression', expression: 'nonsense' });
  check('K9 expression validation reports an invalid expression', r.isError && /not valid/.test(r.text));

  // --- packages ----------------------------------------------------------------------
  r = await call('dhis2_plan_package', fixture.packages[1]);
  check('K10 package with missing references is refused before any write', r.isError && /Referenced but neither/.test(r.text) && commits === 0, r.text.slice(0, 160));
  // --- requirement ledger and clarifications (local) ----------------------------------
  r = await call('dhis2_start_project', { goal: 'Facility assessment program from the paper checklist', documents: [{ id: 'checklist', title: 'Facility checklist v2', kind: 'form' }] });
  const projectId = (/Project ([0-9a-f-]{36})/.exec(r.text) || [])[1];
  r = await call('dhis2_record_requirements', { projectId, requirements: [
    { ref: 'R1', text: 'Assessment program with its questions', source: { document: 'checklist', location: 'all pages' }, status: 'mapped' },
    { ref: 'R2', text: 'Visit window', source: { document: 'checklist', location: 'p2', quote: 'within the visit window' }, status: 'question' },
    { ref: 'R3', text: 'Ownership', source: { document: 'checklist', location: 'p1' }, status: 'question' },
  ] });
  check('K17 project and ledger recorded locally', !r.isError && /Requirements: 3/.test(r.text), r.text.slice(0, 200));
  r = await call('dhis2_record_requirements', { projectId, requirements: [{ ref: 'R2', status: 'decided' }] });
  check('K18 the assistant cannot decide on the person\'s behalf', r.isError && /only the person can decide/.test(r.text), r.text.slice(0, 160));
  r = await call('dhis2_ask_clarifications', { projectId, questions: [
    { ref: 'R2', question: 'How long is the visit window?', options: ['7 days', '14 days'], recommended: '14 days' },
    { ref: 'R3', question: 'Is ownership asked?', options: ['Yes', 'No'] }] });
  check('K19 questions batched in one form; answered ones recorded, unanswered stay open', forms.length === 1 && /Answered: R2/.test(r.text) && /Still open: R3/.test(r.text)
    && /Source: checklist, p2 "within the visit window"/.test(forms[0].message), r.text.slice(0, 200));

  const files = [];
  const pkgIds = [];
  for (let i = 0; i < 3; i++) {
    let args = fixture.packages[i];
    if (i === 0) { // large package via file
      const f = path.join(dir, 'pkg1.json'); fs.writeFileSync(f, JSON.stringify(args)); args = { packageFile: f };
    }
    r = await call('dhis2_plan_package', args);
    const id = pkgId(r.text);
    files.push((/Review: (.+)/.exec(r.text) || [])[1]?.trim());
    if (r.isError || !id) { check(`K11.${i + 1} package ${i + 1} planned`, false, r.text.slice(0, 400)); break; }
    pkgIds.push(id);
    r = await call('dhis2_apply_package', { packageId: id });
    check(`K11.${i + 1} package ${i + 1} applied and verified`, !r.isError && /State: verified/.test(r.text), r.text.slice(0, 300));
  }
  check('K12 the 254-object program needed exactly 3 approvals and 3 imports', prompts.length === 3 && commits === 3 && store.size === 255, `prompts ${prompts.length} commits ${commits} store ${store.size}`);
  check('K13 approval prompts are plain language and point to the review file', /^Allow the assistant to apply this package to the development server/.test(prompts[0] ?? '') && /review\.md/.test(prompts[0] ?? ''));
  check('K14 review files list every object', files.every(f => f && fs.existsSync(f)) && (fs.readFileSync(files[0], 'utf8').match(/^- \*\*create\*\*/gm) ?? []).length === 165);

  // --- handover from the server's own records -----------------------------------------
  const programs = fixture.packages.flatMap(p => p.creates?.programs ?? []);
  // A package that is planned but never applied (cancelled): work linked to it must not count as verified.
  r = await call('dhis2_plan_package', { description: 'Scoring constant', creates: { constants: [{ id: 'coE2E000001', name: 'E2E scoring constant', shortName: 'E2E scoring', value: 2 }] } });
  const cancelledPkg = pkgId(r.text);
  await call('dhis2_cancel_package', { packageId: cancelledPkg });
  r = await call('dhis2_record_requirements', { projectId, requirements: [
    { ref: 'R4', text: 'Scoring weight', source: { document: 'checklist', location: 'p3' }, objects: [{ objectType: 'constants', id: 'coE2E000001' }], packageIds: [cancelledPkg] },
    { ref: 'R1', objects: programs.map(p => ({ objectType: 'programs', id: p.id })), packageIds: pkgIds },
    { ref: 'R2', objects: programs.map(p => ({ objectType: 'programs', id: p.id })), packageIds: pkgIds.slice(-1) },
  ], checks: [{ name: 'Skip logic exercised in Capture', result: 'not-run', evidence: 'no browser in this host' }] });
  r = await call('dhis2_write_handover', { projectId });
  const handoverFile = (/File: (.+)/.exec(r.text) || [])[1]?.trim();
  const md = handoverFile && fs.existsSync(handoverFile) ? fs.readFileSync(handoverFile, 'utf8') : '';
  check('K20 handover: R1 verified from package read-back; open question and unrun check listed; not complete',
    /NOT complete, 4 open/.test(r.text) && /R2: built but not verified/.test(r.text) && /R4: built but not verified \(package \w{8} is cancelled\)/.test(r.text) && /R3: unanswered question/.test(r.text) && /Skip logic.*not-run/.test(r.text)
    && /\| R1 \| Assessment program with its questions \| checklist all pages \| mapped \| verified \|/.test(md), r.text.slice(0, 400));
  check('K21 the person\'s decision appears in the handover, labelled as theirs', /How long is the visit window\? → \*\*14 days\*\*.*Answered in the approval form/.test(md));

  // --- production: package tools hidden ------------------------------------------------
  await call('dhis2_configure', { profile: 'production' });
  const names = (await client.listTools()).tools.map(t => t.name);
  check('K15 package tools are not offered on production', !names.includes('dhis2_plan_package') && !names.includes('dhis2_apply_package') && names.includes('dhis2_check_design'));
} finally {
  await client.close().catch(() => {});
}
const all = protocol.join('\n') + prompts.join('\n') + stderr;
check('K16 canary absent', !all.includes(CANARY));
server.close();
fs.rmSync(dir, { recursive: true, force: true });
const failed = checks.filter(c => !c.ok);
if (resultPath) fs.writeFileSync(resultPath, JSON.stringify({ total: checks.length, failed: failed.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id}${c.ok || !c.detail ? '' : `  — ${c.detail}`}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
