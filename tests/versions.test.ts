/** Version detection, API differences and version-specific rules (sources in src/versions.ts). */
import { parseVersion, versionStatus, effectiveRelease, describeVersion, trackerOrgUnitParams, trackerList, trackerTotal, trackerProgramRequired, meFields, versionGuide } from '../src/versions';
import { checkVersionRules } from '../src/design-check';
import { checkPackageOffline } from '../src/package-engine';

describe('version parsing and support range (2.39-2.43)', () => {
  it.each([
    ['2.41.10', 41, 10, 0], ['2.41.10.1', 41, 10, 1], ['41.10.1', 41, 10, 1], ['v42.7', 42, 7, 0], ['2.40.13-SNAPSHOT', 40, 13, 0], ['2.43', 43, 0, 0],
  ])('%s', (raw, release, patch, hotfix) => {
    expect(parseVersion(raw)).toMatchObject({ release, patch, hotfix });
  });
  it('rejects junk', () => { for (const x of ['', 'abc', '1.0', undefined, 42]) expect(parseVersion(x as any)).toBeNull(); });
  it('classifies versions', () => {
    expect(versionStatus(parseVersion('2.38.6'))).toBe('too-old');
    expect(versionStatus(parseVersion('2.39.10'))).toBe('supported');
    expect(versionStatus(parseVersion('2.43.2'))).toBe('supported');
    expect(versionStatus(parseVersion('2.44.0'))).toBe('untested-newer');
    expect(versionStatus(null)).toBe('unknown');
    expect(effectiveRelease(parseVersion('2.44.0'))).toBe(43);
    expect(effectiveRelease(parseVersion('2.40.1'))).toBe(40);
    expect(describeVersion(parseVersion('2.40.13-SNAPSHOT'))).toMatch(/end-of-support build.*no longer supported by DHIS2.*fully supported by the assistant/);
    expect(describeVersion(parseVersion('2.38.1'))).toMatch(/only reads/);
    expect(describeVersion(parseVersion('2.44.0'))).toMatch(/newer than the assistant has been tested with.*dry run/);
  });
});

describe('API differences', () => {
  it('tracker org-unit parameters: old names up to 2.40, new names from 2.41', () => {
    expect(trackerOrgUnitParams(40, 'trackedEntities', 'ou1', 'SELECTED')).toEqual({ orgUnit: 'ou1', ouMode: 'SELECTED' });
    expect(trackerOrgUnitParams(41, 'trackedEntities', 'ou1', 'SELECTED')).toEqual({ orgUnits: 'ou1', orgUnitMode: 'SELECTED' });
    expect(trackerOrgUnitParams(43, 'enrollments', 'ou1', 'DESCENDANTS')).toEqual({ orgUnits: 'ou1', orgUnitMode: 'DESCENDANTS' });
    expect(trackerOrgUnitParams(39, 'events', 'ou1', 'SELECTED')).toEqual({ orgUnit: 'ou1', ouMode: 'SELECTED' });
    expect(trackerOrgUnitParams(42, 'events', 'ou1', 'SELECTED')).toEqual({ orgUnit: 'ou1', orgUnitMode: 'SELECTED' });
  });
  it('tracker list key: instances (≤2.40) or the plural entity (2.41+)', () => {
    expect(trackerList({ instances: [{ event: 'a' }] }, 'events')).toEqual([{ event: 'a' }]);
    expect(trackerList({ events: [{ event: 'b' }] }, 'events')).toEqual([{ event: 'b' }]);
    expect(trackerList({}, 'events')).toEqual([]);
  });
  it('program required for events/enrollments from 2.43; user roles without userCredentials from 2.42', () => {
    expect(trackerProgramRequired(42, 'events')).toBe(false);
    expect(trackerProgramRequired(43, 'events')).toBe(true);
    expect(trackerProgramRequired(43, 'trackedEntities')).toBe(false);
    expect(meFields(41)).toContain('userCredentials[');
    expect(meFields(42)).not.toContain('userCredentials');
    expect(meFields(42)).toContain('userRoles[');
  });
});

describe('version-specific design rules', () => {
  const pi = { id: 'piAAAAAAAA1', name: 'Visits by sex', program: { id: 'prAAAAAAAA1' }, categoryCombo: { id: 'ccAAAAAAAA1' } };
  it('program-indicator disaggregation: an error with the workaround before 2.42, fine from 2.42', () => {
    const f = checkVersionRules({ programIndicators: [pi], programs: [{ id: 'prAAAAAAAA1', name: 'P', categoryMappings: [{ id: 'm1' }] }] }, 41);
    expect(f.map(x => x.rule)).toEqual(['version-pi-disaggregation', 'version-pi-disaggregation']);
    expect(f[0]!.message).toMatch(/needs DHIS2 2.42 or later; this server is 2.41.*one program indicator per category option/);
    expect(checkVersionRules({ programIndicators: [pi] }, 42)).toEqual([]);
    expect(checkVersionRules({ programIndicators: [{ ...pi, categoryCombo: undefined, categoryMappingIds: [] }] }, 40)).toEqual([]);
  });
  it('event reports/charts: allowed on 2.40, refused from 2.41', () => {
    const p = { eventReports: [{ id: 'erAAAAAAAA1', name: 'Line list' }] };
    expect(checkVersionRules(p, 40)).toEqual([]);
    expect(checkVersionRules(p, 41)[0]!.message).toMatch(/eventVisualizations/);
  });
  it('category limits from 2.42 only', () => {
    const opts = Array.from({ length: 60 }, (_, i) => ({ id: `co${String(i).padStart(9, 'A')}` }));
    const p = { categories: [{ id: 'caAAAAAAAA1', name: 'Facility', categoryOptions: opts }, { id: 'caAAAAAAAA2', name: 'Age', categoryOptions: opts.slice(0, 10) }],
      categoryCombos: [{ id: 'ccAAAAAAAA1', name: 'Big', categories: [{ id: 'caAAAAAAAA1' }, { id: 'caAAAAAAAA2' }] }] };
    expect(checkVersionRules(p, 41)).toEqual([]);
    const f = checkVersionRules(p, 42);
    expect(f.map(x => x.message)).toEqual([expect.stringMatching(/60 options.*at most 50/), expect.stringMatching(/600 option combinations.*at most 500/)]);
  });
  it('packages are checked against the server version, including partial updates', () => {
    const input = { description: 'x', creates: {}, updates: [{ objectType: 'programIndicators', id: 'piAAAAAAAA1', set: { categoryCombo: { id: 'ccAAAAAAAA1' } } }] };
    expect(checkPackageOffline(input, 41).findings.map(f => f.rule)).toContain('version-pi-disaggregation');
    expect(checkPackageOffline(input, 42).findings.map(f => f.rule)).not.toContain('version-pi-disaggregation');
    expect(checkPackageOffline(input).findings.map(f => f.rule)).not.toContain('version-pi-disaggregation');
  });
});

describe('version guide', () => {
  it('on a 2.41 server it gives the workaround for what is missing, and never says to upgrade as the fix', () => {
    const g = versionGuide(parseVersion('2.41.10'));
    expect(g).toContain('Never make an upgrade the fix');
    expect(g).toMatch(/Program indicator disaggregation[^]*Not available on this server \(needs 2.42\+\)[^]*What to do here:\*\* Before 2.42: create one program indicator per category option/);
  });
  it('on a 2.42 server it describes the feature instead', () => {
    const g = versionGuide(parseVersion('2.42.7'));
    expect(g).toMatch(/From 2.42 a program indicator can carry a disaggregation/);
    expect(g).not.toMatch(/What to do here:\*\* Before 2.42/);
  });
});

describe('tracker totals', () => {
  test('reads the count from either reply shape (top-level up to 2.40, pager from 2.41)', () => {
    expect(trackerTotal({ page: 1, pageSize: 1, total: 89, instances: [] })).toBe(89);
    expect(trackerTotal({ pager: { page: 1, pageSize: 1, total: 216 }, events: [] })).toBe(216);
    expect(trackerTotal({ pager: { page: 1, pageSize: 1 }, events: [] })).toBeUndefined();
    expect(trackerTotal({ total: 'many' })).toBeUndefined();
    expect(trackerTotal(null)).toBeUndefined();
  });
});
