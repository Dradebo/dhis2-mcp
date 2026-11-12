/**
 * Development → production transfer: the MCP prepares, the person approves, a
 * production administrator imports, the MCP verifies by reading. The target is
 * never written. Synthetic in-memory servers only.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TransferEngine, TransferError, SourceGateway, TargetGateway } from '../src/transfer';
import { ApprovalResult, ConnectionIdentity } from '../src/change-engine';

const PR = 'prAAAAAAAA1';
const DE1 = 'deAAAAAAAA1';
const DE2 = 'deAAAAAAAA2';
const DE3 = 'deAAAAAAAA3';
const OS1 = 'osAAAAAAAA1';

class Dev implements SourceGateway {
  baseURL = 'https://dev.example.org';
  release = 41;
  exports = 0;
  store: Record<string, any[]> = {
    programs: [{ id: PR, name: 'Facility assessment', organisationUnits: [{ id: 'ouDEV000001' }, { id: 'ouDEV000002' }],
      sharing: { public: 'rw------', users: { u1: { access: 'rw------' } } }, user: { id: 'u1' }, programStages: [{ id: 'psAAAAAAAA1' }] }],
    programStages: [{ id: 'psAAAAAAAA1', name: 'Visit', program: { id: PR } }],
    dataElements: [
      { id: DE1, name: 'Water source', code: 'WATER', valueType: 'TEXT', optionSet: { id: OS1 } },
      { id: DE2, name: 'Staff count', code: 'STAFF', valueType: 'INTEGER' },
      { id: DE3, name: 'Generator', code: 'GEN', valueType: 'BOOLEAN' },
    ],
    optionSets: [{ id: OS1, name: 'Water sources', valueType: 'TEXT' }],
    users: [{ id: 'u1', username: 'dev-admin' }],
    organisationUnits: [{ id: 'ouDEV000001' }],
  };
  async getDependencyExport(type: string, id: string) {
    this.exports++;
    if (type !== 'programs' || id !== PR) return null;
    return { system: { id: 'x' }, ...JSON.parse(JSON.stringify(this.store)) };
  }
}

class Prod implements TargetGateway {
  baseURL = 'https://prod.example.org';
  readOnly = true;
  release: number | undefined = 41;
  writes = 0;
  objects = new Map<string, Record<string, unknown>>([
    [`dataElements/${DE2}`, { id: DE2, name: 'Staff count', code: 'STAFF', valueType: 'INTEGER', lastUpdated: 'old' }],          // identical
    [`dataElements/${DE3}`, { id: DE3, name: 'Generator present', code: 'GEN', valueType: 'BOOLEAN' }],                          // changed
  ]);
  codes = new Map<string, string>(); // code -> id for conflict simulation
  async getOwnerObject(t: string, id: string) { const o = this.objects.get(`${t}/${id}`); return o ? JSON.parse(JSON.stringify(o)) : null; }
  async findIdsByField(_t: string, field: 'code' | 'name', value: string) {
    if (field === 'code' && this.codes.has(value)) return [this.codes.get(value)!];
    return [];
  }
  /** What a production administrator's import would do (outside the MCP). */
  adminImport(pkg: Record<string, any[]>) {
    for (const [t, list] of Object.entries(pkg)) for (const o of list) this.objects.set(`${t}/${o.id}`, { ...o, lastUpdated: 'now' });
  }
}

function setup(opts: { approve?: ApprovalResult; sourceEnv?: string } = {}) {
  const dev = new Dev();
  const prod = new Prod();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dhis2-transfer-'));
  const who: ConnectionIdentity = { epoch: 1, userId: 'u1', username: 'fixture', profile: 'dev', origin: 'https://dev.example.org' };
  const prompts: string[] = [];
  const make = () => new TransferEngine({
    source: () => ({ gw: dev, who, environment: opts.sourceEnv ?? 'development' }),
    openTarget: async () => ({ gw: prod, profile: 'production', environment: 'production', origin: 'https://prod.example.org' }),
    approve: async m => { prompts.push(m); return opts.approve ?? 'accept'; },
    baseDir: () => dir,
  });
  return { dev, prod, dir, prompts, engine: make(), make };
}
const req = { description: 'Facility assessment program, version 1', objects: [{ objectType: 'programs', id: PR }] };

async function code(p: Promise<unknown>) { try { await p; return 'ok'; } catch (e) { return e instanceof TransferError ? e.code : `other:${e}`; } }

describe('prepare', () => {
  it('exports dependencies, strips environment-specific parts and classifies against production', async () => {
    const { engine } = setup();
    const t = await engine.prepare(req);
    const status = Object.fromEntries(t.items.map(i => [i.id, i.status]));
    expect(status).toMatchObject({ [PR]: 'new', [DE1]: 'new', [OS1]: 'new', [DE2]: 'identical', [DE3]: 'changed' });
    expect(t.items.find(i => i.id === DE3)!.changedFields).toEqual(['name']);
    expect(t.pkg.users).toBeUndefined();
    expect(t.pkg.organisationUnits).toBeUndefined();
    const program = t.pkg.programs![0]!;
    expect(program.sharing).toBeUndefined();
    expect(program.user).toBeUndefined();
    expect(program.organisationUnits).toBeUndefined();
    expect(program.programStages).toEqual([{ id: 'psAAAAAAAA1' }]);
    expect(t.notTransferred.map(n => n.what)).toEqual(expect.arrayContaining(['users', 'organisationUnits', 'org unit assignments on programs/data sets', 'sharing settings']));
    const review = fs.readFileSync(t.files.review, 'utf8');
    expect(review).toContain('Nothing will be deleted');
    expect(review).toContain('| changed | dataElements | deAAAAAAAA3 |');
    expect(JSON.parse(fs.readFileSync(t.files.package, 'utf8')).dataElements).toHaveLength(3);
  });
  it('detects identity conflicts (same code, different id) in production', async () => {
    const { engine, prod } = setup();
    prod.codes.set('WATER', 'deOTHER0001');
    const t = await engine.prepare(req);
    expect(t.items.find(i => i.id === DE1)).toMatchObject({ status: 'conflict', conflictWith: ['deOTHER0001'] });
    expect(await code(engine.approve(t.id))).toBe('conflicts');
  });
  it('refuses to start from a production connection', async () => {
    const { engine } = setup({ sourceEnv: 'production' });
    expect(await code(engine.prepare(req))).toBe('source_not_development');
  });
  it('refuses a target that is not opened read-only', async () => {
    const t = setup();
    const e = new TransferEngine({
      source: () => ({ gw: t.dev, who: { epoch: 1, userId: 'u1', username: 'f', profile: 'dev', origin: 'https://dev.example.org' }, environment: 'development' }),
      openTarget: async () => ({ gw: { ...t.prod, readOnly: false, getOwnerObject: t.prod.getOwnerObject.bind(t.prod), findIdsByField: t.prod.findIdsByField.bind(t.prod) }, profile: 'p', environment: 'production', origin: 'https://prod.example.org' }),
      approve: async () => 'accept', baseDir: () => t.dir,
    });
    expect(await code(e.prepare(req))).toBe('internal');
  });
  it('validates input', async () => {
    const { engine } = setup();
    expect(await code(engine.prepare({ objects: [{ objectType: 'programs', id: PR }] }))).toBe('invalid');
    expect(await code(engine.prepare({ description: 'x', objects: [{ objectType: 'users', id: PR }] }))).toBe('invalid');
  });
});

describe('approve', () => {
  it('asks the person in plain language and writes the sign-off and admin instructions', async () => {
    const { engine, prompts } = setup();
    const t = await engine.approve((await engine.prepare(req)).id);
    expect(t.state).toBe('approved');
    expect(prompts[0]).toMatch(/^Approve moving this package from the development server to production/);
    expect(prompts[0]).toContain('4 new, 1 updated, 1 already identical');
    expect(prompts[0]).toContain('will NOT change production');
    const approval = JSON.parse(fs.readFileSync(t.files.approval!, 'utf8'));
    expect(approval.packageHash).toBe(t.packageHash);
    expect(fs.readFileSync(t.files.adminInstructions!, 'utf8')).toContain('Dry run');
  });
  it('detects a package file edited after preparation', async () => {
    const { engine } = setup();
    const t = await engine.prepare(req);
    const pkg = JSON.parse(fs.readFileSync(t.files.package, 'utf8'));
    pkg.dataElements[0].name = 'tampered';
    fs.writeFileSync(t.files.package, JSON.stringify(pkg));
    expect(await code(engine.approve(t.id))).toBe('tampered');
  });
  it('detects development changing after preparation', async () => {
    const { engine, dev } = setup();
    const t = await engine.prepare(req);
    dev.store.dataElements![1].name = 'Staff headcount';
    expect(await code(engine.approve(t.id))).toBe('stale');
  });
  it('a decline is final for that transfer', async () => {
    const { engine } = setup({ approve: 'decline' });
    const t = await engine.prepare(req);
    expect(await code(engine.approve(t.id))).toBe('declined');
    expect(await code(engine.approve(t.id))).toBe('invalid_state');
  });
  it('unknown or guessed ids are refused', async () => {
    const { engine } = setup();
    expect(await code(engine.approve('00000000-0000-4000-8000-000000000000'))).toBe('unknown_transfer');
    expect(await code(engine.approve('../../etc'))).toBe('unknown_transfer');
  });
});

describe('DHIS2 versions of the two servers', () => {
  it('blocks a package that uses a feature the receiving version lacks, before approval', async () => {
    const { engine, dev, prod, prompts } = setup();
    dev.release = 42;
    prod.release = 41;
    dev.store.programIndicators = [{ id: 'piAAAAAAAA1', name: 'Visits by sex', program: { id: PR }, categoryCombo: { id: 'ccAAAAAAAA1' } }];
    const t = await engine.prepare(req);
    expect(t.versions).toEqual({ source: 42, target: 41 });
    expect(t.versionProblems[0]).toMatch(/programIndicators\/piAAAAAAAA1.*needs DHIS2 2.42 or later; this server is 2.41.*one program indicator per category option/);
    expect(fs.readFileSync(t.files.review, 'utf8')).toContain('Will not work on the receiving version');
    expect(await code(engine.approve(t.id))).toBe('version_incompatible');
    expect(prompts).toEqual([]);
  });
  it('the same package is fine when the receiving server is 2.42', async () => {
    const { engine, dev, prod } = setup();
    dev.release = 42; prod.release = 42;
    dev.store.programIndicators = [{ id: 'piAAAAAAAA1', name: 'Visits by sex', program: { id: PR }, categoryCombo: { id: 'ccAAAAAAAA1' } }];
    const t = await engine.prepare(req);
    expect(t.versionProblems).toEqual([]);
    expect((await engine.approve(t.id)).state).toBe('approved');
  });
  it('an unreadable receiving version blocks approval rather than being assumed compatible', async () => {
    const { engine, prod } = setup();
    prod.release = undefined;
    const t = await engine.prepare(req);
    expect(t.versionProblems[0]).toMatch(/could not be read/);
    expect(await code(engine.approve(t.id))).toBe('version_incompatible');
  });
});

describe('verify (reading production only)', () => {
  it('reports not-imported before the admin imports, verified after', async () => {
    const { engine, prod } = setup();
    const t = await engine.approve((await engine.prepare(req)).id);
    expect((await engine.verify(t.id)).state).toBe('not-imported');
    prod.adminImport(t.pkg as any);
    const v = await engine.verify(t.id);
    expect(v.state).toBe('verified');
    expect(prod.writes).toBe(0);
  });
  it('reports a partial import', async () => {
    const { engine, prod } = setup();
    const t = await engine.approve((await engine.prepare(req)).id);
    prod.adminImport({ dataElements: (t.pkg as any).dataElements });
    expect((await engine.verify(t.id)).state).toBe('partially-imported');
  });
  it('survives a server restart: a new engine verifies from the files on disk', async () => {
    const s = setup();
    const t = await s.engine.approve((await s.engine.prepare(req)).id);
    s.prod.adminImport(t.pkg as any);
    const fresh = s.make();
    expect((await fresh.verify(t.id)).state).toBe('verified');
  });
  it('only approved transfers can be verified', async () => {
    const { engine } = setup();
    const t = await engine.prepare(req);
    expect(await code(engine.verify(t.id))).toBe('invalid_state');
  });
});
