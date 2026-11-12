/**
 * Aggregate data values (dataValueSets). Every row is compared with what the
 * server holds now: new, overwrite (shown with old → new), or already identical
 * (skipped). Deleting values (empty value) is not supported.
 */
import { isUid, safeText } from '../security/plans.js';
import { OpKind, OpTarget, OperationError } from '../operations.js';
import type { AggValue, DataGateway } from './gateway.js';

export const AGG_LIMITS = { maxValues: 20000 };
const PERIOD_RE = /^\d{4}([A-Za-z0-9]{0,12})$/;
const key = (v: Pick<AggValue, 'dataElement' | 'period' | 'orgUnit' | 'categoryOptionCombo' | 'attributeOptionCombo'>) =>
  `${v.dataElement}|${v.period}|${v.orgUnit}|${v.categoryOptionCombo}|${v.attributeOptionCombo}`;

/** "5" equals "5.0"; text compared exactly. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === undefined || a === null) return b === undefined || b === null;
  const sa = String(a), sb = String(b ?? '');
  if (sa === sb) return true;
  const na = Number(sa), nb = Number(sb);
  return sa.trim() !== '' && sb.trim() !== '' && Number.isFinite(na) && Number.isFinite(nb) && na === nb;
}

function parseRows(input: unknown, defaultCoc: () => Promise<string>): Promise<{ rows: AggValue[]; problems: string[] }> {
  return (async () => {
    const problems: string[] = [];
    if (!Array.isArray(input) || input.length === 0) return { rows: [], problems: ['dataValues must be a non-empty array.'] };
    if (input.length > AGG_LIMITS.maxValues) return { rows: [], problems: [`At most ${AGG_LIMITS.maxValues} values per import; split it.`] };
    let def: string | undefined;
    const rows: AggValue[] = [];
    const seen = new Set<string>();
    for (const [i, raw] of input.entries()) {
      const at = `dataValues[${i}]`;
      const o = (raw ?? {}) as Record<string, unknown>;
      if (!isUid(o.dataElement) || !isUid(o.orgUnit)) { problems.push(`${at}: dataElement and orgUnit must be 11-character ids.`); continue; }
      if (typeof o.period !== 'string' || !PERIOD_RE.test(o.period)) { problems.push(`${at}: period must be a DHIS2 period such as 202601, 2026Q1 or 2026.`); continue; }
      for (const f of ['categoryOptionCombo', 'attributeOptionCombo'] as const) {
        if (o[f] !== undefined && !isUid(o[f])) { problems.push(`${at}: ${f} must be an 11-character id if given.`); }
      }
      if (o.value === undefined || o.value === null || String(o.value).trim() === '' || typeof o.value === 'object') {
        problems.push(`${at}: value is required (deleting values is not supported).`); continue;
      }
      if (String(o.value).length > 50000) { problems.push(`${at}: value is too long.`); continue; }
      if (o.comment !== undefined && (typeof o.comment !== 'string' || o.comment.length > 360)) { problems.push(`${at}: comment must be text of at most 360 characters.`); continue; }
      if (!o.categoryOptionCombo || !o.attributeOptionCombo) def ??= await defaultCoc();
      const row: AggValue = {
        dataElement: o.dataElement, period: o.period, orgUnit: o.orgUnit,
        categoryOptionCombo: (o.categoryOptionCombo as string) ?? def!, attributeOptionCombo: (o.attributeOptionCombo as string) ?? def!,
        value: String(o.value), ...(typeof o.comment === 'string' ? { comment: o.comment } : {}),
      };
      const k = key(row);
      if (seen.has(k)) { problems.push(`${at} repeats ${k}; each value may appear once.`); continue; }
      seen.add(k);
      rows.push(row);
    }
    return { rows, problems };
  })();
}

async function currentValues(gw: DataGateway, rows: AggValue[]): Promise<Map<string, AggValue>> {
  const uniq = (f: (r: AggValue) => string) => [...new Set(rows.map(f))];
  const found = await gw.getCurrentDataValues({ dataElements: uniq(r => r.dataElement), periods: uniq(r => r.period), orgUnits: uniq(r => r.orgUnit) });
  return new Map(found.map(v => [key(v), v]));
}

function parseSummary(httpStatus: number, s: any): { ok: boolean; text: string; errors: string[]; imported: number; updated: number; ignored: number } {
  const ic = s?.importCount ?? {};
  const imported = Number(ic.imported ?? 0), updated = Number(ic.updated ?? 0), ignored = Number(ic.ignored ?? 0);
  const errors = (Array.isArray(s?.conflicts) ? s.conflicts : []).slice(0, 50)
    .map((c: any) => `${safeText(c?.errorCode ?? '', 10)} ${safeText(c?.object ?? '', 40)}: ${safeText(c?.value ?? c?.message ?? '', 200)}`.trim());
  const status = String(s?.status ?? 'UNKNOWN');
  return { ok: httpStatus < 400 && status !== 'ERROR' && ignored === 0 && errors.length === 0, text: `${status}: ${imported} new, ${updated} updated, ${ignored} ignored`, errors, imported, updated, ignored };
}

export const aggregateKind: OpKind<DataGateway, { dataValues: AggValue[] }> = {
  name: 'aggregate-data',
  plain: 'import aggregate data values',

  async plan(gw, input) {
    const { rows, problems } = await parseRows(input.dataValues, () => gw.getDefaultCategoryOptionCombo());
    if (problems.length) throw new OperationError('invalid', `Data cannot be planned:\n- ${problems.slice(0, 40).join('\n- ')}${problems.length > 40 ? `\n- (+${problems.length - 40} more)` : ''}`);
    const current = await currentValues(gw, rows);
    const targets: OpTarget[] = [];
    const send: AggValue[] = [];
    let skipped = 0;
    for (const r of rows) {
      const k = key(r);
      const before = current.get(k);
      if (before && sameValue(before.value, r.value) && (r.comment === undefined || r.comment === (before.comment ?? ''))) { skipped++; continue; }
      send.push(r);
      targets.push({ key: k, label: `${r.dataElement} ${r.period} ${r.orgUnit}`, action: before ? 'update' : 'create',
        intended: { value: r.value, ...(r.comment !== undefined ? { comment: r.comment } : {}) },
        ...(before ? { before: { value: before.value, ...(before.comment ? { comment: before.comment } : {}) } } : {}) });
    }
    const overwrites = targets.filter(t => t.action === 'update');
    const ous = new Set(send.map(r => r.orgUnit)).size, pes = new Set(send.map(r => r.period)).size;
    const summary = `${targets.length - overwrites.length} new value(s), ${overwrites.length} existing value(s) replaced, ${skipped} already identical (not sent); ${ous} org unit(s), ${pes} period(s). Nothing is deleted.`;
    let dryRun = { ok: true, summary: 'not needed (nothing to send)', errors: [] as string[] };
    if (send.length) {
      const { httpStatus, summary: s } = await gw.postDataValues({ dataValues: send }, true);
      const p = parseSummary(httpStatus, s);
      const counted = p.imported + p.updated;
      dryRun = { ok: p.ok && counted === send.length, summary: p.text, errors: counted === send.length ? p.errors : [...p.errors, `DHIS2 counted ${counted} value(s), expected ${send.length}.`] };
    }
    return {
      description: String(input.description), payload: { dataValues: send }, targets, skipped, summary,
      warnings: overwrites.length ? [`${overwrites.length} value(s) already entered on the server will be replaced (listed in the review file with old and new values).`] : [],
      blocking: [], dryRun,
      review: ['| Action | Data element | Period | Org unit | Category combo | Attribute combo | Before | After |', '|---|---|---|---|---|---|---|---|',
        ...send.map((r, i) => `| ${targets[i]!.action === 'update' ? 'replace' : 'new'} | ${r.dataElement} | ${r.period} | ${r.orgUnit} | ${r.categoryOptionCombo} | ${r.attributeOptionCombo} | ${
          targets[i]!.before ? safeText((targets[i]!.before as any).value, 60).replace(/\|/g, '/') : ''} | ${safeText(r.value, 60).replace(/\|/g, '/')} |`)].join('\n'),
    };
  },

  async drift(gw, op, payload) {
    const current = await currentValues(gw, payload.dataValues);
    const out: string[] = [];
    for (const t of op.targets) {
      const cur = current.get(t.key);
      const before = t.before as { value: string } | undefined;
      if (!before && cur) out.push(`${t.key} was entered by someone else since planning`);
      else if (before && (!cur || !sameValue(cur.value, before.value))) out.push(`${t.key} changed since planning`);
    }
    return out;
  },

  async commit(gw, payload) {
    const { httpStatus, summary } = await gw.postDataValues(payload, false);
    if (httpStatus >= 500) throw new Error(`HTTP ${httpStatus}`);
    const p = parseSummary(httpStatus, summary);
    return { rejected: !p.ok && p.imported + p.updated === 0, summary: p.text, errors: p.errors };
  },

  async readBack(gw, op, payload) {
    let current: Map<string, AggValue>;
    try { current = await currentValues(gw, payload.dataValues); } catch { return true; }
    for (const t of op.targets) {
      const cur = current.get(t.key);
      const want = t.intended as { value: string; comment?: string };
      if (!cur) { t.result = 'missing'; continue; }
      if (sameValue(cur.value, want.value) && (want.comment === undefined || want.comment === (cur.comment ?? ''))) { t.result = 'verified'; continue; }
      const before = t.before as { value: string } | undefined;
      if (before && sameValue(cur.value, before.value)) { t.result = 'unchanged'; continue; }
      t.result = 'mismatch';
      t.detail = 'the server holds a different value';
    }
    return false;
  },

  approvalLines(op) {
    const replaced = op.targets.filter(t => t.action === 'update');
    return replaced.length ? ['Values that will be replaced (first 10):',
      ...replaced.slice(0, 10).map(t => `  ${t.label}: ${safeText((t.before as any).value, 30)} → ${safeText((t.intended as any).value, 30)}`)] : [];
  },
};

export const aggregateKey = key;
