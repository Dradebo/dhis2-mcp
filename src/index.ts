#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { DHIS2Client } from './dhis2-client.js';
import { createDHIS2Tools } from './tools/index.js';

function filterUndefinedValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const filtered: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      filtered[key as keyof T] = value;
    }
  }
  return filtered;
}

const server = new Server(
  {
    name: 'dhis2-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let dhis2Client: DHIS2Client | null = null;
let tools: Tool[] = [];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'dhis2_configure':
        const { baseUrl, username, password } = args as {
          baseUrl: string;
          username: string;
          password: string;
        };
        
        dhis2Client = new DHIS2Client(baseUrl, username, password);
        await dhis2Client.testConnection();
        tools = createDHIS2Tools();
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully connected to DHIS2 instance at ${baseUrl}`,
            },
          ],
        };

      default:
        if (!dhis2Client) {
          throw new Error('DHIS2 client not initialized. Please configure connection first.');
        }
        break;
    }

    switch (name) {
      case 'dhis2_get_system_info':
        const systemInfo = await dhis2Client.getSystemInfo();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(systemInfo, null, 2),
            },
          ],
        };

      case 'dhis2_list_data_elements':
        const { filter: deFilter, pageSize: dePageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const dataElements = await dhis2Client.getDataElements(filterUndefinedValues({ filter: deFilter, pageSize: dePageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dataElements, null, 2),
            },
          ],
        };

      case 'dhis2_create_data_element':
        const newDataElement = args as any;
        const createdDE = await dhis2Client.createDataElement(newDataElement);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdDE, null, 2),
            },
          ],
        };

      case 'dhis2_update_data_element':
        const { id: deId, ...deUpdateData } = args as any;
        const updatedDE = await dhis2Client.updateDataElement(deId, deUpdateData);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(updatedDE, null, 2),
            },
          ],
        };

      case 'dhis2_delete_data_element':
        const { id: deDeleteId } = args as { id: string };
        const deletedDE = await dhis2Client.deleteDataElement(deDeleteId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(deletedDE, null, 2),
            },
          ],
        };

      case 'dhis2_list_data_sets':
        const { filter: dsFilter, pageSize: dsPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const dataSets = await dhis2Client.getDataSets(filterUndefinedValues({ filter: dsFilter, pageSize: dsPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dataSets, null, 2),
            },
          ],
        };

      case 'dhis2_create_data_set':
        const newDataSet = args as any;
        const createdDS = await dhis2Client.createDataSet(newDataSet);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdDS, null, 2),
            },
          ],
        };

      case 'dhis2_list_categories':
        const { filter: catFilter, pageSize: catPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const categories = await dhis2Client.getCategories(filterUndefinedValues({ filter: catFilter, pageSize: catPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(categories, null, 2),
            },
          ],
        };

      case 'dhis2_create_category':
        const newCategory = args as any;
        const createdCat = await dhis2Client.createCategory(newCategory);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdCat, null, 2),
            },
          ],
        };

      case 'dhis2_list_category_options':
        const { filter: coFilter, pageSize: coPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const categoryOptions = await dhis2Client.getCategoryOptions(filterUndefinedValues({ filter: coFilter, pageSize: coPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(categoryOptions, null, 2),
            },
          ],
        };

      case 'dhis2_create_category_option':
        const newCategoryOption = args as any;
        const createdCO = await dhis2Client.createCategoryOption(newCategoryOption);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdCO, null, 2),
            },
          ],
        };

      case 'dhis2_list_category_combos':
        const { filter: ccFilter, pageSize: ccPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const categoryCombos = await dhis2Client.getCategoryCombos(filterUndefinedValues({ filter: ccFilter, pageSize: ccPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(categoryCombos, null, 2),
            },
          ],
        };

      case 'dhis2_create_category_combo':
        const newCategoryCombo = args as any;
        const createdCC = await dhis2Client.createCategoryCombo(newCategoryCombo);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdCC, null, 2),
            },
          ],
        };

      case 'dhis2_list_category_option_combos':
        const { filter: cocFilter, pageSize: cocPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const categoryOptionCombos = await dhis2Client.getCategoryOptionCombos(filterUndefinedValues({ filter: cocFilter, pageSize: cocPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(categoryOptionCombos, null, 2),
            },
          ],
        };

      case 'dhis2_list_org_units':
        const { filter: ouFilter, pageSize: ouPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const orgUnits = await dhis2Client.getOrganisationUnits(filterUndefinedValues({ filter: ouFilter, pageSize: ouPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(orgUnits, null, 2),
            },
          ],
        };

      case 'dhis2_list_org_unit_groups':
        const { filter: ougFilter, pageSize: ougPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const orgUnitGroups = await dhis2Client.getOrganisationUnitGroups(filterUndefinedValues({ filter: ougFilter, pageSize: ougPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(orgUnitGroups, null, 2),
            },
          ],
        };

      case 'dhis2_create_org_unit_group':
        const newOrgUnitGroup = args as any;
        const createdOUG = await dhis2Client.createOrganisationUnitGroup(newOrgUnitGroup);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdOUG, null, 2),
            },
          ],
        };

      case 'dhis2_list_validation_rules':
        const { filter: vrFilter, pageSize: vrPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const validationRules = await dhis2Client.getValidationRules(filterUndefinedValues({ filter: vrFilter, pageSize: vrPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(validationRules, null, 2),
            },
          ],
        };

      case 'dhis2_create_validation_rule':
        const { leftSideExpression, rightSideExpression, ...vrData } = args as any;
        const validationRule = {
          ...vrData,
          leftSide: {
            expression: leftSideExpression,
            missingValueStrategy: 'SKIP_IF_ANY_VALUE_MISSING',
          },
          rightSide: {
            expression: rightSideExpression,
            missingValueStrategy: 'SKIP_IF_ANY_VALUE_MISSING',
          },
        };
        const createdVR = await dhis2Client.createValidationRule(validationRule);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdVR, null, 2),
            },
          ],
        };

      case 'dhis2_run_validation':
        const validationParams = args as any;
        const validationResults = await dhis2Client.runValidation(validationParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(validationResults, null, 2),
            },
          ],
        };

      case 'dhis2_get_data_values':
        const dataValueParams = args as any;
        const dataValues = await dhis2Client.getDataValues(dataValueParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dataValues, null, 2),
            },
          ],
        };

      case 'dhis2_bulk_import_data_values':
        const { dataValues: valuesToImport } = args as { dataValues: any[] };
        const importResult = await dhis2Client.bulkImportDataValues(valuesToImport);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(importResult, null, 2),
            },
          ],
        };

      case 'dhis2_get_analytics':
        const analyticsParams = args as any;
        const analytics = await dhis2Client.getAnalytics(analyticsParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(analytics, null, 2),
            },
          ],
        };

      case 'dhis2_list_programs':
        const { filter: progFilter, pageSize: progPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const programs = await dhis2Client.getPrograms(filterUndefinedValues({ filter: progFilter, pageSize: progPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(programs, null, 2),
            },
          ],
        };

      case 'dhis2_create_program':
        const newProgram = args as any;
        const createdProg = await dhis2Client.createProgram(newProgram);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdProg, null, 2),
            },
          ],
        };

      case 'dhis2_list_tracked_entity_types':
        const { filter: tetFilter, pageSize: tetPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const trackedEntityTypes = await dhis2Client.getTrackedEntityTypes(filterUndefinedValues({ filter: tetFilter, pageSize: tetPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(trackedEntityTypes, null, 2),
            },
          ],
        };

      case 'dhis2_create_tracked_entity_type':
        const newTET = args as any;
        const createdTET = await dhis2Client.createTrackedEntityType(newTET);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdTET, null, 2),
            },
          ],
        };

      case 'dhis2_list_tracked_entity_attributes':
        const { filter: teaFilter, pageSize: teaPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const trackedEntityAttributes = await dhis2Client.getTrackedEntityAttributes(filterUndefinedValues({ filter: teaFilter, pageSize: teaPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(trackedEntityAttributes, null, 2),
            },
          ],
        };

      case 'dhis2_create_tracked_entity_attribute':
        const newTEA = args as any;
        const createdTEA = await dhis2Client.createTrackedEntityAttribute(newTEA);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdTEA, null, 2),
            },
          ],
        };

      case 'dhis2_list_program_stages':
        const { filter: psFilter, pageSize: psPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const programStages = await dhis2Client.getProgramStages(filterUndefinedValues({ filter: psFilter, pageSize: psPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(programStages, null, 2),
            },
          ],
        };

      case 'dhis2_create_program_stage':
        const newPS = args as any;
        const createdPS = await dhis2Client.createProgramStage(newPS);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdPS, null, 2),
            },
          ],
        };

      case 'dhis2_list_program_rules':
        const { filter: prFilter, pageSize: prPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const programRules = await dhis2Client.getProgramRules(filterUndefinedValues({ filter: prFilter, pageSize: prPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(programRules, null, 2),
            },
          ],
        };

      case 'dhis2_create_program_rule':
        const newPR = args as any;
        const createdPR = await dhis2Client.createProgramRule(newPR);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdPR, null, 2),
            },
          ],
        };

      case 'dhis2_list_tracked_entity_instances':
        const teiParams = args as any;
        const trackedEntityInstances = await dhis2Client.getTrackedEntityInstances(teiParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(trackedEntityInstances, null, 2),
            },
          ],
        };

      case 'dhis2_create_tracked_entity_instance':
        const newTEI = args as any;
        const createdTEI = await dhis2Client.createTrackedEntityInstance(newTEI);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdTEI, null, 2),
            },
          ],
        };

      case 'dhis2_list_enrollments':
        const enrollmentParams = args as any;
        const enrollments = await dhis2Client.getEnrollments(enrollmentParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(enrollments, null, 2),
            },
          ],
        };

      case 'dhis2_create_enrollment':
        const newEnrollment = args as any;
        const createdEnrollment = await dhis2Client.createEnrollment(newEnrollment);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdEnrollment, null, 2),
            },
          ],
        };

      case 'dhis2_list_events':
        const eventParams = args as any;
        const events = await dhis2Client.getEvents(eventParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(events, null, 2),
            },
          ],
        };

      case 'dhis2_create_event':
        const newEvent = args as any;
        const createdEvent = await dhis2Client.createEvent(newEvent);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdEvent, null, 2),
            },
          ],
        };

      case 'dhis2_bulk_import_events':
        const { events: eventsToImport } = args as { events: any[] };
        const eventImportResult = await dhis2Client.bulkImportEvents(eventsToImport);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(eventImportResult, null, 2),
            },
          ],
        };

      case 'dhis2_get_event_analytics':
        const eventAnalyticsParams = args as any;
        const eventAnalytics = await dhis2Client.getEventAnalytics(eventAnalyticsParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(eventAnalytics, null, 2),
            },
          ],
        };

      case 'dhis2_get_enrollment_analytics':
        const enrollmentAnalyticsParams = args as any;
        const enrollmentAnalytics = await dhis2Client.getEnrollmentAnalytics(enrollmentAnalyticsParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(enrollmentAnalytics, null, 2),
            },
          ],
        };

      case 'dhis2_get_data_statistics':
        const dataStatistics = await dhis2Client.getDataStatistics();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dataStatistics, null, 2),
            },
          ],
        };

      case 'dhis2_list_dashboards':
        const { filter: dbFilter, pageSize: dbPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const dashboards = await dhis2Client.getDashboards(filterUndefinedValues({ filter: dbFilter, pageSize: dbPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dashboards, null, 2),
            },
          ],
        };

      case 'dhis2_create_dashboard':
        const newDashboard = args as any;
        const createdDashboard = await dhis2Client.createDashboard(newDashboard);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdDashboard, null, 2),
            },
          ],
        };

      case 'dhis2_list_visualizations':
        const { filter: vizFilter, pageSize: vizPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const visualizations = await dhis2Client.getVisualizations(filterUndefinedValues({ filter: vizFilter, pageSize: vizPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(visualizations, null, 2),
            },
          ],
        };

      case 'dhis2_create_visualization':
        const newVisualization = args as any;
        const createdVisualization = await dhis2Client.createVisualization(newVisualization);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(createdVisualization, null, 2),
            },
          ],
        };

      case 'dhis2_list_reports':
        const { filter: reportFilter, pageSize: reportPageSize } = args as {
          filter?: string;
          pageSize?: number;
        };
        const reports = await dhis2Client.getReports(filterUndefinedValues({ filter: reportFilter, pageSize: reportPageSize }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(reports, null, 2),
            },
          ],
        };

      case 'dhis2_generate_report':
        const { reportId, ...reportParams } = args as any;
        const generatedReport = await dhis2Client.generateReport(reportId, reportParams);
        return {
          content: [
            {
              type: 'text',
              text: 'Report generated successfully (binary data)',
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('DHIS2 MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});