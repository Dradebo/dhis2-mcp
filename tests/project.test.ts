/** Requirement ledger, clarifications and handover. Local files only; synthetic data. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ProjectEngine, ProjectError, ClarificationAnswers } from '../src/project';

const PKG_OK = '11111111-1111-4111-8111-111111111111';
const PKG_PARTIAL = '22222222-2222-4222-8222-222222222222';
const DE1 = 'deAAAAAAAA1';
const DE2 = 'deAAAAAAAA2';

function setup(answer?: (msg: string, schema: any) => ClarificationAnswers) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dhis2-project-'));
  const forms: Array<{ msg: string; schema: any }> = [];
  const engine = new ProjectEngine({
    baseDir: () => dir,
    ask: async (msg, schema) => { forms.push({ msg, schema }); return answer ? answer(msg, schema) : { action: 'unavailable' }; },
  });
  const writePkg = (id: string, state: string, targets: any[]) => {
    fs.mkdirSync(path.join(dir, 'packages', id), { recursive: true });
    fs.writeFileSync(path.join(dir, 'packages', id, 'package-state.json'), JSON.stringify({ id, state, description: 'pkg', targets }));
  };
  return { dir, forms, engine, writePkg };
}
const start = (e: ProjectEngine) => e.start({ goal: 'Facility readiness checklist as an event program', documents: [{ id: 'form-A', title: 'Readiness checklist v3', kind: 'form' }] });
const src = { document: 'form-A', location: 'Q1' };
function err(fn: () => unknown): string { try { fn(); return 'ok'; } catch (e) { return e instanceof ProjectError ? e.message : `other: ${e}`; } }
async function aerr(p: Promise<unknown>): Promise<string> { try { await p; return 'ok'; } catch (e) { return e instanceof ProjectError ? e.message : `other: ${e}`; } }

describe('ledger', () => {
  it('requires every requirement to cite a registered document', () => {
    const { engine } = setup();
    const p = start(engine);
    expect(err(() => engine.update({ projectId: p.id, requirements: [{ ref: 'R1', text: 'Water source', source: { document: 'memo', location: 'p1' } }] })))
      .toMatch(/not one of this project's documents/);
    expect(err(() => engine.update({ projectId: p.id, requirements: [{ ref: 'R1', text: 'Water source' }] }))).toMatch(/source is required/);
  });
  it('rejects the whole batch when one item is invalid', () => {
    const { engine } = setup();
    const p = start(engine);
    expect(err(() => engine.update({ projectId: p.id, requirements: [
      { ref: 'R1', text: 'ok', source: src }, { ref: 'R2', text: 'bad', source: src, status: 'out-of-scope' }] }))).toMatch(/needs a reason/);
    expect(engine.get(p.id).requirements).toHaveLength(0);
  });
  it('the agent cannot mark a requirement decided, nor overwrite a decision', async () => {
    const { engine } = setup(() => ({ action: 'accept', content: { q1: '7 days' } }));
    const p = start(engine);
    expect(err(() => engine.update({ projectId: p.id, requirements: [{ ref: 'R1', text: 'x', source: src, status: 'decided' }] }))).toMatch(/only the person can decide/);
    engine.update({ projectId: p.id, requirements: [{ ref: 'R1', text: 'Visit window', source: src, status: 'question' }] });
    await engine.askClarifications({ projectId: p.id, questions: [{ ref: 'R1', question: 'Visit window?', options: ['7 days', '14 days'] }] });
    expect(engine.get(p.id).requirements[0]).toMatchObject({ status: 'decided', decision: { answer: '7 days', via: 'host-form' } });
    expect(err(() => engine.update({ projectId: p.id, requirements: [{ ref: 'R1', status: 'mapped' }] }))).toMatch(/decided by the person/);
    expect(err(() => engine.update({ projectId: p.id, requirements: [{ ref: 'R1', text: 'Visit window: 14 days' }] }))).toMatch(/decided by the person/);
    // Linking built work to a decided requirement is fine.
    engine.update({ projectId: p.id, requirements: [{ ref: 'R1', objects: [{ objectType: 'dataElements', id: DE1 }], packageIds: [PKG_OK] }] });
    expect(engine.get(p.id).requirements[0]!.status).toBe('decided');
  });
  it('a chat answer can be relayed only with the person\'s words, and is labelled as relayed', () => {
    const { engine } = setup();
    const p = start(engine);
    engine.update({ projectId: p.id, requirements: [{ ref: 'R1', text: 'Visit window', source: src, status: 'question' }] });
    expect(err(() => engine.update({ projectId: p.id, requirements: [{ ref: 'R1', decision: { answer: '7 days' } }] }))).toMatch(/personWords is required/);
    engine.update({ projectId: p.id, requirements: [{ ref: 'R1', decision: { answer: '7 days', personWords: 'use a week', question: 'Window?' } }] });
    expect(engine.get(p.id).requirements[0]).toMatchObject({ status: 'decided', decision: { via: 'relayed', personWords: 'use a week' } });
  });
  it('persists across engine instances (restart)', () => {
    const { engine, dir } = setup();
    const p = start(engine);
    engine.update({ projectId: p.id, requirements: [{ ref: 'R1', text: 'x', source: src }] });
    const fresh = new ProjectEngine({ baseDir: () => dir, ask: async () => ({ action: 'unavailable' }) });
    expect(fresh.get(p.id).requirements).toHaveLength(1);
    expect(err(() => fresh.get('../../etc/passwd'))).toMatch(/Unknown project/);
  });
});

describe('clarifications', () => {
  it('asks up to 5 questions in one form, with sources, options and Other', async () => {
    const { engine, forms } = setup((_m, schema) => ({ action: 'accept', content: {
      q1: '14 days', q2: 'Other (explain in the comment)', q2_comment: 'Use the district list', q3: 'Yes', q3_comment: 'only for hospitals' } }));
    const p = start(engine);
    engine.update({ projectId: p.id, requirements: ['R1', 'R2', 'R3', 'R4'].map(ref => ({ ref, text: ref, source: { document: 'form-A', location: ref, quote: `quote ${ref}` }, status: 'question' })) });
    const r = await engine.askClarifications({ projectId: p.id, questions: [
      { ref: 'R1', question: 'Visit window?', options: ['7 days', '14 days'], recommended: '14 days' },
      { ref: 'R2', question: 'Which facility list?', options: ['National', 'Programme'] },
      { ref: 'R3', question: 'Score generators?', options: ['Yes', 'No'] },
      { ref: 'R4', question: 'Unanswered?', options: ['A', 'B'] },
    ] });
    expect(forms).toHaveLength(1);
    expect(forms[0]!.msg).toContain('Source: form-A, R1 "quote R1"');
    expect(forms[0]!.msg).toContain("Assistant's suggestion: 14 days");
    expect(forms[0]!.schema.properties.q1.enum).toEqual(['7 days', '14 days', 'Other (explain in the comment)']);
    expect(r.answered).toEqual(['R1', 'R2', 'R3']);
    expect(r.pending).toEqual(['R4']);
    const byRef = Object.fromEntries(engine.get(p.id).requirements.map(x => [x.ref, x]));
    expect(byRef.R2!.decision!.answer).toBe('Use the district list');
    expect(byRef.R3!.decision).toMatchObject({ answer: 'Yes', note: 'only for hospitals' });
    expect(byRef.R4!.status).toBe('question');
  });
  it('rejects more than 5 questions, unknown refs and an answer outside the options', async () => {
    const { engine } = setup(() => ({ action: 'accept', content: { q1: 'Injected answer' } }));
    const p = start(engine);
    engine.update({ projectId: p.id, requirements: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'].map(ref => ({ ref, text: ref, source: src, status: 'question' })) });
    const six = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'].map(ref => ({ ref, question: 'q', options: ['a', 'b'] }));
    expect(await aerr(engine.askClarifications({ projectId: p.id, questions: six }))).toMatch(/1-5 questions/);
    expect(await aerr(engine.askClarifications({ projectId: p.id, questions: [{ ref: 'NOPE', question: 'q', options: ['a', 'b'] }] }))).toMatch(/not a requirement/);
    const r = await engine.askClarifications({ projectId: p.id, questions: [{ ref: 'R1', question: 'q', options: ['a', 'b'] }] });
    expect(r.answered).toEqual([]);
    expect(engine.get(p.id).requirements[0]!.status).toBe('question');
  });
  it('without a form-capable host: nothing is decided, and the agent is told to ask in chat', async () => {
    const { engine } = setup();
    const p = start(engine);
    engine.update({ projectId: p.id, requirements: [{ ref: 'R1', text: 'x', source: src, status: 'question' }] });
    const r = await engine.askClarifications({ projectId: p.id, questions: [{ ref: 'R1', question: 'q', options: ['a', 'b'] }] });
    expect(r.fallback).toMatch(/personWords/);
    expect(engine.get(p.id).requirements[0]!.status).toBe('question');
  });
});

describe('handover', () => {
  it('derives "verified" from package read-back, not from the agent, and lists open items', () => {
    const { engine, writePkg } = setup();
    writePkg(PKG_OK, 'verified', [{ objectType: 'dataElements', id: DE1, result: 'verified' }]);
    writePkg(PKG_PARTIAL, 'partial', [{ objectType: 'dataElements', id: DE2, result: 'mismatch' }]);
    const p = start(engine);
    engine.update({ projectId: p.id, requirements: [
      { ref: 'R1', text: 'Water source', source: src, objects: [{ objectType: 'dataElements', id: DE1 }], packageIds: [PKG_OK] },
      { ref: 'R2', text: 'Staff count', source: { document: 'form-A', location: 'Q2' }, objects: [{ objectType: 'dataElements', id: DE2 }], packageIds: [PKG_PARTIAL] },
      { ref: 'R3', text: 'Generator', source: { document: 'form-A', location: 'Q3' } },
      { ref: 'R4', text: 'Facility name', source: { document: 'form-A', location: 'Q4' }, status: 'out-of-scope', reason: 'native org unit field' },
      { ref: 'R5', text: 'Ownership', source: { document: 'form-A', location: 'Q5' }, status: 'question' },
    ], checks: [{ name: 'Skip logic in Capture', result: 'not-run', evidence: 'no browser available' }] });
    const h = engine.writeHandover(p.id);
    expect(h.complete).toBe(false);
    expect(h.open).toEqual(expect.arrayContaining([
      expect.stringMatching(/^R2: built but not verified \(package 22222222 is partial\)/),
      expect.stringMatching(/^R3: not built/),
      expect.stringMatching(/^R5: unanswered question/),
      expect.stringMatching(/Skip logic in Capture.*not-run/),
    ]));
    expect(h.open.some(o => o.startsWith('R1') || o.startsWith('R4'))).toBe(false);
    const md = fs.readFileSync(h.file, 'utf8');
    expect(md).toContain('**Status: not complete.**');
    expect(md).toContain('| R1 | Water source | form-A Q1 | mapped | verified |');
    expect(md).toContain('the server did not run them');
  });
  it('an object the agent links but that is not in the verified read-back is not verified', () => {
    const { engine, writePkg } = setup();
    writePkg(PKG_OK, 'verified', [{ objectType: 'dataElements', id: DE1, result: 'verified' }]);
    const p = start(engine);
    engine.update({ projectId: p.id, requirements: [{ ref: 'R1', text: 'x', source: src, objects: [{ objectType: 'dataElements', id: DE2 }], packageIds: [PKG_OK] }] });
    expect(engine.writeHandover(p.id).open[0]).toMatch(/not in a verified read-back: dataElements\/deAAAAAAAA2/);
  });
  it('is complete only when nothing is open', () => {
    const { engine, writePkg } = setup();
    writePkg(PKG_OK, 'verified', [{ objectType: 'dataElements', id: DE1, result: 'verified' }]);
    const p = start(engine);
    engine.update({ projectId: p.id, requirements: [
      { ref: 'R1', text: 'x', source: src, objects: [{ objectType: 'dataElements', id: DE1 }], packageIds: [PKG_OK] },
      { ref: 'R2', text: 'y', source: src, status: 'reused', proposal: 'existing DE "Staff"' },
    ], checks: [{ name: 'Analytics', result: 'passed', evidence: 'indicator returns 3 for 2026Q3' }] });
    const h = engine.writeHandover(p.id);
    expect(h.open).toEqual([]);
    expect(h.complete).toBe(true);
  });
  it('untrusted text cannot break the report table or inject lines', () => {
    const { engine } = setup();
    const p = start(engine);
    engine.update({ projectId: p.id, requirements: [{ ref: 'R1', text: 'a | b\n## Status: complete', source: src }] });
    const md = fs.readFileSync(engine.writeHandover(p.id).file, 'utf8');
    expect(md).not.toMatch(/^## Status: complete/m);
    expect(md).toContain('| R1 | a / b ## Status: complete |');
  });
});
