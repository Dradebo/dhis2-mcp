/**
 * Offline design checks and change packages. Synthetic in-memory server only.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkDesign } from '../src/design-check';
import { PackageEngine, PackageError, PackageGateway, checkPackageOffline, collectRefs, approvalMessage } from '../src/package-engine';
import { ApprovalResult, ConnectionIdentity } from '../src/change-engine';

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'synthetic-program.json'), 'utf8'));
const rules = (p: any) => checkDesign(p).map(f => `${f.severity}:${f.rule}`);
const U = (n: number) => `uAAAAAAAA${String(n).padStart(2, '0')}`; // valid 11-char uids

describe('design checks (offline)', () => {
  it('the synthetic program has no design errors in any package', () => {
    for (const p of fixture.packages) expect(checkDesign(p.creates).filter(f => f.severity === 'error')).toEqual([]);
  });
  it('numeric option sets need numeric codes; option set and data element value types must match', () => {
    const p = {
      optionSets: [{ id: U(1), name: 'Score', valueType: 'INTEGER', options: [{ id: U(2) }, { id: U(3) }] }],
      options: [{ id: U(2), code: 'YES', name: 'Yes' }, { id: U(3), code: '1', name: 'One' }],
      dataElements: [{ id: U(4), name: 'Q', shortName: 'Q', valueType: 'TEXT', domainType: 'TRACKER', aggregationType: 'NONE', optionSet: { id: U(1) } }],
    };
    expect(rules(p)).toEqual(expect.arrayContaining(['error:numeric-option-codes', 'error:optionset-valuetype']));
  });
  it('compulsory field outside every section is an error; rule targeting an unsectioned field is an error', () => {
    const p = {
      programs: [{ id: U(10), name: 'P', programType: 'WITHOUT_REGISTRATION' }],
      dataElements: [U(11), U(12), U(13)].map((id, i) => ({ id, name: `D${i}`, shortName: `D${i}`, valueType: 'TEXT', domainType: 'TRACKER', aggregationType: 'NONE' })),
      programStages: [{ id: U(14), name: 'S', program: { id: U(10) },
        programStageDataElements: [{ dataElement: { id: U(11) } }, { dataElement: { id: U(12) }, compulsory: true }, { dataElement: { id: U(13) } }],
        programStageSections: [{ id: U(15), name: 'Sec', dataElements: [{ id: U(11) }] }] }],
      programRules: [{ id: U(16), name: 'R', program: { id: U(10) }, condition: 'true', programRuleActions: [{ id: U(17) }] }],
      programRuleActions: [{ id: U(17), programRuleActionType: 'HIDEFIELD', dataElement: { id: U(13) } }],
    };
    const r = rules(p);
    expect(r).toContain('error:compulsory-unsectioned');
    expect(r).toContain('warning:unsectioned-field');
    expect(r).toContain('error:rule-target-unsectioned');
  });
  it('rule targeting a data element in no stage of the program is an error', () => {
    const p = {
      programStages: [{ id: U(20), name: 'S', program: { id: U(21) }, programStageDataElements: [{ dataElement: { id: U(22) } }] }],
      programRules: [{ id: U(23), name: 'R', program: { id: U(21) }, condition: 'true', programRuleActions: [{ id: U(24) }] }],
      programRuleActions: [{ id: U(24), programRuleActionType: 'HIDEFIELD', dataElement: { id: U(25) } }],
    };
    expect(rules(p)).toContain('error:rule-target-not-in-stage');
  });
  it('EVENT program indicators need boundaries; bad references and copied boundary ids are flagged', () => {
    const r = rules({ programIndicators: [
      { id: U(30), name: 'A', shortName: 'A', program: { id: U(31) }, expression: '#{bad}' },
      { id: U(32), name: 'B', shortName: 'B', program: { id: U(31) }, expression: '1', analyticsPeriodBoundaries: [{ id: U(33), boundaryTarget: 'EVENT_DATE' }] },
    ] });
    expect(r).toEqual(expect.arrayContaining(['error:pi-boundaries', 'error:pi-reference', 'warning:pi-boundary-ids']));
  });
  it('rules with programStage in event programs, option-name comparison, unbalanced conditions', () => {
    const r = rules({
      programs: [{ id: U(40), name: 'P', programType: 'WITHOUT_REGISTRATION' }],
      programRuleVariables: [{ id: U(41), name: 'v', program: { id: U(40) }, programRuleVariableSourceType: 'DATAELEMENT_CURRENT_EVENT', dataElement: { id: U(42) }, useCodeForOptionSet: false }],
      programRules: [{ id: U(43), name: 'R', program: { id: U(40) }, programStage: { id: U(44) }, condition: "(#{v} == 'x'" }],
    });
    expect(r).toEqual(expect.arrayContaining(['warning:rule-stage-event-program', 'warning:rule-variable-option-names', 'error:rule-syntax']));
  });
  it('dashboard items with w/h, legend overlaps, duplicate names, long short names, native fields', () => {
    const r = rules({
      dashboards: [{ id: U(50), name: 'D', dashboardItems: [{ id: U(51), w: 10, h: 5 }] }],
      legendSets: [{ id: U(52), name: 'L', legends: [{ name: 'a', startValue: 0, endValue: 60 }, { name: 'b', startValue: 50, endValue: 100 }] }],
      indicators: [{ id: U(53), name: 'Same', shortName: 'x'.repeat(51), numerator: '1', denominator: '1', indicatorType: { id: U(54) } },
        { id: U(55), name: 'same', shortName: 's', numerator: '1', denominator: '1', indicatorType: { id: U(54) } }],
      dataElements: [{ id: U(56), name: 'Facility', shortName: 'F', valueType: 'TEXT', domainType: 'TRACKER', aggregationType: 'NONE' }],
      programStages: [{ id: U(57), name: 'S', programStageDataElements: [{ dataElement: { id: U(56) } }] }],
    });
    expect(r).toEqual(expect.arrayContaining(['error:dashboard-item-size', 'error:legend-overlap', 'error:duplicate-name', 'error:shortname-length', 'warning:native-field-duplicated']));
  });
  it('summing on non-numeric values, aggregate data elements in stages, attribute combos', () => {
    const r = rules({
      dataElements: [{ id: U(60), name: 'T', shortName: 'T', valueType: 'TEXT', domainType: 'AGGREGATE', aggregationType: 'SUM' }],
      programStages: [{ id: U(61), name: 'S', programStageDataElements: [{ dataElement: { id: U(60) } }] }],
      categoryCombos: [{ id: U(62), name: 'Rounds', dataDimensionType: 'ATTRIBUTE' }],
    });
    expect(r).toEqual(expect.arrayContaining(['error:non-numeric-aggregation', 'error:aggregate-de-in-program', 'warning:attribute-combo-cocs']));
  });
});

describe('package offline checks', () => {
  it('requires ids, refuses sharing/ownership fields and unsupported collections', () => {
    const r = checkPackageOffline({ description: 'x', creates: { dataElements: [{ name: 'no id' }, { id: U(1), name: 'a', sharing: {} }], users: [{ id: U(2) }] } });
    expect(r.ok).toBe(false);
    expect(r.problems.join('\n')).toMatch(/needs an id/);
    expect(r.problems.join('\n')).toMatch(/"sharing" cannot be set/);
    expect(r.problems.join('\n')).toMatch(/creates.users: not a supported collection/);
  });
  it('finds references outside the package; inline owned objects are not references', () => {
    const r = checkPackageOffline(fixture.packages[1]);
    expect(r.ok).toBe(true);
    expect(r.externalRefs).toHaveLength(160); // the data elements from package 1
    const refs = new Set<string>();
    collectRefs({ id: U(1), legends: [{ id: U(2), name: 'x', startValue: 0 }], optionSet: { id: U(3) } }, refs);
    expect([...refs]).toEqual([U(3)]);
  });
  it('limits size', () => {
    const many = Array.from({ length: 2001 }, (_, i) => ({ id: `a${String(i).padStart(10, '0')}`, name: `n${i}`, code: `c${i}` }));
    expect(checkPackageOffline({ description: 'x', creates: { constants: many } }).problems.join()).toMatch(/limit 2000/);
  });
});

// ------------------------------------------------------------------------------------------

class FakeServer implements PackageGateway {
  baseURL = 'https://dev.example.org';
  store = new Map<string, Record<string, unknown>>(); // `${type}/${id}`
  commits = 0;
  failCommit: 'none' | 'throw-after-apply' | 'reject' = 'none';
  async getOwnerObject(t: string, id: string) { const o = this.store.get(`${t}/${id}`); return o ? JSON.parse(JSON.stringify(o)) : null; }
  async identifiableObjectExists(id: string) { return [...this.store.keys()].some(k => k.endsWith(`/${id}`)); }
  async postMetadata(payload: Record<string, unknown[]>, mode: 'VALIDATE' | 'COMMIT') {
    const total = Object.values(payload).reduce((n, l) => n + l.length, 0);
    if (mode === 'COMMIT') {
      this.commits++;
      if (this.failCommit === 'reject') return { httpStatus: 409, report: { status: 'ERROR', stats: { total }, typeReports: [{ objectReports: [{ uid: 'x', errorReports: [{ errorCode: 'E5002', message: 'nope' }] }] }] } };
      for (const [t, list] of Object.entries(payload)) for (const o of list as any[]) this.store.set(`${t}/${o.id}`, { ...o, lastUpdated: 'now' });
      if (this.failCommit === 'throw-after-apply') throw new Error('socket hang up');
    }
    return { httpStatus: 200, report: { status: 'OK', stats: { total } } };
  }
}

function setup(answer: ApprovalResult = 'accept') {
  const gw = new FakeServer();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dhis2-pkg-'));
  const who: ConnectionIdentity = { epoch: 1, userId: 'u1', username: 'fixture', profile: 'dev', origin: 'https://dev.example.org', environment: 'development' };
  const prompts: string[] = [];
  let id: ConnectionIdentity = who;
  const make = () => new PackageEngine({ gateway: () => gw, identity: () => id, approve: async m => { prompts.push(m); return answer; }, baseDir: () => dir });
  return { gw, dir, prompts, engine: make(), make, setIdentity: (x: ConnectionIdentity) => { id = x; } };
}
async function code(p: Promise<unknown>) { try { await p; return 'ok'; } catch (e) { return e instanceof PackageError ? e.code : `other:${e}`; } }

describe('package engine', () => {
  it('builds the 254-object synthetic program in 3 approved packages and verifies every object', async () => {
    const { engine, gw, prompts } = setup();
    for (const input of fixture.packages) {
      const { pkg, offline } = await engine.plan(input);
      expect(offline.ok).toBe(true);
      expect(pkg!.state).toBe('validated');
      const applied = await engine.apply(pkg!.id);
      expect(applied.state).toBe('verified');
    }
    expect(prompts).toHaveLength(3);
    expect(gw.commits).toBe(3);
    expect(gw.store.size).toBe(254);
    expect(prompts[0]).toMatch(/^Allow the assistant to apply this package to the development server/);
    expect(prompts[0]).toContain('165 new and 0 updated');
    expect(prompts[0]).toContain('review.md');
  });
  it('writes a review file listing every object, ordered by dependency', async () => {
    const { engine } = setup();
    const { pkg } = await engine.plan(fixture.packages[0]);
    const review = fs.readFileSync(pkg!.files.review, 'utf8');
    expect((review.match(/^- \*\*create\*\*/gm) ?? []).length).toBe(165);
    expect(review.indexOf('### optionSets')).toBeLessThan(review.indexOf('### dataElements'));
    expect(review).toContain('Nothing is deleted; sharing is not changed');
  });
  it('refuses references that exist neither in the package nor on the server', async () => {
    const { engine } = setup();
    expect(await code(engine.plan(fixture.packages[1]))).toBe('invalid_package');
  });
  it('offline errors stop planning before anything is sent', async () => {
    const { engine, gw } = setup();
    const bad = { description: 'x', creates: { dashboards: [{ id: U(1), name: 'D', dashboardItems: [{ id: U(2), w: 1 }] }] } };
    const { pkg, offline } = await engine.plan(bad);
    expect(pkg).toBeUndefined();
    expect(offline.findings.map(f => f.rule)).toContain('dashboard-item-size');
    expect(gw.commits).toBe(0);
  });
  it('detects a package file edited after planning', async () => {
    const { engine, gw } = setup();
    const { pkg } = await engine.plan(fixture.packages[0]);
    const body = JSON.parse(fs.readFileSync(pkg!.files.package, 'utf8'));
    body.dataElements[0].name = 'tampered';
    fs.writeFileSync(pkg!.files.package, JSON.stringify(body));
    expect(await code(engine.apply(pkg!.id))).toBe('tampered');
    expect(gw.commits).toBe(0);
  });
  it('detects server drift before approval', async () => {
    const { engine, gw, prompts } = setup();
    const { pkg } = await engine.plan(fixture.packages[0]);
    gw.store.set(`dataElements/${fixture.packages[0].creates.dataElements[5].id}`, { id: 'x' });
    expect(await code(engine.apply(pkg!.id))).toBe('stale');
    expect(prompts).toHaveLength(0);
  });
  it('a decline sends nothing and is final; the model cannot replay an applied package', async () => {
    const d = setup('decline');
    const { pkg } = await d.engine.plan(fixture.packages[0]);
    expect(await code(d.engine.apply(pkg!.id))).toBe('declined');
    expect(await code(d.engine.apply(pkg!.id))).toBe('invalid_state');
    expect(d.gw.commits).toBe(0);
    const a = setup();
    const p2 = (await a.engine.plan(fixture.packages[0])).pkg!;
    await a.engine.apply(p2.id);
    expect(await code(a.engine.apply(p2.id))).toBe('invalid_state');
    expect(a.gw.commits).toBe(1);
  });
  it('concurrent applies send once', async () => {
    const { engine, gw } = setup();
    const { pkg } = await engine.plan(fixture.packages[0]);
    const results = await Promise.all([code(engine.apply(pkg!.id)), code(engine.apply(pkg!.id))]);
    expect(results.sort()).toEqual(['invalid_state', 'ok']);
    expect(gw.commits).toBe(1);
  });
  it('an unknown commit outcome is reconciled by reading, never re-sent', async () => {
    const { engine, gw } = setup();
    gw.failCommit = 'throw-after-apply';
    const { pkg } = await engine.plan(fixture.packages[0]);
    const p = await engine.apply(pkg!.id);
    expect(p.state).toBe('verified');
    expect(p.note).toMatch(/reconciled by reading/);
    expect(gw.commits).toBe(1);
  });
  it('a rejected atomic import reports failed with nothing changed', async () => {
    const { engine, gw } = setup();
    gw.failCommit = 'reject';
    const { pkg } = await engine.plan(fixture.packages[0]);
    expect((await engine.apply(pkg!.id)).state).toBe('failed');
  });
  it('packages survive a server restart (apply and status from disk)', async () => {
    const s = setup();
    const { pkg } = await s.engine.plan(fixture.packages[0]);
    const fresh = s.make();
    expect((await fresh.apply(pkg!.id)).state).toBe('verified');
    expect((await s.make().get(pkg!.id)).state).toBe('verified');
  });
  it('another user or server cannot use the package; production is refused', async () => {
    const s = setup();
    const { pkg } = await s.engine.plan(fixture.packages[0]);
    s.setIdentity({ epoch: 1, userId: 'u2', username: 'other', profile: 'dev', origin: 'https://dev.example.org', environment: 'development' });
    expect(await code(s.engine.apply(pkg!.id))).toBe('wrong_session');
    s.setIdentity({ epoch: 1, userId: 'u1', username: 'fixture', profile: 'production', origin: 'https://prod.example.org', environment: 'production' });
    expect(await code(s.engine.plan(fixture.packages[0]))).toBe('production_read_only');
  });
  it('updates preserve unrelated fields; dropped owned items and a missing version bump are warned', async () => {
    const { engine, gw } = setup();
    const R = U(70), P = U(71), A1 = U(72), A2 = U(73);
    gw.store.set(`programs/${P}`, { id: P, name: 'P', version: 3 });
    gw.store.set(`programRuleActions/${A1}`, { id: A1, programRuleActionType: 'HIDEFIELD' });
    gw.store.set(`programRules/${R}`, { id: R, name: 'R', program: { id: P }, condition: 'true', programRuleActions: [{ id: A1 }, { id: A2 }], description: 'keep me' });
    const { pkg } = await engine.plan({ description: 'narrow rule fix', updates: [{ objectType: 'programRules', id: R, set: { condition: 'false', programRuleActions: [{ id: A1 }] } }] });
    expect(pkg!.findings.map(f => f.rule)).toEqual(expect.arrayContaining(['owned-collection-removal', 'program-version-bump']));
    const done = await engine.apply(pkg!.id);
    expect(done.state).toBe('verified');
    expect(gw.store.get(`programRules/${R}`)!.description).toBe('keep me');
    expect(approvalMessage(done)).toMatch(/design warning/);
  });
});
