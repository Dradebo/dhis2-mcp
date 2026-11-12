// End-to-end: data imports (aggregate + tracker), sharing changes and analytics jobs over a real
// MCP stdio connection against fake HTTPS DHIS2 servers (development + production).
// The MCP client plays the host: it approves (or declines) when asked. Synthetic data only.
//
// Usage: node tests/e2e/stdio-operations.mjs <compiled-entry.js> [result.json]
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
// The fake servers behave like this DHIS2 release (parameter names, list keys, removed endpoints).
const VERSION = process.env.E2E_DHIS2_VERSION || '2.41.10';
const RELEASE = Number(/^(?:2\.)?(\d{2})/.exec(VERSION)[1]);
const CANARY = 'canaryOps-dev-pw';
const PERSON = 'CanaryPersonName';
const DEF = 'HllvX50cXC0', DE1 = 'deAAAAAAAA1', DE2 = 'deAAAAAAAA2', OU1 = 'ouAAAAAAAA1';
const PR = 'prAAAAAAAA1', PS = 'psAAAAAAAA1', TET = 'tetAAAAAAA1', ATT = 'atAAAAAAAA1';
const EVPR = 'prEVENTPRG1', DS = 'dsAAAAAAAA1', UG1 = 'ugAAAAAAAA1', UG2 = 'ugAAAAAAAA2';

const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'dhis2-ops-'));
const keyFile = path.join(dir, 'k.pem'); const certFile = path.join(dir, 'c.pem');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyFile, '-out', certFile, '-days', '1',
  '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' });
const tls = { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };
const user = { id: 'fixtureUid1', displayName: 'Fixture', username: 'fixture', authorities: ['ALL'], userRoles: [] };

function makeServer(name) {
  const st = {
    log: [], values: new Map(), events: new Map(), enrollments: new Map(), tes: new Map(),
    sharing: new Map([[`dataSet/${DS}`, { name: 'Monthly returns', publicAccess: 'r-------', externalAccess: false, userGroupAccesses: [{ id: UG2, access: 'r-r-----' }], userAccesses: [] }]]),
    groups: new Map([[UG1, 'Data clerks'], [UG2, 'Managers']]),
    jobs: new Map(),
  };
  const key = v => `${v.dataElement}|${v.period}|${v.orgUnit}|${v.categoryOptionCombo}|${v.attributeOptionCombo}`;
  st.server = https.createServer(tls, (req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const url = new URL(req.url, 'https://localhost');
      const p = url.pathname, q = url.searchParams;
      st.log.push({ method: req.method, path: p, query: url.search });
      const json = (s, d) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); };
      const data = body ? JSON.parse(body) : null;
      if (p === '/api/system/info') return json(200, { version: VERSION, revision: 'abc1234' });
      if (p === '/api/me') return json(200, RELEASE >= 42 ? { ...user, userRoles: [{ id: 'roleAAAAAA1', name: 'Superuser', authorities: ['ALL'] }] }
        : { ...user, userCredentials: { username: user.username, userRoles: [{ id: 'roleAAAAAA1', name: 'Superuser', authorities: ['ALL'] }] } });
      // Removed in 2.42 (and never used by the assistant on any version).
      if (/^\/api\/(trackedEntityInstances|events|enrollments|relationships)(\/|$)/.test(p)) {
        st.oldTracker = (st.oldTracker ?? 0) + 1;
        if (RELEASE >= 42) return json(404, { message: 'removed' });
      }
      // Tracker query parameter names by version: old names up to 2.40, both in 2.41, new only from 2.42.
      if (/^\/api\/tracker\/(events|enrollments|trackedEntities)$/.test(p)) {
        const ent = p.split('/').pop();
        const usesNew = q.has('orgUnitMode') || (ent !== 'events' && q.has('orgUnits'));
        const usesOld = q.has('ouMode') || (ent !== 'events' && q.has('orgUnit'));
        if (RELEASE <= 40 && usesNew) return json(400, { message: `2.${RELEASE} does not know orgUnits/orgUnitMode` });
        if (RELEASE >= 42 && usesOld) return json(400, { message: `2.${RELEASE} removed orgUnit/ouMode` });
        if (RELEASE >= 43 && ent !== 'trackedEntities' && !q.get('program')) return json(400, { message: 'program is required' });
        q.set('__ou', q.get(ent === 'events' || RELEASE <= 40 ? 'orgUnit' : 'orgUnits'));
      }
      const counted = q.get('totalPages') === 'true';
      const listBody = (ent, list) => (RELEASE <= 40 ? { page: 1, pageSize: 1000, ...(counted ? { total: list.length } : {}), instances: list }
        : { pager: { page: 1, pageSize: 1000, ...(counted ? { total: list.length } : {}) }, page: 1, pageSize: 1000, [ent]: list });
      if (p === '/api/categoryOptionCombos') return json(200, { categoryOptionCombos: [{ id: DEF }] });
      // Real 2.41 answer when the bulk parameters are sent to the single-value endpoint.
      if (p === '/api/dataValues' && req.method === 'GET') return json(409, { httpStatus: 'Conflict', httpStatusCode: 409, status: 'ERROR', errorCode: 'E1100', message: 'Data element not found or not accessible: `null`' });
      if (p === '/api/dataValueSets' && req.method === 'GET') {
        const des = q.getAll('dataElement'), ous = q.getAll('orgUnit').flatMap(x => x.split(',')), pes = q.getAll('period').flatMap(x => x.split(','));
        if (q.get('dataSet')) {
          if (q.get('dataSet') !== DS) return json(200, {});
          const ym = (d) => d.replace(/-/g, '').slice(0, 6);
          const inRange = (pe) => pes.length ? pes.includes(pe) : (!q.get('startDate') || pe >= ym(q.get('startDate'))) && (!q.get('endDate') || pe <= ym(q.get('endDate')));
          return json(200, { dataSet: DS, dataValues: [...st.values.values()].filter(v => ous.includes(v.orgUnit) && inRange(v.period)) });
        }
        return json(200, { dataValues: [...st.values.values()].filter(v => des.includes(v.dataElement) && ous.includes(v.orgUnit) && pes.includes(v.period)) });
      }
      if (p === '/api/dataValueSets' && req.method === 'POST') {
        let imported = 0, updated = 0;
        for (const v of data.dataValues) { if (st.values.has(key(v))) updated++; else imported++; }
        if (q.get('dryRun') !== 'true') for (const v of data.dataValues) st.values.set(key(v), v);
        return json(200, { httpStatus: 'OK', status: 'OK', response: { responseType: 'ImportSummary', status: 'SUCCESS', importCount: { imported, updated, ignored: 0, deleted: 0 }, conflicts: [] } });
      }
      if (p === '/api/tracker' && req.method === 'POST') {
        if (q.get('importMode') === 'COMMIT') {
          const putEv = (e, enr) => st.events.set(e.event, { ...e, programStage: e.programStage ?? PS, ...(enr ? { enrollment: enr } : {}) });
          const putEn = (en, te) => { st.enrollments.set(en.enrollment, { ...en, trackedEntity: te ?? en.trackedEntity }); (en.events ?? []).forEach(e => putEv({ ...e, program: e.program ?? en.program }, en.enrollment)); };
          for (const te of data.trackedEntities ?? []) { st.tes.set(te.trackedEntity, te); (te.enrollments ?? []).forEach(en => putEn(en, te.trackedEntity)); }
          for (const en of data.enrollments ?? []) putEn(en);
          for (const e of data.events ?? []) putEv(e);
        }
        return json(200, { status: 'OK', validationReport: { errorReports: [], warningReports: [] }, stats: { created: 0, updated: 0, deleted: 0, ignored: 0, total: 0 } });
      }
      let m = /^\/api\/tracker\/(events|enrollments|trackedEntities)\/(\w{11})$/.exec(p);
      if (m) { const o = { events: st.events, enrollments: st.enrollments, trackedEntities: st.tes }[m[1]].get(m[2]); return o ? json(200, o) : json(404, {}); }
      if (p === '/api/tracker/events') {
        const list = [...st.events.values()].filter(e => e.program === q.get('program') && e.orgUnit === q.get('__ou')
          && (!q.get('occurredAfter') || e.occurredAt.slice(0, 10) >= q.get('occurredAfter')) && (!q.get('occurredBefore') || e.occurredAt.slice(0, 10) <= q.get('occurredBefore')));
        return json(200, listBody('events', list));
      }
      if (p === '/api/tracker/trackedEntities') return json(200, listBody('trackedEntities', [...st.tes.values()].filter(t => t.trackedEntityType === q.get('trackedEntityType') && t.orgUnit === q.get('__ou'))));
      if (p === '/api/tracker/enrollments') return json(200, listBody('enrollments', [...st.enrollments.values()].filter(e => e.program === q.get('program') && e.orgUnit === q.get('__ou'))));
      if (p === '/api/sharing') {
        const k = `${q.get('type')}/${q.get('id')}`;
        if (req.method === 'GET') return st.sharing.has(k) ? json(200, { meta: { allowPublicAccess: true }, object: { id: q.get('id'), ...st.sharing.get(k) } }) : json(404, {});
        st.sharing.set(k, { ...data.object, name: st.sharing.get(k).name });
        return json(200, { httpStatus: 'OK', status: 'OK', message: 'Access control set' });
      }
      m = /^\/api\/userGroups\/(\w{11})$/.exec(p);
      if (m) return st.groups.has(m[1]) ? json(200, { id: m[1], displayName: st.groups.get(m[1]) }) : json(404, {});
      if (p === '/api/resourceTables/analytics' && req.method === 'POST') {
        st.jobs.set('jbAAAAAAAA1', 0);
        return json(200, { httpStatus: 'OK', response: { id: 'jbAAAAAAAA1', jobType: 'ANALYTICS_TABLE', relativeNotifierEndpoint: '/api/system/tasks/ANALYTICS_TABLE/jbAAAAAAAA1' } });
      }
      if (p === '/api/system/tasks/ANALYTICS_TABLE') return json(200, {});
      m = /^\/api\/system\/tasks\/ANALYTICS_TABLE\/(\w{11})$/.exec(p);
      if (m) {
        const n = (st.jobs.get(m[1]) ?? 0) + 1; st.jobs.set(m[1], n);
        return json(200, n < 2 ? [{ time: '2026-11-04T10:00:00.000', message: 'Analytics table update started', level: 'INFO', completed: false }]
          : [{ time: '2026-11-04T10:05:00.000', message: 'Analytics tables updated', level: 'INFO', completed: true }, { time: '2026-11-04T10:00:00.000', message: 'Analytics table update started', level: 'INFO', completed: false }]);
      }
      json(404, { message: `${name}: no route ${req.method} ${p}` });
    });
  });
  return st;
}

const dev = makeServer('dev');
const prod = makeServer('prod');
await new Promise(r => dev.server.listen(0, '127.0.0.1', r));
await new Promise(r => prod.server.listen(0, '127.0.0.1', r));
const env = {
  PATH: process.env.PATH ?? '', SYSTEMROOT: process.env.SYSTEMROOT ?? '',
  TEMP: dir, TMP: dir, USERPROFILE: dir, HOME: dir, APPDATA: dir, LOCALAPPDATA: dir,
  NODE_EXTRA_CA_CERTS: certFile, DHIS2_MCP_HOME: path.join(dir, 'store'),
  DHIS2_MCP_PROFILES: 'dev,production',
  DHIS2_MCP_DEV_BASE_URL: `https://localhost:${dev.server.address().port}`, DHIS2_MCP_DEV_USERNAME: 'fixture', DHIS2_MCP_DEV_PASSWORD: CANARY, DHIS2_MCP_DEV_ENVIRONMENT: 'development',
  DHIS2_MCP_PRODUCTION_BASE_URL: `https://localhost:${prod.server.address().port}`, DHIS2_MCP_PRODUCTION_USERNAME: 'fixture', DHIS2_MCP_PRODUCTION_PASSWORD: CANARY,
};

const transport = new StdioClientTransport({ command: process.execPath, args: [entry], env, stderr: 'pipe' });
let stderr = '';
transport.stderr?.on('data', d => { stderr += d.toString(); });
const prompts = [];
let nextAnswer = 'accept';
const client = new Client({ name: 'e2e-operations', version: '1.0.0' }, { capabilities: { elicitation: { form: {} } } });
client.setRequestHandler(ElicitRequestSchema, async r => { prompts.push(r.params.message); const a = nextAnswer; nextAnswer = 'accept'; return { action: a, content: {} }; });
await client.connect(transport);
const toolOutputs = [];
const importOutputs = []; // outputs of the data-import tools: must never echo record values
const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  toolOutputs.push(JSON.stringify(r));
  if (/^dhis2_(plan_data|apply_operation|get_operation|cancel_operation)$/.test(name)) importOutputs.push(JSON.stringify(r));
  return { isError: Boolean(r.isError), text: (r.content ?? []).map(c => c.text ?? '').join('\n') };
};
const checks = [];
const check = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail });
const opId = t => (/Operation ([0-9a-f-]{36})/.exec(t) || [])[1];
const devPosts = () => dev.log.filter(l => l.method === 'POST').map(l => `${l.path}${l.query.includes('dryRun=true') || l.query.includes('importMode=VALIDATE') ? ' (dry run)' : ''}`);

try {
  let r = await call('dhis2_configure', { profile: 'dev' });
  check('O0 the server version is detected and shown', !r.isError && new RegExp(`DHIS2 2\\.${RELEASE}\\.`).test(r.text), r.text.slice(0, 300));
  if (RELEASE < 39) {
    // --- older than supported: the assistant only reads ------------------------------------
    check('V1 an unsupported old version is announced as read-only', /READ-ONLY/.test(r.text) && /only reads/.test(r.text), r.text.slice(0, 300));
    r = await call('dhis2_plan_data', { description: 'x', dataValues: [{ dataElement: DE1, period: '202601', orgUnit: OU1, value: 1 }] });
    check('V2 planning a change is refused', r.isError && /version_read_only/.test(r.text), r.text.slice(0, 200));
    const names = (await client.listTools()).tools.map(t => t.name);
    check('V3 no change tools are offered', !['dhis2_plan_data', 'dhis2_plan_package', 'dhis2_run_analytics'].some(n => names.includes(n)) && names.includes('dhis2_list_data_elements'));
  } else {
    // --- aggregate --------------------------------------------------------------------
    dev.values.set(`${DE2}|202601|${OU1}|${DEF}|${DEF}`, { dataElement: DE2, period: '202601', orgUnit: OU1, categoryOptionCombo: DEF, attributeOptionCombo: DEF, value: '7' });
    r = await call('dhis2_plan_data', { description: 'January facility returns', dataValues: [
      { dataElement: DE1, period: '202601', orgUnit: OU1, value: 5 }, { dataElement: DE2, period: '202601', orgUnit: OU1, value: 9 }] });
    const agg = opId(r.text);
    check('O1 aggregate plan: 1 new, 1 replaced, dry run only', !r.isError && /1 new value\(s\), 1 existing value\(s\) replaced/.test(r.text)
      && JSON.stringify(devPosts()) === JSON.stringify(['/api/dataValueSets (dry run)']), r.text.slice(0, 300));
    const getQ = dev.log.find(l => l.path === '/api/dataValueSets' && l.method === 'GET')?.query ?? '';
    check('O2 current values are read with repeated plain parameters (no [] brackets)', /dataElement=deAAAAAAAA1&dataElement=deAAAAAAAA2/.test(getQ) && !getQ.includes('%5B'), getQ);
    nextAnswer = 'decline';
    r = await call('dhis2_apply_operation', { operationId: agg });
    check('O3 declined in the host → nothing sent', r.isError && /declined/.test(r.text) && devPosts().length === 1, r.text.slice(0, 160));
    r = await call('dhis2_plan_data', { description: 'January facility returns', dataValues: [
      { dataElement: DE1, period: '202601', orgUnit: OU1, value: 5 }, { dataElement: DE2, period: '202601', orgUnit: OU1, value: 9 }] });
    r = await call('dhis2_apply_operation', { operationId: opId(r.text) });
    check('O4 approved → imported and every value read back', !r.isError && /State: verified/.test(r.text) && dev.values.get(`${DE2}|202601|${OU1}|${DEF}|${DEF}`).value === '9'
      && /deAAAAAAAA2 202601 ouAAAAAAAA1: 7 → 9/.test(prompts.at(-1)), r.text.slice(0, 300));

    // --- tracker ----------------------------------------------------------------------
    const people = { description: 'Baseline clients', trackedEntities: ['A', 'B'].map(x => ({ trackedEntityType: TET, orgUnit: OU1,
      attributes: [{ attribute: ATT, value: `${PERSON}-${x}` }],
      enrollments: [{ program: PR, orgUnit: OU1, enrolledAt: '2026-03-01', events: [{ programStage: PS, orgUnit: OU1, occurredAt: '2026-03-01', dataValues: [{ dataElement: DE1, value: '12' }] }] }] })) };
    const f = path.join(dir, 'clients.json'); fs.writeFileSync(f, JSON.stringify(people));
    r = await call('dhis2_plan_data', { dataFile: f });
    r = await call('dhis2_apply_operation', { operationId: opId(r.text) });
    check('O5 tracker import from a file: ids assigned, atomic import, 6 records read back', !r.isError && /State: verified/.test(r.text) && dev.tes.size === 2 && dev.events.size === 2
      && /individual-level records/.test(prompts.at(-1)), r.text.slice(0, 300));
    const survey = { description: 'Facility survey (event program)', events: [{ program: EVPR, orgUnit: OU1, occurredAt: '2026-03-05', dataValues: [{ dataElement: DE1, value: '3' }] }] };
    r = await call('dhis2_plan_data', survey);
    await call('dhis2_apply_operation', { operationId: opId(r.text) });
    const commitsBefore = dev.log.filter(l => l.path === '/api/tracker' && l.query.includes('COMMIT')).length;
    r = await call('dhis2_plan_data', survey);
    check('O6 re-importing the same survey is refused before any send', r.isError && /State: invalid/.test(r.text) && /look identical/.test(r.text)
      && dev.log.filter(l => l.path === '/api/tracker' && l.query.includes('COMMIT')).length === commitsBefore && dev.events.size === 3, r.text.slice(0, 300));
    r = await call('dhis2_plan_data', { ...survey, acknowledgeDuplicates: true });
    check('O7 with the person\'s confirmation it can be planned, and the warning is carried', !r.isError && /State: validated/.test(r.text) && /genuinely new/.test(r.text));
    await call('dhis2_cancel_operation', { operationId: opId(r.text) });

    // --- sharing ----------------------------------------------------------------------
    r = await call('dhis2_plan_sharing_change', { description: 'Clerks enter monthly returns', changes: [{ objectType: 'dataSets', id: DS, userGroups: [{ id: UG1, metadata: 'view', data: 'capture' }] }] });
    r = await call('dhis2_apply_operation', { operationId: opId(r.text) });
    const ds = dev.sharing.get(`dataSet/${DS}`);
    check('O8 sharing: grant added, existing grant and public access kept, read back', !r.isError && /State: verified/.test(r.text)
      && ds.userGroupAccesses.some(g => g.id === UG1 && g.access === 'r-rw----') && ds.userGroupAccesses.some(g => g.id === UG2 && g.access === 'r-r-----') && ds.publicAccess === 'r-------'
      && /group "Data clerks": no access → can see it; see and enter data/.test(prompts.at(-1)), r.text.slice(0, 300));

    // --- analytics --------------------------------------------------------------------
    r = await call('dhis2_run_analytics', { reason: 'Show the imported baseline on dashboards', lastYears: 1 });
    check('O9 analytics starts only after approval', !r.isError && /Job jbAAAAAAAA1/.test(r.text) && /rebuild the analytics tables/.test(prompts.at(-1))
      && dev.log.some(l => l.path === '/api/resourceTables/analytics' && l.query.includes('lastYears=1')), r.text.slice(0, 200));
    r = await call('dhis2_get_job', { jobId: 'jbAAAAAAAA1' });
    const first = r.text;
    r = await call('dhis2_get_job', { jobId: 'jbAAAAAAAA1' });
    check('O10 job progress followed to completion', /State: running/.test(first) && /State: completed/.test(r.text) && /Analytics tables updated/.test(r.text), `${first.slice(0, 80)} / ${r.text.slice(0, 120)}`);

    // --- record lists through the tracker API, with this version's names and list key -----
    r = await call('dhis2_list_events', { program: EVPR, orgUnit: OU1 });
    const evs = r.isError ? null : JSON.parse(r.text);
    const te = await call('dhis2_list_tracked_entities', { trackedEntityType: TET, orgUnit: OU1 });
    const tes = te.isError ? null : JSON.parse(te.text);
    check('O16 record lists work on this version (parameter names and list key)', evs?.returned === 1 && tes?.returned === 2, `${r.text.slice(0, 150)} | ${te.text.slice(0, 150)}`);
    r = await call('dhis2_get_data_values', { dataSet: DS, orgUnit: [OU1], startDate: '2025-01-01', endDate: '2026-12-31' });
    const wantValues = [...dev.values.values()].filter(v => v.orgUnit === OU1).length;
    check('O19 aggregate values are read through /dataValueSets', !r.isError && wantValues > 0 && JSON.parse(r.text).dataValues?.length === wantValues, `${wantValues} | ${r.text.slice(0, 200)}`);
    r = await call('dhis2_list_events', { program: EVPR, orgUnit: OU1, countOnly: true });
    check('O18 counting returns the total in this version\'s reply shape, without records', !r.isError && JSON.parse(r.text).total === 1 && !r.text.includes('dataValues'), r.text.slice(0, 200));
    check('O17 the removed old tracker endpoints are never called', !dev.oldTracker && !prod.oldTracker, String(dev.oldTracker));

    // --- production ---------------------------------------------------------------------
    await call('dhis2_configure', { profile: 'production' });
    const names = (await client.listTools()).tools.map(t => t.name);
    check('O11 none of these tools are offered on production', !['dhis2_plan_data', 'dhis2_plan_sharing_change', 'dhis2_apply_operation', 'dhis2_run_analytics'].some(n => names.includes(n)));
    r = await call('dhis2_plan_data', { description: 'x', dataValues: [{ dataElement: DE1, period: '202601', orgUnit: OU1, value: 1 }] });
    const r2 = await call('dhis2_run_analytics', { reason: 'x' });
    check('O12 calling them anyway on production is refused', r.isError && /production_read_only/.test(r.text) && r2.isError && /production_read_only/.test(r2.text), `${r.text.slice(0, 100)} | ${r2.text.slice(0, 100)}`);

  }
} finally {
  await client.close().catch(() => {});
}
if (RELEASE < 39) check('O13 the too-old server received only GET requests', dev.log.length > 0 && dev.log.every(l => l.method === 'GET'), JSON.stringify(dev.log.filter(l => l.method !== 'GET')));
else check('O13 production received only GET requests', prod.log.length > 0 && prod.log.every(l => l.method === 'GET'), JSON.stringify(prod.log.filter(l => l.method !== 'GET')));
check('O14 the import tools never echo personal values (only the local review file holds them)', importOutputs.length > 0 ? !importOutputs.join('\n').includes(PERSON) : RELEASE < 39);
check('O15 canary absent', !(toolOutputs.join('\n') + prompts.join('\n') + stderr).includes(CANARY));
dev.server.close(); prod.server.close();
fs.rmSync(dir, { recursive: true, force: true });
const failed = checks.filter(c => !c.ok);
if (resultPath) fs.writeFileSync(resultPath, JSON.stringify({ total: checks.length, failed: failed.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id}${c.ok || !c.detail ? '' : `  — ${c.detail}`}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
