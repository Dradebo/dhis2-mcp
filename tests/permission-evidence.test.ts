import { describePermissionEvidence } from '../src/permission-evidence';

describe('Permission evidence is not inferred from local tool discovery', () => {
  it.each([
    [false, false, 'not configured', 'not verified'],
    [true, false, 'configured', 'not verified'],
    [true, true, 'configured', 'retrieved during configuration'],
    [false, true, 'not configured', 'not verified'],
  ])('reports configured=%s verifiedUser=%s without claiming live API access', (clientConfigured, userRetrieved, clientText, userText) => {
    const result=describePermissionEvidence(Boolean(clientConfigured),Boolean(userRetrieved));
    expect(result).toContain(clientText);
    expect(result).toContain(userText);
    expect(result).toContain('Local MCP policy does not establish DHIS2 authorization');
    expect(result).not.toContain('live authenticated');
  });
});
