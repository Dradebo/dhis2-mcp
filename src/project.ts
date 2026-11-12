/**
 * Customisation projects (PRODUCT-DESIGN phase D): the requirement ledger,
 * batched clarifications and the handover report, kept by the server rather
 * than in the agent's prose.
 *
 * - Every requirement must cite a registered source document (source-faithful).
 * - Only the person can make a "decided" requirement: through the host's form
 *   (via: host-form) or relayed from chat with their words quoted (via: relayed).
 *   The agent cannot mark something decided on its own.
 * - The handover derives "built" and "verified" from the change packages'
 *   on-disk receipts, not from what the agent says. Agent-reported checks are
 *   labelled as such.
 *
 * Local files only; no DHIS2 access.
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { safeText } from './security/plans.js';
import type { ApprovalResult } from './change-engine.js';

export type RequirementStatus = 'mapped' | 'reused' | 'question' | 'decided' | 'out-of-scope';
const AGENT_STATUSES: ReadonlySet<string> = new Set(['mapped', 'reused', 'question', 'out-of-scope']);

export interface SourceRef { document: string; location: string; quote?: string }
export interface Decision { answer: string; note?: string; via: 'host-form' | 'relayed'; personWords?: string; at: string; question: string }
export interface Requirement {
  ref: string; text: string; source: SourceRef; status: RequirementStatus;
  proposal?: string; reason?: string;
  objects?: Array<{ objectType: string; id: string }>;
  packageIds?: string[];
  decision?: Decision;
  pendingQuestion?: { question: string; options: string[]; recommended?: string };
  updatedAt: string;
}
export interface Check { name: string; result: 'passed' | 'failed' | 'not-run'; evidence: string; at: string }
export interface Project {
  id: string; goal: string; createdAt: string;
  documents: Array<{ id: string; title: string; kind?: string }>;
  requirements: Requirement[];
  checks: Check[];
  dir: string;
}

export interface ClarificationAnswers { action: ApprovalResult; content?: Record<string, unknown> }
export interface ProjectDeps {
  baseDir: () => string;
  /** Show a form to the person through the MCP host. */
  ask: (message: string, schema: Record<string, unknown>) => Promise<ClarificationAnswers>;
  now?: () => Date;
}

export class ProjectError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = 'ProjectError'; }
}

export const PROJECT_LIMITS = { documents: 100, requirements: 3000, questionsPerRound: 5, options: 4, text: 600 };
const REF_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;
const UUID_RE = /^[0-9a-f-]{36}$/;
const UID_RE = /^[A-Za-z][A-Za-z0-9]{10}$/;
const OTHER = 'Other (explain in the comment)';

function str(v: unknown, field: string, max = PROJECT_LIMITS.text, required = true): string | undefined {
  if (v === undefined || v === null || v === '') {
    if (required) throw new ProjectError('invalid', `${field} is required.`);
    return undefined;
  }
  if (typeof v !== 'string') throw new ProjectError('invalid', `${field} must be text.`);
  const s = v.trim();
  if (s.length > max) throw new ProjectError('invalid', `${field} must be at most ${max} characters.`);
  if (required && !s) throw new ProjectError('invalid', `${field} is required.`);
  return s || undefined;
}

/** Markdown table cell: one line, no pipes. */
function cell(v: unknown, max = 120): string { return safeText(v ?? '', max).replace(/\|/g, '/'); }

export class ProjectEngine {
  private cache = new Map<string, Project>();
  constructor(private deps: ProjectDeps) {}
  private now(): string { return (this.deps.now ? this.deps.now() : new Date()).toISOString(); }
  private root(): string { return path.join(this.deps.baseDir(), 'projects'); }

  private save(p: Project): void {
    fs.mkdirSync(p.dir, { recursive: true });
    const tmp = path.join(p.dir, 'ledger.json.tmp');
    fs.writeFileSync(tmp, JSON.stringify(p, null, 2), 'utf8');
    fs.renameSync(tmp, path.join(p.dir, 'ledger.json'));
  }

  get(projectId: unknown): Project {
    if (typeof projectId !== 'string' || !UUID_RE.test(projectId)) throw new ProjectError('unknown_project', 'Unknown project id.');
    const cached = this.cache.get(projectId);
    if (cached) return cached;
    const dir = path.join(this.root(), projectId);
    try {
      const p = JSON.parse(fs.readFileSync(path.join(dir, 'ledger.json'), 'utf8')) as Project;
      if (p.id !== projectId) throw new Error('mismatch');
      p.dir = dir;
      this.cache.set(projectId, p);
      return p;
    } catch { throw new ProjectError('unknown_project', 'Unknown project id.'); }
  }

  start(args: unknown): Project {
    const a = (args ?? {}) as Record<string, unknown>;
    const goal = str(a.goal, 'goal', 400)!;
    const docs = Array.isArray(a.documents) ? a.documents : [];
    if (!docs.length || docs.length > PROJECT_LIMITS.documents) throw new ProjectError('invalid', `documents must list 1-${PROJECT_LIMITS.documents} source documents ({id, title, kind?}).`);
    const seen = new Set<string>();
    const documents = docs.map((d, i) => {
      const o = (d ?? {}) as Record<string, unknown>;
      const id = str(o.id, `documents[${i}].id`, 40)!;
      if (!REF_RE.test(id)) throw new ProjectError('invalid', `documents[${i}].id: use letters, digits, ".", "_" or "-".`);
      if (seen.has(id)) throw new ProjectError('invalid', `Duplicate document id "${id}".`);
      seen.add(id);
      const kind = str(o.kind, `documents[${i}].kind`, 60, false);
      return { id, title: str(o.title, `documents[${i}].title`, 200)!, ...(kind ? { kind } : {}) };
    });
    const id = randomUUID();
    const p: Project = { id, goal, createdAt: this.now(), documents, requirements: [], checks: [], dir: path.join(this.root(), id) };
    this.save(p);
    this.cache.set(id, p);
    return p;
  }

  /** Upsert requirements by ref and append agent-reported checks. */
  update(args: unknown): Project {
    const a = (args ?? {}) as Record<string, unknown>;
    const p = this.get(a.projectId);
    const reqs = a.requirements === undefined ? [] : a.requirements;
    const checks = a.checks === undefined ? [] : a.checks;
    if (!Array.isArray(reqs) || !Array.isArray(checks)) throw new ProjectError('invalid', 'requirements and checks must be arrays.');
    if (!reqs.length && !checks.length) throw new ProjectError('invalid', 'Nothing to update: give requirements and/or checks.');
    const docIds = new Set(p.documents.map(d => d.id));
    const next = new Map(p.requirements.map(r => [r.ref, structuredClone(r)]));
    const problems: string[] = [];
    reqs.forEach((raw, i) => {
      const at = `requirements[${i}]`;
      try {
        const o = (raw ?? {}) as Record<string, unknown>;
        const ref = str(o.ref, `${at}.ref`, 40)!;
        if (!REF_RE.test(ref)) throw new ProjectError('invalid', `${at}.ref: use letters, digits, ".", "_" or "-".`);
        const existing = next.get(ref);
        const src = (o.source ?? existing?.source) as Record<string, unknown> | undefined;
        if (!src || typeof src !== 'object') throw new ProjectError('invalid', `${at}.source is required: {document, location, quote?}.`);
        const document = str(src.document, `${at}.source.document`, 40)!;
        if (!docIds.has(document)) throw new ProjectError('invalid', `${at}.source.document "${safeText(document, 40)}" is not one of this project's documents (${[...docIds].join(', ')}). Every requirement must cite a source.`);
        const quote = str(src.quote, `${at}.source.quote`, 300, false);
        const source: SourceRef = { document, location: str(src.location, `${at}.source.location`, 120)!, ...(quote ? { quote } : {}) };
        const text = str(o.text ?? existing?.text, `${at}.text`)!;

        if (existing?.status === 'decided' && o.decision === undefined
          && ((o.status !== undefined && o.status !== 'decided') || (o.text !== undefined && o.text !== existing.text))) {
          throw new ProjectError('invalid', `${at}: ${ref} was decided by the person; its status and wording cannot be changed without a new answer from them.`);
        }
        let status = (o.status ?? existing?.status ?? 'mapped') as string;
        let decision = existing?.decision;
        if (o.decision !== undefined) {
          const d = (o.decision ?? {}) as Record<string, unknown>;
          const personWords = str(d.personWords, `${at}.decision.personWords`, 400)!;
          decision = { answer: str(d.answer, `${at}.decision.answer`)!, via: 'relayed', personWords, at: this.now(),
            question: existing?.pendingQuestion?.question ?? str(d.question, `${at}.decision.question`)! };
          status = 'decided';
        } else if (status === 'decided' && existing?.status !== 'decided') {
          throw new ProjectError('invalid', `${at}: only the person can decide. Use dhis2_ask_clarifications, or relay their answer as decision {answer, personWords}.`);
        } else if (status !== 'decided' && !AGENT_STATUSES.has(status)) {
          throw new ProjectError('invalid', `${at}.status must be one of: mapped, reused, question, out-of-scope.`);
        }
        const reason = str(o.reason ?? existing?.reason, `${at}.reason`, 400, false);
        if (status === 'out-of-scope' && !reason) throw new ProjectError('invalid', `${at}: out-of-scope needs a reason.`);

        let objects = existing?.objects;
        if (o.objects !== undefined) {
          if (!Array.isArray(o.objects) || o.objects.length > 200) throw new ProjectError('invalid', `${at}.objects must be an array of at most 200 {objectType, id}.`);
          objects = o.objects.map((x, j) => {
            const ob = (x ?? {}) as Record<string, unknown>;
            if (typeof ob.objectType !== 'string' || !/^[A-Za-z]{2,60}$/.test(ob.objectType) || typeof ob.id !== 'string' || !UID_RE.test(ob.id)) {
              throw new ProjectError('invalid', `${at}.objects[${j}] needs objectType and an 11-character id.`);
            }
            return { objectType: ob.objectType, id: ob.id };
          });
        }
        let packageIds = existing?.packageIds;
        if (o.packageIds !== undefined) {
          if (!Array.isArray(o.packageIds) || o.packageIds.length > 20 || o.packageIds.some(x => typeof x !== 'string' || !UUID_RE.test(x))) {
            throw new ProjectError('invalid', `${at}.packageIds must be up to 20 package ids.`);
          }
          packageIds = [...new Set(o.packageIds as string[])];
        }
        const proposal = str(o.proposal ?? existing?.proposal, `${at}.proposal`, PROJECT_LIMITS.text, false);
        const r: Requirement = {
          ref, text, source, status: status as RequirementStatus, updatedAt: this.now(),
          ...(proposal ? { proposal } : {}), ...(reason ? { reason } : {}),
          ...(objects ? { objects } : {}), ...(packageIds ? { packageIds } : {}), ...(decision ? { decision } : {}),
          ...(existing?.pendingQuestion && status !== 'decided' ? { pendingQuestion: existing.pendingQuestion } : {}),
        };
        next.set(ref, r);
      } catch (e) {
        if (!(e instanceof ProjectError)) throw e;
        problems.push(e.message);
      }
    });
    const newChecks: Check[] = [];
    checks.forEach((raw, i) => {
      const o = (raw ?? {}) as Record<string, unknown>;
      try {
        const result = o.result;
        if (result !== 'passed' && result !== 'failed' && result !== 'not-run') throw new ProjectError('invalid', `checks[${i}].result must be passed, failed or not-run.`);
        newChecks.push({ name: str(o.name, `checks[${i}].name`, 200)!, result, evidence: str(o.evidence, `checks[${i}].evidence`, 600)!, at: this.now() });
      } catch (e) { if (!(e instanceof ProjectError)) throw e; problems.push(e.message); }
    });
    if (problems.length) throw new ProjectError('invalid', `Nothing was saved:\n- ${problems.slice(0, 30).join('\n- ')}`);
    if (next.size > PROJECT_LIMITS.requirements) throw new ProjectError('invalid', `At most ${PROJECT_LIMITS.requirements} requirements per project.`);
    // Commit only when the whole batch is valid.
    p.requirements = [...next.values()];
    for (const c of newChecks) {
      const idx = p.checks.findIndex(x => x.name === c.name);
      if (idx >= 0) p.checks[idx] = c; else p.checks.push(c);
    }
    this.save(p);
    return p;
  }

  /** One form, up to 5 questions, each tied to a requirement and citing its source. */
  async askClarifications(args: unknown): Promise<{ project: Project; answered: string[]; pending: string[]; fallback?: string }> {
    const a = (args ?? {}) as Record<string, unknown>;
    const p = this.get(a.projectId);
    const qs = Array.isArray(a.questions) ? a.questions : [];
    if (!qs.length || qs.length > PROJECT_LIMITS.questionsPerRound) {
      throw new ProjectError('invalid', `Ask 1-${PROJECT_LIMITS.questionsPerRound} questions per round. Batch them; never ask piecemeal.`);
    }
    const byRef = new Map(p.requirements.map(r => [r.ref, r]));
    const seen = new Set<string>();
    const questions = qs.map((raw, i) => {
      const o = (raw ?? {}) as Record<string, unknown>;
      const ref = str(o.ref, `questions[${i}].ref`, 40)!;
      const req = byRef.get(ref);
      if (!req) throw new ProjectError('invalid', `questions[${i}].ref "${safeText(ref, 40)}" is not a requirement in the ledger; record it first (status "question").`);
      if (req.status === 'decided') throw new ProjectError('invalid', `Requirement ${ref} is already decided.`);
      if (seen.has(ref)) throw new ProjectError('invalid', `Requirement ${ref} appears twice.`);
      seen.add(ref);
      const options = Array.isArray(o.options) ? o.options.map((x, j) => str(x, `questions[${i}].options[${j}]`, 150)!) : [];
      if (options.length < 2 || options.length > PROJECT_LIMITS.options || new Set(options).size !== options.length) {
        throw new ProjectError('invalid', `questions[${i}].options must list 2-${PROJECT_LIMITS.options} distinct choices ("Other" is added automatically).`);
      }
      const recommended = str(o.recommended, `questions[${i}].recommended`, 150, false);
      if (recommended && !options.includes(recommended)) throw new ProjectError('invalid', `questions[${i}].recommended must be one of the options.`);
      return { ref, req, question: str(o.question, `questions[${i}].question`, 300)!, options, ...(recommended ? { recommended } : {}) };
    });

    const properties: Record<string, unknown> = {};
    const lines = [`Questions about: ${safeText(p.goal, 200)}`, 'The documents do not settle these. Pick an answer for each (you can skip any).', ''];
    questions.forEach((q, i) => {
      const n = i + 1;
      const src = `${q.req.source.document}, ${q.req.source.location}`;
      lines.push(`${n}. ${safeText(q.question, 300)}`, `   Source: ${safeText(src, 160)}${q.req.source.quote ? ` "${safeText(q.req.source.quote, 160)}"` : ''}`);
      if (q.recommended) lines.push(`   Assistant's suggestion: ${safeText(q.recommended, 150)}`);
      properties[`q${n}`] = { type: 'string', title: `${n}. ${safeText(q.question, 120)}`, enum: [...q.options.map(x => safeText(x, 150)), OTHER] };
      properties[`q${n}_comment`] = { type: 'string', title: `${n}. Comment (optional)`, maxLength: 500 };
    });
    // Mark as pending first, so an interrupted round is visible in the ledger.
    for (const q of questions) {
      q.req.status = 'question';
      q.req.pendingQuestion = { question: q.question, options: q.options, ...(q.recommended ? { recommended: q.recommended } : {}) };
    }
    this.save(p);

    let res: ClarificationAnswers;
    try { res = await this.deps.ask(lines.join('\n'), { type: 'object', properties }); } catch { res = { action: 'unavailable' }; }
    if (res.action !== 'accept') {
      const fallback = res.action === 'unavailable'
        ? 'This assistant host cannot show forms. Ask the person these questions in the chat, then record each answer with dhis2_record_requirements as decision {answer, personWords} (quote their words).'
        : 'The person closed the questions without answering. They stay open in the ledger; do not guess the answers.';
      return { project: p, answered: [], pending: questions.map(q => q.ref), fallback };
    }
    const content = res.content ?? {};
    const answered: string[] = [];
    const pending: string[] = [];
    questions.forEach((q, i) => {
      const n = i + 1;
      const choice = content[`q${n}`];
      const comment = typeof content[`q${n}_comment`] === 'string' ? (content[`q${n}_comment`] as string).trim().slice(0, 500) : '';
      const valid = typeof choice === 'string' && (choice === OTHER || q.options.map(x => safeText(x, 150)).includes(choice));
      if (!valid || (choice === OTHER && !comment)) { pending.push(q.ref); return; }
      const answer = choice === OTHER ? comment : q.options[q.options.map(x => safeText(x, 150)).indexOf(choice as string)]!;
      q.req.decision = { answer, ...(comment && choice !== OTHER ? { note: comment } : {}), via: 'host-form', at: this.now(), question: q.question };
      q.req.status = 'decided';
      delete q.req.pendingQuestion;
      q.req.updatedAt = this.now();
      answered.push(q.ref);
    });
    this.save(p);
    return { project: p, answered, pending };
  }

  /** Build the handover from the ledger plus the packages' and transfers' own records. */
  writeHandover(projectId: unknown): { project: Project; file: string; complete: boolean; open: string[] } {
    const p = this.get(projectId);
    const pkgDir = path.join(this.deps.baseDir(), 'packages');
    const pkgCache = new Map<string, any>();
    const readPkg = (id: string): any => {
      if (!pkgCache.has(id)) {
        let v: any = null;
        try { v = JSON.parse(fs.readFileSync(path.join(pkgDir, id, 'package-state.json'), 'utf8')); } catch { v = null; }
        pkgCache.set(id, v && v.id === id ? v : null);
      }
      return pkgCache.get(id);
    };
    type Built = 'verified' | 'not-verified' | 'not-built' | 'n/a';
    const builtState = (r: Requirement): { state: Built; detail: string } => {
      if (r.status === 'out-of-scope' || r.status === 'question') return { state: 'n/a', detail: '' };
      if (!r.packageIds?.length) return { state: 'not-built', detail: 'no change package linked' };
      const pkgs = r.packageIds.map(readPkg);
      const missing = r.packageIds.filter((_, i) => !pkgs[i]);
      if (missing.length) return { state: 'not-verified', detail: `package record not found: ${missing.map(x => x.slice(0, 8)).join(', ')}` };
      const notVerified = pkgs.filter(x => x.state !== 'verified');
      if (notVerified.length) return { state: 'not-verified', detail: notVerified.map(x => `package ${x.id.slice(0, 8)} is ${x.state}`).join('; ') };
      // Every linked object must be in a verified package's read-back.
      const verifiedObjects = new Set(pkgs.flatMap(x => (x.targets ?? []).filter((t: any) => t.result === 'verified').map((t: any) => `${t.objectType}/${t.id}`)));
      const unverified = (r.objects ?? []).filter(o => !verifiedObjects.has(`${o.objectType}/${o.id}`));
      if (r.status !== 'reused' && unverified.length) return { state: 'not-verified', detail: `not in a verified read-back: ${unverified.slice(0, 5).map(o => `${o.objectType}/${o.id}`).join(', ')}` };
      return { state: 'verified', detail: `read back by the server (${pkgs.map(x => x.id.slice(0, 8)).join(', ')})` };
    };
    const rows = p.requirements.map(r => ({ r, b: r.status === 'reused' && !r.packageIds?.length ? { state: 'n/a' as Built, detail: 'existing object reused' } : builtState(r) }));
    const open: string[] = [];
    for (const { r, b } of rows) {
      if (r.status === 'question') open.push(`${r.ref}: unanswered question${r.pendingQuestion ? ` ("${safeText(r.pendingQuestion.question, 100)}")` : ''}`);
      else if (b.state === 'not-built') open.push(`${r.ref}: not built (${b.detail})`);
      else if (b.state === 'not-verified') open.push(`${r.ref}: built but not verified (${b.detail})`);
    }
    for (const c of p.checks) if (c.result !== 'passed') open.push(`check "${safeText(c.name, 80)}": ${c.result}`);
    const linkedPkgs = [...new Set(p.requirements.flatMap(r => r.packageIds ?? []))];
    const transfersDir = path.join(this.deps.baseDir(), 'transfers');
    const transfers: any[] = [];
    try {
      for (const t of fs.readdirSync(transfersDir)) {
        if (!UUID_RE.test(t)) continue;
        try {
          const meta = JSON.parse(fs.readFileSync(path.join(transfersDir, t, 'transfer.json'), 'utf8'));
          if (Array.isArray(meta.items) && meta.items.some((i: any) => p.requirements.some(r => r.objects?.some(o => o.id === i.id)))) transfers.push(meta);
        } catch { /* skip unreadable */ }
      }
    } catch { /* no transfers yet */ }
    const complete = open.length === 0 && p.requirements.length > 0;
    const count = (s: string) => p.requirements.filter(r => r.status === s).length;
    const decisions = p.requirements.filter(r => r.decision);

    const md = [
      `# Handover: ${cell(p.goal, 300)}`, '',
      `Generated ${this.now()} by the DHIS2 MCP server from its own records. Project ${p.id}.`,
      complete ? '**Status: complete.** Every requirement is verified, reused, decided-and-verified or out of scope, and every recorded check passed.'
        : `**Status: not complete.** ${open.length} item(s) are open (listed below).`, '',
      '## Sources', '',
      ...p.documents.map(d => `- **${cell(d.id, 40)}**: ${cell(d.title, 200)}${d.kind ? ` (${cell(d.kind, 60)})` : ''}`), '',
      '## Summary', '',
      `- ${p.requirements.length} requirement(s): ${count('mapped')} built new, ${count('reused')} reused, ${count('decided')} decided by the person, ${count('question')} still a question, ${count('out-of-scope')} out of scope.`,
      `- ${rows.filter(x => x.b.state === 'verified').length} verified by reading DHIS2 back after the change.`,
      `- ${linkedPkgs.length} change package(s) linked.`, '',
      ...(open.length ? ['## Open items', '', ...open.map(o => `- ${cell(o, 300)}`), ''] : []),
      '## Decisions made by the person', '',
      ...(decisions.length ? decisions.map(r => `- **${cell(r.ref, 40)}**: ${cell(r.decision!.question, 200)} → **${cell(r.decision!.answer, 200)}**${r.decision!.note ? ` (${cell(r.decision!.note, 200)})` : ''}. ${
        r.decision!.via === 'host-form' ? 'Answered in the approval form' : `Relayed by the assistant from chat, person's words: "${cell(r.decision!.personWords, 300)}"`}, ${r.decision!.at}.`)
        : ['- None.']), '',
      '## Requirements', '',
      '| Ref | Requirement | Source | Status | Built | Detail |', '|---|---|---|---|---|---|',
      ...rows.map(({ r, b }) => `| ${cell(r.ref, 40)} | ${cell(r.text, 140)} | ${cell(`${r.source.document} ${r.source.location}`, 80)} | ${r.status} | ${b.state} | ${cell(
        r.status === 'out-of-scope' ? r.reason : b.detail || r.proposal || '', 160)} |`), '',
      '## Change packages', '',
      ...(linkedPkgs.length ? linkedPkgs.map(id => { const x = readPkg(id); return x
        ? `- ${id}: **${x.state}**, ${Array.isArray(x.targets) ? x.targets.length : 0} object(s): ${cell(x.description, 200)}`
        : `- ${id}: record not found`; }) : ['- None linked.']), '',
      '## Checks reported by the assistant', '',
      'These were run by the assistant and are reported as it described them; the server did not run them.', '',
      ...(p.checks.length ? p.checks.map(c => `- ${c.result === 'passed' ? 'Passed' : c.result === 'failed' ? 'FAILED' : 'Not run'}: ${cell(c.name, 200)}. ${cell(c.evidence, 400)}`) : ['- None reported.']), '',
      '## Moving to production', '',
      ...(transfers.length ? transfers.map(t => `- Transfer ${t.id}: **${t.state}** (to ${cell(t.target?.origin, 100)})`)
        : ['- Not started. Production is read-only for the assistant: dhis2_prepare_transfer → the person approves → a production administrator imports → dhis2_verify_transfer.']),
    ].join('\n');
    const file = path.join(p.dir, 'handover.md');
    fs.writeFileSync(file, md, 'utf8');
    return { project: p, file, complete, open };
  }
}

export function describeProject(p: Project): string {
  const by: Record<string, number> = {};
  for (const r of p.requirements) by[r.status] = (by[r.status] ?? 0) + 1;
  const questions = p.requirements.filter(r => r.status === 'question');
  return [
    `Project ${p.id}`,
    `Goal: ${safeText(p.goal, 300)}`,
    `Documents: ${p.documents.map(d => d.id).join(', ')}`,
    `Requirements: ${p.requirements.length}${p.requirements.length ? ` (${Object.entries(by).map(([k, n]) => `${n} ${k}`).join(', ')})` : ''}`,
    ...(questions.length ? [`Open questions (${questions.length}): ${questions.slice(0, 15).map(r => r.ref).join(', ')}${questions.length > 15 ? ', …' : ''}`] : []),
    `Checks recorded: ${p.checks.length}`,
    `Ledger: ${path.join(p.dir, 'ledger.json')}`,
  ].join('\n');
}
