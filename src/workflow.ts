/**
 * The documents → customisation procedure, shipped inside the server as MCP
 * prompts and resources so any host's agent gets it (PRODUCT-DESIGN phase D).
 * Static text only; no instance access, no secrets.
 */

export interface GuideResource { uri: string; name: string; description: string; text: string }

const WORKFLOW = `# Customising DHIS2 from documents

You are building DHIS2 configuration on a DEVELOPMENT server from documents the person gave you
(design notes, paper forms, spreadsheets, reports). The person is interrupted for only two things:
clarifications the documents cannot answer, and approvals for changes. Production is read-only;
finished work reaches it only through dhis2_prepare_transfer.

## 1. Intake
- Read every document fully. Register the goal and each document with dhis2_start_project (id, title, kind).
  The server keeps the ledger, decisions and handover; keep the projectId.
- Write down the goal in one sentence and confirm it only if it is genuinely ambiguous.
- Note the reporting grain the documents imply: who/what is counted, where (org unit level), how often (period), by whom (data entry role).

## 2. Instance discovery and reuse
- The server's DHIS2 version is shown when connecting. Read dhis2://guides/version-differences: it lists what
  differs on that version and the workaround where a feature is missing. The person usually cannot change the
  server version: never make an upgrade the fix. dhis2_check_design applies that version's rules.
- Search for existing objects before designing new ones (dhis2_find_reusable): option sets, data elements,
  category combos, legend sets, indicators, programs, dashboards. Reuse semantically equivalent objects;
  create new ones only for a genuinely different definition, and say why for each.
- dhis2_get_schema for every object type you will create: required properties, enums, length limits.

## 3. Requirement ledger (dhis2_record_requirements)
- One row per source question/requirement: source (document, location, quote), proposal (DHIS2 object, value type,
  option codes, section, skip logic, analytics use), status (mapped / reused / question / out-of-scope with reason).
- Do not add questions DHIS2 already captures natively: org unit (facility/district), event or enrollment date,
  reporting period. Use the native field instead.
- Where documents disagree or are silent, write a numbered question with the options and your recommendation.
  Batch all questions into ONE clarification round with dhis2_ask_clarifications (up to 5 per form; several forms
  only if there are more than 5). You cannot mark anything decided yourself.

## 4. Design summary (one approval)
Present, in plain language: the program/data set structure (stages, sections, question counts), option sets,
skip-logic rules, calculations (definition, numerator, denominator, what counts as missing), dashboards, and what
is reused vs new. Get the person's agreement before building. Design agreement is not permission to invent
definitions later: unresolved items stay unresolved and are reported.

## 5. Build in packages
- Generate ids first (dhis2_generate_uids) so objects can reference each other inside a package.
- Run dhis2_check_design on each draft until it reports no errors; resolve or justify every warning.
- dhis2_plan_package → show the person the review file → dhis2_apply_package (they approve in their host).
- Suggested packages: (1) option sets, data elements, attributes, category model; (2) program/data set, stages,
  sections; (3) rule variables, rules, actions; (4) program indicators and indicators; (5) visualizations and dashboards.
  One coherent package each, not one per object.
- After rule or form changes to an existing program, bump the program version in the same package.

## 6. Verify
- Read-back is automatic after apply; treat any mismatch, missing or collateral change as a defect.
- Validate every program indicator and indicator expression with the expression-description endpoints.
- Analytics: start a run with dhis2_run_analytics (the person approves) and follow it with dhis2_get_job; then
  query each indicator for a period with data and one without; real zeros and "no data" must be distinguishable.
- Forms and rules: static checks do not prove rules fire. Where a browser is available, open a new form in Capture
  without saving and exercise the skip logic; otherwise report native testing as pending.

## 7. Data and sharing (approvals)
- Data (baselines, test or historical data): dhis2_plan_data with aggregate dataValues or tracker records, then
  dhis2_apply_operation. Replaced values are shown old → new. Likely re-imports are refused: ask the person, and only
  pass acknowledgeDuplicates: true if they confirm the records are genuinely new.
- Sharing: new objects get the server's default sharing. Agree with the person which user groups can see, edit or
  enter data, then dhis2_plan_sharing_change → dhis2_apply_operation. Existing grants are kept unless named.
  Never copy sharing from another server.

## 8. Handover
Link each requirement to its objects and packageIds, record the checks you ran (dhis2_record_requirements checks), then
dhis2_write_handover. It derives "verified" from the packages' read-back and lists every open item. A short plain-language report: what was built (with links), what was reused, every check run and its result,
open questions and known gaps, and how to move it to production (dhis2_prepare_transfer → administrator import →
dhis2_verify_transfer). Do not claim checks that were not run.
`;

const MODELLING = `# DHIS2 modelling rules that prevent silent failures (observed on 2.41; version-specific differences
# are in dhis2://guides/version-differences and are checked by dhis2_check_design)

## Option sets and value types
- Stored values and indicator expressions use option CODES, not names. For numeric scores make the option set and
  data element numeric (e.g. INTEGER_ZERO_OR_POSITIVE) and put the number in the code, the meaning in the name
  ("2 - Available and functional"). Summing TEXT option values imports cleanly but every calculation fails.
- A data element's valueType must equal its option set's valueType.
- Option codes must be unique within the set.

## Program stages and forms
- In a section form, a data element in the stage but in no section is invisible. If it is compulsory, every save fails.
- A HIDEFIELD/SETMANDATORYFIELD action on an unsectioned field makes Capture's Save silently do nothing.
- Program stages need TRACKER-domain data elements.
- Removing an item from an owned collection (programStageDataElements, programRuleActions, sections) deletes it.
  Stored values survive removal of a data element from a stage, but check indicators, visualizations and rule variables first.

## Program rules
- Rule variables with useCodeForOptionSet=false compare against option names; prefer codes so renaming options cannot break rules.
- In single-stage event programs, leave programStage empty on rules (rules with it set did not fire in Capture).
- DHIS2 rejects a rule action whose data element is not yet in a stage, even if the same import adds it:
  import stage changes in an earlier package than the rules that target new fields.
- Deleting rules does not delete their variables; remove orphaned variables explicitly.
- Capture caches rules and forms until the program version changes: bump the version after rule/form changes.

## Program indicators and indicators
- Every EVENT program indicator needs explicit EVENT_DATE boundaries (AFTER_START_OF_REPORTING_PERIOD and
  BEFORE_END_OF_REPORTING_PERIOD); without them aggregate analytics fail with a SQL error.
- When cloning a program indicator, send boundaries without ids (copied boundary ids fail the whole atomic import).
- References are #{programStageUid.dataElementUid}.
- Percentages use an indicator type with factor 100; a mean of values that are already percentages uses factor 1.
- Decide and write down what counts in the denominator: answered only, or including blanks/N/A. Blank can mean
  "not applicable" or "not captured"; check the data before choosing.
- Program-indicator disaggregation exists only from 2.42; on older servers use one indicator per category option
  (see dhis2://guides/version-differences).

## Category model
- New attribute category combos get no category option combos on import: run
  POST /api/maintenance/categoryOptionComboUpdate/categoryCombo/{id} and read them back.
- Category options need data sharing (rwrw----) for data entry; categories and combos accept only metadata sharing.

## Names
- name/shortName/code are unique per type; shortName and code max 50 characters, name max 230.
- Keep analytics item names at about 55 characters or less: longer names are cut off in pivot rows and chart axes.
  Put full source wording in the description.
`;

const DASHBOARDS = `# Analytics and dashboards (observed on 2.41; see dhis2://guides/version-differences)

- Design from the instrument's own structure: map every item to its section/component, check coverage is exact,
  then one block per section. Do not flatten two semantic dimensions into one mixed axis.
- Use relative periods (e.g. LAST_12_MONTHS), not fixed ones, so dashboards stay current across collection rounds.
- Dashboard item size fields are width/height; w/h are ignored.
- The dashboard panel header shows the view's name: set hideTitle and use the subtitle when the name is technical.
- Pivot topLimit/sortOrder are ignored on dashboards and column sorting is not saved.
- Stacked bars take band colours only with legend strategy BY_DATA_ITEM and one legend set per item.
  Stack only additive, mutually exclusive quantities, never independent percentages.
- Hide a chart's series legend with seriesKey.hidden=true (hideLegend does not).
- Org unit dimension "<country>;LEVEL-<country level>;LEVEL-<facility level>" shows a national column beside
  facilities and stays dynamic.
- Use a colour-blind-safe band scheme unless the programme has an approved palette.
- Dashboards without data: deliver a plan with a data-profiling gate; build once real data exists.
- Verify each view by analytics at national and single-facility scope, and render it natively where a browser exists.
`;

const VERIFICATION = `# Verification and handover checklist

- Every created/updated object read back and matched (the package receipt lists each one).
- No collateral changes: unrelated fields and sharing of updated objects unchanged.
- Expressions validated: /api/programIndicators/expression/description and /filter/description,
  /api/indicators/expression/description.
- Analytics run; each indicator queried for a period with data and one without; values reconciled against a
  hand count from the source data where data exists.
- Forms/rules exercised in Capture without saving (or reported as pending if no browser is available).
- Requirement ledger: every source requirement mapped, reused, out of scope (with reason) or open.
- Handover lists: links, reuse, checks with results, open questions, known gaps, and the production route
  (prepare transfer → administrator import → verify transfer).
`;

export const GUIDES: GuideResource[] = [
  { uri: 'dhis2://guides/customise-from-documents', name: 'Customising DHIS2 from documents', description: 'The staged procedure from documents to verified configuration and handover.', text: WORKFLOW },
  { uri: 'dhis2://guides/modelling-rules', name: 'DHIS2 modelling rules', description: 'Design rules that prevent silent import, Capture and analytics failures.', text: MODELLING },
  { uri: 'dhis2://guides/analytics-dashboards', name: 'Analytics and dashboards', description: 'Dashboard and visualization rules.', text: DASHBOARDS },
  { uri: 'dhis2://guides/verification-handover', name: 'Verification and handover', description: 'What must be checked before work is called done.', text: VERIFICATION },
];

export const PROMPTS = [
  {
    name: 'customise_from_documents',
    description: 'Turn documents (forms, protocols, reports) into verified DHIS2 configuration on a development server.',
    arguments: [
      { name: 'goal', description: 'What should exist at the end, in one sentence.', required: true },
      { name: 'documents', description: 'Paths or names of the source documents.', required: false },
    ],
  },
];

export function getPrompt(name: string, args: Record<string, string> | undefined): { description: string; messages: Array<{ role: 'user'; content: { type: 'text'; text: string } }> } {
  if (name !== 'customise_from_documents') throw new Error(`Unknown prompt: ${name}`);
  const goal = String(args?.goal ?? '').slice(0, 500);
  const docs = String(args?.documents ?? '').slice(0, 2000);
  const text = [
    `Goal: ${goal || '(ask the person for the goal in one sentence)'}`,
    docs ? `Source documents: ${docs}` : 'Source documents: ask the person which documents to use.',
    '',
    'Follow this procedure. Also read the resources dhis2://guides/modelling-rules, dhis2://guides/analytics-dashboards',
    'and dhis2://guides/verification-handover before designing.',
    '',
    WORKFLOW,
  ].join('\n');
  return { description: 'Documents → DHIS2 customisation', messages: [{ role: 'user', content: { type: 'text', text } }] };
}
