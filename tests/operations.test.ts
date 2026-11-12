/** Approved operations (aggregate data, tracker data, sharing) and analytics jobs. In-memory DHIS2; synthetic data. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OperationEngine, OperationError, Operation } from '../src/operations';
import { aggregateKind } from '../src/ops/aggregate';
import { trackerKind } from '../src/ops/tracker';
import { sharingKind } from '../src/ops/sharing';
import { JobEngine, JobError } from '../src/jobs';
import type { AggValue, OpsGateway, SharingObject } from '../src/ops/gateway';
import type { ApprovalResult, ConnectionIdentity } from '../src/change-engine';

const DEF = 'HllvX50cXC0';
const DE1 = 'deAAAAAAAA1', DE2 = 'deAAAAAAAA2', OU1 = 'ouAAAAAAAA1', OU2 = 'ouAAAAAAAA2';
const PR = 'prAAAAAAAA1', PS = 'psAAAAAAAA1', TET = 'tetAAAAAAA1', ATT = 'atAAAAAAAA1';
const DS = 'dsAAAAAAAA1', UG1 = 'ugAAAAAAAA1', UG2 = 'ugAAAAAAAA2', DB = 'dbAAAAAAAA1';

class FakeDhis2 implements OpsGateway {
  values = new Map<string, AggValue>();
  tracker = { event: new Map<string, any>(), enrollment: new Map<string, any>(), trackedEntity: new Map<string, any>() };
  sharing = new Map<string, SharingObject>();
  principals = new Map<string, string>([[`userGroups/${UG1}`, 'Data clerks'], [`userGroups/${UG2}`, 'Managers']]);
  posts: string[] = [];
  trackerErrors: any[] = [];
  failNextCommit: 'throw-after-apply' | 'throw-before-apply' | null = null;
  k = (v: AggValue) => `${v.dataElement}|${v.period}|${v.orgUnit}|${v.categoryOptionCombo}|${v.attributeOptionCombo}`;

  async getDefaultCategoryOptionCombo() { return DEF; }
  async getCurrentDataValues(q: { dataElements: string[]; periods: string[]; orgUnits: string[] }) {
    return [...this.values.values()].filter(v => q.dataElements.includes(v.dataElement) && q.periods.includes(v.period) && q.orgUnits.includes(v.orgUnit)).map(v => ({ ...v }));
  }
  async postDataValues(payload: { dataValues: AggValue[] }, dryRun: boolean) {
    this.posts.push(`dataValueSets dryRun=${dryRun}`);
    if (!dryRun) await this.maybeFail(() => this.applyValues(payload));
    let imported = 0, updated = 0;
    for (const v of payload.dataValues) { if (this.values.has(this.k(v))) updated++; else imported++; }
    if (!dryRun) this.applyValues(payload);
    return { httpStatus: 200, summary: { status: 'SUCCESS', importCount: { imported, updated, ignored: 0, deleted: 0 }, conflicts: [] } };
  }
  private applyValues(p: { dataValues: AggValue[] }) { for (const v of p.dataValues) this.values.set(this.k(v), { ...v }); }
  private async maybeFail(apply: () => void) {
    const f = this.failNextCommit; this.failNextCommit = null;
    if (f === 'throw-after-apply') { apply(); throw new Error('socket hang up'); }
    if (f === 'throw-before-apply') throw new Error('socket hang up');
  }
  async postTracker(payload: Record<string, any>, mode: 'VALIDATE' | 'COMMIT') {
    this.posts.push(`tracker ${mode}`);
    if (this.trackerErrors.length) return { httpStatus: 409, report: { status: 'ERROR', validationReport: { errorReports: this.trackerErrors }, stats: {} } };
    const store = () => {
      const putEvent = (e: any, enrollment?: string) => this.tracker.event.set(e.event, { ...e, ...(enrollment ? { enrollment } : {}), programStage: e.programStage ?? PS });
      const putEnr = (en: any, te?: string) => { this.tracker.enrollment.set(en.enrollment, { ...en, trackedEntity: te ?? en.trackedEntity }); (en.events ?? []).forEach((e: any) => putEvent({ ...e, program: e.program ?? en.program }, en.enrollment)); };
      for (const te of payload.trackedEntities ?? []) { this.tracker.trackedEntity.set(te.trackedEntity, te); (te.enrollments ?? []).forEach((en: any) => putEnr(en, te.trackedEntity)); }
      for (const en of payload.enrollments ?? []) putEnr(en);
      for (const e of payload.events ?? []) putEvent(e);
    };
    if (mode === 'COMMIT') { await this.maybeFail(store); store(); }
    return { httpStatus: 200, report: { status: 'OK', validationReport: { errorReports: [] }, stats: { created: 1, updated: 0, ignored: 0, total: 1 } } };
  }
  async getTrackerRecord(kind: 'event' | 'enrollment' | 'trackedEntity', uid: string) { const r = this.tracker[kind].get(uid); return r ? JSON.parse(JSON.stringify(r)) : null; }
  async findEvents(q: { program: string; orgUnit: string; occurredAfter: string; occurredBefore: string }) {
    return { records: [...this.tracker.event.values()].filter(e => e.program === q.program && e.orgUnit === q.orgUnit
      && e.occurredAt.slice(0, 10) >= q.occurredAfter && e.occurredAt.slice(0, 10) <= q.occurredBefore), complete: true };
  }
  async findTrackedEntities(q: { trackedEntityType: string; orgUnit: string }) {
    return { records: [...this.tracker.trackedEntity.values()].filter(t => t.trackedEntityType === q.trackedEntityType && t.orgUnit === q.orgUnit), complete: true };
  }
  async getSharing(type: string, id: string) { const s = this.sharing.get(`${type}/${id}`); return s ? JSON.parse(JSON.stringify(s)) : null; }
  async postSharing(type: string, id: string, object: SharingObject) {
    this.posts.push(`sharing ${type}/${id}`);
    const cur = this.sharing.get(`${type}/${id}`)!;
    this.sharing.set(`${type}/${id}`, { ...object, name: cur.name! });
    return { httpStatus: 200, message: 'Access control set' };
  }
  async getPrincipalName(kind: 'userGroups' | 'users', id: string) { return this.principals.get(`${kind}/${id}`) ?? null; }
}

function setup(opts: { answer?: ApprovalResult; environment?: string } = {}) {
  const gw = new FakeDhis2();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dhis2-ops-'));
  const who: ConnectionIdentity = { epoch: 1, userId: 'u1', username: 'fixture', profile: 'dev', origin: 'https://dev.example.org', environment: opts.environment ?? 'development' };
  const prompts: string[] = [];
  const make = () => new OperationEngine<OpsGateway>({
    gateway: () => gw, identity: () => who, baseDir: () => dir,
    approve: async m => { prompts.push(m); return opts.answer ?? 'accept'; },
  }, [aggregateKind, trackerKind, sharingKind]);
  return { gw, dir, prompts, engine: make(), make, who };
}
async function code(p: Promise<unknown> | (() => unknown)): Promise<string> {
  try { await (typeof p === 'function' ? p() : p); return 'ok'; } catch (e) { return e instanceof OperationError || e instanceof JobError ? e.code : `other: ${e}`; }
}
const val = (de: string, pe: string, ou: string, value: string): AggValue => ({ dataElement: de, period: pe, orgUnit: ou, categoryOptionCombo: DEF, attributeOptionCombo: DEF, value });

describe('aggregate data', () => {
  it('classifies new / replaced / identical, sends only what changes, and shows old → new', async () => {
    const { engine, gw, prompts } = setup();
    gw.values.set(gw.k(val(DE1, '202601', OU1, '5')), val(DE1, '202601', OU1, '5'));
    gw.values.set(gw.k(val(DE2, '202601', OU1, '7')), val(DE2, '202601', OU1, '7'));
    const op = await engine.plan('aggregate-data', { description: 'January returns', dataValues: [
      { dataElement: DE1, period: '202601', orgUnit: OU1, value: '5.0' },   // identical (numeric)
      { dataElement: DE2, period: '202601', orgUnit: OU1, value: 9 },       // replaces 7
      { dataElement: DE1, period: '202601', orgUnit: OU2, value: '3' },     // new
    ] });
    expect(op.state).toBe('validated');
    expect(op.skipped).toBe(1);
    expect(op.summary).toMatch(/^1 new value\(s\), 1 existing value\(s\) replaced, 1 already identical/);
    expect(JSON.parse(fs.readFileSync(op.files.payload, 'utf8')).dataValues).toHaveLength(2);
    const done = await engine.apply(op.id);
    expect(done.state).toBe('verified');
    expect(prompts[0]).toContain(`${DE2} 202601 ${OU1}: 7 → 9`);
    expect(prompts[0]).toContain('1 value(s) already entered on the server will be replaced');
    expect(gw.posts).toEqual(['dataValueSets dryRun=true', 'dataValueSets dryRun=false']);
  });
  it('refuses invalid input before touching the server', async () => {
    const { engine, gw } = setup();
    expect(await code(engine.plan('aggregate-data', { description: 'x', dataValues: [{ dataElement: DE1, period: '202601', orgUnit: OU1, value: '' }] }))).toBe('invalid');
    expect(await code(engine.plan('aggregate-data', { description: 'x', dataValues: [{ dataElement: DE1, period: 'Jan', orgUnit: OU1, value: '1' }] }))).toBe('invalid');
    expect(await code(engine.plan('aggregate-data', { description: 'x', dataValues: [
      { dataElement: DE1, period: '202601', orgUnit: OU1, value: '1' }, { dataElement: DE1, period: '202601', orgUnit: OU1, value: '2' }] }))).toBe('invalid');
    expect(gw.posts).toEqual([]);
  });
  it('a value entered by someone else after planning makes it stale; nothing is sent', async () => {
    const { engine, gw } = setup();
    const op = await engine.plan('aggregate-data', { description: 'x', dataValues: [{ dataElement: DE1, period: '202601', orgUnit: OU1, value: '4' }] });
    gw.values.set(gw.k(val(DE1, '202601', OU1, '8')), val(DE1, '202601', OU1, '8'));
    expect(await code(engine.apply(op.id))).toBe('stale');
    expect(gw.posts.filter(p => p.endsWith('false'))).toEqual([]);
  });
  it('declined → nothing sent; applying twice is refused', async () => {
    const d = setup({ answer: 'decline' });
    const op = await d.engine.plan('aggregate-data', { description: 'x', dataValues: [{ dataElement: DE1, period: '202601', orgUnit: OU1, value: '4' }] });
    expect(await code(d.engine.apply(op.id))).toBe('declined');
    expect(d.gw.values.size).toBe(0);
    const a = setup();
    const op2 = await a.engine.plan('aggregate-data', { description: 'x', dataValues: [{ dataElement: DE1, period: '202601', orgUnit: OU1, value: '4' }] });
    await a.engine.apply(op2.id);
    expect(await code(a.engine.apply(op2.id))).toBe('invalid_state');
  });
  it('detects an edited payload file', async () => {
    const { engine } = setup();
    const op = await engine.plan('aggregate-data', { description: 'x', dataValues: [{ dataElement: DE1, period: '202601', orgUnit: OU1, value: '4' }] });
    fs.writeFileSync(op.files.payload, JSON.stringify({ dataValues: [val(DE1, '202601', OU1, '999')] }));
    expect(await code(engine.apply(op.id))).toBe('tampered');
  });
  it('an unknown outcome is reconciled by reading, not re-sent', async () => {
    const { engine, gw } = setup();
    const op = await engine.plan('aggregate-data', { description: 'x', dataValues: [{ dataElement: DE1, period: '202601', orgUnit: OU1, value: '4' }] });
    gw.failNextCommit = 'throw-after-apply';
    const done = await engine.apply(op.id);
    expect(done.state).toBe('verified');
    expect(done.note).toMatch(/Outcome unknown.*Nothing was re-sent/);
    expect(gw.posts.filter(p => p.endsWith('false'))).toHaveLength(1);
    const lost = setup();
    const op2 = await lost.engine.plan('aggregate-data', { description: 'x', dataValues: [{ dataElement: DE1, period: '202601', orgUnit: OU1, value: '4' }] });
    lost.gw.failNextCommit = 'throw-before-apply';
    expect((await lost.engine.apply(op2.id)).state).toBe('not-applied');
  });
  it('is refused on production and survives a restart', async () => {
    const p = setup({ environment: 'production' });
    expect(await code(p.engine.plan('aggregate-data', { description: 'x', dataValues: [{ dataElement: DE1, period: '202601', orgUnit: OU1, value: '4' }] }))).toBe('production_read_only');
    const s = setup();
    const op = await s.engine.plan('aggregate-data', { description: 'x', dataValues: [{ dataElement: DE1, period: '202601', orgUnit: OU1, value: '4' }] });
    expect((await s.make().apply(op.id)).state).toBe('verified');
  });
});

describe('tracker data', () => {
  const te = (name: string) => ({ trackedEntityType: TET, orgUnit: OU1, attributes: [{ attribute: ATT, value: name }],
    enrollments: [{ program: PR, orgUnit: OU1, enrolledAt: '2026-03-01', events: [{ programStage: PS, orgUnit: OU1, occurredAt: '2026-03-01', dataValues: [{ dataElement: DE1, value: '12' }] }] }] });

  it('assigns ids to every nested record, validates, imports atomically and reads each record back', async () => {
    const { engine, gw, prompts } = setup();
    const op = await engine.plan('tracker-data', { description: 'Baseline clients', trackedEntities: [te('A'), te('B')] });
    expect(op.state).toBe('validated');
    expect(op.targets).toHaveLength(6);
    expect(op.summary).toMatch(/^2 tracked entities, 2 enrollment\(s\), 2 event\(s\): 6 new/);
    const done = await engine.apply(op.id);
    expect(done.state).toBe('verified');
    expect(gw.tracker.event.size).toBe(2);
    expect(prompts[0]).toContain('individual-level records');
    expect(gw.posts).toEqual(['tracker VALIDATE', 'tracker COMMIT']);
  });
  it('refuses a re-import of identical events unless the person confirmed they are new', async () => {
    const { engine, gw } = setup();
    const ev = { program: PR, programStage: PS, orgUnit: OU1, occurredAt: '2026-03-02', dataValues: [{ dataElement: DE1, value: '4' }, { dataElement: DE2, value: 'yes' }] };
    const first = await engine.plan('tracker-data', { description: 'Facility survey', events: [ev] });
    await engine.apply(first.id);
    const again = await engine.plan('tracker-data', { description: 'Facility survey', events: [{ ...ev, dataValues: [{ dataElement: DE2, value: 'yes' }, { dataElement: DE1, value: '4.0' }] }] });
    expect(again.state).toBe('invalid');
    expect(again.note).toMatch(/look identical to records already on the server.*acknowledgeDuplicates/);
    expect(again.targets[0]!.detail).toMatch(/identical to existing event/);
    expect(gw.posts.filter(p => p === 'tracker VALIDATE')).toHaveLength(1); // the blocked plan never reached DHIS2's dry run
    const ack = await engine.plan('tracker-data', { description: 'Facility survey', events: [ev], acknowledgeDuplicates: true });
    expect(ack.state).toBe('validated');
    expect(ack.warnings[0]).toMatch(/The person has said they are genuinely new/);
  });
  it('flags duplicates inside one import too', async () => {
    const { engine } = setup();
    const op = await engine.plan('tracker-data', { description: 'x', trackedEntities: [te('Same'), te('Same')] });
    expect(op.state).toBe('invalid');
    expect(op.targets.filter(t => /in this import/.test(t.detail ?? '')).map(t => t.key.split('/')[0])).toEqual(['trackedEntity']); // its event is part of that person
  });
  it('DHIS2 dry-run errors make the plan invalid; an atomic rejection at commit is "failed"', async () => {
    const { engine, gw } = setup();
    gw.trackerErrors = [{ errorCode: 'E1064', trackerType: 'TRACKED_ENTITY', uid: 'x', message: 'Non-unique attribute value' }];
    const bad = await engine.plan('tracker-data', { description: 'x', trackedEntities: [te('A')] });
    expect(bad.state).toBe('invalid');
    expect(bad.dryRun.errors[0]).toMatch(/E1064/);
    gw.trackerErrors = [];
    const op = await engine.plan('tracker-data', { description: 'x', trackedEntities: [te('A')] });
    gw.trackerErrors = [{ errorCode: 'E1000', message: 'no access' }];
    expect((await engine.apply(op.id)).state).toBe('failed');
  });
  it('a record with a supplied existing id is an update, and drift on it is detected', async () => {
    const { engine, gw } = setup();
    const EV = 'evAAAAAAAA1';
    gw.tracker.event.set(EV, { event: EV, program: PR, programStage: PS, orgUnit: OU1, occurredAt: '2026-01-01T00:00:00.000', dataValues: [{ dataElement: DE1, value: '1' }] });
    const op = await engine.plan('tracker-data', { description: 'correction', events: [{ event: EV, program: PR, programStage: PS, orgUnit: OU1, occurredAt: '2026-01-01', dataValues: [{ dataElement: DE1, value: '2' }] }] });
    expect(op.targets[0]!.action).toBe('update');
    expect(op.warnings).toContain('1 existing record(s) will be updated.');
    gw.tracker.event.get(EV).dataValues[0].value = '3';
    expect(await code(engine.apply(op.id))).toBe('stale');
  });
});

describe('sharing', () => {
  function seed(gw: FakeDhis2) {
    gw.sharing.set(`dataSet/${DS}`, { name: 'Monthly returns', publicAccess: 'r-------', userGroupAccesses: [{ id: UG2, access: 'r-r-----' }], userAccesses: [{ id: 'usAAAAAAAA1', access: 'rw------' }] });
    gw.sharing.set(`dashboard/${DB}`, { name: 'Overview', publicAccess: '--------', userGroupAccesses: [], userAccesses: [] });
  }
  it('merges with existing grants, explains in plain words, and reads back', async () => {
    const { engine, gw, prompts } = setup();
    seed(gw);
    const op = await engine.plan('sharing', { description: 'Clerks enter monthly data', changes: [
      { objectType: 'dataSets', id: DS, userGroups: [{ id: UG1, metadata: 'view', data: 'capture' }] },
      { objectType: 'dashboards', id: DB, userGroups: [{ id: UG1, metadata: 'view' }] }] });
    expect(op.state).toBe('validated');
    const done = await engine.apply(op.id);
    expect(done.state).toBe('verified');
    const ds = gw.sharing.get(`dataSet/${DS}`)!;
    expect(ds.userGroupAccesses).toEqual(expect.arrayContaining([{ id: UG1, access: 'r-rw----' }, { id: UG2, access: 'r-r-----' }]));
    expect(ds.userAccesses).toEqual([{ id: 'usAAAAAAAA1', access: 'rw------' }]);
    expect(prompts[0]).toContain('group "Data clerks": no access → can see it; see and enter data');
  });
  it('warns when everyone could edit or enter data, and counts removed grants', async () => {
    const { engine, gw } = setup();
    seed(gw);
    const op = await engine.plan('sharing', { description: 'x', changes: [{ objectType: 'dataSets', id: DS, public: { metadata: 'edit', data: 'capture' }, remove: { userGroups: [UG2] } }] });
    expect(op.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/Everyone would be able to EDIT/), expect.stringMatching(/Everyone would be able to ENTER DATA/), '1 existing grant(s) will be removed.']));
  });
  it('refuses unknown groups, data levels on metadata-only types, and unknown types', async () => {
    const { engine, gw } = setup();
    seed(gw);
    expect(await code(engine.plan('sharing', { description: 'x', changes: [{ objectType: 'dataSets', id: DS, userGroups: [{ id: 'ugNOPE00001', metadata: 'view' }] }] }))).toBe('invalid');
    expect(await code(engine.plan('sharing', { description: 'x', changes: [{ objectType: 'dashboards', id: DB, userGroups: [{ id: UG1, metadata: 'view', data: 'capture' }] }] }))).toBe('invalid');
    expect(await code(engine.plan('sharing', { description: 'x', changes: [{ objectType: 'users', id: DB, public: { metadata: 'view' } }] }))).toBe('invalid');
    expect(gw.posts).toEqual([]);
  });
  it('detects a sharing change made by someone else during approval', async () => {
    const gwRef: { gw?: FakeDhis2 } = {};
    const s = setup();
    gwRef.gw = s.gw;
    seed(s.gw);
    const engine = new OperationEngine<OpsGateway>({ gateway: () => s.gw, identity: () => s.who, baseDir: () => s.dir,
      approve: async () => { s.gw.sharing.get(`dataSet/${DS}`)!.publicAccess = 'rw------'; return 'accept'; } }, [sharingKind]);
    const op = await engine.plan('sharing', { description: 'x', changes: [{ objectType: 'dataSets', id: DS, userGroups: [{ id: UG1, metadata: 'view' }] }] });
    expect(await code(engine.apply(op.id))).toBe('stale');
    expect(s.gw.posts).toEqual([]);
  });
});

describe('analytics jobs', () => {
  function jobs(opts: { answer?: ApprovalResult; environment?: string; running?: boolean } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dhis2-jobs-'));
    const calls: any[] = [];
    let notes: any[] = [{ time: '2026-11-04T10:00:00', message: 'Analytics table update started', level: 'INFO', completed: false }];
    const gw = {
      getRunningAnalytics: async () => (opts.running ? { jbOLD000001: [{ time: 't', message: 'Populating', completed: false }] } : {}),
      startAnalytics: async (p: any) => { calls.push(p); return 'jbAAAAAAAA1'; },
      getAnalyticsNotifications: async () => notes,
    };
    const who: ConnectionIdentity = { epoch: 1, userId: 'u1', username: 'f', profile: 'dev', origin: 'https://dev.example.org', environment: opts.environment ?? 'development' };
    const prompts: string[] = [];
    const engine = new JobEngine({ gateway: () => gw, identity: () => who, baseDir: () => dir, approve: async m => { prompts.push(m); return opts.answer ?? 'accept'; } });
    return { engine, calls, prompts, setNotes: (n: any[]) => { notes = n; } };
  }
  it('asks first, starts once, and follows progress to completion', async () => {
    const j = jobs();
    const job = await j.engine.startAnalytics({ reason: 'show new baseline data', lastYears: 2, skipEvents: true });
    expect(j.prompts[0]).toMatch(/rebuild the analytics tables.*\n.*Nothing is created, changed or deleted/);
    expect(j.prompts[0]).toContain('Scope: the last 2 year(s), skipping events data.');
    expect(j.calls).toEqual([{ lastYears: 2, skipEvents: true }]);
    expect((await j.engine.get(job.jobId)).state).toBe('running');
    j.setNotes([{ time: '2026-11-04T10:00:00', message: 'started', level: 'INFO' }, { time: '2026-11-04T10:09:00', message: 'Analytics tables updated', level: 'INFO', completed: true }]);
    const done = await j.engine.get(job.jobId);
    expect(done.state).toBe('completed');
    expect(done.lastMessages.at(-1)).toMatch(/Analytics tables updated/);
  });
  it('reports a failed run', async () => {
    const j = jobs();
    const job = await j.engine.startAnalytics({ reason: 'x' });
    j.setNotes([{ time: 't1', message: 'Process failed: out of memory', level: 'ERROR', completed: true }]);
    expect((await j.engine.get(job.jobId)).state).toBe('failed');
  });
  it('refuses a second run, a declined run, production, and bad input', async () => {
    expect(await code(jobs({ running: true }).engine.startAnalytics({ reason: 'x' }))).toBe('already_running');
    const d = jobs({ answer: 'decline' });
    expect(await code(d.engine.startAnalytics({ reason: 'x' }))).toBe('declined');
    expect(d.calls).toEqual([]);
    expect(await code(jobs({ environment: 'production' }).engine.startAnalytics({ reason: 'x' }))).toBe('production_read_only');
    expect(await code(jobs().engine.startAnalytics({ reason: 'x', lastYears: 0 }))).toBe('invalid');
    expect(await code(jobs().engine.startAnalytics({}))).toBe('invalid');
  });
});
