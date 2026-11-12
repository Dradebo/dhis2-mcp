/**
 * DHIS2 version handling: one table for every behaviour that differs between
 * versions, each with its source. The client and the design checks ask this
 * module; nothing else hard-codes a version.
 *
 * Full support: 2.39 to 2.43 (decided 2026-11-12). DHIS2 supports 2.41-2.43;
 * 2.39 and 2.40 are end-of-support but still widely run.
 *  - older than 2.39 : read-only (nothing is created or changed)
 *  - newer than 2.43 : treated like the newest known version, flagged as untested;
 *                      every change still has to pass DHIS2's own dry run first
 */

export interface DhisVersion {
  release: number;      // 39, 40, 41, 42, 43 ...
  patch: number;        // 10 for 2.41.10 / 41.10.1
  hotfix: number;       // 1 for 2.41.10.1 / 41.10.1
  raw: string;
  snapshot: boolean;    // SNAPSHOT / end-of-support builds
}

export const SUPPORTED = { min: 39, max: 43 } as const;
export type VersionStatus = 'supported' | 'too-old' | 'untested-newer' | 'unknown';

/** Accepts "2.41.10", "2.41.10.1", "41.10.1", "v42.7", "2.40.13-SNAPSHOT". */
export function parseVersion(raw: unknown): DhisVersion | null {
  if (typeof raw !== 'string') return null;
  const m = /^v?(?:2\.)?(\d{2})(?:\.(\d+))?(?:\.(\d+))?/.exec(raw.trim());
  if (!m) return null;
  const release = Number(m[1]);
  if (release < 20 || release > 99) return null;
  return { release, patch: Number(m[2] ?? 0), hotfix: Number(m[3] ?? 0), raw: raw.trim(), snapshot: /SNAPSHOT|EOS/i.test(raw) };
}

export function versionStatus(v: DhisVersion | null): VersionStatus {
  if (!v) return 'unknown';
  if (v.release < SUPPORTED.min) return 'too-old';
  if (v.release > SUPPORTED.max) return 'untested-newer';
  return 'supported';
}

/** The release whose behaviour applies: newer-than-known versions use the newest known profile. */
export function effectiveRelease(v: DhisVersion | null): number {
  if (!v) return SUPPORTED.max;
  return Math.min(Math.max(v.release, SUPPORTED.min), SUPPORTED.max);
}

export function describeVersion(v: DhisVersion | null): string {
  const s = versionStatus(v);
  if (!v) return 'DHIS2 version unknown';
  const name = `DHIS2 2.${v.release}.${v.patch}${v.hotfix ? `.${v.hotfix}` : ''}${v.snapshot ? ' (end-of-support build)' : ''}`;
  if (s === 'too-old') return `${name}: older than 2.${SUPPORTED.min}, so the assistant only reads (nothing is created or changed)`;
  if (s === 'untested-newer') return `${name}: newer than the assistant has been tested with (up to 2.${SUPPORTED.max}); it uses 2.${SUPPORTED.max} behaviour and every change must pass DHIS2's dry run`;
  if (v.release <= 40) return `${name}: no longer supported by DHIS2 (security fixes only); fully supported by the assistant`;
  return name;
}

// ---- API differences ---------------------------------------------------------------------

export type TrackerEntity = 'events' | 'enrollments' | 'trackedEntities';

/**
 * Org-unit query parameters for /api/tracker/{entity}.
 * 2.41 renamed orgUnit → orgUnits (trackedEntities, enrollments) and ouMode → orgUnitMode (all three);
 * the old names were removed in 2.42. Sources: 2.41 and 2.42 upgrade notes.
 */
export function trackerOrgUnitParams(release: number, entity: TrackerEntity, orgUnit: string | undefined, mode: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  const newNames = release >= 41;
  if (orgUnit) out[entity === 'events' || !newNames ? 'orgUnit' : 'orgUnits'] = orgUnit;
  if (mode) out[newNames ? 'orgUnitMode' : 'ouMode'] = mode;
  return out;
}

/** Records from a tracker list response: "instances" up to 2.40, the plural entity key from 2.41. */
export function trackerList(body: any, entity: TrackerEntity): Array<Record<string, any>> {
  const list = body?.[entity] ?? body?.instances;
  return Array.isArray(list) ? list : [];
}

/**
 * Total matching records. `totalPages=true` asks DHIS2 to count (same parameter name 2.36-2.43).
 * The count sits at top-level `total` up to 2.40 and in `pager.total` from 2.41 (the 2.41 response
 * reshaping). Read both shapes; return undefined when the server did not count.
 */
export function trackerTotal(body: any): number | undefined {
  const t = body?.pager?.total ?? body?.total;
  return typeof t === 'number' && Number.isFinite(t) ? t : undefined;
}

/** 2.43 made `program` mandatory on /tracker/events and /tracker/enrollments. */
export function trackerProgramRequired(release: number, entity: TrackerEntity): boolean {
  return release >= 43 && entity !== 'trackedEntities';
}

/** /api/me field list: userCredentials was merged into the user object and removed in 2.42. */
export function meFields(release: number): string {
  const base = 'id,displayName,username,userGroups[id,name],organisationUnits[id,name,level],authorities';
  return release >= 42 ? `${base},userRoles[id,name,authorities]`
    : `${base},userRoles[id,name,authorities],userCredentials[username,userRoles[id,name,authorities]]`;
}

// ---- version-tagged knowledge ----------------------------------------------------------------

export interface VersionNote {
  id: string;
  title: string;
  from?: number;          // first release where this applies
  until?: number;         // last release where this applies
  text: string;
  workaround?: string;    // what to do where the feature is missing
  source: string;
}

export const VERSION_NOTES: VersionNote[] = [
  {
    id: 'pi-disaggregation', title: 'Program indicator disaggregation (category combinations on program indicators)', from: 42,
    text: 'From 2.42 a program indicator can carry a disaggregation category combination (categoryCombo / attributeCombo / categoryMappingIds) mapped on the program (categoryMappings), so one indicator splits by e.g. sex and age in Data Visualizer.',
    workaround: 'Before 2.42: create one program indicator per category option (or option combination), each with a filter that selects that group, named "<indicator> - <option>" and grouped in a program indicator group so they appear together. Record in the handover that after an upgrade to 2.42+ they can be replaced by one disaggregated indicator.',
    source: 'https://docs.dhis2.org/en/implement/maintenance-and-use/programme-indicator-disaggregation.html ; dhis2-core 2.42.7 ProgramIndicator.java / Program.java',
  },
  {
    id: 'event-visualizations', title: 'Event reports and event charts', from: 41,
    text: '/api/eventReports and /api/eventCharts reached end of support in 2.41; use eventVisualizations (Line Listing / Data Visualizer).',
    workaround: '2.39 and 2.40: eventReports/eventCharts still work, but eventVisualizations is preferred because it survives upgrades.',
    source: 'https://github.com/dhis2/dhis2-releases/blob/master/releases/deprecated-features.md',
  },
  {
    id: 'category-limits', title: 'Category size limits', from: 42,
    text: 'From 2.42 the server limits categories by default: at most 50 options per category (31 in 42.0), 5 categories per category combination and 500 option combinations per combination. Administrators can change the limits.',
    workaround: 'Split very large categories (e.g. long facility or age lists) into an option set on a data element, or into several smaller category combinations.',
    source: 'https://community.dhis2.org/t/upgrade-to-2-42-query-to-view-parameters-for-category-configuration-limit-options/75367',
  },
  {
    id: 'old-tracker-api', title: 'Old tracker API', from: 42,
    text: '/api/trackedEntityInstances, /api/enrollments, /api/events and /api/relationships were removed in 2.42. This assistant uses /api/tracker on every version (available since 2.36).',
    source: 'https://github.com/dhis2/dhis2-releases/blob/master/releases/2.42/README.md',
  },
  {
    id: 'tracker-param-names', title: 'Tracker query parameter names', from: 41,
    text: '2.41 renamed orgUnit → orgUnits (tracked entities, enrollments), ouMode → orgUnitMode and the list key instances → events/trackedEntities/enrollments; 2.42 removed the old names. The assistant chooses the right names automatically.',
    source: 'https://dhis2.github.io/dhis2-releases/releases/2.41/',
  },
  {
    id: 'tracker-program-required', title: 'Program required in event and enrollment searches', from: 43,
    text: 'From 2.43, /tracker/events and /tracker/enrollments require a program.',
    source: 'https://github.com/dhis2/dhis2-releases/blob/master/releases/2.43/README.md',
  },
  {
    id: 'user-credentials', title: 'User credentials object', from: 42,
    text: 'userCredentials was merged into the user object and removed in 2.42 (username and userRoles are top-level).',
    source: 'https://github.com/dhis2/dhis2-releases/blob/master/releases/2.42/README.md',
  },
  {
    id: 'classic-apps', title: 'Classic Data Entry and Tracker Capture apps', from: 42,
    text: 'The classic Data Entry and Tracker Capture apps were removed in 2.42; use the Data Entry (aggregate) and Capture apps.',
    source: 'https://github.com/dhis2/dhis2-releases/blob/master/releases/2.42/README.md',
  },
];

export function appliesTo(n: Pick<VersionNote, 'from' | 'until'>, release: number): boolean {
  return (n.from === undefined || release >= n.from) && (n.until === undefined || release <= n.until);
}

/** Markdown guide: what differs on the given release (or across all supported releases). */
export function versionGuide(v: DhisVersion | null): string {
  const lines = ['# DHIS2 version differences', '',
    v ? `Connected server: ${describeVersion(v)}.` : `No server connected: differences across 2.${SUPPORTED.min}-2.${SUPPORTED.max} are listed.`, '',
    'The person using the assistant usually cannot change the server version. Never make an upgrade the fix: use the',
    'workaround for the connected version, and note in the handover what can be simplified after an upgrade.', ''];
  for (const n of VERSION_NOTES) {
    const range = `${n.from ? `2.${n.from}` : `2.${SUPPORTED.min}`}${n.until ? `-2.${n.until}` : '+'}`;
    if (v) {
      const r = effectiveRelease(v);
      const has = appliesTo(n, r);
      if (!has && !n.workaround) continue;
      lines.push(`## ${n.title}`, has ? n.text : `Not available on this server (needs ${range}).`, ...(!has && n.workaround ? [`**What to do here:** ${n.workaround}`] : []), `Source: ${n.source}`, '');
    } else {
      lines.push(`## ${n.title} (${range})`, n.text, ...(n.workaround ? [`Earlier versions: ${n.workaround}`] : []), `Source: ${n.source}`, '');
    }
  }
  return lines.join('\n');
}
