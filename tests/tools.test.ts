import { createDHIS2Tools } from '../src/tools/index';

describe('DHIS2 Tools', () => {
  let tools: any[];

  beforeAll(() => {
    tools = createDHIS2Tools();
  });

  describe('tool registration', () => {
    it('should create tools array', () => {
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should include required core tools', () => {
      const toolNames = tools.map(tool => tool.name);
      
      const requiredTools = [
        'dhis2_configure',
        'dhis2_get_system_info',
        'dhis2_list_data_elements',
        'dhis2_create_data_element',
        'dhis2_list_programs',
        'dhis2_create_program',
        'dhis2_get_analytics',
        'dhis2_get_event_analytics'
      ];

      requiredTools.forEach(toolName => {
        expect(toolNames).toContain(toolName);
      });
    });

    it('should have valid tool schemas', () => {
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
      });
    });
  });

  describe('dhis2_configure tool', () => {
    let configureTool: any;

    beforeAll(() => {
      configureTool = tools.find(tool => tool.name === 'dhis2_configure');
    });

    it('should exist and have correct schema', () => {
      expect(configureTool).toBeDefined();
      expect(configureTool.inputSchema.properties).toHaveProperty('baseUrl');
      expect(configureTool.inputSchema.properties).toHaveProperty('username');
      expect(configureTool.inputSchema.properties).toHaveProperty('password');
      expect(configureTool.inputSchema.required).toEqual(['baseUrl', 'username', 'password']);
    });
  });

  describe('data element tools', () => {
    let createTool: any;
    let listTool: any;

    beforeAll(() => {
      createTool = tools.find(tool => tool.name === 'dhis2_create_data_element');
      listTool = tools.find(tool => tool.name === 'dhis2_list_data_elements');
    });

    it('should have create data element tool with proper schema', () => {
      expect(createTool).toBeDefined();
      expect(createTool.inputSchema.properties).toHaveProperty('name');
      expect(createTool.inputSchema.properties).toHaveProperty('valueType');
      expect(createTool.inputSchema.properties).toHaveProperty('domainType');
      expect(createTool.inputSchema.properties.valueType.enum).toContain('NUMBER');
      expect(createTool.inputSchema.properties.valueType.enum).toContain('TEXT');
      expect(createTool.inputSchema.properties.domainType.enum).toContain('AGGREGATE');
      expect(createTool.inputSchema.properties.domainType.enum).toContain('TRACKER');
    });

    it('should have list data elements tool with optional filters', () => {
      expect(listTool).toBeDefined();
      expect(listTool.inputSchema.properties).toHaveProperty('filter');
      expect(listTool.inputSchema.properties).toHaveProperty('pageSize');
      expect(listTool.inputSchema.required).toBeUndefined(); // All parameters are optional
    });
  });

  describe('program tools', () => {
    let createTool: any;
    let listTool: any;

    beforeAll(() => {
      createTool = tools.find(tool => tool.name === 'dhis2_create_program');
      listTool = tools.find(tool => tool.name === 'dhis2_list_programs');
    });

    it('should have create program tool with program type validation', () => {
      expect(createTool).toBeDefined();
      expect(createTool.inputSchema.properties).toHaveProperty('programType');
      expect(createTool.inputSchema.properties.programType.enum).toContain('WITH_REGISTRATION');
      expect(createTool.inputSchema.properties.programType.enum).toContain('WITHOUT_REGISTRATION');
    });

    it('should have list programs tool', () => {
      expect(listTool).toBeDefined();
      expect(listTool.inputSchema.type).toBe('object');
    });
  });

  describe('analytics tools', () => {
    let analyticsTool: any;
    let eventAnalyticsTool: any;

    beforeAll(() => {
      analyticsTool = tools.find(tool => tool.name === 'dhis2_get_analytics');
      eventAnalyticsTool = tools.find(tool => tool.name === 'dhis2_get_event_analytics');
    });

    it('should have basic analytics tool', () => {
      expect(analyticsTool).toBeDefined();
      expect(analyticsTool.inputSchema.properties).toHaveProperty('dimension');
      expect(analyticsTool.inputSchema.properties).toHaveProperty('filter');
    });

    it('should have event analytics tool with required parameters', () => {
      expect(eventAnalyticsTool).toBeDefined();
      expect(eventAnalyticsTool.inputSchema.properties).toHaveProperty('program');
      expect(eventAnalyticsTool.inputSchema.properties).toHaveProperty('startDate');
      expect(eventAnalyticsTool.inputSchema.properties).toHaveProperty('endDate');
      expect(eventAnalyticsTool.inputSchema.properties).toHaveProperty('orgUnit');
      expect(eventAnalyticsTool.inputSchema.required).toEqual(['program', 'startDate', 'endDate', 'orgUnit']);
    });
  });

  describe('validation tools', () => {
    let validationTool: any;
    let runValidationTool: any;

    beforeAll(() => {
      validationTool = tools.find(tool => tool.name === 'dhis2_create_validation_rule');
      runValidationTool = tools.find(tool => tool.name === 'dhis2_run_validation');
    });

    it('should have validation rule creation tool', () => {
      expect(validationTool).toBeDefined();
      expect(validationTool.inputSchema.properties).toHaveProperty('importance');
      expect(validationTool.inputSchema.properties).toHaveProperty('operator');
      expect(validationTool.inputSchema.properties.importance.enum).toContain('HIGH');
      expect(validationTool.inputSchema.properties.importance.enum).toContain('MEDIUM');
      expect(validationTool.inputSchema.properties.importance.enum).toContain('LOW');
    });

    it('should have run validation tool', () => {
      expect(runValidationTool).toBeDefined();
      expect(runValidationTool.inputSchema.required).toContain('startDate');
      expect(runValidationTool.inputSchema.required).toContain('endDate');
      expect(runValidationTool.inputSchema.required).toContain('organisationUnits');
    });
  });

  describe('bulk operations', () => {
    let bulkDataValuesTool: any;
    let bulkEventsTool: any;

    beforeAll(() => {
      bulkDataValuesTool = tools.find(tool => tool.name === 'dhis2_bulk_import_data_values');
      bulkEventsTool = tools.find(tool => tool.name === 'dhis2_bulk_import_events');
    });

    it('should have bulk data values import tool', () => {
      expect(bulkDataValuesTool).toBeDefined();
      expect(bulkDataValuesTool.inputSchema.properties).toHaveProperty('dataValues');
      expect(bulkDataValuesTool.inputSchema.properties.dataValues.type).toBe('array');
    });

    it('should have bulk events import tool', () => {
      expect(bulkEventsTool).toBeDefined();
      expect(bulkEventsTool.inputSchema.properties).toHaveProperty('events');
      expect(bulkEventsTool.inputSchema.properties.events.type).toBe('array');
    });
  });
});