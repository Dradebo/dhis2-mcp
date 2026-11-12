/**
 * Live findings on DHIS2 2.41.10.1 (2026-11-12):
 *  - lists sent paging=false, so DHIS2 ignored pageSize (5 category combos asked, 49 combos with 58,581
 *    embedded option combos returned: 18 MB) and the MCP connection closed;
 *  - nothing bounded the size of a tool reply.
 */
import axios from 'axios';
import { listPaging } from '../src/dhis2-client';
import { limitToolResult, MAX_TOOL_RESULT_CHARS } from '../src/result-limit';
import { DHIS2Client } from '../src/dhis2-client';

jest.mock('axios');

describe('list paging', () => {
  test('always pages, defaults to 50 and caps at 200', () => {
    expect(listPaging()).toEqual({ paging: true, page: 1, pageSize: 50 });
    expect(listPaging({ pageSize: 5, page: 3 })).toEqual({ paging: true, page: 3, pageSize: 5 });
    expect(listPaging({ pageSize: 100000 })).toEqual({ paging: true, page: 1, pageSize: 200 });
    expect(listPaging({ pageSize: 0, page: -2 })).toEqual({ paging: true, page: 1, pageSize: 1 });
    expect(listPaging({ pageSize: NaN as any, page: 'x' as any })).toEqual({ paging: true, page: 1, pageSize: 50 });
  });

  test('every metadata list request sends paging=true with the asked page size, and category combos count option combos instead of embedding them', async () => {
    const get = jest.fn().mockResolvedValue({ data: {} });
    (axios.create as jest.Mock).mockReturnValue({ get, interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } }, defaults: { headers: {} } });
    const c = new DHIS2Client('https://dhis2.example.org', { username: 'u', password: 'p' } as any);
    const methods = ['getDataElements', 'getOrganisationUnits', 'getDataSets', 'getCategories', 'getCategoryOptions', 'getCategoryCombos',
      'getCategoryOptionCombos', 'getOrganisationUnitGroups', 'getValidationRules', 'getPrograms', 'getTrackedEntityTypes',
      'getTrackedEntityAttributes', 'getProgramStages', 'getProgramRules', 'getDashboards', 'getVisualizations', 'getReports'];
    for (const m of methods) {
      get.mockClear();
      await (c as any)[m]({ pageSize: 7, page: 2 });
      const params = get.mock.calls[0][1].params;
      expect({ m, paging: params.paging, pageSize: params.pageSize, page: params.page }).toEqual({ m, paging: true, pageSize: 7, page: 2 });
      if (m === 'getCategoryCombos') expect(params.fields).not.toMatch(/categoryOptionCombos\[/);
    }
  });
});

describe('tool reply size', () => {
  test('small replies pass unchanged', () => {
    const r = { content: [{ type: 'text', text: 'hello' }] };
    expect(limitToolResult(r)).toEqual({ content: [{ type: 'text', text: 'hello' }] });
  });

  test('oversized pretty JSON is sent compact rather than cut when that fits', () => {
    const rows = Array.from({ length: 2000 }, (_, i) => ({ dataElement: 'abcdefghijk', period: '202401', orgUnit: 'ouAAAAAAAA1', value: String(i) }));
    const pretty = JSON.stringify({ dataValues: rows }, null, 2);
    expect(pretty.length).toBeGreaterThan(MAX_TOOL_RESULT_CHARS);
    expect(JSON.stringify({ dataValues: rows }).length).toBeLessThan(MAX_TOOL_RESULT_CHARS);
    const r: any = limitToolResult({ content: [{ type: 'text', text: pretty }] });
    expect(JSON.parse(r.content[0].text).dataValues).toHaveLength(2000);
  });

  test('oversized replies are cut with a note telling the agent to ask for less', () => {
    const big = 'x'.repeat(MAX_TOOL_RESULT_CHARS * 3);
    const r: any = limitToolResult({ content: [{ type: 'text', text: 'a'.repeat(1000) }, { type: 'text', text: big }, { type: 'text', text: big }] });
    const total = r.content.reduce((n: number, p: any) => n + p.text.length, 0);
    expect(total).toBeLessThan(MAX_TOOL_RESULT_CHARS + 500);
    expect(r.content[1].text).toMatch(/Reply cut at .* Ask for less: use filter, a smaller pageSize, or the next page\./);
  });
});
