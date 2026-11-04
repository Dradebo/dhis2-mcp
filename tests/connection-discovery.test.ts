import { createDevelopmentTools, createAPITools } from '../src/tools/index';
import { PermissionSystem } from '../src/permission-system';

describe('Unauthenticated MCP connection discovery', () => {
  it('keeps tool names unique after authentication adds API tools', () => {
    const names = [...createDevelopmentTools(), ...createAPITools()].map(tool => tool.name);
    expect(new Set(names).size).toBe(names.length);
  });
  it('exposes the connection tool before an instance is configured', () => {
    const tools = PermissionSystem.filterToolsByPermissions(
      createDevelopmentTools(), PermissionSystem.createDefaultPermissions()
    );
    expect(tools.map(tool => tool.name)).toContain('dhis2_configure');
  });
});
