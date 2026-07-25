import { createAPITools, createDevelopmentTools } from '../src/tools/index';

describe('pre-connection tool registration', () => {
  it('advertises dhis2_configure before a DHIS2 connection exists', () => {
    const toolNames = createDevelopmentTools().map(tool => tool.name);

    expect(toolNames).toContain('dhis2_configure');
  });

  it('does not duplicate dhis2_configure when API tools are added after connection', () => {
    const developmentNames = createDevelopmentTools().map(tool => tool.name);
    const apiNames = createAPITools().map(tool => tool.name);
    const allNames = [...developmentNames, ...apiNames];

    expect(allNames.filter(name => name === 'dhis2_configure')).toHaveLength(1);
  });

  it('keeps ordinary API tools hidden before connection', () => {
    const toolNames = createDevelopmentTools().map(tool => tool.name);

    expect(toolNames).not.toContain('dhis2_get_system_info');
    expect(toolNames).not.toContain('dhis2_list_data_elements');
    expect(toolNames).not.toContain('dhis2_list_programs');
  });
});
