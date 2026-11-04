/**
 * Change packages: build-scale changes on a development server with one approval.
 *
 *  1. offline   : shape, limits, forbidden fields, design checks (design-check.ts),
 *                 internal/external reference analysis. Needs no connection.
 *  2. plan      : before-images for updates, absence for creates, external
 *                 references must exist, DHIS2 dry run; writes package.json and a
 *                 plain-language review.md listing every object and field. Saved to disk.
 *  3. apply     : re-hash the package file, re-check every precondition, the person
 *                 approves in the MCP host (summary + review file), re-check again,
 *                 ONE atomic DHIS2 import (DHIS2 orders dependencies itself), read back
 *                 every object. Ambiguous outcomes are reconciled by reading, never re-sent.
 *
 * Production connections never reach here (policy + GET-only transport).
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  FORBIDDEN_FIELDS, canonicalJson, deepFreeze, describeValue, diffFields, isUid, mergeUpdate,
  mismatchedFields, safeText, sha256,
} from './security/plans.js';
import { checkDesign, Finding } from './design-check.js';
import { toSafeErrorMessage } from './security/safe-errors.js';
import type { ApprovalResult, ConnectionIdentity } from './change-engine.js';

export const PACKAGE_OBJECT_TYPES: ReadonlySet<string> = new Set([
  'dataElements', 'dataElementGroups', 'dataElementGroupSets', 'dataSets', 'sections', 'categoryOptions', 'categories',
  'categoryCombos', 'categoryOptionGroups', 'categoryOptionGroupSets', 'indicators', 'indicatorTypes', 'indicatorGroups',
  'organisationUnitGroups', 'organisationUnitGroupSets', 'validationRules', 'validationRuleGroups', 'predictors',
  'programs', 'programStages', 'programStageSections', 'programSections', 'trackedEntityTypes', 'trackedEntityAttributes',
  'programIndicators', 'programIndicatorGroups', 'programRules', 'programRuleVariables', 'programRuleActions',
  'legendSets', 'optionSets', 'options', 'optionGroups', 'visualizations', 'eventVisualizations', 'eventReports',
  'eventCharts', 'maps', 'dashboards', 'constants', 'attributes', 'relationshipTypes',
]);

export const PACKAGE_LIMITS = { maxObjects: 2000, maxBytes: 8 * 1024 * 1024, maxDescription: 300, ttlHours: 24 };

/** Never part of a reference set, even when they look like {id}. */
const REF_KEYS = new Set(['id', 'name', 'displayName', 'code', 'shortName']);
const VOLATILE = new Set(['lastUpdated', 'lastUpdatedBy', 'href', 'access', 'displayName', 'displayShortName',
  'displayDescription', 'displayFormName', 'favorites', 'favorite', 'version', 'created', 'createdBy']);

export interface PackageInput {
  description: string;
  creates?: Record<string, Array<Record<string, unknown>>>;
  updates?: Array<{ objectType: string; id: string; set: Record<string, unknown> }>;
}

export interface OfflineReport {
  ok: boolean;
  problems: string[];          // structural: the package cannot be planned
  findings: Finding[];         // design checks
  counts: Record<string, { create: number; update: number }>;
  externalRefs: string[];      // ids referenced but not defined in the package
  normalized?: { description: string; creates: Record<string, Array<Record<string, unknown>>>; updates: NonNullable<PackageInput['updates']> };
}

/** Collect {id} references (objects made only of identity keys) anywhere below `value`. */
export function collectRefs(value: unknown, out: Set<string>, top = true): void {
  if (Array.isArray(value)) { for (const v of value) collectRefs(v, out, false); return; }
  if (!value || typeof value !== 'object') return;
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o);
  if (!top && isUid(o.id) && keys.every(k => REF_KEYS.has(k))) { out.add(o.id as string); return; }
  for (const [k, v] of Object.entries(o)) if (k !== 'id') collectRefs(v, out, false);
}

/** Ids of nested objects defined inline (owned), e.g. programStageDataElements, legends. */
function collectInlineIds(value: unknown, out: Set<string>, top = true): void {
  if (Array.isArray(value)) { for (const v of value) collectInlineIds(v, out, false); return; }
  if (!value || typeof value !== 'object') return;
  const o = value as Record<string, unknown>;
  if (!top && isUid(o.id) && !Object.keys(o).every(k => REF_KEYS.has(k))) out.add(o.id as string);
  for (const [k, v] of Object.entries(o)) if (k !== 'id') collectInlineIds(v, out, false);
}

function forbiddenIn(obj: Record<string, unknown>): string[] {
  return Object.keys(obj).filter(k => k !== 'id' && FORBIDDEN_FIELDS.has(k));
}

export function checkPackageOffline(input: unknown): OfflineReport {
  const problems: string[] = [];
  const counts: OfflineReport['counts'] = {};
  const bump = (t: string, k: 'create' | 'update') => { (counts[t] ??= { create: 0, update: 0 })[k]++; };
  if (!input || typeof input !== 'object') return { ok: false, problems: ['Arguments must be an object.'], findings: [], counts, externalRefs: [] };
  const a = input as Record<string, unknown>;
  const description = typeof a.description === 'string' ? a.description.trim() : '';
  if (!description) problems.push('description is required: say what the package builds and why.');
  else if (description.length > PACKAGE_LIMITS.maxDescription) problems.push(`description must be at most ${PACKAGE_LIMITS.maxDescription} characters.`);
  const creates = (a.creates ?? {}) as Record<string, unknown>;
  const updates = (a.updates ?? []) as unknown;
  if (typeof creates !== 'object' || Array.isArray(creates)) problems.push('creates must be an object of {collection: [objects]}.');
  if (!Array.isArray(updates)) problems.push('updates must be an array of {objectType, id, set}.');
  if (problems.length) return { ok: false, problems, findings: [], counts, externalRefs: [] };

  let bytes = 0;
  try { bytes = Buffer.byteLength(JSON.stringify({ creates, updates })); } catch { problems.push('Package is not valid JSON.'); }
  if (bytes > PACKAGE_LIMITS.maxBytes) problems.push(`Package is ${(bytes / 1048576).toFixed(1)} MB (limit ${PACKAGE_LIMITS.maxBytes / 1048576} MB); split it.`);

  const defined = new Set<string>();
  const seen = new Set<string>();
  let total = 0;
  const cleanCreates: Record<string, Array<Record<string, unknown>>> = {};
  for (const [type, list] of Object.entries(creates)) {
    if (!PACKAGE_OBJECT_TYPES.has(type)) { problems.push(`creates.${type}: not a supported collection.`); continue; }
    if (!Array.isArray(list)) { problems.push(`creates.${type} must be an array.`); continue; }
    list.forEach((o, i) => {
      const at = `creates.${type}[${i}]`;
      if (!o || typeof o !== 'object' || Array.isArray(o)) { problems.push(`${at} must be an object.`); return; }
      const obj = o as Record<string, unknown>;
      if (!isUid(obj.id)) { problems.push(`${at} needs an id (11-character UID) so other objects in the package can reference it; use dhis2_generate_uids.`); return; }
      if (seen.has(obj.id as string)) problems.push(`${at}: id ${obj.id} is used twice in the package.`);
      seen.add(obj.id as string);
      defined.add(obj.id as string);
      collectInlineIds(obj, defined);
      for (const f of forbiddenIn(obj)) problems.push(`${at}: field "${f}" cannot be set (identity, ownership or sharing).`);
      (cleanCreates[type] ??= []).push(obj);
      bump(type, 'create');
      total++;
    });
  }
  const cleanUpdates: NonNullable<PackageInput['updates']> = [];
  (updates as unknown[]).forEach((u, i) => {
    const at = `updates[${i}]`;
    const ch = u as Record<string, unknown>;
    if (!ch || typeof ch !== 'object') { problems.push(`${at} must be an object.`); return; }
    if (typeof ch.objectType !== 'string' || !PACKAGE_OBJECT_TYPES.has(ch.objectType)) { problems.push(`${at}.objectType is not a supported collection.`); return; }
    if (!isUid(ch.id)) { problems.push(`${at}.id must be an 11-character UID.`); return; }
    if (seen.has(ch.id)) problems.push(`${at}: ${ch.id} appears more than once in the package; combine the fields.`);
    seen.add(ch.id);
    if (!ch.set || typeof ch.set !== 'object' || Array.isArray(ch.set) || !Object.keys(ch.set).length) { problems.push(`${at}.set must be a non-empty object.`); return; }
    for (const f of forbiddenIn(ch.set as Record<string, unknown>)) problems.push(`${at}: field "${f}" cannot be changed (identity, ownership or sharing).`);
    if ('id' in (ch.set as object)) problems.push(`${at}: set may not change the id.`);
    cleanUpdates.push({ objectType: ch.objectType, id: ch.id, set: ch.set as Record<string, unknown> });
    bump(ch.objectType, 'update');
    total++;
  });
  if (total === 0) problems.push('The package is empty.');
  if (total > PACKAGE_LIMITS.maxObjects) problems.push(`The package has ${total} objects (limit ${PACKAGE_LIMITS.maxObjects}); split it.`);

  const refs = new Set<string>();
  for (const list of Object.values(cleanCreates)) for (const o of list) collectRefs(o, refs);
  for (const u of cleanUpdates) collectRefs(u.set, refs);
  const updatedIds = new Set(cleanUpdates.map(u => u.id));
  const externalRefs = [...refs].filter(r => !defined.has(r) && !updatedIds.has(r)).sort();

  // Design checks run on what the creates + the update sets describe (updates are partial, so
  // only creates get the full rule set).
  const findings = checkDesign(cleanCreates as any);
  const ok = problems.length === 0 && !findings.some(f => f.severity === 'error');
  return { ok, problems, findings, counts, externalRefs, ...(problems.length ? {} : { normalized: { description, creates: cleanCreates, updates: cleanUpdates } }) };
}

// ---------------------------------------------------------------------------------------------

export interface PackageGateway {
  baseURL: string;
  getOwnerObject(objectType: string, id: string): Promise<Record<string, unknown> | null>;
  identifiableObjectExists(id: string): Promise<boolean>;
  postMetadata(payload: Record<string, unknown[]>, mode: 'VALIDATE' | 'COMMIT'): Promise<{ httpStatus: number; report: any }>;
}

export type PackageState = 'validated' | 'invalid' | 'applying' | 'verified' | 'partial' | 'not-applied' | 'failed'
  | 'applied-unverified' | 'unknown-outcome' | 'stale' | 'declined' | 'expired' | 'cancelled';
const OPEN: ReadonlySet<PackageState> = new Set(['validated']);

interface PkgTarget {
  action: 'create' | 'update'; objectType: string; id: string; label: string;
  fields: string[];                         // creates: all fields; updates: changed fields
  intended: Record<string, unknown>;
  preserved?: Record<string, unknown>;
  beforeHash?: string;                      // updates only
  result?: 'verified' | 'mismatch' | 'missing' | 'unchanged'; mismatchedFields?: string[]; collateralChanges?: string[];
}

export interface ChangePackage {
  id: string;
  owner: ConnectionIdentity;
  description: string;
  createdAt: string;
  expiresAt: string;
  state: PackageState;
  payloadHash: string;
  targets: PkgTarget[];
  findings: Finding[];
  validation: { status: string; errors: string[]; total: number };
  dir: string;
  files: { package: string; review: string; receipt?: string };
  note?: string;
}

export interface PackageDeps {
  gateway: () => PackageGateway | null;
  identity: () => ConnectionIdentity | null;
  approve: (message: string) => Promise<ApprovalResult>;
  baseDir: () => string;
  now?: () => Date;
}

export class PackageError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = 'PackageError'; }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]!); }
  }));
  return out;
}

function parseReport(report: any): { status: string; errors: string[]; total: number } {
  const status = typeof report?.status === 'string' ? report.status : 'UNKNOWN';
  const total = Number(report?.stats?.total ?? 0);
  const errors: string[] = [];
  for (const tr of Array.isArray(report?.typeReports) ? report.typeReports : []) {
    for (const or of Array.isArray(tr?.objectReports) ? tr.objectReports : []) {
      for (const er of Array.isArray(or?.errorReports) ? or.errorReports : []) {
        if (errors.length < 50) errors.push(`${safeText(er?.errorCode ?? 'E????', 10)} ${safeText(tr?.klass?.split('.').pop() ?? '', 30)} ${safeText(or?.uid ?? '', 11)}: ${safeText(er?.message ?? '', 200)}`);
      }
    }
  }
  return { status, errors, total };
}

function sameOwner(a: ConnectionIdentity, b: ConnectionIdentity): boolean {
  return a.userId === b.userId && a.origin === b.origin && a.profile === b.profile;
}

export class PackageEngine {
  private packages = new Map<string, ChangePackage>();
  constructor(private deps: PackageDeps) {}
  private now(): Date { return this.deps.now ? this.deps.now() : new Date(); }

  private conn() {
    const gw = this.deps.gateway(); const who = this.deps.identity();
    if (!gw || !who) throw new PackageError('not_connected', 'No verified DHIS2 connection.');
    if (who.environment === 'production') throw new PackageError('production_read_only', 'Production is read-only; build on development and use dhis2_prepare_transfer.');
    return { gw, who };
  }

  private save(p: ChangePackage): void { fs.writeFileSync(path.join(p.dir, 'package-state.json'), JSON.stringify(p, null, 2), 'utf8'); }

  private load(id: string): ChangePackage | undefined {
    try {
      const dir = path.join(this.deps.baseDir(), 'packages', id);
      const p = JSON.parse(fs.readFileSync(path.join(dir, 'package-state.json'), 'utf8')) as ChangePackage;
      this.packages.set(id, p);
      return p;
    } catch { return undefined; }
  }

  private owned(id: unknown): ChangePackage {
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) throw new PackageError('unknown_package', 'Unknown package id.');
    const p = this.packages.get(id) ?? this.load(id);
    if (!p) throw new PackageError('unknown_package', 'Unknown package id.');
    const who = this.deps.identity();
    if (!who || !sameOwner(p.owner, who)) throw new PackageError('wrong_session', 'This package belongs to a different connection or user.');
    if (p.state === 'validated' && this.now() > new Date(p.expiresAt)) { p.state = 'expired'; this.save(p); }
    return p;
  }

  private readPayload(p: ChangePackage): Record<string, unknown[]> | null {
    try {
      const payload = JSON.parse(fs.readFileSync(p.files.package, 'utf8'));
      return sha256(payload) === p.payloadHash ? payload : null;
    } catch { return null; }
  }

  async plan(input: unknown): Promise<{ pkg?: ChangePackage; offline: OfflineReport }> {
    const offline = checkPackageOffline(input);
    if (!offline.ok || !offline.normalized) return { offline };
    const { gw, who } = this.conn();
    const { description, creates, updates } = offline.normalized;
    const problems: string[] = [];

    // External references must already exist on the server.
    const missingRefs: string[] = [];
    await mapLimit(offline.externalRefs, 8, async id => { if (!(await gw.identifiableObjectExists(id))) missingRefs.push(id); });
    if (missingRefs.length) problems.push(`Referenced but neither in the package nor on the server: ${missingRefs.sort().slice(0, 30).join(', ')}${missingRefs.length > 30 ? ` (+${missingRefs.length - 30})` : ''}.`);

    const targets: PkgTarget[] = [];
    const payload: Record<string, Array<Record<string, unknown>>> = {};
    const createList = Object.entries(creates).flatMap(([t, l]) => l.map(o => ({ t, o })));
    const exists = await mapLimit(createList, 8, async ({ t, o }) => Boolean(await gw.getOwnerObject(t, o.id as string)));
    createList.forEach(({ t, o }, i) => {
      if (exists[i]) { problems.push(`${t}/${o.id} already exists; put it under updates instead.`); return; }
      const obj = JSON.parse(JSON.stringify(o));
      (payload[t] ??= []).push(obj);
      const { id: _id, ...fields } = obj;
      targets.push({ action: 'create', objectType: t, id: obj.id, label: String(obj.name ?? obj.code ?? ''), fields: Object.keys(fields), intended: fields });
    });
    const befores = await mapLimit(updates, 8, u => gw.getOwnerObject(u.objectType, u.id));
    updates.forEach((u, i) => {
      const before = befores[i];
      if (!before) { problems.push(`${u.objectType}/${u.id} does not exist (or is not visible to this user).`); return; }
      const diffs = diffFields(before, u.set);
      if (!diffs.length) { problems.push(`${u.objectType}/${u.id}: none of the requested fields would change.`); return; }
      const changed = Object.fromEntries(diffs.map(d => [d.field, u.set[d.field]]));
      (payload[u.objectType] ??= []).push(mergeUpdate(before, changed));
      const preserved = Object.fromEntries(Object.entries(before).filter(([k]) => !(k in changed) && !VOLATILE.has(k)));
      targets.push({ action: 'update', objectType: u.objectType, id: u.id, label: String(before.name ?? before.displayName ?? ''),
        fields: Object.keys(changed), intended: changed, preserved, beforeHash: sha256(before) });
    });
    if (problems.length) throw new PackageError('invalid_package', `Package cannot be planned:\n- ${problems.join('\n- ')}`);
    const findings = [...offline.findings, ...planFindings(creates, updates, befores)];

    const expected = targets.length;
    const { httpStatus, report } = await gw.postMetadata(payload, 'VALIDATE');
    const parsed = parseReport(report);
    let state: PackageState = 'validated';
    if (httpStatus >= 400 || parsed.status === 'ERROR' || parsed.errors.length) state = 'invalid';
    else if (parsed.total !== expected) { state = 'invalid'; parsed.errors.push(`DHIS2 counted ${parsed.total} object(s), expected ${expected}.`); }

    const id = randomUUID();
    const dir = path.join(this.deps.baseDir(), 'packages', id);
    fs.mkdirSync(dir, { recursive: true });
    const created = this.now();
    const p: ChangePackage = {
      id, owner: { ...who }, description, createdAt: created.toISOString(),
      expiresAt: new Date(created.getTime() + PACKAGE_LIMITS.ttlHours * 3600_000).toISOString(),
      state, payloadHash: sha256(payload), targets, findings,
      validation: { status: parsed.status, errors: parsed.errors, total: parsed.total },
      dir, files: { package: path.join(dir, 'package.json'), review: path.join(dir, 'review.md') },
    };
    fs.writeFileSync(p.files.package, canonicalJson(payload), 'utf8');
    fs.writeFileSync(p.files.review, renderReview(p), 'utf8');
    deepFreeze(p.targets.map(t => t.intended));
    this.packages.set(id, p);
    this.save(p);
    return { pkg: p, offline };
  }

  private async drift(gw: PackageGateway, p: ChangePackage): Promise<string[]> {
    const out: string[] = [];
    await mapLimit(p.targets, 8, async t => {
      const cur = await gw.getOwnerObject(t.objectType, t.id);
      if (t.action === 'create' && cur) out.push(`${t.objectType}/${t.id} now exists`);
      if (t.action === 'update' && (!cur || sha256(cur) !== t.beforeHash)) out.push(`${t.objectType}/${t.id} changed since planning`);
    });
    return out.sort();
  }

  async apply(id: unknown): Promise<ChangePackage> {
    const { gw } = this.conn();
    const p = this.owned(id);
    if (!OPEN.has(p.state)) throw new PackageError('invalid_state', `Package is "${p.state}" and cannot be applied${p.state === 'expired' || p.state === 'stale' ? '; plan it again' : ''}.`);
    const payload = this.readPayload(p);
    if (!payload) { p.state = 'stale'; this.save(p); throw new PackageError('tampered', 'The package file no longer matches what was planned. Nothing was sent; plan it again.'); }
    p.state = 'applying';
    let d: string[];
    try { d = await this.drift(gw, p); } catch (e) { p.state = 'validated'; throw e; }
    if (d.length) { p.state = 'stale'; this.save(p); throw new PackageError('stale', `Nothing was sent: ${d.slice(0, 10).join('; ')}${d.length > 10 ? ` (+${d.length - 10})` : ''}. Plan it again.`); }

    let answer: ApprovalResult;
    try { answer = await this.deps.approve(approvalMessage(p)); } catch { answer = 'unavailable'; }
    if (answer !== 'accept') {
      p.state = answer === 'unavailable' ? 'validated' : 'declined';
      this.save(p);
      throw new PackageError(answer === 'unavailable' ? 'no_approval_channel' : 'declined', answer === 'unavailable'
        ? 'The MCP host did not show the approval to the person. Nothing was sent.'
        : 'The person did not approve this package. Nothing was sent. Do not retry without new direction.');
    }
    if (this.now() > new Date(p.expiresAt)) { p.state = 'expired'; this.save(p); throw new PackageError('expired', 'Package expired before approval completed. Nothing was sent.'); }
    try { d = await this.drift(gw, p); } catch (e) { p.state = 'validated'; this.save(p); throw e; }
    if (d.length) { p.state = 'stale'; this.save(p); throw new PackageError('stale', `Changed during approval: ${d.slice(0, 10).join('; ')}. Nothing was sent.`); }

    this.save({ ...p, state: 'unknown-outcome' }); // crash during commit → reconcile by reading on next look
    let commit: { httpStatus: number; report: any };
    try {
      commit = await gw.postMetadata(payload, 'COMMIT');
    } catch (e) {
      p.state = 'unknown-outcome';
      await this.reconcile(gw, p, `Commit outcome unknown (${toSafeErrorMessage(e)}); reconciled by reading. Nothing was re-sent.`);
      return p;
    }
    const parsed = parseReport(commit.report);
    if (commit.httpStatus >= 400 || parsed.status === 'ERROR') {
      p.validation = { ...p.validation, errors: parsed.errors };
      await this.reconcile(gw, p, `DHIS2 rejected the import (HTTP ${commit.httpStatus}); atomic mode means nothing should have changed.`, true);
      return p;
    }
    await this.reconcile(gw, p);
    return p;
  }

  private async reconcile(gw: PackageGateway, p: ChangePackage, note?: string, rejected = false): Promise<void> {
    let readFailed = false;
    await mapLimit(p.targets, 8, async t => {
      let actual: Record<string, unknown> | null = null;
      try { actual = await gw.getOwnerObject(t.objectType, t.id); } catch { readFailed = true; return; }
      delete t.mismatchedFields; delete t.collateralChanges;
      if (!actual) { t.result = 'missing'; return; }
      const mism = mismatchedFields(t.intended, actual);
      const coll = t.preserved ? mismatchedFields(t.preserved, actual) : [];
      if (!mism.length && !coll.length) t.result = 'verified';
      else if (t.action === 'update' && sha256(actual) === t.beforeHash) t.result = 'unchanged';
      else { t.result = 'mismatch'; if (mism.length) t.mismatchedFields = mism; if (coll.length) t.collateralChanges = coll; }
    });
    const n = p.targets.length;
    const verified = p.targets.filter(t => t.result === 'verified').length;
    const untouched = p.targets.filter(t => t.result === 'unchanged' || (t.result === 'missing' && t.action === 'create')).length;
    p.state = readFailed ? 'unknown-outcome' : verified === n ? 'verified' : untouched === n ? (rejected ? 'failed' : 'not-applied')
      : verified > 0 ? 'partial' : 'applied-unverified';
    if (note) p.note = note;
    p.files.receipt = path.join(p.dir, 'receipt.json');
    fs.writeFileSync(p.files.receipt, JSON.stringify({
      packageId: p.id, payloadHash: p.payloadHash, state: p.state, checkedAt: this.now().toISOString(), note: p.note,
      targets: p.targets.map(t => ({ action: t.action, objectType: t.objectType, id: t.id, result: t.result,
        ...(t.mismatchedFields ? { mismatchedFields: t.mismatchedFields } : {}), ...(t.collateralChanges ? { collateralChanges: t.collateralChanges } : {}) })),
    }, null, 2), 'utf8');
    this.save(p);
  }

  async get(id: unknown): Promise<ChangePackage> {
    const p = this.owned(id);
    if (p.state === 'unknown-outcome' || p.state === 'applying') {
      const gw = this.deps.gateway();
      if (gw) await this.reconcile(gw, p, 'Reconciled by reading after an interrupted or unknown commit; nothing was re-sent.');
    }
    return p;
  }

  cancel(id: unknown): ChangePackage {
    const p = this.owned(id);
    if (p.state !== 'validated') throw new PackageError('invalid_state', `Package is "${p.state}" and cannot be cancelled.`);
    p.state = 'cancelled';
    this.save(p);
    return p;
  }
}

/**
 * Warnings that need the server's current state:
 *  - an update that drops items from an owned collection (DHIS2 deletes owned children,
 *    e.g. rule actions, stage data elements, sections);
 *  - rule/stage changes to a program whose version is not bumped (Capture reloads
 *    rules and forms only when the program version changes).
 */
export function planFindings(
  creates: Record<string, Array<Record<string, unknown>>>,
  updates: NonNullable<PackageInput['updates']>,
  befores: Array<Record<string, unknown> | null>,
): Finding[] {
  const out: Finding[] = [];
  const idsIn = (v: unknown): string[] => Array.isArray(v) ? v.map(x => (x && typeof x === 'object' && isUid((x as any).id) ? (x as any).id : undefined)).filter(Boolean) as string[] : [];
  updates.forEach((u, i) => {
    const before = befores[i];
    if (!before) return;
    for (const [field, after] of Object.entries(u.set)) {
      if (!Array.isArray(after) || !Array.isArray(before[field])) continue;
      const keep = new Set(idsIn(after));
      const dropped = idsIn(before[field]).filter(x => !keep.has(x));
      if (dropped.length) out.push({ severity: 'warning', rule: 'owned-collection-removal', objectType: u.objectType, id: u.id, name: String(before.name ?? ''),
        message: `Removes ${dropped.length} item(s) from ${field}. For owned collections (rule actions, stage data elements, sections) DHIS2 deletes the removed items. Confirm this is intended.` });
    }
  });
  const touched = new Set<string>();
  const progOf = (o: any) => (o?.program && isUid(o.program.id) ? o.program.id : undefined);
  for (const t of ['programRules', 'programRuleVariables', 'programStages', 'programStageSections'] as const) {
    for (const o of creates[t] ?? []) { const p = progOf(o); if (p) touched.add(p); }
  }
  updates.forEach((u, i) => {
    if (['programRules', 'programRuleVariables', 'programRuleActions', 'programStages', 'programStageSections'].includes(u.objectType)) {
      const p = progOf(befores[i]) ?? progOf(u.set); if (p) touched.add(p);
    }
  });
  const created = new Set((creates.programs ?? []).map(p => p.id as string));
  const bumped = new Set(updates.filter(u => u.objectType === 'programs' && 'version' in u.set).map(u => u.id));
  for (const p of touched) {
    if (!created.has(p) && !bumped.has(p)) out.push({ severity: 'warning', rule: 'program-version-bump', objectType: 'programs', id: p,
      message: 'Rules or forms of this existing program change, but its version is not increased. Capture keeps its cached rules and forms until the version changes; add an update {objectType: programs, set: {version: current + 1}}.' });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------

const ORDER = ['optionSets', 'options', 'categoryOptions', 'categories', 'categoryCombos', 'legendSets', 'attributes',
  'trackedEntityAttributes', 'trackedEntityTypes', 'dataElements', 'dataElementGroups', 'dataSets', 'sections', 'programs',
  'programStages', 'programStageSections', 'programRuleVariables', 'programRules', 'programRuleActions', 'indicatorTypes',
  'indicators', 'programIndicators', 'validationRules', 'constants', 'visualizations', 'eventVisualizations', 'maps', 'dashboards'];
const rank = (t: string) => { const i = ORDER.indexOf(t); return i < 0 ? ORDER.length : i; };

export function countsByType(targets: PkgTarget[]): string {
  const m = new Map<string, { c: number; u: number }>();
  for (const t of targets) { const e = m.get(t.objectType) ?? { c: 0, u: 0 }; t.action === 'create' ? e.c++ : e.u++; m.set(t.objectType, e); }
  return [...m.entries()].sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([t, e]) => `${t}: ${[e.c ? `${e.c} new` : '', e.u ? `${e.u} updated` : ''].filter(Boolean).join(', ')}`).join('; ');
}

export function approvalMessage(p: ChangePackage): string {
  const c = p.targets.filter(t => t.action === 'create').length;
  const u = p.targets.length - c;
  const warn = p.findings.filter(f => f.severity === 'warning').length;
  return [
    `Allow the assistant to apply this package to the ${safeText(p.owner.environment ?? 'connected', 20)} server ${p.owner.origin}?`,
    `In short: ${c} new and ${u} updated object(s). Nothing will be deleted and no sharing will change.`,
    `By type: ${countsByType(p.targets)}.`,
    `Purpose given by the assistant (unverified): "${safeText(p.description, 200)}"`,
    `DHIS2 dry run: ${p.validation.status}, ${p.validation.total} object(s), 0 errors.${warn ? ` ${warn} design warning(s) are listed in the review.` : ''}`,
    `Every object and field is listed in: ${p.files.review}`,
    `Package ${p.id.slice(0, 8)}, sha256 ${p.payloadHash.slice(0, 16)}. Approve only if the review matches what you asked for.`,
  ].join('\n');
}

export function renderReview(p: ChangePackage): string {
  const sorted = [...p.targets].sort((a, b) => rank(a.objectType) - rank(b.objectType) || a.label.localeCompare(b.label));
  const lines = [
    `# Change package review: ${safeText(p.description, 200)}`, '',
    `Server: **${p.owner.origin}** (${p.owner.environment ?? 'unknown'}), signed in as ${safeText(p.owner.username, 40)}.`,
    `Planned ${p.createdAt}; expires ${p.expiresAt}. Fingerprint (sha256): \`${p.payloadHash}\`.`, '',
    '## In short', '',
    `- ${p.targets.filter(t => t.action === 'create').length} new object(s), ${p.targets.filter(t => t.action === 'update').length} updated.`,
    `- ${countsByType(p.targets)}.`,
    '- Applied as one all-or-nothing import. Nothing is deleted; sharing is not changed.',
    `- DHIS2 dry run: ${p.validation.status}${p.validation.errors.length ? `, ${p.validation.errors.length} error(s)` : ', no errors'}.`, '',
  ];
  if (p.validation.errors.length) lines.push('## DHIS2 dry-run errors', '', ...p.validation.errors.map(e => `- ${e}`), '');
  if (p.findings.length) {
    lines.push('## Design checks', '');
    for (const f of p.findings) lines.push(`- **${f.severity}** [${f.rule}] ${f.objectType}${f.id ? `/${f.id}` : ''}${f.name ? ` "${safeText(f.name, 60)}"` : ''}: ${f.message}`);
    lines.push('');
  }
  lines.push('## Every object', '');
  let current = '';
  for (const t of sorted) {
    if (t.objectType !== current) { current = t.objectType; lines.push('', `### ${current}`, ''); }
    lines.push(`- **${t.action}** \`${t.id}\` ${t.label ? `"${safeText(t.label, 80)}"` : ''}`);
    for (const f of t.fields) {
      if (t.action === 'update') lines.push(`  - ${f}: → ${describeValue(t.intended[f], 120)}`);
      else if (!['name'].includes(f)) lines.push(`  - ${f}: ${describeValue(t.intended[f], 120)}`);
    }
  }
  return lines.join('\n');
}

export function describePackage(p: ChangePackage): string {
  const lines = [
    `Package ${p.id}`, `State: ${p.state}`, `Objects: ${p.targets.length} (${countsByType(p.targets)})`,
    `DHIS2 dry run: ${p.validation.status}, ${p.validation.errors.length} error(s)`,
    ...(p.validation.errors.length ? p.validation.errors.slice(0, 20).map(e => `  - ${e}`) : []),
    `Design warnings: ${p.findings.filter(f => f.severity === 'warning').length}`,
    `Review: ${p.files.review}`, `Package file: ${p.files.package}`,
    ...(p.files.receipt ? [`Receipt: ${p.files.receipt}`] : []), ...(p.note ? [`Note: ${p.note}`] : []),
  ];
  if (p.targets.some(t => t.result)) {
    const r: Record<string, number> = {};
    for (const t of p.targets) if (t.result) r[t.result] = (r[t.result] ?? 0) + 1;
    lines.push(`Read-back: ${Object.entries(r).map(([k, n]) => `${n} ${k}`).join(', ')}`);
    for (const t of p.targets.filter(t => t.result === 'mismatch' || t.result === 'missing').slice(0, 20)) {
      lines.push(`  - ${t.objectType}/${t.id}: ${t.result}${t.mismatchedFields ? ` (${t.mismatchedFields.join(', ')})` : ''}${t.collateralChanges ? ` collateral: ${t.collateralChanges.join(', ')}` : ''}`);
    }
  }
  if (p.state === 'validated') lines.push('', 'Next: show the person the review file, then call dhis2_apply_package. They approve in their MCP host; your arguments cannot approve it.');
  if (p.state === 'invalid') lines.push('', 'Fix the DHIS2 errors and plan a new package.');
  return lines.join('\n');
}
