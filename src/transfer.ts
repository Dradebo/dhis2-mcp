/**
 * Development → production transfer, without the MCP ever writing to production.
 *
 *  prepare  : export the approved objects and their metadata dependencies from the
 *             development (or training) connection; strip sharing, users and other
 *             environment-specific references; compare every object against the
 *             target instance read-only (new / changed / identical / conflict);
 *             write package.json + a plain-language review.md.
 *  approve  : re-export from development and re-hash the package file (so neither
 *             development drift nor file tampering goes unnoticed); the person approves
 *             in the MCP host; an approval record and admin instructions are written.
 *  verify   : after a production administrator imports the approved file, read the
 *             target back and confirm it matches the package.
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { canonicalJson, deepFreeze, isUid, mismatchedFields, safeText, sha256 } from './security/plans.js';
import type { ApprovalResult, ConnectionIdentity } from './change-engine.js';

export const TRANSFER_ROOT_TYPES: ReadonlySet<string> = new Set([
  'programs', 'programStages', 'trackedEntityTypes', 'trackedEntityAttributes', 'dataSets', 'dataElements',
  'dataElementGroups', 'categoryCombos', 'categories', 'categoryOptions', 'optionSets', 'indicators', 'indicatorGroups',
  'programIndicators', 'programRules', 'validationRules', 'legendSets', 'visualizations', 'eventVisualizations',
  'maps', 'dashboards', 'constants', 'organisationUnitGroups',
]);

/** Environment-specific collections: never transferred, only reported. */
const NOT_TRANSFERRED: Record<string, string> = {
  users: 'user accounts differ between servers',
  userRoles: 'user roles are managed per server',
  userGroups: 'user groups are managed per server',
  organisationUnits: 'organisation units are managed per server',
  organisationUnitLevels: 'organisation unit levels are managed per server',
};

/** Top-level keys removed from every transferred object (never nested keys). */
const STRIP_TOP_LEVEL = ['sharing', 'publicAccess', 'externalAccess', 'userAccesses', 'userGroupAccesses', 'access',
  'href', 'user', 'createdBy', 'lastUpdatedBy', 'favorites', 'favorite'];
/** Org unit assignments on these collections refer to development org units; they are removed. */
const STRIP_ORG_UNIT_ASSIGNMENTS = new Set(['programs', 'dataSets']);
const COMPARE_IGNORE = new Set([...STRIP_TOP_LEVEL, 'lastUpdated', 'created', 'organisationUnits', 'displayName',
  'displayShortName', 'displayDescription', 'displayFormName', 'version', 'translations']);

const LIMITS = { maxRoots: 50, maxObjects: 5000 };

export interface SourceGateway {
  baseURL: string;
  getDependencyExport(objectType: string, id: string): Promise<Record<string, unknown> | null>;
}
export interface TargetGateway {
  baseURL: string;
  readOnly: boolean;
  getOwnerObject(objectType: string, id: string): Promise<Record<string, unknown> | null>;
  findIdsByField(objectType: string, field: 'code' | 'name', value: string): Promise<string[]>;
}
export interface TargetConnection { gw: TargetGateway; profile: string; environment: string; origin: string }

export type TransferState = 'prepared' | 'approved' | 'declined' | 'stale' | 'verified' | 'partially-imported' | 'not-imported';
export type ItemStatus = 'new' | 'changed' | 'identical' | 'conflict' | 'unknown';

export interface TransferItem {
  objectType: string; id: string; name: string; status: ItemStatus;
  changedFields?: string[]; conflictWith?: string[];
  verify?: 'match' | 'missing' | 'differs'; verifyFields?: string[];
}

export interface Transfer {
  id: string;
  owner: ConnectionIdentity;
  description: string;
  roots: Array<{ objectType: string; id: string }>;
  sourceOrigin: string;
  target: { profile: string; environment: string; origin: string };
  createdAt: string;
  state: TransferState;
  packageHash: string;
  items: TransferItem[];
  notTransferred: Array<{ what: string; count: number; reason: string }>;
  dir: string;
  files: { package: string; review: string; approval?: string; adminInstructions?: string; verification?: string };
  pkg: Record<string, Array<Record<string, unknown>>>;
}

export interface TransferDeps {
  source: () => { gw: SourceGateway; who: ConnectionIdentity; environment: string | null } | null;
  openTarget: (profile: string | undefined) => Promise<TargetConnection>;
  approve: (message: string) => Promise<ApprovalResult>;
  baseDir: () => string;
  now?: () => Date;
}

export class TransferError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = 'TransferError'; }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]!); }
  }));
  return out;
}

function sameOwner(a: ConnectionIdentity, b: ConnectionIdentity): boolean {
  return a.userId === b.userId && a.origin === b.origin && a.profile === b.profile;
}

const PLAIN: Record<string, string> = { new: 'new', changed: 'changed', identical: 'already identical', conflict: 'conflicting', unknown: 'not checked' };

export class TransferEngine {
  private transfers = new Map<string, Transfer>();
  constructor(private deps: TransferDeps) {}
  private now(): Date { return this.deps.now ? this.deps.now() : new Date(); }

  private requireSource() {
    const src = this.deps.source();
    if (!src) throw new TransferError('not_connected', 'Connect to the development server first.');
    if (src.environment !== 'development' && src.environment !== 'training') {
      throw new TransferError('source_not_development', 'Transfers start from a development or training server. Customisation is never done on production.');
    }
    return src;
  }

  /** Transfers are kept on disk, so an import done days later can still be verified. */
  private save(t: Transfer): void {
    const { pkg: _pkg, ...meta } = t;
    fs.writeFileSync(path.join(t.dir, 'transfer.json'), JSON.stringify(meta, null, 2), 'utf8');
  }

  private load(transferId: string): Transfer | undefined {
    const dir = path.join(this.deps.baseDir(), 'transfers', transferId);
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(dir, 'transfer.json'), 'utf8')) as Omit<Transfer, 'pkg'>;
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      if (sha256(pkg) !== meta.packageHash) return undefined;
      const t: Transfer = { ...meta, pkg: deepFreeze(pkg) };
      this.transfers.set(transferId, t);
      return t;
    } catch { return undefined; }
  }

  private owned(transferId: unknown): Transfer {
    if (typeof transferId !== 'string' || !/^[0-9a-f-]{36}$/.test(transferId)) throw new TransferError('unknown_transfer', 'Unknown transfer id.');
    const t = this.transfers.get(transferId) ?? this.load(transferId);
    if (!t) throw new TransferError('unknown_transfer', 'Unknown transfer id.');
    const src = this.deps.source();
    if (!src || !sameOwner(t.owner, src.who)) throw new TransferError('wrong_session', 'This transfer belongs to a different connection or user.');
    return t;
  }

  /** Export roots + dependencies from development and sanitise into an import package. */
  private async buildPackage(gw: SourceGateway, roots: Array<{ objectType: string; id: string }>) {
    const pkg: Record<string, Map<string, Record<string, unknown>>> = {};
    const skipped: Record<string, number> = {};
    let orgUnitAssignmentsRemoved = 0;
    for (const root of roots) {
      const exp = await gw.getDependencyExport(root.objectType, root.id);
      if (!exp) throw new TransferError('not_found', `${root.objectType}/${root.id} was not found on the development server.`);
      for (const [collection, list] of Object.entries(exp)) {
        if (!Array.isArray(list)) continue; // e.g. "system" block
        if (collection in NOT_TRANSFERRED) { skipped[collection] = (skipped[collection] ?? 0) + list.length; continue; }
        if (!/^[A-Za-z]{2,60}$/.test(collection)) continue;
        for (const raw of list as Array<Record<string, unknown>>) {
          if (!raw || typeof raw !== 'object' || !isUid(raw.id)) continue;
          const obj: Record<string, unknown> = JSON.parse(JSON.stringify(raw));
          for (const k of STRIP_TOP_LEVEL) delete obj[k];
          if (STRIP_ORG_UNIT_ASSIGNMENTS.has(collection) && Array.isArray(obj.organisationUnits)) {
            orgUnitAssignmentsRemoved += obj.organisationUnits.length;
            delete obj.organisationUnits;
          }
          (pkg[collection] ??= new Map()).set(obj.id as string, obj);
        }
      }
    }
    const plain: Record<string, Array<Record<string, unknown>>> = {};
    for (const c of Object.keys(pkg).sort()) plain[c] = [...pkg[c]!.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const total = Object.values(plain).reduce((n, l) => n + l.length, 0);
    if (total > LIMITS.maxObjects) throw new TransferError('too_large', `The package would contain ${total} objects (limit ${LIMITS.maxObjects}); transfer in smaller parts.`);
    const notTransferred = Object.entries(skipped).map(([what, count]) => ({ what, count, reason: NOT_TRANSFERRED[what]! }));
    if (orgUnitAssignmentsRemoved) notTransferred.push({ what: 'org unit assignments on programs/data sets', count: orgUnitAssignmentsRemoved, reason: 'development org units differ from production; assign in production after import' });
    notTransferred.push({ what: 'sharing settings', count: total, reason: 'access is set on the production server, not copied from development' });
    return { pkg: plain, notTransferred, total };
  }

  private async compare(target: TargetGateway, pkg: Record<string, Array<Record<string, unknown>>>): Promise<TransferItem[]> {
    const flat = Object.entries(pkg).flatMap(([objectType, list]) => list.map(obj => ({ objectType, obj })));
    return mapLimit(flat, 8, async ({ objectType, obj }) => {
      const id = obj.id as string;
      const name = String(obj.name ?? obj.displayName ?? '');
      try {
        const current = await target.getOwnerObject(objectType, id);
        if (!current) {
          for (const field of ['code', 'name'] as const) {
            const v = obj[field];
            if (typeof v !== 'string' || !v) continue;
            const ids = (await target.findIdsByField(objectType, field, v)).filter(x => x !== id);
            if (ids.length) return { objectType, id, name, status: 'conflict' as const, conflictWith: ids.slice(0, 5), changedFields: [field] };
          }
          return { objectType, id, name, status: 'new' as const };
        }
        const changed = Object.keys(obj).filter(k => !COMPARE_IGNORE.has(k) && canonicalJson(obj[k] ?? null) !== canonicalJson(current[k] ?? null));
        return changed.length ? { objectType, id, name, status: 'changed' as const, changedFields: changed } : { objectType, id, name, status: 'identical' as const };
      } catch {
        return { objectType, id, name, status: 'unknown' as const };
      }
    });
  }

  private counts(items: TransferItem[]): Record<ItemStatus, number> {
    const c: Record<ItemStatus, number> = { new: 0, changed: 0, identical: 0, conflict: 0, unknown: 0 };
    for (const i of items) c[i.status]++;
    return c;
  }

  private writeReview(t: Transfer): void {
    const c = this.counts(t.items);
    const lines = [
      `# Transfer review: ${safeText(t.description, 200)}`, '',
      `From **${t.sourceOrigin}** (development) to **${t.target.origin}** (${t.target.environment}).`,
      `Prepared ${t.createdAt}. Package fingerprint (sha256): \`${t.packageHash}\`.`, '',
      '## In short', '',
      `- ${c.new} new object(s) will be created in ${t.target.environment}.`,
      `- ${c.changed} existing object(s) will be updated.`,
      `- ${c.identical} object(s) are already identical and will not change.`,
      `- ${c.conflict} conflict(s) must be resolved before import.`,
      ...(c.unknown ? [`- ${c.unknown} object(s) could not be checked against ${t.target.environment}.`] : []),
      '- Nothing will be deleted. The assistant does not change the production server; an administrator imports this file.', '',
      '## Not transferred', '',
      ...t.notTransferred.map(n => `- ${n.what} (${n.count}): ${n.reason}`), '',
      '## Every object', '',
      '| Status | Type | Id | Name | Details |', '|---|---|---|---|---|',
      ...t.items.map(i => `| ${PLAIN[i.status]} | ${i.objectType} | ${i.id} | ${safeText(i.name, 60).replace(/\|/g, '/')} | ${
        i.status === 'changed' ? `fields: ${i.changedFields!.join(', ')}` : i.status === 'conflict' ? `same ${i.changedFields?.[0]} as ${i.conflictWith!.join(', ')}` : ''} |`),
    ];
    fs.writeFileSync(t.files.review, lines.join('\n'), 'utf8');
  }

  async prepare(args: unknown): Promise<Transfer> {
    const src = this.requireSource();
    const a = (args ?? {}) as Record<string, unknown>;
    const description = typeof a.description === 'string' ? a.description.trim() : '';
    if (!description) throw new TransferError('invalid', 'description is required: say what is being transferred and why.');
    const roots = Array.isArray(a.objects) ? a.objects as Array<Record<string, unknown>> : [];
    if (!roots.length || roots.length > LIMITS.maxRoots) throw new TransferError('invalid', `objects must list 1-${LIMITS.maxRoots} items ({objectType, id}).`);
    for (const r of roots) {
      if (typeof r?.objectType !== 'string' || !TRANSFER_ROOT_TYPES.has(r.objectType) || !isUid(r.id)) {
        throw new TransferError('invalid', `Each object needs an objectType from: ${[...TRANSFER_ROOT_TYPES].join(', ')}, and an 11-character id.`);
      }
    }
    const target = await this.deps.openTarget(typeof a.targetProfile === 'string' ? a.targetProfile : undefined);
    if (!target.gw.readOnly) throw new TransferError('internal', 'Transfer targets must be opened read-only.');
    if (target.origin === new URL(src.gw.baseURL).origin) throw new TransferError('invalid', 'The target is the same server as the source.');

    const cleanRoots = roots.map(r => ({ objectType: r.objectType as string, id: r.id as string }));
    const { pkg, notTransferred } = await this.buildPackage(src.gw, cleanRoots);
    const items = await this.compare(target.gw, pkg);
    const id = randomUUID();
    const dir = path.join(this.deps.baseDir(), 'transfers', id);
    fs.mkdirSync(dir, { recursive: true });
    const t: Transfer = {
      id, owner: { ...src.who }, description, roots: cleanRoots, sourceOrigin: new URL(src.gw.baseURL).origin,
      target: { profile: target.profile, environment: target.environment, origin: target.origin },
      createdAt: this.now().toISOString(), state: 'prepared', packageHash: sha256(pkg), items, notTransferred, dir,
      files: { package: path.join(dir, 'package.json'), review: path.join(dir, 'review.md') },
      pkg: deepFreeze(pkg),
    };
    fs.writeFileSync(t.files.package, canonicalJson(pkg), 'utf8');
    this.writeReview(t);
    this.transfers.set(id, t);
    this.save(t);
    return t;
  }

  async approve(transferId: unknown): Promise<Transfer> {
    const src = this.requireSource();
    const t = this.owned(transferId);
    if (t.state !== 'prepared') throw new TransferError('invalid_state', `Transfer is "${t.state}" and cannot be approved.`);
    // The package file must be exactly what was prepared (the agent can write files).
    let onDisk: unknown;
    try { onDisk = JSON.parse(fs.readFileSync(t.files.package, 'utf8')); } catch { onDisk = null; }
    if (sha256(onDisk) !== t.packageHash) {
      t.state = 'stale';
      this.save(t);
      throw new TransferError('tampered', 'The package file no longer matches what was prepared. Prepare the transfer again.');
    }
    // Development must still hold the same content.
    const { pkg } = await this.buildPackage(src.gw, t.roots);
    if (sha256(pkg) !== t.packageHash) {
      t.state = 'stale';
      this.save(t);
      throw new TransferError('stale', 'The objects changed on the development server since the transfer was prepared. Prepare it again.');
    }
    const c = this.counts(t.items);
    if (c.conflict) throw new TransferError('conflicts', `${c.conflict} conflict(s) must be resolved before approval (see ${t.files.review}).`);
    const message = [
      `Approve moving this package from the development server to ${t.target.environment} (${t.target.origin})?`,
      `In short: ${c.new} new, ${c.changed} updated, ${c.identical} already identical${c.unknown ? `, ${c.unknown} not checked` : ''}. Nothing is deleted; sharing is not copied.`,
      `Purpose given by the assistant (unverified): "${safeText(t.description, 200)}"`,
      'The assistant will NOT change production. Approving produces a signed-off file for a production administrator to import.',
      `Full list of every object: ${t.files.review}`,
      `Package fingerprint sha256 ${t.packageHash.slice(0, 16)}.`,
    ].join('\n');
    let answer: ApprovalResult;
    try { answer = await this.deps.approve(message); } catch { answer = 'unavailable'; }
    if (answer !== 'accept') {
      if (answer === 'unavailable') throw new TransferError('no_approval_channel', 'This assistant host cannot ask the person for approval.');
      t.state = 'declined';
      this.save(t);
      throw new TransferError('declined', 'The person did not approve the transfer.');
    }
    t.state = 'approved';
    t.files.approval = path.join(t.dir, 'approval.json');
    t.files.adminInstructions = path.join(t.dir, 'FOR-THE-PRODUCTION-ADMINISTRATOR.txt');
    fs.writeFileSync(t.files.approval, JSON.stringify({
      transferId: t.id, packageHash: t.packageHash, description: t.description,
      source: t.sourceOrigin, target: t.target, approvedAt: this.now().toISOString(),
      approvedVia: 'MCP host approval prompt', counts: c,
    }, null, 2), 'utf8');
    fs.writeFileSync(t.files.adminInstructions, [
      'DHIS2 metadata transfer approved for import',
      `Target: ${t.target.origin}`,
      `File: package.json (sha256 ${t.packageHash})`, '',
      '1. In the Import/Export app, choose Metadata import and upload package.json.',
      '2. Keep "Create and update" and atomic mode "All". Run a Dry run first and check it reports no errors.',
      '3. Run the import.',
      '4. Tell the assistant it is done; it will check production matches the approved package (reading only).',
      '5. Set sharing and org unit assignments in production as needed (they are not copied from development).',
    ].join('\n'), 'utf8');
    this.save(t);
    return t;
  }

  async verify(transferId: unknown): Promise<Transfer> {
    const t = this.owned(transferId);
    if (!['approved', 'verified', 'partially-imported', 'not-imported'].includes(t.state)) {
      throw new TransferError('invalid_state', `Transfer is "${t.state}"; only approved transfers can be verified.`);
    }
    const target = await this.deps.openTarget(t.target.profile);
    if (target.origin !== t.target.origin) throw new TransferError('invalid', 'The target profile now points at a different server.');
    const byKey = new Map(Object.entries(t.pkg).flatMap(([c, l]) => l.map(o => [`${c}/${o.id}`, o] as const)));
    await mapLimit(t.items, 8, async item => {
      const intended = { ...byKey.get(`${item.objectType}/${item.id}`)! };
      for (const k of COMPARE_IGNORE) delete intended[k];
      let actual: Record<string, unknown> | null = null;
      try { actual = await target.gw.getOwnerObject(item.objectType, item.id); } catch { actual = null; }
      if (!actual) { item.verify = 'missing'; return; }
      const mism = mismatchedFields(intended, actual);
      item.verify = mism.length ? 'differs' : 'match';
      if (mism.length) item.verifyFields = mism; else delete item.verifyFields;
    });
    const moving = t.items.filter(i => i.status === 'new' || i.status === 'changed');
    const matched = moving.filter(i => i.verify === 'match').length;
    // A changed object that has not been imported yet still differs, so "not imported"
    // and "imported but altered" cannot be told apart for it; both are reported as not matching.
    t.state = matched === moving.length && t.items.every(i => i.verify === 'match') ? 'verified'
      : matched === 0 ? 'not-imported' : 'partially-imported';
    t.files.verification = path.join(t.dir, 'verification.json');
    fs.writeFileSync(t.files.verification, JSON.stringify({
      transferId: t.id, state: t.state, checkedAt: this.now().toISOString(),
      items: t.items.map(i => ({ objectType: i.objectType, id: i.id, verify: i.verify, ...(i.verifyFields ? { fields: i.verifyFields } : {}) })),
    }, null, 2), 'utf8');
    this.save(t);
    return t;
  }

  get(transferId: unknown): Transfer { return this.owned(transferId); }
}

export function describeTransfer(t: Transfer): string {
  const c: Record<string, number> = {};
  for (const i of t.items) c[i.status] = (c[i.status] ?? 0) + 1;
  const v: Record<string, number> = {};
  for (const i of t.items) if (i.verify) v[i.verify] = (v[i.verify] ?? 0) + 1;
  const lines = [
    `Transfer ${t.id}`,
    `State: ${t.state}`,
    `From ${t.sourceOrigin} (development) to ${t.target.origin} (${t.target.environment}, profile ${t.target.profile})`,
    `Objects: ${t.items.length} — ${Object.entries(c).map(([k, n]) => `${n} ${PLAIN[k] ?? k}`).join(', ')}`,
    ...(Object.keys(v).length ? [`Production check: ${Object.entries(v).map(([k, n]) => `${n} ${k}`).join(', ')}`] : []),
    `Not transferred: ${t.notTransferred.map(n => `${n.what} (${n.count})`).join('; ')}`,
    `Package: ${t.files.package}`, `Review: ${t.files.review}`,
    ...(t.files.adminInstructions ? [`Instructions for the production administrator: ${t.files.adminInstructions}`] : []),
    ...(t.items.some(i => i.status === 'conflict') ? ['Conflicts (same code/name, different id) must be resolved before approval:',
      ...t.items.filter(i => i.status === 'conflict').slice(0, 20).map(i => `  - ${i.objectType}/${i.id} "${safeText(i.name, 50)}" vs ${i.conflictWith!.join(', ')}`)] : []),
  ];
  if (t.state === 'prepared') lines.push('', 'Next: review the file with the person, then call dhis2_approve_transfer. The person approves in their MCP host.');
  if (t.state === 'approved') lines.push('', 'Next: a production administrator imports package.json (see the instructions file). Then call dhis2_verify_transfer.');
  return lines.join('\n');
}
