/**
 * Authority names must be real. Live finding (2026-11-12, DHIS2 2.41.10.1): ten invented authority
 * names made every read fail for non-superusers; fake servers only ever used superusers ('ALL').
 * Fixture: GET /api/authorities from the real development server (names only).
 */
import fs from 'node:fs';
import path from 'node:path';
import { PermissionSystem } from '../src/permission-system';

const known = new Set<string>(JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/authorities-2.41.json'), 'utf8')).authorities);

// Shaped like the live Metadata Manager account (no ALL), trimmed to representative authorities.
const metadataManager = {
  id: 'u1', username: 'mm', authorities: ['F_DATAELEMENT_PUBLIC_ADD', 'F_DATAELEMENT_PRIVATE_ADD', 'F_PROGRAM_PUBLIC_ADD', 'F_DATAVALUE_ADD', 'F_EXPORT_DATA', 'F_METADATA_IMPORT'],
  userRoles: [{ id: 'r1', name: 'Metadata Manager', authorities: ['F_PROGRAMSTAGE_ADD'] }],
} as any;
const dataViewer = { id: 'u2', username: 'dv', authorities: [], userRoles: [{ id: 'r2', name: 'Data Viewer', authorities: ['M_dhis-web-dashboard'] }] } as any;

describe('authority names', () => {
  test('every authority the permission mapping checks exists on DHIS2 2.41', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/permission-system.ts'), 'utf8');
    const used = [...new Set([...src.matchAll(/authorities\.has\('([A-Za-z0-9_-]+)'\)/g)].map(m => m[1] as string))];
    expect(used.length).toBeGreaterThan(5);
    expect(used.filter(a => !known.has(a))).toEqual([]);
  });

  test('generated app manifests only name real authorities', () => {
    for (const f of ['../src/webapp-generators.ts', '../src/debugging-helpers.ts']) {
      const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
      const named = [...new Set([...src.matchAll(/["'](F_[A-Z0-9_]+)["']/g)].map(m => m[1] as string))];
      expect({ file: f, unknown: named.filter(a => !known.has(a)) }).toEqual({ file: f, unknown: [] });
    }
  });
});

describe('non-superusers', () => {
  test('a Metadata Manager can read metadata, data, analytics and tracker lists', () => {
    const p = PermissionSystem.extractPermissionsFromDHIS2User(metadataManager);
    for (const tool of ['dhis2_list_programs', 'dhis2_list_data_sets', 'dhis2_list_org_units', 'dhis2_get_data_values', 'dhis2_get_analytics', 'dhis2_list_events', 'dhis2_plan_package', 'dhis2_plan_data']) {
      expect({ tool, ok: PermissionSystem.hasToolPermission(tool, p) }).toEqual({ tool, ok: true });
    }
  });

  test('a viewer without F_PERFORM_MAINTENANCE is not offered analytics table runs', () => {
    const p = PermissionSystem.extractPermissionsFromDHIS2User(dataViewer);
    expect(PermissionSystem.hasToolPermission('dhis2_list_programs', p)).toBe(true);
    expect(PermissionSystem.hasToolPermission('dhis2_run_analytics', p)).toBe(false);
    const withMaint = PermissionSystem.extractPermissionsFromDHIS2User({ ...dataViewer, authorities: ['F_PERFORM_MAINTENANCE'] });
    expect(PermissionSystem.hasToolPermission('dhis2_run_analytics', withMaint)).toBe(true);
  });
});
