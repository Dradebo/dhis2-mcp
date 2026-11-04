/**
 * Pure helpers for planned metadata changes (mission W2): canonical hashing,
 * UID generation, before-image merge/diff, approval-summary rendering and
 * read-back comparison. No I/O here.
 */
import { createHash, randomInt } from 'node:crypto';

export const ALLOWED_OBJECT_TYPES: ReadonlySet<string> = new Set([
  'dataElements', 'dataElementGroups', 'dataSets', 'categoryOptions', 'categories', 'categoryCombos',
  'indicators', 'indicatorTypes', 'indicatorGroups', 'organisationUnitGroups', 'validationRules',
  'programIndicators', 'programRules', 'programRuleVariables', 'programRuleActions', 'legendSets',
  'optionSets', 'options', 'visualizations', 'eventVisualizations', 'maps', 'dashboards', 'constants',
]);

/** Fields a plan may never set: identity, ownership, sharing and server-managed state. */
export const FORBIDDEN_FIELDS: ReadonlySet<string> = new Set([
  'id', 'uid', 'sharing', 'publicAccess', 'externalAccess', 'userAccesses', 'userGroupAccesses', 'access',
  'createdBy', 'lastUpdatedBy', 'user', 'created', 'lastUpdated', 'href', 'favorites', 'favorite',
]);

/** Top-level keys stripped from a before-image before re-sending it (never nested ones: sharing.users[*].access must survive). */
const SERVER_MANAGED_TOP_LEVEL = [
  'access', 'href', 'createdBy', 'lastUpdatedBy', 'favorites', 'favorite',
  'displayName', 'displayShortName', 'displayDescription', 'displayFormName',
];

export const LIMITS = { maxChanges: 20, maxFields: 40, maxPayloadBytes: 64 * 1024, maxDescription: 300 };

const UID_RE = /^[A-Za-z][A-Za-z0-9]{10}$/;
const UID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function isUid(v: unknown): v is string {
  return typeof v === 'string' && UID_RE.test(v);
}

export function generateUid(): string {
  let uid = UID_CHARS[randomInt(0, 52)]!;
  for (let i = 0; i < 10; i++) uid += UID_CHARS[randomInt(0, 62)]!;
  return uid;
}

/** JSON with recursively sorted object keys, so equal content hashes equally. */
export function canonicalJson(value: unknown): string {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.keys(v as object).sort().map(k => [k, norm((v as Record<string, unknown>)[k])]));
    }
    return v;
  };
  return JSON.stringify(norm(value));
}

export function sha256(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as object)) deepFreeze(v);
  }
  return value;
}

export type ChangeInput =
  | { action: 'create'; objectType: string; object: Record<string, unknown> }
  | { action: 'update'; objectType: string; id: string; set: Record<string, unknown> };

export interface PlanInput {
  description: string;
  changes: ChangeInput[];
}

/** Validate untrusted plan input. Returns a list of problems (empty = valid). */
export function validatePlanInput(input: unknown): { problems: string[]; plan?: PlanInput } {
  const problems: string[] = [];
  if (!input || typeof input !== 'object') return { problems: ['Arguments must be an object.'] };
  const { description, changes } = input as Record<string, unknown>;
  if (typeof description !== 'string' || !description.trim()) problems.push('description is required: say what the change is for.');
  else if (description.length > LIMITS.maxDescription) problems.push(`description must be at most ${LIMITS.maxDescription} characters.`);
  if (!Array.isArray(changes) || changes.length === 0) {
    problems.push('changes must be a non-empty array.');
    return { problems };
  }
  if (changes.length > LIMITS.maxChanges) problems.push(`At most ${LIMITS.maxChanges} changes per plan; split the work into smaller plans.`);
  if (Buffer.byteLength(JSON.stringify(changes)) > LIMITS.maxPayloadBytes) problems.push(`changes exceed ${LIMITS.maxPayloadBytes} bytes.`);
  let fieldCount = 0;
  const seen = new Set<string>();
  changes.forEach((c, i) => {
    const at = `changes[${i}]`;
    if (!c || typeof c !== 'object') { problems.push(`${at} must be an object.`); return; }
    const ch = c as Record<string, unknown>;
    if (typeof ch.objectType !== 'string' || !ALLOWED_OBJECT_TYPES.has(ch.objectType)) {
      problems.push(`${at}.objectType must be one of: ${[...ALLOWED_OBJECT_TYPES].join(', ')}.`);
      return;
    }
    let fields: Record<string, unknown> | undefined;
    if (ch.action === 'create') {
      if (!ch.object || typeof ch.object !== 'object' || Array.isArray(ch.object)) { problems.push(`${at}.object must be an object.`); return; }
      fields = ch.object as Record<string, unknown>;
      if ('id' in fields && !isUid(fields.id)) problems.push(`${at}.object.id must be an 11-character DHIS2 UID if given.`);
      if (isUid(fields.id)) {
        const key = `${ch.objectType}/${fields.id}`;
        if (seen.has(key)) problems.push(`${at} duplicates ${key}.`);
        seen.add(key);
      }
    } else if (ch.action === 'update') {
      if (!isUid(ch.id)) { problems.push(`${at}.id must be an 11-character DHIS2 UID.`); return; }
      const key = `${ch.objectType}/${ch.id}`;
      if (seen.has(key)) problems.push(`${at} duplicates ${key}; combine the fields into one change.`);
      seen.add(key);
      if (!ch.set || typeof ch.set !== 'object' || Array.isArray(ch.set) || Object.keys(ch.set as object).length === 0) {
        problems.push(`${at}.set must be a non-empty object of top-level fields to change.`);
        return;
      }
      fields = ch.set as Record<string, unknown>;
    } else {
      problems.push(`${at}.action must be "create" or "update" (deletion is not supported).`);
      return;
    }
    for (const k of Object.keys(fields)) {
      if (k === 'id' && ch.action === 'create') continue;
      if (FORBIDDEN_FIELDS.has(k)) problems.push(`${at}: field "${k}" cannot be changed through a plan (identity, ownership or sharing).`);
      if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(k)) problems.push(`${at}: invalid field name.`);
      fieldCount++;
    }
  });
  if (fieldCount > LIMITS.maxFields) problems.push(`At most ${LIMITS.maxFields} fields per plan (got ${fieldCount}); split the work.`);
  return problems.length ? { problems } : { problems, plan: { description: description as string, changes: changes as ChangeInput[] } };
}

/** Apply `set` onto a fresh before-image, preserving everything else (incl. nested sharing access strings). */
export function mergeUpdate(beforeImage: Record<string, unknown>, set: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = JSON.parse(JSON.stringify(beforeImage));
  for (const k of SERVER_MANAGED_TOP_LEVEL) delete merged[k];
  for (const [k, v] of Object.entries(set)) merged[k] = JSON.parse(JSON.stringify(v));
  return merged;
}

export interface FieldDiff { field: string; before: unknown; after: unknown }

export function diffFields(beforeImage: Record<string, unknown>, set: Record<string, unknown>): FieldDiff[] {
  return Object.entries(set)
    .filter(([k, v]) => canonicalJson(beforeImage[k] ?? null) !== canonicalJson(v ?? null))
    .map(([field, after]) => ({ field, before: beforeImage[field], after }));
}

// ---- untrusted text rendering ------------------------------------------------

/** Render untrusted text safely: no control/bidi characters, one line, bounded. */
export function safeText(value: unknown, max = 80): string {
  let s = typeof value === 'string' ? value : JSON.stringify(value ?? null) ?? 'null';
  s = s.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…(+${s.length - max} chars)` : s;
}

export function describeValue(v: unknown, max = 70): string {
  if (v === undefined || v === null || v === '') return '(empty)';
  if (Array.isArray(v)) return `[${v.length} item${v.length === 1 ? '' : 's'}] ${safeText(v, max)}`;
  if (typeof v === 'string') return `"${safeText(v, max)}"`;
  return safeText(v, max);
}

export interface PlannedTarget {
  action: 'create' | 'update';
  objectType: string;
  id: string;
  label: string;
  diffs: FieldDiff[];          // updates: changed fields; creates: all supplied fields
}

const PLAIN_TYPE: Record<string, [string, string]> = {
  dataElements: ['data element', 'data elements'], dataElementGroups: ['data element group', 'data element groups'],
  dataSets: ['data set', 'data sets'], categoryOptions: ['category option', 'category options'],
  categories: ['category', 'categories'], categoryCombos: ['category combination', 'category combinations'],
  indicators: ['indicator', 'indicators'], indicatorTypes: ['indicator type', 'indicator types'],
  indicatorGroups: ['indicator group', 'indicator groups'], organisationUnitGroups: ['org unit group', 'org unit groups'],
  validationRules: ['validation rule', 'validation rules'], programIndicators: ['program indicator', 'program indicators'],
  programRules: ['program rule', 'program rules'], programRuleVariables: ['program rule variable', 'program rule variables'],
  programRuleActions: ['program rule action', 'program rule actions'], legendSets: ['legend', 'legends'],
  optionSets: ['option set', 'option sets'], options: ['option', 'options'], visualizations: ['chart or table', 'charts or tables'],
  eventVisualizations: ['event report', 'event reports'], maps: ['map', 'maps'], dashboards: ['dashboard', 'dashboards'],
  constants: ['constant', 'constants'],
};

function plainCount(objectType: string, n: number): string {
  const [one, many] = PLAIN_TYPE[objectType] ?? [objectType, objectType];
  return `${n} ${n === 1 ? one : many}`;
}

/** One plain-language sentence, e.g. "update 1 data element (\"ANC 1st\"); create 2 indicators". */
export function plainSummary(targets: PlannedTarget[]): string {
  const groups = new Map<string, PlannedTarget[]>();
  for (const t of targets) {
    const k = `${t.action}|${t.objectType}`;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  return [...groups.entries()].map(([k, list]) => {
    const [action, objectType] = k.split('|') as [string, string];
    const names = list.slice(0, 3).map(t => t.label ? `"${safeText(t.label, 40)}"` : t.id).join(', ');
    return `${action} ${plainCount(objectType, list.length)} (${names}${list.length > 3 ? `, +${list.length - 3} more` : ''})`;
  }).join('; ');
}

export function renderApprovalSummary(args: {
  planId: string; payloadHash: string; origin: string; profile: string; user: string; environment?: string;
  description: string; targets: PlannedTarget[]; validation: string; expiresAt: Date;
}): string {
  const fieldTotal = args.targets.reduce((n, t) => n + t.diffs.length, 0);
  const lines = [
    `Allow the assistant to change DHIS2 on the ${safeText(args.environment ?? 'connected', 20)} server ${args.origin}?`,
    `In short: ${plainSummary(args.targets)}.`,
    `Purpose given by the assistant (unverified): "${safeText(args.description, 200)}"`,
    'Nothing will be deleted and no sharing or ownership will change.',
    '',
    `Details: ${args.targets.length} object(s), ${fieldTotal} field(s). This is the complete list:`,
  ];
  args.targets.forEach((t, i) => {
    lines.push(` ${i + 1}. ${t.action.toUpperCase()} ${t.objectType} ${t.id} ${t.label ? `"${safeText(t.label, 60)}"` : ''}`.trimEnd());
    for (const d of t.diffs) {
      lines.push(t.action === 'update'
        ? `      ${d.field}: ${describeValue(d.before)} → ${describeValue(d.after)}`
        : `      ${d.field}: ${describeValue(d.after)}`);
    }
  });
  lines.push(`DHIS2 dry run: ${args.validation}`);
  lines.push(`Signed in as ${safeText(args.user, 40)} (profile ${safeText(args.profile, 32)}). Plan ${args.planId.slice(0, 8)}, sha256 ${args.payloadHash.slice(0, 12)}, expires ${args.expiresAt.toISOString()}.`);
  lines.push('Approve only if this matches what you asked for.');
  return lines.join('\n');
}

// ---- read-back comparison ---------------------------------------------------

/** True when every property of `intended` is present and equal in `actual` (refs match by id; arrays as multisets). */
export function subsetMatches(intended: unknown, actual: unknown): boolean {
  if (intended === null || intended === undefined) return actual === null || actual === undefined || actual === '';
  if (Array.isArray(intended)) {
    if (!Array.isArray(actual) || actual.length !== intended.length) return false;
    const used = new Set<number>();
    return intended.every(item => {
      const idx = actual.findIndex((a, j) => !used.has(j) && subsetMatches(item, a));
      if (idx < 0) return false;
      used.add(idx);
      return true;
    });
  }
  if (typeof intended === 'object') {
    if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false;
    return Object.entries(intended as Record<string, unknown>).every(([k, v]) => subsetMatches(v, (actual as Record<string, unknown>)[k]));
  }
  return intended === actual;
}

export function mismatchedFields(intended: Record<string, unknown>, actual: Record<string, unknown> | null): string[] {
  if (!actual) return ['(object missing)'];
  return Object.keys(intended).filter(k => k !== 'id' && !subsetMatches(intended[k], actual[k]));
}
