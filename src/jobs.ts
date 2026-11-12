/**
 * Background jobs on a development server: analytics table generation.
 * Start needs the person's approval (it is heavy and slows the server); a second
 * run is refused while one is in progress; progress is read from DHIS2's task
 * notifications. Job records persist on disk. Refused on production.
 */
import fs from 'node:fs';
import path from 'node:path';
import { isUid, safeText } from './security/plans.js';
import type { ApprovalResult, ConnectionIdentity } from './change-engine.js';

export interface TaskNotification { time?: string; message?: string; level?: string; completed?: boolean }
export interface JobGateway {
  getRunningAnalytics(): Promise<Record<string, TaskNotification[]>>;
  startAnalytics(params: Record<string, string | number | boolean>): Promise<string>;
  getAnalyticsNotifications(jobId: string): Promise<TaskNotification[]>;
}
export interface Job {
  jobId: string; kind: 'analytics'; owner: ConnectionIdentity; reason: string; params: Record<string, string | number | boolean>;
  startedAt: string; state: 'running' | 'completed' | 'failed' | 'unknown'; lastMessages: string[]; checkedAt?: string;
}
export interface JobDeps {
  gateway: () => JobGateway | null; identity: () => ConnectionIdentity | null;
  approve: (message: string) => Promise<ApprovalResult>; baseDir: () => string; now?: () => Date;
}
export class JobError extends Error { constructor(public code: string, message: string) { super(message); this.name = 'JobError'; } }

/** Newest-first or oldest-first lists both handled: sort by time. */
function summarise(list: TaskNotification[]): { state: Job['state']; messages: string[] } {
  if (!Array.isArray(list) || !list.length) return { state: 'unknown', messages: [] };
  const sorted = [...list].sort((a, b) => String(a.time ?? '').localeCompare(String(b.time ?? '')));
  const messages = sorted.slice(-5).map(n => `${safeText(n.time ?? '', 25)} ${safeText(n.level ?? '', 8)} ${safeText(n.message ?? '', 200)}`.trim());
  if (sorted.some(n => String(n.level).toUpperCase() === 'ERROR')) return { state: 'failed', messages };
  return { state: sorted.some(n => n.completed === true) ? 'completed' : 'running', messages };
}

export class JobEngine {
  constructor(private deps: JobDeps) {}
  private now(): Date { return this.deps.now ? this.deps.now() : new Date(); }
  private file(jobId: string): string { return path.join(this.deps.baseDir(), 'jobs', `${jobId}.json`); }
  private save(j: Job): void { fs.mkdirSync(path.dirname(this.file(j.jobId)), { recursive: true }); fs.writeFileSync(this.file(j.jobId), JSON.stringify(j, null, 2), 'utf8'); }

  private conn() {
    const gw = this.deps.gateway(); const who = this.deps.identity();
    if (!gw || !who) throw new JobError('not_connected', 'No verified DHIS2 connection.');
    if (who.environment === 'production') throw new JobError('production_read_only', 'Production is read-only; the assistant does not start jobs there.');
    return { gw, who };
  }

  async startAnalytics(args: unknown): Promise<Job> {
    const a = (args ?? {}) as Record<string, unknown>;
    const reason = typeof a.reason === 'string' ? a.reason.trim() : '';
    if (!reason || reason.length > 300) throw new JobError('invalid', 'reason is required (at most 300 characters): say why analytics must run now.');
    const params: Record<string, string | number | boolean> = {};
    if (a.lastYears !== undefined) {
      if (!Number.isInteger(a.lastYears) || (a.lastYears as number) < 1 || (a.lastYears as number) > 20) throw new JobError('invalid', 'lastYears must be a whole number from 1 to 20.');
      params.lastYears = a.lastYears as number;
    }
    for (const f of ['skipResourceTables', 'skipEvents', 'skipEnrollment', 'skipAggregate'] as const) {
      if (a[f] !== undefined) { if (typeof a[f] !== 'boolean') throw new JobError('invalid', `${f} must be true or false.`); if (a[f]) params[f] = true; }
    }
    const { gw, who } = this.conn();
    const running = Object.entries(await gw.getRunningAnalytics()).filter(([, list]) => summarise(list).state === 'running');
    if (running.length) throw new JobError('already_running', `An analytics run is already in progress (job ${safeText(running[0]![0], 20)}). Wait for it with dhis2_get_job.`);
    const scope = [params.lastYears ? `the last ${params.lastYears} year(s)` : 'all years',
      ...(['skipAggregate', 'skipEvents', 'skipEnrollment'] as const).filter(f => params[f]).map(f => `skipping ${f.slice(4).toLowerCase()} data`)].join(', ');
    let answer: ApprovalResult;
    try {
      answer = await this.deps.approve([
        `Allow the assistant to rebuild the analytics tables on the ${safeText(who.environment ?? 'development', 20)} server ${who.origin}?`,
        'This makes newly entered data and new indicators visible in dashboards and reports. Nothing is created, changed or deleted in your data.',
        'It can take from minutes to hours and slows the server while it runs.',
        `Scope: ${scope}.`,
        `Reason given by the assistant (unverified): "${safeText(reason, 200)}"`,
      ].join('\n'));
    } catch { answer = 'unavailable'; }
    if (answer !== 'accept') {
      throw new JobError(answer === 'unavailable' ? 'no_approval_channel' : 'declined', answer === 'unavailable'
        ? 'The MCP host did not show the approval to the person. Nothing was started.'
        : 'The person did not approve the analytics run. Nothing was started.');
    }
    const jobId = await gw.startAnalytics(params);
    if (!isUid(jobId)) throw new JobError('unexpected', 'DHIS2 did not return a job id; check the Data Administration app before starting another run.');
    const job: Job = { jobId, kind: 'analytics', owner: { ...who }, reason, params, startedAt: this.now().toISOString(), state: 'running', lastMessages: [] };
    this.save(job);
    return job;
  }

  async get(jobId: unknown): Promise<Job> {
    if (!isUid(jobId)) throw new JobError('unknown_job', 'Unknown job id.');
    let job: Job;
    try { job = JSON.parse(fs.readFileSync(this.file(jobId), 'utf8')) as Job; } catch { throw new JobError('unknown_job', 'Unknown job id.'); }
    const { gw, who } = this.conn();
    if (job.owner.origin !== who.origin || job.owner.userId !== who.userId) throw new JobError('wrong_session', 'This job belongs to a different connection or user.');
    if (job.state === 'running' || job.state === 'unknown') {
      const s = summarise(await gw.getAnalyticsNotifications(jobId));
      job.state = s.state;
      if (s.messages.length) job.lastMessages = s.messages;
      job.checkedAt = this.now().toISOString();
      this.save(job);
    }
    return job;
  }
}

export function describeJob(j: Job): string {
  return [
    `Job ${j.jobId} (analytics)`, `State: ${j.state}`, `Started: ${j.startedAt}`,
    ...(j.lastMessages.length ? ['Latest progress:', ...j.lastMessages.map(m => `  ${m}`)] : []),
    ...(j.state === 'running' || j.state === 'unknown' ? ['', 'Check again later with dhis2_get_job. Do not start another run meanwhile.'] : []),
    ...(j.state === 'completed' ? ['', 'Analytics is up to date: now verify indicators and dashboards (a period with data and one without).'] : []),
  ].join('\n');
}
