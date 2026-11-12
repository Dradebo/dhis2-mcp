/**
 * Approved operations on a development server: data imports (aggregate and
 * tracker) and sharing changes. One lifecycle for every kind:
 *
 *   plan    : the kind reads the server's current state, builds the exact payload,
 *             classifies every target (new / changed / unchanged), runs DHIS2's own
 *             dry run, and writes payload.json + review.md. Nothing changes.
 *   apply   : payload file re-hashed (tamper) → drift re-check → the person approves
 *             in the MCP host → drift re-check → one send → read-back of every target.
 *   outcome : unknown or interrupted sends are reconciled by reading, never re-sent.
 *
 * State lives on disk (survives restarts), is bound to the DHIS2 user/server/profile,
 * expires after 24 hours, and is refused on production.
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { canonicalJson, safeText, sha256 } from './security/plans.js';
import { toSafeErrorMessage } from './security/safe-errors.js';
import type { ApprovalResult, ConnectionIdentity } from './change-engine.js';

export type OpKindName = 'aggregate-data' | 'tracker-data' | 'sharing';
export type OpState = 'validated' | 'invalid' | 'applying' | 'verified' | 'partial' | 'not-applied' | 'failed'
  | 'applied-unverified' | 'unknown-outcome' | 'stale' | 'declined' | 'expired' | 'cancelled';
export type TargetResult = 'verified' | 'mismatch' | 'missing' | 'unchanged';

export interface OpTarget {
  key: string;                       // stable identity, e.g. "event/abc123" or "de|pe|ou|coc|aoc"
  label: string;
  action: 'create' | 'update';
  intended: unknown;                 // what read-back must find
  before?: unknown;                  // updates: what was there (for "unchanged" detection)
  result?: TargetResult;
  detail?: string;
}

export interface Operation {
  id: string;
  kind: OpKindName;
  owner: ConnectionIdentity;
  description: string;
  createdAt: string;
  expiresAt: string;
  state: OpState;
  summary: string;                   // one plain-language sentence
  warnings: string[];                // shown in the approval prompt
  skipped: number;                   // targets left out because they already match
  targets: OpTarget[];
  dryRun: { ok: boolean; summary: string; errors: string[] };
  payloadHash: string;
  dir: string;
  files: { payload: string; review: string; receipt?: string };
  note?: string;
}

export interface Planned<P> {
  description: string;
  payload: P;
  targets: OpTarget[];
  skipped: number;
  summary: string;
  warnings: string[];
  blocking: string[];                // problems: the operation is refused (state invalid, nothing to apply)
  dryRun: { ok: boolean; summary: string; errors: string[] };
  review: string;                    // markdown body (engine adds a header)
}

export interface CommitResult { rejected: boolean; summary: string; errors: string[] }

export interface OpKind<G, P> {
  name: OpKindName;
  plain: string;                     // "import data", "change sharing"
  plan(gw: G, input: Record<string, unknown>): Promise<Planned<P>>;
  /** Changes on the server since planning; empty when safe to send. */
  drift(gw: G, op: Operation, payload: P): Promise<string[]>;
  /** Send once. Throw only when the outcome is unknown (network/5xx/timeout). */
  commit(gw: G, payload: P, op: Operation): Promise<CommitResult>;
  /** Read every target back; set target.result (and detail). Return true if any read failed. */
  readBack(gw: G, op: Operation, payload: P): Promise<boolean>;
  approvalLines(op: Operation): string[];
}

export interface OpDeps<G> {
  gateway: () => G | null;
  identity: () => ConnectionIdentity | null;
  approve: (message: string) => Promise<ApprovalResult>;
  baseDir: () => string;
  now?: () => Date;
}

export class OperationError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = 'OperationError'; }
}

export const OP_LIMITS = { ttlHours: 24, maxDescription: 300 };

export async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]!); }
  }));
  return out;
}

const sameOwner = (a: ConnectionIdentity, b: ConnectionIdentity) => a.userId === b.userId && a.origin === b.origin && a.profile === b.profile;
const cell = (v: unknown, max = 80) => safeText(v ?? '', max).replace(/\|/g, '/');

export class OperationEngine<G> {
  private ops = new Map<string, Operation>();
  private kinds = new Map<OpKindName, OpKind<G, any>>();
  constructor(private deps: OpDeps<G>, kinds: Array<OpKind<G, any>>) { for (const k of kinds) this.kinds.set(k.name, k); }
  private now(): Date { return this.deps.now ? this.deps.now() : new Date(); }

  private conn() {
    const gw = this.deps.gateway(); const who = this.deps.identity();
    if (!gw || !who) throw new OperationError('not_connected', 'No verified DHIS2 connection.');
    if (who.environment === 'production') {
      throw new OperationError('production_read_only', 'Production is read-only: nothing is created or changed there. Do this on the development server.');
    }
    return { gw, who };
  }

  private save(op: Operation): void {
    const tmp = path.join(op.dir, 'state.json.tmp');
    fs.writeFileSync(tmp, JSON.stringify(op), 'utf8');
    fs.renameSync(tmp, path.join(op.dir, 'state.json'));
  }

  private owned(id: unknown): Operation {
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) throw new OperationError('unknown_operation', 'Unknown operation id.');
    let op = this.ops.get(id);
    if (!op) {
      try {
        const dir = path.join(this.deps.baseDir(), 'operations', id);
        op = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8')) as Operation;
        if (op.id !== id) throw new Error('mismatch');
        op.dir = dir;
        this.ops.set(id, op);
      } catch { throw new OperationError('unknown_operation', 'Unknown operation id.'); }
    }
    const who = this.deps.identity();
    if (!who || !sameOwner(op.owner, who)) throw new OperationError('wrong_session', 'This operation belongs to a different connection or user.');
    if (op.state === 'validated' && this.now() > new Date(op.expiresAt)) { op.state = 'expired'; this.save(op); }
    return op;
  }

  private kind(op: Operation): OpKind<G, any> { return this.kinds.get(op.kind)!; }

  private readPayload(op: Operation): unknown | null {
    try {
      const payload = JSON.parse(fs.readFileSync(op.files.payload, 'utf8'));
      return sha256(payload) === op.payloadHash ? payload : null;
    } catch { return null; }
  }

  async plan(kindName: OpKindName, input: Record<string, unknown>): Promise<Operation> {
    const kind = this.kinds.get(kindName);
    if (!kind) throw new OperationError('invalid', 'Unknown operation kind.');
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    if (!description || description.length > OP_LIMITS.maxDescription) {
      throw new OperationError('invalid', `description is required (at most ${OP_LIMITS.maxDescription} characters): say what this is for.`);
    }
    const { gw, who } = this.conn();
    const planned = await kind.plan(gw, { ...input, description });
    const id = randomUUID();
    const dir = path.join(this.deps.baseDir(), 'operations', id);
    fs.mkdirSync(dir, { recursive: true });
    const created = this.now();
    const state: OpState = planned.blocking.length || !planned.dryRun.ok || planned.targets.length === 0 ? 'invalid' : 'validated';
    const op: Operation = {
      id, kind: kindName, owner: { ...who }, description, createdAt: created.toISOString(),
      expiresAt: new Date(created.getTime() + OP_LIMITS.ttlHours * 3600_000).toISOString(),
      state, summary: planned.summary, warnings: planned.warnings, skipped: planned.skipped,
      targets: planned.targets, dryRun: planned.dryRun, payloadHash: sha256(planned.payload), dir,
      files: { payload: path.join(dir, 'payload.json'), review: path.join(dir, 'review.md') },
      ...(planned.blocking.length ? { note: planned.blocking.join(' ') } : planned.targets.length === 0 ? { note: 'Nothing to do: everything already matches.' } : {}),
    };
    fs.writeFileSync(op.files.payload, canonicalJson(planned.payload), 'utf8');
    fs.writeFileSync(op.files.review, [
      `# Review: ${cell(description, 300)}`, '',
      `Operation ${id} (${kind.plain}) on ${who.origin}, prepared ${op.createdAt}.`, '',
      `**In short:** ${planned.summary}`, '',
      ...(planned.blocking.length ? ['## Cannot be applied', '', ...planned.blocking.map(b => `- ${cell(b, 600)}`), ''] : []),
      ...(planned.warnings.length ? ['## Please check', '', ...planned.warnings.map(w => `- ${cell(w, 600)}`), ''] : []),
      `DHIS2 dry run: ${cell(planned.dryRun.summary, 300)}`, ...planned.dryRun.errors.map(e => `- ${cell(e, 300)}`), '',
      planned.review,
    ].join('\n'), 'utf8');
    this.ops.set(id, op);
    this.save(op);
    return op;
  }

  approvalMessage(op: Operation): string {
    return [
      `Allow the assistant to ${this.kind(op).plain} on the ${safeText(op.owner.environment ?? 'development', 20)} server ${op.owner.origin}?`,
      `In short: ${op.summary}`,
      `Purpose given by the assistant (unverified): "${safeText(op.description, 200)}"`,
      ...op.warnings.map(w => `⚠ ${safeText(w, 300)}`),
      ...this.kind(op).approvalLines(op),
      `Every item is listed in ${op.files.review}`,
      `DHIS2 dry run: ${safeText(op.dryRun.summary, 200)}. Operation ${op.id.slice(0, 8)}, sha256 ${op.payloadHash.slice(0, 12)}.`,
      'Approve only if this matches what you asked for.',
    ].join('\n');
  }

  async apply(id: unknown): Promise<Operation> {
    const { gw } = this.conn();
    const op = this.owned(id);
    if (op.state !== 'validated') {
      throw new OperationError('invalid_state', `Operation is "${op.state}" and cannot be applied${['expired', 'stale'].includes(op.state) ? '; plan it again' : ''}.`);
    }
    const kind = this.kind(op);
    const payload = this.readPayload(op);
    if (!payload) { op.state = 'stale'; this.save(op); throw new OperationError('tampered', 'The payload file no longer matches what was planned. Nothing was sent; plan it again.'); }
    op.state = 'applying'; // claimed before any await: replays and concurrent applies are refused
    let d: string[];
    try { d = await kind.drift(gw, op, payload); } catch (e) { op.state = 'validated'; throw e; }
    if (d.length) { op.state = 'stale'; this.save(op); throw new OperationError('stale', `Nothing was sent: ${d.slice(0, 10).join('; ')}${d.length > 10 ? ` (+${d.length - 10})` : ''}. Plan it again.`); }

    let answer: ApprovalResult;
    try { answer = await this.deps.approve(this.approvalMessage(op)); } catch { answer = 'unavailable'; }
    if (answer !== 'accept') {
      op.state = answer === 'unavailable' ? 'validated' : 'declined';
      this.save(op);
      throw new OperationError(answer === 'unavailable' ? 'no_approval_channel' : 'declined', answer === 'unavailable'
        ? 'The MCP host did not show the approval to the person. Nothing was sent.'
        : 'The person did not approve this. Nothing was sent. Do not retry without new direction.');
    }
    if (this.now() > new Date(op.expiresAt)) { op.state = 'expired'; this.save(op); throw new OperationError('expired', 'Expired before approval completed. Nothing was sent.'); }
    try { d = await kind.drift(gw, op, payload); } catch (e) { op.state = 'validated'; this.save(op); throw e; }
    if (d.length) { op.state = 'stale'; this.save(op); throw new OperationError('stale', `Changed during approval: ${d.slice(0, 10).join('; ')}. Nothing was sent.`); }

    this.save({ ...op, state: 'unknown-outcome' }); // a crash during the send is reconciled by reading next time
    let res: CommitResult;
    try {
      res = await kind.commit(gw, payload, op);
    } catch (e) {
      op.state = 'unknown-outcome';
      await this.reconcile(gw, op, payload, `Outcome unknown (${toSafeErrorMessage(e)}); reconciled by reading. Nothing was re-sent.`);
      return op;
    }
    await this.reconcile(gw, op, payload, res.rejected ? `DHIS2 rejected it: ${res.summary}${res.errors.length ? ` (${res.errors.slice(0, 5).join('; ')})` : ''}` : res.summary, res.rejected);
    return op;
  }

  private async reconcile(gw: G, op: Operation, payload: unknown, note?: string, rejected = false): Promise<void> {
    for (const t of op.targets) { delete t.result; delete t.detail; }
    const readFailed = await this.kind(op).readBack(gw, op, payload);
    const n = op.targets.length;
    const verified = op.targets.filter(t => t.result === 'verified').length;
    const untouched = op.targets.filter(t => t.result === 'unchanged' || (t.result === 'missing' && t.action === 'create')).length;
    op.state = readFailed ? 'unknown-outcome' : verified === n ? 'verified' : untouched === n ? (rejected ? 'failed' : 'not-applied')
      : verified > 0 ? 'partial' : 'applied-unverified';
    if (note) op.note = note;
    op.files.receipt = path.join(op.dir, 'receipt.json');
    fs.writeFileSync(op.files.receipt, JSON.stringify({
      operationId: op.id, kind: op.kind, payloadHash: op.payloadHash, state: op.state, checkedAt: this.now().toISOString(), note: op.note,
      counts: Object.fromEntries(['verified', 'mismatch', 'missing', 'unchanged'].map(r => [r, op.targets.filter(t => t.result === r).length])),
      problems: op.targets.filter(t => t.result !== 'verified').slice(0, 500).map(t => ({ key: t.key, result: t.result, detail: t.detail })),
    }, null, 2), 'utf8');
    this.save(op);
  }

  async get(id: unknown): Promise<Operation> {
    const op = this.owned(id);
    if (op.state === 'unknown-outcome' || op.state === 'applying') {
      const gw = this.deps.gateway();
      const payload = this.readPayload(op);
      if (gw && payload) await this.reconcile(gw, op, payload, 'Reconciled by reading after an interrupted or unknown send; nothing was re-sent.');
    }
    return op;
  }

  cancel(id: unknown): Operation {
    const op = this.owned(id);
    if (op.state !== 'validated') throw new OperationError('invalid_state', `Operation is "${op.state}" and cannot be cancelled.`);
    op.state = 'cancelled';
    this.save(op);
    return op;
  }
}

/** Model-facing text: counts and problems by key; no record values. */
export function describeOperation(op: Operation): string {
  const counts: Record<string, number> = {};
  for (const t of op.targets) counts[t.result ?? t.action] = (counts[t.result ?? t.action] ?? 0) + 1;
  const problems = op.targets.filter(t => t.result && t.result !== 'verified');
  const lines = [
    `Operation ${op.id}`, `Kind: ${op.kind}`, `State: ${op.state}`,
    `In short: ${op.summary}`,
    `Items: ${op.targets.length} (${Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(', ')})${op.skipped ? `; ${op.skipped} skipped as already identical` : ''}`,
    `DHIS2 dry run: ${op.dryRun.summary}`,
    ...op.dryRun.errors.slice(0, 20).map(e => `  - ${e}`),
    ...(op.warnings.length ? ['Warnings:', ...op.warnings.map(w => `  - ${w}`)] : []),
    ...(op.note ? [`Note: ${op.note}`] : []),
    ...(problems.length ? [`Read-back problems (${problems.length}):`, ...problems.slice(0, 20).map(t => `  - ${t.key}: ${t.result}${t.detail ? ` (${t.detail})` : ''}`)] : []),
    `Review: ${op.files.review}`,
    ...(op.files.receipt ? [`Receipt: ${op.files.receipt}`] : []),
  ];
  if (op.state === 'validated') lines.push('', 'Next: show the person the review file, then call dhis2_apply_operation. They approve in their MCP host; your arguments cannot approve it.');
  return lines.join('\n');
}
