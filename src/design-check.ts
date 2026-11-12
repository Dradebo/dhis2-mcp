/**
 * Offline design checks for a proposed metadata payload ({collection: objects[]}).
 * Pure: no instance access. Each rule encodes a failure seen in real DHIS2 work
 * (mostly on 2.41) that otherwise surfaces only after import, in Capture, or in analytics.
 * Rules that depend on the server version are in checkVersionRules (see versions.ts).
 *
 * Severity: "error" = would fail import or silently break collection/analytics;
 * "warning" = likely problem that needs a human/agent decision.
 */
import { isUid } from './security/plans.js';
import { VERSION_NOTES } from './versions.js';

export interface Finding {
  severity: 'error' | 'warning';
  rule: string;
  objectType: string;
  id?: string;
  name?: string;
  message: string;
}

type Obj = Record<string, any>;
type Payload = Record<string, Obj[]>;

const VALUE_TYPES = new Set(['TEXT', 'LONG_TEXT', 'MULTI_TEXT', 'LETTER', 'PHONE_NUMBER', 'EMAIL', 'BOOLEAN', 'TRUE_ONLY',
  'DATE', 'DATETIME', 'TIME', 'NUMBER', 'UNIT_INTERVAL', 'PERCENTAGE', 'INTEGER', 'INTEGER_POSITIVE', 'INTEGER_NEGATIVE',
  'INTEGER_ZERO_OR_POSITIVE', 'TRACKER_ASSOCIATE', 'USERNAME', 'COORDINATE', 'ORGANISATION_UNIT', 'REFERENCE', 'AGE',
  'URL', 'FILE_RESOURCE', 'IMAGE', 'GEOJSON']);
const NUMERIC = new Set(['NUMBER', 'UNIT_INTERVAL', 'PERCENTAGE', 'INTEGER', 'INTEGER_POSITIVE', 'INTEGER_NEGATIVE', 'INTEGER_ZERO_OR_POSITIVE']);
const SUMMABLE_AGG = new Set(['SUM', 'AVERAGE', 'AVERAGE_SUM_ORG_UNIT', 'STDDEV', 'VARIANCE', 'MIN', 'MAX']);
const AGG_TYPES = new Set(['SUM', 'AVERAGE', 'AVERAGE_SUM_ORG_UNIT', 'LAST', 'LAST_AVERAGE_ORG_UNIT', 'LAST_IN_PERIOD',
  'LAST_IN_PERIOD_AVERAGE_ORG_UNIT', 'FIRST', 'FIRST_AVERAGE_ORG_UNIT', 'COUNT', 'STDDEV', 'VARIANCE', 'MIN', 'MAX',
  'NONE', 'CUSTOM', 'DEFAULT', 'MIN_SUM_ORG_UNIT', 'MAX_SUM_ORG_UNIT', 'FIRST_FIRST_ORG_UNIT', 'LAST_LAST_ORG_UNIT']);

/** Collections whose objects need a name, and those with DHIS2-enforced unique names/shortNames/codes. */
const NEEDS_NAME = new Set(['dataElements', 'dataSets', 'categoryOptions', 'categories', 'categoryCombos', 'indicators',
  'indicatorTypes', 'programIndicators', 'programs', 'programStages', 'trackedEntityAttributes', 'trackedEntityTypes',
  'optionSets', 'options', 'legendSets', 'visualizations', 'eventVisualizations', 'maps', 'dashboards', 'constants',
  'validationRules', 'programRules', 'organisationUnitGroups', 'dataElementGroups', 'indicatorGroups']);
const NEEDS_SHORT_NAME = new Set(['dataElements', 'indicators', 'programIndicators', 'trackedEntityAttributes', 'categoryOptions']);
const UNIQUE_NAME = new Set(['dataElements', 'indicators', 'programIndicators', 'dataSets', 'programs', 'trackedEntityAttributes',
  'categoryOptions', 'categories', 'categoryCombos', 'optionSets', 'legendSets', 'constants', 'indicatorTypes',
  'organisationUnitGroups', 'dataElementGroups', 'indicatorGroups', 'trackedEntityTypes', 'validationRules']);

function label(o: Obj): string { return String(o?.name ?? o?.displayName ?? o?.code ?? o?.id ?? ''); }
const ref = (v: any): string | undefined => (v && typeof v === 'object' && isUid(v.id) ? v.id : undefined);

export function checkDesign(payload: Payload, release?: number): Finding[] {
  const out: Finding[] = [];
  const add = (severity: Finding['severity'], rule: string, objectType: string, o: Obj | undefined, message: string) =>
    out.push({ severity, rule, objectType, ...(o?.id ? { id: String(o.id) } : {}), ...(o ? { name: label(o).slice(0, 80) } : {}), message });

  const byId = new Map<string, { type: string; o: Obj }>();
  for (const [type, list] of Object.entries(payload)) {
    if (!Array.isArray(list)) { add('error', 'shape', type, undefined, 'Each collection must be an array of objects.'); continue; }
    for (const o of list) if (o && isUid(o.id)) byId.set(o.id, { type, o });
  }
  const get = (id?: string) => (id ? byId.get(id)?.o : undefined);

  // --- generic: names, lengths, uniqueness, ids --------------------------------
  for (const [type, list] of Object.entries(payload)) {
    if (!Array.isArray(list)) continue;
    const seen: Record<string, Map<string, string>> = { name: new Map(), shortName: new Map(), code: new Map() };
    for (const o of list) {
      if (!o || typeof o !== 'object') { add('error', 'shape', type, undefined, 'Objects must be JSON objects.'); continue; }
      if (o.id !== undefined && !isUid(o.id)) add('error', 'uid', type, o, `"${o.id}" is not a valid 11-character DHIS2 UID (letter first, then letters/digits).`);
      if (NEEDS_NAME.has(type) && !(typeof o.name === 'string' && o.name.trim())) add('error', 'name-required', type, o, 'A name is required.');
      if (NEEDS_SHORT_NAME.has(type) && !(typeof o.shortName === 'string' && o.shortName.trim())) add('error', 'shortname-required', type, o, 'A shortName is required.');
      if (typeof o.name === 'string' && o.name.length > 230) add('error', 'name-length', type, o, `name is ${o.name.length} characters (max 230).`);
      if (typeof o.shortName === 'string' && o.shortName.length > 50) add('error', 'shortname-length', type, o, `shortName is ${o.shortName.length} characters (max 50).`);
      if (typeof o.code === 'string' && o.code.length > 50) add('error', 'code-length', type, o, `code is ${o.code.length} characters (max 50).`);
      if (typeof o.formName === 'string' && o.formName.length > 230) add('error', 'formname-length', type, o, 'formName exceeds 230 characters.');
      if (typeof o.name === 'string' && o.name.length > 55 && ['dataElements', 'programIndicators', 'indicators'].includes(type)) {
        add('warning', 'label-truncation', type, o, 'Names over ~55 characters are cut off in pivot-table row headers and chart axes; keep the full wording in description/formName.');
      }
      for (const f of ['name', 'shortName', 'code'] as const) {
        if (f === 'name' && !UNIQUE_NAME.has(type)) continue;
        if (f === 'shortName' && !UNIQUE_NAME.has(type)) continue;
        const v = typeof o[f] === 'string' ? o[f].trim().toLowerCase() : '';
        if (!v) continue;
        if (seen[f]!.has(v)) add('error', `duplicate-${f}`, type, o, `${f} "${o[f]}" is also used by ${seen[f]!.get(v)}; DHIS2 requires it to be unique.`);
        else seen[f]!.set(v, String(o.id ?? label(o)));
      }
    }
  }

  // --- option sets ------------------------------------------------------------
  const optionSetOptions = (os: Obj): Obj[] => (Array.isArray(os.options) ? os.options.map((r: any) => get(ref(r)) ?? r).filter(Boolean) : []);
  for (const os of payload.optionSets ?? []) {
    if (!VALUE_TYPES.has(os.valueType)) add('error', 'valuetype', 'optionSets', os, `valueType "${os.valueType}" is not a DHIS2 value type.`);
    const codes = new Map<string, number>();
    for (const opt of optionSetOptions(os)) {
      if (!opt.code) { add('error', 'option-code', 'options', opt, 'Each option needs a code (stored values and indicators use codes, not names).'); continue; }
      codes.set(String(opt.code), (codes.get(String(opt.code)) ?? 0) + 1);
      if (NUMERIC.has(os.valueType) && !/^-?\d+(\.\d+)?$/.test(String(opt.code))) {
        add('error', 'numeric-option-codes', 'options', opt, `Option set "${label(os)}" is numeric but code "${opt.code}" is not a number; sums and comparisons in indicators will fail. Put the meaning in the name, the number in the code.`);
      }
    }
    for (const [c, n] of codes) if (n > 1) add('error', 'duplicate-option-code', 'optionSets', os, `Option code "${c}" appears ${n} times.`);
  }

  // --- data elements / attributes ----------------------------------------------
  for (const type of ['dataElements', 'trackedEntityAttributes'] as const) {
    for (const de of payload[type] ?? []) {
      if (!VALUE_TYPES.has(de.valueType)) add('error', 'valuetype', type, de, `valueType "${de.valueType}" is not a DHIS2 value type.`);
      if (de.aggregationType !== undefined && !AGG_TYPES.has(de.aggregationType)) add('error', 'aggregationtype', type, de, `aggregationType "${de.aggregationType}" is not valid.`);
      if (type === 'dataElements' && de.domainType !== undefined && !['AGGREGATE', 'TRACKER'].includes(de.domainType)) add('error', 'domaintype', type, de, 'domainType must be AGGREGATE or TRACKER.');
      if (type === 'dataElements' && !de.domainType) add('error', 'domaintype', type, de, 'domainType is required (AGGREGATE or TRACKER).');
      if (type === 'dataElements' && !de.aggregationType) add('error', 'aggregationtype', type, de, 'aggregationType is required.');
      if (SUMMABLE_AGG.has(de.aggregationType) && de.valueType && !NUMERIC.has(de.valueType) && de.valueType !== 'BOOLEAN' && de.valueType !== 'TRUE_ONLY') {
        add('error', 'non-numeric-aggregation', type, de, `${de.aggregationType} aggregation on a ${de.valueType} value is not meaningful; use NONE/COUNT or a numeric value type.`);
      }
      const os = get(ref(de.optionSet));
      if (os && os.valueType && de.valueType && os.valueType !== de.valueType) {
        add('error', 'optionset-valuetype', type, de, `valueType ${de.valueType} differs from its option set "${label(os)}" (${os.valueType}).`);
      }
    }
  }

  // --- program stages: sections, compulsory fields -----------------------------
  const sectionsOf = (ps: Obj): Obj[] => {
    const inline = Array.isArray(ps.programStageSections) ? ps.programStageSections.map((r: any) => get(ref(r)) ?? r) : [];
    const standalone = (payload.programStageSections ?? []).filter(s => ref(s.programStage) === ps.id);
    const all = [...inline, ...standalone].filter(Boolean);
    return [...new Map(all.map(s => [s.id ?? JSON.stringify(s), s])).values()];
  };
  const sectionedDEs = new Map<string, Set<string>>(); // stageId -> DE ids in sections
  for (const ps of payload.programStages ?? []) {
    const sections = sectionsOf(ps);
    const inSections = new Set<string>(sections.flatMap(s => (Array.isArray(s.dataElements) ? s.dataElements.map(ref).filter((x: string | undefined): x is string => Boolean(x)) : [])));
    if (ps.id) sectionedDEs.set(ps.id, inSections);
    const psdes = Array.isArray(ps.programStageDataElements) ? ps.programStageDataElements : [];
    const stageDEs = new Set<string>(psdes.map((p: any) => ref(p.dataElement)).filter((x: string | undefined): x is string => Boolean(x)));
    if (sections.length) {
      for (const p of psdes) {
        const id = ref(p.dataElement);
        if (id && !inSections.has(id)) {
          add(p.compulsory ? 'error' : 'warning', p.compulsory ? 'compulsory-unsectioned' : 'unsectioned-field', 'programStages', ps,
            p.compulsory
              ? `Compulsory field ${label(get(id) ?? { id })} is not in any section, so it can never be entered in Capture and every save fails.`
              : `Field ${label(get(id) ?? { id })} is in the stage but not in any section; it is invisible in the section form.`);
        }
      }
      for (const id of inSections) if (!stageDEs.has(id)) add('error', 'section-field-not-in-stage', 'programStages', ps, `A section lists ${label(get(id) ?? { id })}, which is not a data element of the stage.`);
    }
    for (const p of psdes) {
      const de = get(ref(p.dataElement));
      if (de && de.domainType === 'AGGREGATE') add('error', 'aggregate-de-in-program', 'programStages', ps, `${label(de)} has domainType AGGREGATE; program stages need TRACKER data elements.`);
    }
  }

  // Fields DHIS2 already captures natively (org unit, event date, period) should not be form questions.
  const NATIVE = /^(facility|health facility|facility name|district|org(anisation|anization)? ?unit|date of (assessment|visit|interview|observation)|(assessment|visit|interview|observation|event) date|reporting (month|period|year)|month of reporting)$/i;
  const stageDEIds = new Set((payload.programStages ?? []).flatMap(ps => (ps.programStageDataElements ?? []).map((p: any) => ref(p.dataElement)).filter(Boolean)));
  for (const de of payload.dataElements ?? []) {
    const n = String(de.formName ?? de.name ?? '').trim();
    if (stageDEIds.has(de.id) && NATIVE.test(n)) add('warning', 'native-field-duplicated', 'dataElements', de, `"${n}" duplicates what DHIS2 captures natively (org unit, event date or period); drop the question and use the native field.`);
  }
  for (const cc of payload.categoryCombos ?? []) {
    if (cc.dataDimensionType === 'ATTRIBUTE') add('warning', 'attribute-combo-cocs', 'categoryCombos', cc, 'New attribute category combos get no option combos on import; afterwards run POST /api/maintenance/categoryOptionComboUpdate/categoryCombo/<id> and read the combos back. Category options need data sharing (rwrw----) for data entry.');
  }

  // --- program rules, variables, actions -----------------------------------------
  const programs = new Map((payload.programs ?? []).map(p => [p.id, p]));
  const varsByProgram = new Map<string, Set<string>>();
  for (const v of payload.programRuleVariables ?? []) {
    const pid = ref(v.program) ?? '?';
    if (!varsByProgram.has(pid)) varsByProgram.set(pid, new Set());
    const names = varsByProgram.get(pid)!;
    if (names.has(v.name)) add('error', 'duplicate-rule-variable', 'programRuleVariables', v, `Variable name "${v.name}" is used twice in the same program.`);
    names.add(v.name);
    if (v.name && /[^A-Za-z0-9_ .-]/.test(v.name)) add('warning', 'rule-variable-name', 'programRuleVariables', v, 'Rule variable names with special characters are hard to reference in expressions.');
    if (v.programRuleVariableSourceType?.startsWith('DATAELEMENT') && !ref(v.dataElement)) add('error', 'rule-variable-source', 'programRuleVariables', v, 'A data-element variable needs a dataElement.');
    if (v.useCodeForOptionSet === false) add('warning', 'rule-variable-option-names', 'programRuleVariables', v, 'useCodeForOptionSet=false compares against option NAMES; indicators and stored values use codes. Prefer codes so renaming options does not break rules.');
  }
  const actions = new Map((payload.programRuleActions ?? []).map(a => [a.id, a]));
  for (const rule of payload.programRules ?? []) {
    const pid = ref(rule.program);
    if (!pid) add('error', 'rule-program', 'programRules', rule, 'A program rule needs a program.');
    if (typeof rule.condition !== 'string' || !rule.condition.trim()) add('error', 'rule-condition', 'programRules', rule, 'A program rule needs a condition.');
    const cond = String(rule.condition ?? '');
    const pairs: Array<[string, string]> = [['(', ')'], ['{', '}'], ["'", "'"]];
    for (const [a, b] of pairs) {
      const n1 = cond.split(a).length - 1, n2 = cond.split(b).length - 1;
      if (a === b ? n1 % 2 !== 0 : n1 !== n2) add('error', 'rule-syntax', 'programRules', rule, `Unbalanced ${a}${b === a ? '' : b} in the condition.`);
    }
    const known = varsByProgram.get(pid ?? '?');
    for (const m of cond.matchAll(/[#A]\{([^}]+)\}/g)) {
      if (known && !known.has(m[1]!)) add('warning', 'rule-unknown-variable', 'programRules', rule, `Condition uses variable "${m[1]}", not defined in this package (fine only if it already exists on the server).`);
    }
    const prog = pid ? programs.get(pid) : undefined;
    if (prog?.programType === 'WITHOUT_REGISTRATION' && ref(rule.programStage)) {
      add('warning', 'rule-stage-event-program', 'programRules', rule, 'Rules with programStage set did not fire in single-stage event programs in Capture (2.41 testing); leave programStage empty.');
    }
    for (const r of Array.isArray(rule.programRuleActions) ? rule.programRuleActions : []) {
      const a = actions.get(ref(r) ?? '') ?? (r && r.programRuleActionType ? r : undefined);
      if (!a) continue;
      if (['HIDEFIELD', 'SETMANDATORYFIELD', 'ASSIGN'].includes(a.programRuleActionType) && !ref(a.dataElement) && !ref(a.trackedEntityAttribute) && !a.content) {
        add('error', 'rule-action-target', 'programRuleActions', a, `${a.programRuleActionType} needs a dataElement or trackedEntityAttribute.`);
      }
      const target = ref(a.dataElement);
      const progStages = (payload.programStages ?? []).filter(s => ref(s.program) === pid);
      if (target && progStages.length && !progStages.some(s => (s.programStageDataElements ?? []).some((p: any) => ref(p.dataElement) === target))) {
        add('error', 'rule-target-not-in-stage', 'programRuleActions', a, 'The target data element is not in any stage of this program in the package; DHIS2 rejects the action. Add it to a stage (and section) first.');
      }
      if (target && ['HIDEFIELD', 'SETMANDATORYFIELD'].includes(a.programRuleActionType)) {
        const stagesWithSections = [...sectionedDEs.entries()].filter(([sid]) => (payload.programStages ?? []).some(s => s.id === sid && sectionsOf(s).length));
        const inStageNotSection = stagesWithSections.some(([sid, set]) => {
          const ps = (payload.programStages ?? []).find(s => s.id === sid)!;
          const inStage = (ps.programStageDataElements ?? []).some((p: any) => ref(p.dataElement) === target);
          return inStage && !set.has(target);
        });
        if (inStageNotSection) add('error', 'rule-target-unsectioned', 'programRuleActions', a, 'This action targets a field that is in the stage but not in any section; in Capture, Save then silently does nothing.');
      }
    }
  }

  // --- program indicators ---------------------------------------------------------
  for (const pi of payload.programIndicators ?? []) {
    if (!ref(pi.program)) add('error', 'pi-program', 'programIndicators', pi, 'A program indicator needs a program.');
    if (typeof pi.expression !== 'string' || !pi.expression.trim()) add('error', 'pi-expression', 'programIndicators', pi, 'An expression is required.');
    for (const field of ['expression', 'filter'] as const) {
      const e = typeof pi[field] === 'string' ? pi[field] : '';
      if ((e.split('(').length - 1) !== (e.split(')').length - 1)) add('error', 'pi-syntax', 'programIndicators', pi, `Unbalanced parentheses in ${field}.`);
      for (const m of e.matchAll(/#\{([^}]*)\}/g)) {
        const parts = m[1]!.split('.');
        if (parts.length !== 2 || !parts.every(isUid)) add('error', 'pi-reference', 'programIndicators', pi, `"#{${m[1]}}" in ${field} must be #{programStageUid.dataElementUid}.`);
      }
    }
    const analyticsType = pi.analyticsType ?? 'EVENT';
    const boundaries = Array.isArray(pi.analyticsPeriodBoundaries) ? pi.analyticsPeriodBoundaries : [];
    if (analyticsType === 'EVENT' && boundaries.length === 0) {
      add('error', 'pi-boundaries', 'programIndicators', pi, 'EVENT program indicators need explicit EVENT_DATE boundaries (AFTER_START_OF_REPORTING_PERIOD and BEFORE_END_OF_REPORTING_PERIOD); without them aggregate analytics fail with a SQL error on 2.41.');
    }
    for (const b of boundaries) if (b && b.id) add('warning', 'pi-boundary-ids', 'programIndicators', pi, 'Copied boundary ids cause duplicate-key import failures; send boundaries without ids.');
  }

  // --- indicators --------------------------------------------------------------------
  for (const ind of payload.indicators ?? []) {
    for (const f of ['numerator', 'denominator'] as const) if (typeof ind[f] !== 'string' || !ind[f].trim()) add('error', `indicator-${f}`, 'indicators', ind, `${f} is required (use "1" for a plain count).`);
    if (!ref(ind.indicatorType)) add('error', 'indicator-type', 'indicators', ind, 'indicatorType is required (factor 100 for percentages, 1 for means of percentages).');
  }

  // --- legends -----------------------------------------------------------------------------
  for (const ls of payload.legendSets ?? []) {
    const legends = (Array.isArray(ls.legends) ? ls.legends : []).filter((l: any) => typeof l.startValue === 'number' && typeof l.endValue === 'number')
      .sort((a: any, b: any) => a.startValue - b.startValue);
    for (let i = 0; i < legends.length; i++) {
      const l = legends[i];
      if (l.endValue <= l.startValue) add('error', 'legend-range', 'legendSets', ls, `Legend "${l.name ?? i}" ends at or before it starts.`);
      if (i && legends[i - 1].endValue > l.startValue) add('error', 'legend-overlap', 'legendSets', ls, `Legends "${legends[i - 1].name}" and "${l.name}" overlap.`);
      if (i && legends[i - 1].endValue < l.startValue) add('warning', 'legend-gap', 'legendSets', ls, `Values between ${legends[i - 1].endValue} and ${l.startValue} have no legend colour.`);
    }
  }

  // --- dashboards ----------------------------------------------------------------------------
  for (const d of payload.dashboards ?? []) {
    for (const item of Array.isArray(d.dashboardItems) ? d.dashboardItems : []) {
      if ('w' in item || 'h' in item) add('error', 'dashboard-item-size', 'dashboards', d, 'Dashboard items use width/height; w/h are silently ignored and items render at default size.');
    }
  }
  if (release !== undefined) out.push(...checkVersionRules(payload, release));
  return out;
}

/**
 * Rules that depend on the server's DHIS2 version (rule ids start with "version-").
 * Each points to the version note that explains it and, where a feature is missing,
 * the workaround for that version. Also run on partial update sets.
 */
export function checkVersionRules(payload: Payload, release: number): Finding[] {
  const out: Finding[] = [];
  const note = (id: string) => VERSION_NOTES.find(n => n.id === id)!;
  const add = (rule: string, objectType: string, o: Obj | undefined, message: string) =>
    out.push({ severity: 'error', rule, objectType, ...(o?.id ? { id: String(o.id) } : {}), ...(o ? { name: label(o).slice(0, 80) } : {}), message });
  const nonEmpty = (v: unknown) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '');

  if (release < 42) {
    const w = note('pi-disaggregation').workaround;
    for (const pi of payload.programIndicators ?? []) {
      const used = ['categoryCombo', 'attributeCombo', 'categoryMappingIds'].filter(f => nonEmpty(pi?.[f]));
      if (used.length) add('version-pi-disaggregation', 'programIndicators', pi, `Program indicator disaggregation (${used.join(', ')}) needs DHIS2 2.42 or later; this server is 2.${release}. ${w}`);
    }
    for (const p of payload.programs ?? []) {
      if (nonEmpty(p?.categoryMappings)) add('version-pi-disaggregation', 'programs', p, `Program category mappings need DHIS2 2.42 or later; this server is 2.${release}. ${w}`);
    }
  }
  if (release >= 41) {
    for (const t of ['eventReports', 'eventCharts']) {
      for (const o of payload[t] ?? []) add('version-event-visualizations', t, o, `${t} reached end of support in 2.41; this server is 2.${release}. Create an eventVisualizations object instead (Line Listing / Data Visualizer).`);
    }
  }
  if (release >= 42) {
    const cats = new Map<string, Obj>((payload.categories ?? []).filter(c => isUid(c?.id)).map(c => [c.id, c]));
    for (const c of payload.categories ?? []) {
      const n = Array.isArray(c?.categoryOptions) ? c.categoryOptions.length : 0;
      if (n > 50) add('version-category-limits', 'categories', c, `${n} options; DHIS2 2.42+ allows at most 50 per category by default (31 on 42.0). ${note('category-limits').workaround}`);
    }
    for (const cc of payload.categoryCombos ?? []) {
      const list = Array.isArray(cc?.categories) ? cc.categories : [];
      if (list.length > 5) add('version-category-limits', 'categoryCombos', cc, `${list.length} categories; DHIS2 2.42+ allows at most 5 per category combination by default.`);
      const sizes = list.map((r: any) => cats.get(r?.id)?.categoryOptions?.length);
      if (sizes.length && sizes.every((x: unknown) => typeof x === 'number')) {
        const combos = (sizes as number[]).reduce((a, b) => a * b, 1);
        if (combos > 500) add('version-category-limits', 'categoryCombos', cc, `${combos} option combinations; DHIS2 2.42+ allows at most 500 by default. ${note('category-limits').workaround}`);
      }
    }
  }
  return out;
}

export function summariseFindings(findings: Finding[]): string {
  if (!findings.length) return 'No design problems found by the offline checks.';
  const errors = findings.filter(f => f.severity === 'error');
  const warnings = findings.filter(f => f.severity === 'warning');
  const fmt = (f: Finding) => `  - [${f.rule}] ${f.objectType}${f.id ? `/${f.id}` : ''}${f.name ? ` "${f.name}"` : ''}: ${f.message}`;
  return [
    `${errors.length} error(s), ${warnings.length} warning(s).`,
    ...(errors.length ? ['Errors (fix before planning):', ...errors.slice(0, 100).map(fmt)] : []),
    ...(warnings.length ? ['Warnings (decide or fix):', ...warnings.slice(0, 100).map(fmt)] : []),
    ...(findings.length > 200 ? [`(+${findings.length - 200} more)`] : []),
  ].join('\n');
}
