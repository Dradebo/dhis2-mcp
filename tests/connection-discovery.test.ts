import { createDevelopmentTools, createAPITools } from '../src/tools/index';
import { filterDiscoverableTools } from '../src/security/tool-policy';

describe('Unauthenticated MCP connection discovery', () => {
  it('keeps tool names unique after authentication adds API tools', () => {
    const names = [...createDevelopmentTools(), ...createAPITools()].map(tool => tool.name);
    expect(new Set(names).size).toBe(names.length);
  });
  it('exposes the connection tool before an instance is configured', () => {
    const tools = filterDiscoverableTools(createDevelopmentTools(), {
      connectionVerified: false, permissions: null, capabilities: new Set(),
    });
    expect(tools.map(tool => tool.name)).toContain('dhis2_configure');
  });
});
