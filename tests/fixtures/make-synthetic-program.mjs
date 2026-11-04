// Deterministic synthetic program for package tests (no real data). Produces three
// packages that must be applied in order: (1) option set, data elements, legend set;
// (2) program, stage, sections; (3) rules, program indicators, visualizations, dashboard.
// Usage: node tests/fixtures/make-synthetic-program.mjs > tests/fixtures/synthetic-program.json
const CH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
let seed = 42;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed; };
const uid = () => { let s = CH[rnd() % 52]; for (let i = 0; i < 10; i++) s += CH[rnd() % 62]; return s; };

const N_DE = 160, N_RULES = 20, N_PI = 20, SECTIONS = 4;
const os = { id: uid(), name: 'SYN Score 0-2', valueType: 'INTEGER_ZERO_OR_POSITIVE' };
const options = [['0', '0 - Not available'], ['1', '1 - Available, not functional'], ['2', '2 - Available and functional']]
  .map(([code, name], i) => ({ id: uid(), code, name, sortOrder: i + 1, optionSet: { id: os.id } }));
os.options = options.map(o => ({ id: o.id }));
const des = Array.from({ length: N_DE }, (_, i) => ({
  id: uid(), name: `SYN Item ${String(i + 1).padStart(3, '0')}`, shortName: `SYN Item ${i + 1}`, code: `SYN_ITEM_${i + 1}`,
  valueType: 'INTEGER_ZERO_OR_POSITIVE', domainType: 'TRACKER', aggregationType: 'NONE', optionSet: { id: os.id },
}));
const legend = { id: uid(), name: 'SYN Score bands', legends: [
  { id: uid(), name: 'Low', startValue: 0, endValue: 50, color: '#F46D43' },
  { id: uid(), name: 'Mid', startValue: 50, endValue: 80, color: '#FDD049' },
  { id: uid(), name: 'High', startValue: 80, endValue: 101, color: '#A6D96A' },
] };

const prog = { id: uid(), name: 'SYN Facility assessment', shortName: 'SYN Facility assessment', programType: 'WITHOUT_REGISTRATION' };
const stage = { id: uid(), name: 'SYN Assessment', program: { id: prog.id } };
const per = N_DE / SECTIONS;
const sections = Array.from({ length: SECTIONS }, (_, s) => ({
  id: uid(), name: `SYN Section ${s + 1}`, sortOrder: s + 1, programStage: { id: stage.id },
  dataElements: des.slice(s * per, (s + 1) * per).map(d => ({ id: d.id })),
}));
stage.programStageDataElements = des.map((d, i) => ({ dataElement: { id: d.id }, compulsory: i % 40 === 0, sortOrder: i + 1 }));
stage.programStageSections = sections.map(s => ({ id: s.id }));
stage.formType = 'SECTION';
prog.programStages = [{ id: stage.id }];

const vars = [], rules = [], actions = [];
for (let i = 0; i < N_RULES; i++) {
  const trigger = des[i * 8], target = des[i * 8 + 1];
  const v = { id: uid(), name: `syn_item_${i * 8 + 1}`, program: { id: prog.id }, programRuleVariableSourceType: 'DATAELEMENT_CURRENT_EVENT', dataElement: { id: trigger.id }, useCodeForOptionSet: true };
  const a = { id: uid(), programRuleActionType: 'HIDEFIELD', dataElement: { id: target.id } };
  const r = { id: uid(), name: `SYN hide item ${i * 8 + 2} when item ${i * 8 + 1} is 0`, program: { id: prog.id }, condition: `#{${v.name}} == 0`, programRuleActions: [{ id: a.id }] };
  a.programRule = { id: r.id };
  vars.push(v); rules.push(r); actions.push(a);
}
const pis = Array.from({ length: N_PI }, (_, i) => ({
  id: uid(), name: `SYN Item ${i + 1} functional (%)`, shortName: `SYN Item ${i + 1} functional`, program: { id: prog.id }, analyticsType: 'EVENT',
  expression: `d2:countIfValue(#{${stage.id}.${des[i].id}}, 2) * 100`, filter: `d2:hasValue(#{${stage.id}.${des[i].id}})`,
  analyticsPeriodBoundaries: [
    { boundaryTarget: 'EVENT_DATE', analyticsPeriodBoundaryType: 'AFTER_START_OF_REPORTING_PERIOD' },
    { boundaryTarget: 'EVENT_DATE', analyticsPeriodBoundaryType: 'BEFORE_END_OF_REPORTING_PERIOD' },
  ],
  legendSets: [{ id: legend.id }], aggregationType: 'AVERAGE',
}));
const viz = [0, 1].map(k => ({
  id: uid(), name: `SYN Functional items ${k * 10 + 1}-${k * 10 + 10}`, type: 'BAR', relativePeriods: { last12Months: true },
  dataDimensionItems: pis.slice(k * 10, k * 10 + 10).map(p => ({ dataDimensionItemType: 'PROGRAM_INDICATOR', programIndicator: { id: p.id } })),
  columns: [{ dimension: 'dx' }], rows: [{ dimension: 'ou' }], filters: [{ dimension: 'pe' }],
}));
const dash = { id: uid(), name: 'SYN Facility assessment summary', dashboardItems: viz.map((v, i) => ({ id: uid(), type: 'VISUALIZATION', visualization: { id: v.id }, x: i * 30, y: 0, width: 30, height: 20 })) };

const out = {
  packages: [
    { description: 'SYN: score option set, 160 assessment questions, score legend', creates: { optionSets: [os], options, dataElements: des, legendSets: [legend] } },
    { description: 'SYN: facility assessment event program with one stage and four sections', creates: { programs: [prog], programStages: [stage], programStageSections: sections } },
    { description: 'SYN: skip logic, 20 item indicators, 2 charts and a summary dashboard', creates: { programRuleVariables: vars, programRules: rules, programRuleActions: actions, programIndicators: pis, visualizations: viz, dashboards: [dash] } },
  ],
};
process.stdout.write(JSON.stringify(out, null, 1));
