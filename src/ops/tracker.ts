/**
 * Tracker data (tracked entities, enrollments, events) through /api/tracker,
 * atomic (all or nothing).
 *
 * - Every record gets its id before sending, so a send can be checked by reading
 *   and is never repeated blindly.
 * - Duplicate guard: new events and tracked entities are compared with what the
 *   server already holds (same program/stage/org unit/date and identical values;
 *   same type/org unit and identical attributes) and with each other. Likely
 *   re-imports are refused unless the person has confirmed they are genuinely new,
 *   and the approval then says so.
 */
import { generateUid, isUid, safeText, sha256 } from '../security/plans.js';
import { OpKind, OpTarget, OperationError, mapLimit } from '../operations.js';
import { sameValue } from './aggregate.js';
import type { DataGateway } from './gateway.js';

export const TRACKER_LIMITS = { maxRecords: 5000, duplicateScan: 10000 };
type Kind = 'trackedEntity' | 'enrollment' | 'event';
const DATE_RE = /^\d{4}-\d{2}-\d{2}([T ][0-9:.]+Z?)?$/;

interface Rec { kind: Kind; uid: string; supplied: boolean; obj: Record<string, any>; inEnrollment: boolean }

const pairs = (list: unknown, idField: string): Record<string, string> => Object.fromEntries(
  (Array.isArray(list) ? list : []).filter((x: any) => x && isUid(x[idField])).map((x: any) => [x[idField], String(x.value ?? '')]));
const numNorm = (v: string) => (v.trim() !== '' && Number.isFinite(Number(v)) ? String(Number(v)) : v);

/** The fields read-back must find, in a comparable shape. */
function essence(kind: Kind, o: Record<string, any>): Record<string, unknown> {
  if (kind === 'event') return { program: o.program, ...(o.programStage ? { programStage: o.programStage } : {}), orgUnit: o.orgUnit,
    occurredAt: String(o.occurredAt ?? '').slice(0, 10), values: pairs(o.dataValues, 'dataElement') };
  if (kind === 'enrollment') return { program: o.program, orgUnit: o.orgUnit, enrolledAt: String(o.enrolledAt ?? '').slice(0, 10) };
  return { trackedEntityType: o.trackedEntityType, orgUnit: o.orgUnit, values: pairs(o.attributes, 'attribute') };
}

function essenceMatches(want: Record<string, any>, got: Record<string, any>): string[] {
  const bad: string[] = [];
  for (const [k, v] of Object.entries(want)) {
    if (k === 'values') {
      for (const [id, val] of Object.entries(v as Record<string, string>)) if (!sameValue(got.values?.[id], val)) bad.push(id);
    } else if (v !== undefined && got[k] !== v) bad.push(k);
  }
  return bad;
}

function fingerprint(kind: Kind, o: Record<string, any>): string {
  const e = essence(kind, o) as any;
  const vals = Object.entries(e.values ?? {}).map(([k, v]) => `${k}=${numNorm(String(v))}`).sort();
  // Program stage is left out: the server always returns it, the input may omit it.
  return sha256(kind === 'event' ? [e.program, e.orgUnit, e.occurredAt, vals] : [e.trackedEntityType, e.orgUnit, vals]);
}

/** Copy the input, give every record an id, and list the records. */
function normalise(input: Record<string, unknown>): { payload: Record<string, unknown[]>; recs: Rec[]; problems: string[] } {
  const problems: string[] = [];
  const recs: Rec[] = [];
  const seen = new Set<string>();
  const take = (kind: Kind, o: any, at: string, parent?: { enrollment?: string; program?: string; trackedEntity?: string }) => {
    if (!o || typeof o !== 'object' || Array.isArray(o)) { problems.push(`${at} must be an object.`); return; }
    const idField = kind;
    const supplied = o[idField] !== undefined;
    if (supplied && !isUid(o[idField])) { problems.push(`${at}.${idField} must be an 11-character id if given.`); return; }
    if (!supplied) o[idField] = generateUid();
    if (seen.has(o[idField])) { problems.push(`${at}: id ${o[idField]} appears twice.`); return; }
    seen.add(o[idField]);
    if (!isUid(o.orgUnit)) problems.push(`${at}.orgUnit must be an 11-character id.`);
    if (kind === 'trackedEntity') {
      if (!isUid(o.trackedEntityType)) problems.push(`${at}.trackedEntityType is required.`);
      (Array.isArray(o.enrollments) ? o.enrollments : []).forEach((e: any, j: number) => take('enrollment', e, `${at}.enrollments[${j}]`, { trackedEntity: o.trackedEntity }));
    } else if (kind === 'enrollment') {
      if (!isUid(o.program)) problems.push(`${at}.program is required.`);
      if (typeof o.enrolledAt !== 'string' || !DATE_RE.test(o.enrolledAt)) problems.push(`${at}.enrolledAt must be a date (YYYY-MM-DD).`);
      if (!parent && !isUid(o.trackedEntity)) problems.push(`${at}.trackedEntity is required for an enrollment outside a tracked entity.`);
      (Array.isArray(o.events) ? o.events : []).forEach((e: any, j: number) => take('event', e, `${at}.events[${j}]`, { enrollment: o.enrollment, program: o.program }));
    } else {
      if (parent?.program && !o.program) o.program = parent.program;
      if (!isUid(o.program)) problems.push(`${at}.program is required.`);
      if (o.programStage !== undefined && !isUid(o.programStage)) problems.push(`${at}.programStage must be an 11-character id.`);
      if (typeof o.occurredAt !== 'string' || !DATE_RE.test(o.occurredAt)) problems.push(`${at}.occurredAt must be a date (YYYY-MM-DD).`);
      if (o.dataValues !== undefined && !Array.isArray(o.dataValues)) problems.push(`${at}.dataValues must be an array.`);
      for (const dv of Array.isArray(o.dataValues) ? o.dataValues : []) {
        if (!dv || !isUid(dv.dataElement) || dv.value === undefined || dv.value === null || String(dv.value) === '') { problems.push(`${at}: every data value needs a dataElement id and a value (deleting values is not supported).`); break; }
      }
    }
    recs.push({ kind, uid: o[idField], supplied, obj: o, inEnrollment: kind === 'event' && (Boolean(parent?.enrollment) || isUid(o.enrollment)) });
  };
  const payload: Record<string, unknown[]> = {};
  for (const [field, kind] of [['trackedEntities', 'trackedEntity'], ['enrollments', 'enrollment'], ['events', 'event']] as const) {
    const list = input[field];
    if (list === undefined) continue;
    if (!Array.isArray(list)) { problems.push(`${field} must be an array.`); continue; }
    const copy = JSON.parse(JSON.stringify(list));
    copy.forEach((o: any, i: number) => take(kind, o, `${field}[${i}]`));
    if (copy.length) payload[field] = copy;
  }
  if (!recs.length && !problems.length) problems.push('Give trackedEntities, enrollments and/or events.');
  if (recs.length > TRACKER_LIMITS.maxRecords) problems.push(`At most ${TRACKER_LIMITS.maxRecords} records per import (got ${recs.length}); split it.`);
  return { payload, recs, problems };
}

function parseReport(httpStatus: number, r: any): { ok: boolean; text: string; errors: string[] } {
  const errors = (Array.isArray(r?.validationReport?.errorReports) ? r.validationReport.errorReports : []).slice(0, 50)
    .map((e: any) => `${safeText(e?.errorCode ?? '', 10)} ${safeText(e?.trackerType ?? '', 20)} ${safeText(e?.uid ?? '', 11)}: ${safeText(e?.message ?? '', 200)}`);
  const s = r?.stats ?? {};
  const status = String(r?.status ?? 'UNKNOWN');
  return { ok: httpStatus < 400 && status !== 'ERROR' && errors.length === 0, errors,
    text: `${status}${s.total !== undefined ? `: ${Number(s.created ?? 0)} created, ${Number(s.updated ?? 0)} updated, ${Number(s.ignored ?? 0)} ignored` : ''}` };
}

const LABEL: Record<Kind, string> = { trackedEntity: 'tracked entity', enrollment: 'enrollment', event: 'event' };

export const trackerKind: OpKind<DataGateway, Record<string, unknown[]>> = {
  name: 'tracker-data',
  plain: 'import tracker data (individual records)',

  async plan(gw, input) {
    const { payload, recs, problems } = normalise(input);
    if (problems.length) throw new OperationError('invalid', `Data cannot be planned:\n- ${problems.slice(0, 40).join('\n- ')}${problems.length > 40 ? `\n- (+${problems.length - 40} more)` : ''}`);

    // Records whose ids were supplied may already exist: those are updates.
    const existing = await mapLimit(recs, 8, r => (r.supplied ? gw.getTrackerRecord(r.kind, r.uid) : Promise.resolve(null)));
    const targets: OpTarget[] = recs.map((r, i) => {
      const before = existing[i];
      return { key: `${r.kind}/${r.uid}`, label: `${LABEL[r.kind]} ${r.uid}`, action: before ? 'update' as const : 'create' as const,
        intended: essence(r.kind, r.obj), ...(before ? { before: essence(r.kind, before) } : {}) };
    });

    // Duplicate guard for new events and tracked entities.
    const warnings: string[] = [];
    const blocking: string[] = [];
    const dup = new Map<string, string>(); // record key -> reason
    // Events inside an enrollment belong to one person: two people's events may legitimately be
    // identical, so only stand-alone (event program) events and tracked entities are compared.
    const fresh = recs.filter((r, i) => !existing[i] && r.kind !== 'enrollment' && !r.inEnrollment);
    const inImport = new Map<string, string>();
    for (const r of fresh) {
      const fp = fingerprint(r.kind, r.obj);
      const other = inImport.get(fp);
      if (other) dup.set(`${r.kind}/${r.uid}`, `identical to ${other} in this import`); else inImport.set(fp, `${r.kind}/${r.uid}`);
    }
    const groups = new Map<string, Rec[]>();
    for (const r of fresh) {
      const g = r.kind === 'event' ? `event|${r.obj.program}|${r.obj.orgUnit}` : `trackedEntity|${r.obj.trackedEntityType}|${r.obj.orgUnit}`;
      groups.set(g, [...(groups.get(g) ?? []), r]);
    }
    const incomplete: string[] = [];
    await mapLimit([...groups.entries()], 4, async ([g, list]) => {
      const [kind, a, ou] = g.split('|') as [Kind, string, string];
      let found: { records: Array<Record<string, any>>; complete: boolean };
      if (kind === 'event') {
        const dates = list.map(r => String(r.obj.occurredAt).slice(0, 10)).sort();
        found = await gw.findEvents({ program: a, orgUnit: ou, occurredAfter: dates[0]!, occurredBefore: dates[dates.length - 1]! }, TRACKER_LIMITS.duplicateScan);
      } else {
        found = await gw.findTrackedEntities({ trackedEntityType: a, orgUnit: ou }, TRACKER_LIMITS.duplicateScan);
      }
      if (!found.complete) incomplete.push(`${kind === 'event' ? 'events of program' : 'tracked entities of type'} ${a} in ${ou}`);
      const onServer = new Map(found.records.map(x => [fingerprint(kind, x), String(x[kind] ?? '')]));
      for (const r of list) {
        const match = onServer.get(fingerprint(kind, r.obj));
        if (match && !dup.has(`${r.kind}/${r.uid}`)) dup.set(`${r.kind}/${r.uid}`, `identical to existing ${LABEL[kind]} ${match}`);
      }
    });
    for (const t of targets) { const why = dup.get(t.key); if (why) t.detail = `possible duplicate: ${why}`; }
    if (dup.size) {
      const text = `${dup.size} new record(s) look identical to records already on the server or elsewhere in this import (a re-import creates duplicates).`;
      if (input.acknowledgeDuplicates === true) warnings.push(`${text} The person has said they are genuinely new.`);
      else blocking.push(`${text} Ask the person; only if they confirm the records are genuinely new, plan again with acknowledgeDuplicates: true.`);
    }
    if (incomplete.length) warnings.push(`Duplicate check incomplete (more than ${TRACKER_LIMITS.duplicateScan} existing records) for: ${incomplete.slice(0, 5).join('; ')}.`);
    const updates = targets.filter(t => t.action === 'update').length;
    if (updates) warnings.push(`${updates} existing record(s) will be updated.`);

    const counts = (k: Kind) => recs.filter(r => r.kind === k).length;
    const summary = `${counts('trackedEntity')} tracked entit${counts('trackedEntity') === 1 ? 'y' : 'ies'}, ${counts('enrollment')} enrollment(s), ${counts('event')} event(s): ${targets.length - updates} new, ${updates} updated, in ${new Set(recs.map(r => r.obj.orgUnit)).size} org unit(s). All or nothing; nothing is deleted.`;

    let dryRun = { ok: false, summary: 'not run (blocked before validation)', errors: [] as string[] };
    if (!blocking.length) {
      const { httpStatus, report } = await gw.postTracker(payload, 'VALIDATE');
      const p = parseReport(httpStatus, report);
      dryRun = { ok: p.ok, summary: p.text, errors: p.errors };
    }
    return {
      description: String(input.description), payload, targets, skipped: 0, summary, warnings, blocking, dryRun,
      review: ['| Action | Record | Program / type | Org unit | Date | Values | Note |', '|---|---|---|---|---|---|---|',
        ...recs.map((r, i) => {
          const e = essence(r.kind, r.obj) as any;
          return `| ${targets[i]!.action} | ${LABEL[r.kind]} ${r.uid} | ${e.program ?? e.trackedEntityType} | ${e.orgUnit} | ${e.occurredAt ?? e.enrolledAt ?? ''} | ${
            Object.entries(e.values ?? {}).map(([k, v]) => `${k}=${safeText(v, 40)}`).join('; ').replace(/\|/g, '/')} | ${safeText(targets[i]!.detail ?? '', 80).replace(/\|/g, '/')} |`;
        })].join('\n'),
    };
  },

  async drift(gw, op) {
    const out: string[] = [];
    await mapLimit(op.targets.filter(t => t.before !== undefined), 8, async t => {
      const [kind, uid] = t.key.split('/') as [Kind, string];
      const cur = await gw.getTrackerRecord(kind, uid);
      if (!cur || sha256(essence(kind, cur)) !== sha256(t.before)) out.push(`${t.key} changed since planning`);
    });
    return out;
  },

  async commit(gw, payload) {
    const { httpStatus, report } = await gw.postTracker(payload, 'COMMIT');
    if (httpStatus >= 500) throw new Error(`HTTP ${httpStatus}`);
    const p = parseReport(httpStatus, report);
    return { rejected: !p.ok, summary: p.text, errors: p.errors };
  },

  async readBack(gw, op) {
    let failed = false;
    await mapLimit(op.targets, 8, async t => {
      const [kind, uid] = t.key.split('/') as [Kind, string];
      let cur: Record<string, any> | null;
      try { cur = await gw.getTrackerRecord(kind, uid); } catch { failed = true; return; }
      if (!cur) { t.result = 'missing'; return; }
      const got = essence(kind, cur) as Record<string, any>;
      const bad = essenceMatches(t.intended as Record<string, any>, got);
      if (!bad.length) { t.result = 'verified'; return; }
      if (t.before !== undefined && sha256(got) === sha256(t.before)) { t.result = 'unchanged'; return; }
      t.result = 'mismatch';
      t.detail = `differs in: ${bad.slice(0, 8).join(', ')}`;
    });
    return failed;
  },

  approvalLines(op) {
    return ['These are individual-level records. The review file holds every record and value.'];
  },
};
