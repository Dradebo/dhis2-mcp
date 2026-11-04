/**
 * Safe change engine (mission W2): plan → validate (DHIS2 dry run) → host-mediated
 * approval → precondition re-check → apply → read back → minimised receipt.
 *
 * Plans are held server-side, immutable and bound to the connection epoch,
 * DHIS2 user and instance origin. The model can only refer to a plan by its
 * opaque id; approval comes from the MCP host (elicitation), never from tool
 * arguments. Ambiguous outcomes are reconciled by reading, never by re-sending.
 */
import { randomUUID } from 'node:crypto';
import {
  ChangeInput, PlannedTarget, deepFreeze, diffFields, generateUid, isUid, mergeUpdate,
  mismatchedFields, renderApprovalSummary, sha256, validatePlanInput, safeText,
} from './security/plans.js';
import { toSafeErrorMessage } from './security/safe-errors.js';

export type PlanState =
  | 'validated' | 'invalid' | 'applying' | 'verified' | 'applied-unverified' | 'partial'
  | 'failed' | 'not-applied' | 'unknown-outcome' | 'stale' | 'cancelled' | 'declined' | 'expired';

const TERMINAL: ReadonlySet<PlanState> = new Set(['invalid', 'verified', 'applied-unverified', 'partial', 'failed', 'not-applied', 'stale', 'cancelled', 'declined', 'expired']);

export type ApprovalResult = 'accept' | 'decline' | 'cancel' | 'unavailable';

/** Minimal client surface the engine needs (implemented by DHIS2Client). */
export interface MetadataGateway {
  baseURL: string;
  getOwnerObject(objectType: string, id: string): Promise<Record<string, unknown> | null>;
  postMetadata(payload: Record<string, unknown[]>, mode: 'VALIDATE' | 'COMMIT'): Promise<{ httpStatus: number; report: any }>;
}

export interface ConnectionIdentity {
  epoch: number;
  userId: string;
  username: string;
  profile: string;
  origin: string;
  environment?: string;
}

interface Precondition { objectType: string; id: string; kind: 'absent' | 'hash'; hash?: string }

interface TargetRecord extends PlannedTarget {
  intended: Record<string, unknown>;   // fields that read-back must find
  preserved?: Record<string, unknown>; // updates: unchanged before-image fields that must survive
}

/** Fields DHIS2 legitimately changes on every save; excluded from collateral-change checks. */
const VOLATILE = new Set(['lastUpdated', 'lastUpdatedBy', 'href', 'access', 'displayName', 'displayShortName',
  'displayDescription', 'displayFormName', 'favorites', 'favorite', 'version']);

export interface Plan {
  id: string;
  owner: ConnectionIdentity;
  createdAt: Date;
  expiresAt: Date;
  state: PlanState;
  description: string;
  payload: Record<string, unknown[]>;
  payloadHash: string;
  preconditions: Precondition[];
  targets: TargetRecord[];
  summary: string;
  validation: { status: string; stats?: unknown; errors: string[] };
  receipt?: Receipt;
}

export interface Receipt {
  planId: string;
  payloadHash: string;
  state: PlanState;
  appliedAt?: string;
  importStatus?: string;
  stats?: unknown;
  targets: Array<{ objectType: string; id: string; result: 'verified' | 'mismatch' | 'missing' | 'unchanged'; mismatchedFields?: string[]; collateralChanges?: string[] }>;
  note?: string;
}

export interface EngineDeps {
  gateway: () => MetadataGateway | null;
  identity: () => ConnectionIdentity | null;
  approve: (message: string) => Promise<ApprovalResult>;
  ttlSeconds: number;
  now?: () => Date;
}

export class ChangeEngineError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = 'ChangeEngineError'; }
}

function sameOwner(a: ConnectionIdentity, b: ConnectionIdentity): boolean {
  return a.epoch === b.epoch && a.userId === b.userId && a.origin === b.origin && a.profile === b.profile;
}

function parseImportReport(report: any): { status: string; stats: any; errors: string[]; total: number } {
  const status = typeof report?.status === 'string' ? report.status : 'UNKNOWN';
  const stats = report?.stats && typeof report.stats === 'object' ? {
    created: Number(report.stats.created ?? 0), updated: Number(report.stats.updated ?? 0),
    deleted: Number(report.stats.deleted ?? 0), ignored: Number(report.stats.ignored ?? 0), total: Number(report.stats.total ?? 0),
  } : undefined;
  const errors: string[] = [];
  const typeReports = Array.isArray(report?.typeReports) ? report.typeReports : [];
  for (const tr of typeReports) {
    for (const or of Array.isArray(tr?.objectReports) ? tr.objectReports : []) {
      for (const er of Array.isArray(or?.errorReports) ? or.errorReports : []) {
        if (errors.length < 20) errors.push(`${safeText(er?.errorCode ?? 'E????', 10)} ${safeText(or?.uid ?? '', 11)}: ${safeText(er?.message ?? '', 160)}`);
      }
    }
  }
  return { status, stats, errors, total: stats?.total ?? 0 };
}

export class ChangeEngine {
  private plans = new Map<string, Plan>();
  constructor(private deps: EngineDeps) {}

  private now(): Date { return this.deps.now ? this.deps.now() : new Date(); }

  private requireConnection(): { gw: MetadataGateway; who: ConnectionIdentity } {
    const gw = this.deps.gateway();
    const who = this.deps.identity();
    if (!gw || !who) throw new ChangeEngineError('not_connected', 'No verified DHIS2 connection.');
    return { gw, who };
  }

  /** Invalidate every open plan (called on (re)configuration). */
  invalidateAll(): void {
    for (const plan of this.plans.values()) if (!TERMINAL.has(plan.state) && plan.state !== 'unknown-outcome') plan.state = 'stale';
  }

  private getOwnedPlan(planId: unknown): Plan {
    if (typeof planId !== 'string' || !/^[0-9a-f-]{36}$/.test(planId)) throw new ChangeEngineError('unknown_plan', 'Unknown plan id.');
    const plan = this.plans.get(planId);
    if (!plan) throw new ChangeEngineError('unknown_plan', 'Unknown plan id.');
    const who = this.deps.identity();
    if (!who || !sameOwner(plan.owner, who)) {
      throw new ChangeEngineError('wrong_session', 'This plan belongs to a different connection or user session and cannot be used here.');
    }
    if (plan.state === 'validated' && this.now() > plan.expiresAt) plan.state = 'expired';
    return plan;
  }

  async createPlan(args: unknown): Promise<Plan> {
    const { gw, who } = this.requireConnection();
    const { problems, plan: input } = validatePlanInput(args);
    if (!input) throw new ChangeEngineError('invalid_plan', `Plan rejected:\n- ${problems.join('\n- ')}`);

    const payload: Record<string, unknown[]> = {};
    const preconditions: Precondition[] = [];
    const targets: TargetRecord[] = [];

    for (const change of input.changes as ChangeInput[]) {
      if (change.action === 'update') {
        const before = await gw.getOwnerObject(change.objectType, change.id);
        if (!before) throw new ChangeEngineError('invalid_plan', `${change.objectType}/${change.id} does not exist (or is not visible to this user).`);
        const diffs = diffFields(before, change.set);
        if (diffs.length === 0) throw new ChangeEngineError('invalid_plan', `${change.objectType}/${change.id}: none of the requested fields would change.`);
        const changedSet = Object.fromEntries(diffs.map(d => [d.field, change.set[d.field]]));
        (payload[change.objectType] ??= []).push(mergeUpdate(before, changedSet));
        preconditions.push({ objectType: change.objectType, id: change.id, kind: 'hash', hash: sha256(before) });
        const preserved = Object.fromEntries(Object.entries(before).filter(([k]) => !(k in changedSet) && !VOLATILE.has(k)));
        targets.push({ action: 'update', objectType: change.objectType, id: change.id,
          label: String(before.name ?? before.displayName ?? ''), diffs, intended: changedSet, preserved });
      } else {
        const object = JSON.parse(JSON.stringify(change.object)) as Record<string, unknown>;
        const id = isUid(object.id) ? object.id : generateUid();
        object.id = id;
        if (await gw.getOwnerObject(change.objectType, id)) {
          throw new ChangeEngineError('invalid_plan', `${change.objectType}/${id} already exists; use an update instead.`);
        }
        (payload[change.objectType] ??= []).push(object);
        preconditions.push({ objectType: change.objectType, id, kind: 'absent' });
        const { id: _omit, ...fields } = object;
        targets.push({ action: 'create', objectType: change.objectType, id, label: String(object.name ?? ''),
          diffs: Object.entries(fields).map(([field, after]) => ({ field, before: undefined, after })), intended: fields });
      }
    }

    // DHIS2 dry run. A VALIDATE whose total does not match the object count means the
    // body was not what we think we sent (an empty-body VALIDATE reports total 0).
    const expected = Object.values(payload).reduce((n, list) => n + list.length, 0);
    const { httpStatus, report } = await gw.postMetadata(payload, 'VALIDATE');
    const parsed = parseImportReport(report);
    let validationText: string;
    let state: PlanState = 'validated';
    if (httpStatus >= 400 || parsed.status === 'ERROR' || parsed.errors.length) {
      state = 'invalid';
      validationText = `FAILED (${parsed.errors.length} error(s))`;
    } else if (parsed.total !== expected) {
      state = 'invalid';
      validationText = `FAILED: DHIS2 counted ${parsed.total} object(s), expected ${expected}`;
      parsed.errors.push(validationText);
    } else {
      validationText = `${parsed.status}, ${expected} object(s), 0 errors`;
    }

    const id = randomUUID();
    const createdAt = this.now();
    const expiresAt = new Date(createdAt.getTime() + this.deps.ttlSeconds * 1000);
    const payloadHash = sha256(payload);
    const plan: Plan = {
      id, owner: { ...who }, createdAt, expiresAt, state, description: input.description,
      payload: deepFreeze(payload), payloadHash, preconditions: deepFreeze(preconditions), targets: deepFreeze(targets),
      summary: renderApprovalSummary({ planId: id, payloadHash, origin: who.origin, profile: who.profile, user: who.username,
        ...(who.environment ? { environment: who.environment } : {}),
        description: input.description, targets, validation: validationText, expiresAt }),
      validation: { status: parsed.status, stats: parsed.stats, errors: parsed.errors },
    };
    this.plans.set(id, plan);
    return plan;
  }

  private async preconditionsHold(gw: MetadataGateway, plan: Plan): Promise<string[]> {
    const drift: string[] = [];
    for (const pre of plan.preconditions) {
      const current = await gw.getOwnerObject(pre.objectType, pre.id);
      if (pre.kind === 'absent' && current) drift.push(`${pre.objectType}/${pre.id} now exists`);
      if (pre.kind === 'hash' && (!current || sha256(current) !== pre.hash)) drift.push(`${pre.objectType}/${pre.id} changed since the plan was made`);
    }
    return drift;
  }

  async applyPlan(planId: unknown): Promise<Plan> {
    const { gw } = this.requireConnection();
    const plan = this.getOwnedPlan(planId);
    if (plan.state !== 'validated') {
      throw new ChangeEngineError(plan.state === 'applying' || TERMINAL.has(plan.state) || plan.state === 'unknown-outcome' ? 'not_applicable' : 'invalid_state',
        `Plan is "${plan.state}" and cannot be applied${plan.state === 'expired' || plan.state === 'stale' ? '; create a new plan' : ''}.`);
    }
    if (sha256(plan.payload) !== plan.payloadHash) {
      plan.state = 'failed';
      throw new ChangeEngineError('integrity', 'Plan payload integrity check failed; nothing was sent.');
    }
    plan.state = 'applying'; // claim synchronously, before any await: concurrent/replayed applies are refused
    let drift: string[];
    try {
      drift = await this.preconditionsHold(gw, plan);
    } catch (e) {
      plan.state = 'validated';
      throw e;
    }
    if (drift.length) { plan.state = 'stale'; throw new ChangeEngineError('stale', `Plan is stale (${drift.join('; ')}). Nothing was sent; create a new plan.`); }
    let decision: ApprovalResult;
    try {
      decision = await this.deps.approve(plan.summary);
    } catch {
      decision = 'unavailable';
    }
    if (decision !== 'accept') {
      plan.state = decision === 'unavailable' ? 'validated' : 'declined';
      throw new ChangeEngineError(decision === 'unavailable' ? 'no_approval_channel' : 'declined',
        decision === 'unavailable'
          ? 'No trusted approval channel: the MCP host did not present the approval to the user. Nothing was sent.'
          : 'The user did not approve this plan. Nothing was sent. Do not retry without new direction from the user.');
    }
    if (this.now() > plan.expiresAt) { plan.state = 'expired'; throw new ChangeEngineError('expired', 'Plan expired before approval completed. Nothing was sent.'); }
    // Re-check after approval (which may take minutes); see TOCTOU note in SECURITY-MODEL.md.
    try {
      drift = await this.preconditionsHold(gw, plan);
    } catch (e) {
      plan.state = 'validated';
      throw e;
    }
    if (drift.length) { plan.state = 'stale'; throw new ChangeEngineError('stale', `Target changed during approval (${drift.join('; ')}). Nothing was sent.`); }

    let commit: { httpStatus: number; report: any };
    try {
      commit = await gw.postMetadata(plan.payload as Record<string, unknown[]>, 'COMMIT');
    } catch (e) {
      // Timeout / 5xx / network: the server may or may not have applied it. Never re-send; reconcile by reading.
      plan.state = 'unknown-outcome';
      await this.reconcile(plan, `Commit outcome unknown (${toSafeErrorMessage(e)}); reconciled by read-back.`);
      return plan;
    }
    const parsed = parseImportReport(commit.report);
    if (commit.httpStatus >= 400 || parsed.status === 'ERROR') {
      plan.state = 'failed';
      await this.reconcile(plan, `DHIS2 rejected the import (HTTP ${commit.httpStatus}, ${parsed.errors.length} error(s)).`, parsed);
      return plan;
    }
    await this.reconcile(plan, undefined, parsed);
    return plan;
  }

  /** Read every target back and derive the verified state. Reads only. */
  private async reconcile(plan: Plan, note?: string, parsed?: ReturnType<typeof parseImportReport>): Promise<void> {
    const gw = this.deps.gateway();
    const results: Receipt['targets'] = [];
    let readFailed = false;
    for (const t of plan.targets) {
      let actual: Record<string, unknown> | null = null;
      try { actual = gw ? await gw.getOwnerObject(t.objectType, t.id) : null; } catch { readFailed = true; }
      const pre = plan.preconditions.find(p => p.objectType === t.objectType && p.id === t.id)!;
      if (!actual) { results.push({ objectType: t.objectType, id: t.id, result: 'missing' }); continue; }
      const mism = mismatchedFields(t.intended, actual);
      // Unrelated configuration (binding arrays, nested sharing access strings, ...) must survive.
      const collateral = t.preserved ? mismatchedFields(t.preserved, actual) : [];
      if (mism.length === 0 && collateral.length === 0) results.push({ objectType: t.objectType, id: t.id, result: 'verified' });
      else if (mism.length === 0) results.push({ objectType: t.objectType, id: t.id, result: 'mismatch', collateralChanges: collateral });
      else if (pre.kind === 'hash' && sha256(actual) === pre.hash) results.push({ objectType: t.objectType, id: t.id, result: 'unchanged' });
      else results.push({ objectType: t.objectType, id: t.id, result: 'mismatch', mismatchedFields: mism, ...(collateral.length ? { collateralChanges: collateral } : {}) });
    }
    const verified = results.filter(r => r.result === 'verified').length;
    const untouched = results.filter(r => r.result === 'unchanged' || (r.result === 'missing' && plan.preconditions.find(p => p.id === r.id)?.kind === 'absent')).length;
    let state: PlanState;
    if (readFailed) state = 'unknown-outcome';
    else if (verified === results.length) state = 'verified';
    else if (untouched === results.length) state = 'not-applied';
    else if (verified > 0) state = 'partial';
    else state = 'applied-unverified';
    if (plan.state === 'failed' && state === 'not-applied') state = 'failed';
    plan.state = state;
    plan.receipt = {
      planId: plan.id, payloadHash: plan.payloadHash, state, appliedAt: this.now().toISOString(),
      ...(parsed ? { importStatus: parsed.status, stats: parsed.stats } : {}),
      targets: results, ...(note ? { note } : {}),
    };
  }

  /** Status lookup; an unknown-outcome plan is reconciled by reading (never re-sent). */
  async getPlan(planId: unknown): Promise<Plan> {
    const plan = this.getOwnedPlan(planId);
    if (plan.state === 'unknown-outcome') await this.reconcile(plan, 'Reconciled by read-back after an unknown outcome; nothing was re-sent.');
    return plan;
  }

  cancelPlan(planId: unknown): Plan {
    const plan = this.getOwnedPlan(planId);
    if (plan.state !== 'validated') throw new ChangeEngineError('invalid_state', `Plan is "${plan.state}" and cannot be cancelled.`);
    plan.state = 'cancelled';
    return plan;
  }
}

/** Model-facing text for a plan (no payload values beyond the approval summary). */
export function describePlan(plan: Plan): string {
  const lines = [`Plan ${plan.id}`, `State: ${plan.state}`, `Expires: ${plan.expiresAt.toISOString()}`, '', plan.summary];
  if (plan.validation.errors.length) lines.push('', 'DHIS2 validation errors:', ...plan.validation.errors.map(e => `  - ${e}`));
  if (plan.receipt) lines.push('', 'Receipt:', JSON.stringify(plan.receipt, null, 2));
  if (plan.state === 'validated') lines.push('', 'Next: call dhis2_apply_plan with this planId. The user will be asked to approve it in their MCP host; your arguments cannot approve it.');
  return lines.join('\n');
}
