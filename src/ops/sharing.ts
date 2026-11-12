/**
 * Sharing changes. Existing grants are kept unless the change names them; the
 * owner and external access are never touched. DHIS2 has no dry run for sharing,
 * so every object and every user group/user is checked by reading first, and the
 * result is read back.
 */
import { isUid, safeText, sha256 } from '../security/plans.js';
import { OpKind, OpTarget, OperationError, mapLimit } from '../operations.js';
import type { SharingGateway, SharingObject } from './gateway.js';

/** Collection → sharing type, and whether the type has data sharing. */
export const SHARING_TYPES: Record<string, { type: string; data: boolean }> = {
  dataSets: { type: 'dataSet', data: true }, programs: { type: 'program', data: true }, programStages: { type: 'programStage', data: true },
  trackedEntityTypes: { type: 'trackedEntityType', data: true }, categoryOptions: { type: 'categoryOption', data: true },
  categoryOptionGroups: { type: 'categoryOptionGroup', data: true },
  dataElements: { type: 'dataElement', data: false }, dataElementGroups: { type: 'dataElementGroup', data: false },
  indicators: { type: 'indicator', data: false }, indicatorGroups: { type: 'indicatorGroup', data: false },
  programIndicators: { type: 'programIndicator', data: false }, optionSets: { type: 'optionSet', data: false },
  legendSets: { type: 'legendSet', data: false }, dashboards: { type: 'dashboard', data: false },
  visualizations: { type: 'visualization', data: false }, eventVisualizations: { type: 'eventVisualization', data: false },
  maps: { type: 'map', data: false }, trackedEntityAttributes: { type: 'trackedEntityAttribute', data: false },
  categories: { type: 'category', data: false }, categoryCombos: { type: 'categoryCombo', data: false },
  validationRules: { type: 'validationRule', data: false }, constants: { type: 'constant', data: false },
};
export const SHARING_LIMITS = { maxObjects: 200, maxPrincipalsPerObject: 50 };

const META: Record<string, string> = { none: '--', view: 'r-', edit: 'rw' };
const DATA: Record<string, string> = { none: '--', view: 'r-', capture: 'rw' };

interface Norm { public: string; groups: Record<string, string>; users: Record<string, string> }
const norm = (s: SharingObject): Norm => ({
  public: s.publicAccess ?? '--------',
  groups: Object.fromEntries((s.userGroupAccesses ?? []).map(g => [g.id, g.access]).sort()),
  users: Object.fromEntries((s.userAccesses ?? []).map(u => [u.id, u.access]).sort()),
});

/** "can see it and enter data" */
export function plainAccess(access: string | undefined, hasData: boolean): string {
  if (!access || access.slice(0, 4) === '----') return 'no access';
  const m = access.slice(0, 2) === 'rw' ? 'can edit it' : access.slice(0, 2) === 'r-' ? 'can see it' : 'cannot see it';
  if (!hasData) return m;
  const d = access.slice(2, 4) === 'rw' ? 'see and enter data' : access.slice(2, 4) === 'r-' ? 'see data' : 'no data access';
  return `${m}; ${d}`;
}

function accessString(level: Record<string, unknown>, hasData: boolean, at: string, problems: string[]): string | null {
  const m = META[String(level.metadata ?? '')];
  if (!m) { problems.push(`${at}.metadata must be none, view or edit.`); return null; }
  let d = '--';
  if (level.data !== undefined) {
    if (!hasData) { problems.push(`${at}.data: this object type has no data sharing.`); return null; }
    const dd = DATA[String(level.data)];
    if (!dd) { problems.push(`${at}.data must be none, view or capture.`); return null; }
    d = dd;
  }
  return `${m}${d}----`;
}

interface Change { objectType: string; id: string; type: string; hasData: boolean;
  public?: string; groups: Record<string, string | null>; users: Record<string, string | null> }

function parseChanges(input: unknown): { changes: Change[]; problems: string[] } {
  const problems: string[] = [];
  if (!Array.isArray(input) || !input.length) return { changes: [], problems: ['changes must be a non-empty array.'] };
  if (input.length > SHARING_LIMITS.maxObjects) return { changes: [], problems: [`At most ${SHARING_LIMITS.maxObjects} objects per sharing change.`] };
  const seen = new Set<string>();
  const changes: Change[] = [];
  input.forEach((raw, i) => {
    const at = `changes[${i}]`;
    const o = (raw ?? {}) as Record<string, any>;
    const t = SHARING_TYPES[String(o.objectType)];
    if (!t) { problems.push(`${at}.objectType must be one of: ${Object.keys(SHARING_TYPES).join(', ')}.`); return; }
    if (!isUid(o.id)) { problems.push(`${at}.id must be an 11-character id.`); return; }
    if (seen.has(`${o.objectType}/${o.id}`)) { problems.push(`${at} repeats ${o.objectType}/${o.id}.`); return; }
    seen.add(`${o.objectType}/${o.id}`);
    const c: Change = { objectType: o.objectType, id: o.id, type: t.type, hasData: t.data, groups: {}, users: {} };
    if (o.public !== undefined) { const pa = accessString(o.public ?? {}, t.data, `${at}.public`, problems); if (pa) c.public = pa; }
    for (const [field, into] of [['userGroups', c.groups], ['users', c.users]] as const) {
      const list = o[field] ?? [];
      if (!Array.isArray(list) || list.length > SHARING_LIMITS.maxPrincipalsPerObject) { problems.push(`${at}.${field} must be an array of at most ${SHARING_LIMITS.maxPrincipalsPerObject}.`); continue; }
      list.forEach((p: any, j: number) => {
        if (!isUid(p?.id)) { problems.push(`${at}.${field}[${j}].id must be an 11-character id.`); return; }
        if (p.id in into) { problems.push(`${at}.${field}[${j}] repeats ${p.id}.`); return; }
        const a = accessString(p, t.data, `${at}.${field}[${j}]`, problems);
        if (a) into[p.id] = a.startsWith('----') ? null : a; // "none" removes the grant
      });
    }
    for (const [field, into] of [['userGroups', c.groups], ['users', c.users]] as const) {
      for (const id of Array.isArray(o.remove?.[field]) ? o.remove[field] : []) {
        if (!isUid(id)) { problems.push(`${at}.remove.${field} must hold 11-character ids.`); continue; }
        if (id in into) { problems.push(`${at}: ${id} is both granted and removed.`); continue; }
        into[id] = null;
      }
    }
    if (c.public === undefined && !Object.keys(c.groups).length && !Object.keys(c.users).length) { problems.push(`${at} changes nothing.`); return; }
    changes.push(c);
  });
  return { changes, problems };
}

interface SharingPayloadItem { type: string; objectType: string; id: string; object: SharingObject }

export const sharingKind: OpKind<SharingGateway, SharingPayloadItem[]> = {
  name: 'sharing',
  plain: 'change sharing (who can see, edit or enter data)',

  async plan(gw, input) {
    const { changes, problems } = parseChanges(input.changes);
    if (problems.length) throw new OperationError('invalid', `Sharing change cannot be planned:\n- ${problems.slice(0, 40).join('\n- ')}`);
    const principals = new Map<string, string | null>();
    for (const c of changes) {
      for (const id of Object.keys(c.groups)) principals.set(`userGroups/${id}`, null);
      for (const id of Object.keys(c.users)) principals.set(`users/${id}`, null);
    }
    await mapLimit([...principals.keys()], 8, async k => {
      const [kind, id] = k.split('/') as ['userGroups' | 'users', string];
      principals.set(k, await gw.getPrincipalName(kind, id));
    });
    const befores = await mapLimit(changes, 8, c => gw.getSharing(c.type, c.id));
    const missing: string[] = [];
    changes.forEach((c, i) => { if (!befores[i]) missing.push(`${c.objectType}/${c.id} not found`); });
    for (const c of changes) {
      for (const [id, a] of Object.entries(c.groups)) if (a !== null && !principals.get(`userGroups/${id}`)) missing.push(`user group ${id} not found`);
      for (const [id, a] of Object.entries(c.users)) if (a !== null && !principals.get(`users/${id}`)) missing.push(`user ${id} not found`);
    }
    if (missing.length) throw new OperationError('invalid', `Sharing change cannot be planned:\n- ${[...new Set(missing)].slice(0, 40).join('\n- ')}`);

    const payload: SharingPayloadItem[] = [];
    const targets: OpTarget[] = [];
    const warnings: string[] = [];
    const lines: string[] = [];
    let skipped = 0;
    const who = (kind: string, id: string) => `${kind === 'groups' ? 'group' : 'user'} "${safeText(principals.get(`${kind === 'groups' ? 'userGroups' : 'users'}/${id}`) ?? id, 50)}"`;
    changes.forEach((c, i) => {
      const before = befores[i]!;
      const b = norm(before);
      const after: Norm = { public: c.public ?? b.public, groups: { ...b.groups }, users: { ...b.users } };
      for (const [id, a] of Object.entries(c.groups)) { if (a === null) delete after.groups[id]; else after.groups[id] = a; }
      for (const [id, a] of Object.entries(c.users)) { if (a === null) delete after.users[id]; else after.users[id] = a; }
      after.groups = Object.fromEntries(Object.entries(after.groups).sort());
      after.users = Object.fromEntries(Object.entries(after.users).sort());
      if (sha256(after) === sha256(b)) { skipped++; return; }
      const label = `${c.objectType.replace(/s$/, '')} "${safeText(before.name ?? c.id, 60)}"`;
      const diffs: string[] = [];
      if (after.public !== b.public) {
        diffs.push(`everyone: ${plainAccess(b.public, c.hasData)} → ${plainAccess(after.public, c.hasData)}`);
        if (after.public.slice(0, 2) === 'rw') warnings.push(`Everyone would be able to EDIT ${label}.`);
        if (c.hasData && after.public.slice(2, 4) === 'rw') warnings.push(`Everyone would be able to ENTER DATA in ${label}.`);
      }
      for (const kind of ['groups', 'users'] as const) {
        const ids = new Set([...Object.keys(b[kind]), ...Object.keys(after[kind])]);
        for (const id of ids) if (b[kind][id] !== after[kind][id]) diffs.push(`${who(kind, id)}: ${plainAccess(b[kind][id], c.hasData)} → ${plainAccess(after[kind][id], c.hasData)}`);
      }
      lines.push(`- **${label}** (${c.objectType}/${c.id})`, ...diffs.map(d => `  - ${d}`));
      targets.push({ key: `${c.objectType}/${c.id}`, label: `${label}: ${diffs.join('; ')}`, action: 'update', intended: after, before: b });
      payload.push({ type: c.type, objectType: c.objectType, id: c.id, object: {
        publicAccess: after.public, ...(before.externalAccess !== undefined ? { externalAccess: before.externalAccess } : {}),
        userGroupAccesses: Object.entries(after.groups).map(([id, access]) => ({ id, access })),
        userAccesses: Object.entries(after.users).map(([id, access]) => ({ id, access })),
      } });
    });
    const removed = targets.reduce((n, t) => {
      const b = t.before as Norm, a = t.intended as Norm;
      return n + Object.keys(b.groups).filter(id => !(id in a.groups)).length + Object.keys(b.users).filter(id => !(id in a.users)).length;
    }, 0);
    if (removed) warnings.push(`${removed} existing grant(s) will be removed.`);
    return {
      description: String(input.description), payload, targets, skipped, warnings, blocking: [],
      summary: `change who can access ${targets.length} object(s)${skipped ? ` (${skipped} already as requested)` : ''}. Existing access not mentioned is kept; owners and external access are not changed.`,
      dryRun: { ok: true, summary: 'DHIS2 has no dry run for sharing; every object, user group and user was checked by reading', errors: [] },
      review: lines.join('\n'),
    };
  },

  async drift(gw, op, payload) {
    const out: string[] = [];
    await mapLimit(payload, 8, async p => {
      const t = op.targets.find(x => x.key === `${p.objectType}/${p.id}`)!;
      const cur = await gw.getSharing(p.type, p.id);
      if (!cur || sha256(norm(cur)) !== sha256(t.before)) out.push(`sharing of ${t.key} changed since planning`);
    });
    return out;
  },

  async commit(gw, payload) {
    const errors: string[] = [];
    let done = 0;
    for (const p of payload) {
      const r = await gw.postSharing(p.type, p.id, p.object);
      if (r.httpStatus >= 500) throw new Error(`HTTP ${r.httpStatus}`);
      if (r.httpStatus >= 400) { errors.push(`${p.objectType}/${p.id}: ${safeText(r.message, 200)}`); break; }
      done++;
    }
    return { rejected: done === 0 && errors.length > 0, summary: `${done} of ${payload.length} object(s) updated${errors.length ? '; stopped at the first refusal' : ''}`, errors };
  },

  async readBack(gw, op, payload) {
    let failed = false;
    await mapLimit(payload, 8, async p => {
      const t = op.targets.find(x => x.key === `${p.objectType}/${p.id}`)!;
      let cur: SharingObject | null;
      try { cur = await gw.getSharing(p.type, p.id); } catch { failed = true; return; }
      if (!cur) { t.result = 'missing'; return; }
      const got = sha256(norm(cur));
      t.result = got === sha256(t.intended) ? 'verified' : got === sha256(t.before) ? 'unchanged' : 'mismatch';
      if (t.result === 'mismatch') t.detail = 'sharing on the server differs from what was approved';
    });
    return failed;
  },

  approvalLines(op) {
    return ['Changes:', ...op.targets.slice(0, 15).map(t => `  ${safeText(t.label, 300)}`), ...(op.targets.length > 15 ? [`  …and ${op.targets.length - 15} more (see the review file).`] : [])];
  },
};
