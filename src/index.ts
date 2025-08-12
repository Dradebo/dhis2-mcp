#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CompleteRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { DHIS2Client } from './dhis2-client.js';
import { createDHIS2Tools } from './tools/index.js';
import { auditLogger } from './audit-logger.js';
import { ConfirmationSystem } from './confirmation-system.js';
import { PermissionSystem, UserPermissions } from './permission-system.js';
import { ParameterCompletion } from './parameter-completion.js';
import { MultiServerComposition } from './multi-server-composition.js';
import {
  generateWebAppInitInstructions,
  generateManifestContent,
  generateBuildSystemConfig,
  generateDevEnvironmentConfig,
  generateAppRuntimeConfig,
  generateAuthenticationPatterns,
  generateUIComponents,
  generateUIFormPatterns,
  generateUIDataDisplayPatterns,
  generateUINavigationLayout,
  generateDesignSystemConfig,
  generateAndroidMaterialForm,
  generateAndroidListAdapter,
  generateAndroidNavigationDrawer,
  generateAndroidBottomSheet,
  generateTestSetup
} from './webapp-generators.js';
import {
  diagnoseCORSIssues,
  generateCORSConfiguration,
  debugAuthentication,
  generateProxyConfiguration,
  resolveBuildIssues,
  generatePerformanceOptimizations,
  validateEnvironment,
  generateMigrationGuide
} from './debugging-helpers.js';
import {
  generateAndroidProjectInit,
  generateGradleBuildConfig,
  generateSyncConfiguration,
  generateLocationServicesConfig,
  generateStorageConfiguration,
  generateCameraConfiguration,
  generateAndroidAuthenticationConfig,
  generateDataModelsConfiguration,
  generateAndroidTestingConfiguration,
  generateAndroidUIConfiguration,
  generateOfflineAnalyticsConfiguration,
  generateNotificationsConfiguration,
  generatePerformanceOptimizationConfiguration
} from './android-generators.js';

function filterUndefinedValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const filtered: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      filtered[key as keyof T] = value;
    }
  }
  return filtered;
}

// Helper function to add audit logging to successful operations
function logSuccessfulOperation(toolName: string, params: Record<string, any>, result: any, startTime: number, resourcesAffected?: string[]) {
  auditLogger.log({
    toolName,
    parameters: params,
    outcome: 'success',
    dhis2Instance: dhis2Client?.baseURL,
    userId: currentUser?.username,
    executionTime: Date.now() - startTime,
    ...(resourcesAffected && { resourcesAffected })
  });
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
let userPermissions: UserPermissions = PermissionSystem.createDefaultPermissions();
let currentUser: any = null;
let parameterCompletion: ParameterCompletion = new ParameterCompletion(null);
let multiServerComposition: MultiServerComposition = new MultiServerComposition();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Filter tools based on user permissions
  const filteredTools = PermissionSystem.filterToolsByPermissions(tools, userPermissions);
  
  return {
    tools: filteredTools,
  };
});

server.setRequestHandler(CompleteRequestSchema, async (request) => {
  const { ref, argument } = request.params;
  
  try {
    // Extract current argument values from context for tool-specific completions
    const context = argument?.name ? { [argument.name]: argument.value } : {};
    const toolName = typeof ref === 'object' && 'name' in ref ? (ref as any).name : '';
    const argumentName = argument?.name || '';
    const partialValue = typeof argument?.value === 'string' ? argument.value : undefined;
    
    const completion = await parameterCompletion.getCompletion(toolName, argumentName, partialValue);
    
    // Also try tool-specific completions
    if (toolName && argumentName) {
      const toolSpecific = await parameterCompletion.getToolSpecificCompletion(
        toolName,
        argumentName,
        context
      );
      
      if (toolSpecific.values.length > 0) {
        completion.values = [...toolSpecific.values, ...completion.values];
      }
    }
    
    return {
      completion: {
        values: completion.values.slice(0, 50), // Limit to 50 suggestions
        hasMore: completion.values.length > 50
      }
    };
  } catch (error) {
    console.error('Error in completion handler:', error);
    return {
      completion: {
        values: [],
        hasMore: false
      }
    };
  }
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const startTime = Date.now();

  // Check if tool requires confirmation and isn't already confirmed
  const argsWithConfirmation = args as any;
  if (ConfirmationSystem.requiresConfirmation(name) && !argsWithConfirmation.confirmed) {
    const confirmationRequest = ConfirmationSystem.getConfirmationRequest(name, argsWithConfirmation);
    if (confirmationRequest) {
      const confirmationMessage = ConfirmationSystem.generateConfirmationMessage(confirmationRequest);
      
      // Log the confirmation request
      auditLogger.log({
        toolName: name,
        parameters: args as Record<string, any>,
        outcome: 'error',
        error: 'Confirmation required',
        dhis2Instance: dhis2Client?.baseURL
      });
      
      return {
        content: [{
          type: 'text',
          text: confirmationMessage
        }],
        isError: true
      };
    }
  }

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
        
        // Update parameter completion with the new client
        parameterCompletion = new ParameterCompletion(dhis2Client);
        
        // Fetch user information and permissions
        try {
          currentUser = await dhis2Client.getCurrentUser();
          userPermissions = PermissionSystem.extractPermissionsFromDHIS2User(currentUser);
        } catch (error) {
          console.warn('Could not fetch user permissions, using defaults:', error);
          userPermissions = PermissionSystem.createDefaultPermissions();
        }
        
        tools = createDHIS2Tools();
        
        // Log successful connection
        auditLogger.log({
          toolName: name,
          parameters: { baseUrl, username: '***REDACTED***' },
          outcome: 'success',
          dhis2Instance: baseUrl,
          userId: currentUser?.username || username,
          executionTime: Date.now() - startTime
        });
        
        const permissionSummary = PermissionSystem.getPermissionSummary(userPermissions);
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Successfully connected to DHIS2 instance at ${baseUrl}

👤 User: ${currentUser?.displayName || username}
🔐 Permission Level: ${permissionSummary.level} 
📝 ${permissionSummary.description}

🛠️ Available Tools: ${PermissionSystem.filterToolsByPermissions(tools, userPermissions).length} of ${tools.length} total tools

✅ Allowed Operations:
${permissionSummary.allowedOperations.map(op => `  • ${op}`).join('\n')}

${permissionSummary.restrictedOperations.length > 0 ? `⛔ Restricted Operations:
${permissionSummary.restrictedOperations.map(op => `  • ${op}`).join('\n')}` : ''}

🔍 Use tools starting with 'dhis2_' to interact with your DHIS2 instance.`,
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
        logSuccessfulOperation(name, {}, systemInfo, startTime);
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
        logSuccessfulOperation(name, { filter: deFilter, pageSize: dePageSize }, dataElements, startTime);
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
        logSuccessfulOperation(name, newDataElement, createdDE, startTime, [createdDE.response?.uid || 'unknown']);
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

      // Web App Platform Integration Tools
      case 'dhis2_init_webapp':
        const { appName, appTitle, appDescription, namespace, appType, template, typescript, pwa, outputPath } = args as any;
        const initInstructions = generateWebAppInitInstructions(appName, appTitle, appDescription, { namespace, appType, template, typescript, pwa, outputPath });
        return {
          content: [
            {
              type: 'text',
              text: initInstructions,
            },
          ],
        };

      case 'dhis2_configure_app_manifest':
        const manifestArgs = args as any;
        const manifestContent = generateManifestContent(manifestArgs);
        return {
          content: [
            {
              type: 'text',
              text: manifestContent,
            },
          ],
        };

      case 'dhis2_configure_build_system':
        const buildSystemArgs = args as any;
        const buildConfig = generateBuildSystemConfig(buildSystemArgs);
        return {
          content: [
            {
              type: 'text',
              text: buildConfig,
            },
          ],
        };

      case 'dhis2_setup_dev_environment':
        const devEnvArgs = args as any;
        const devEnvConfig = generateDevEnvironmentConfig(devEnvArgs);
        return {
          content: [
            {
              type: 'text',
              text: devEnvConfig,
            },
          ],
        };

      case 'dhis2_generate_app_runtime_config':
        const runtimeConfigArgs = args as any;
        const runtimeConfig = generateAppRuntimeConfig(runtimeConfigArgs);
        return {
          content: [
            {
              type: 'text',
              text: runtimeConfig,
            },
          ],
        };

      case 'dhis2_create_datastore_namespace':
        const datastoreNsArgs = args as any;
        const result = await dhis2Client.createDataStoreNamespace(datastoreNsArgs.namespace, datastoreNsArgs);
        return {
          content: [
            {
              type: 'text',
              text: `DataStore namespace '${datastoreNsArgs.namespace}' configured successfully`,
            },
          ],
        };

      case 'dhis2_manage_datastore_key':
        const datastoreKeyArgs = args as any;
        const keyResult = await dhis2Client.manageDataStoreKey(datastoreKeyArgs);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(keyResult, null, 2),
            },
          ],
        };

      case 'dhis2_setup_authentication_patterns':
        const authArgs = args as any;
        const authPatterns = generateAuthenticationPatterns(authArgs);
        return {
          content: [
            {
              type: 'text',
              text: authPatterns,
            },
          ],
        };

      case 'dhis2_create_ui_components':
        const uiArgs = args as any;
        const uiComponents = generateUIComponents(uiArgs);
        return {
          content: [
            {
              type: 'text',
              text: uiComponents,
            },
          ],
        };

      // Phase 4: UI Library Integration
      case 'dhis2_generate_ui_form_patterns':
        const formArgs = args as any;
        const formCode = generateUIFormPatterns(formArgs);
        return {
          content: [
            { type: 'text', text: formCode }
          ]
        };

      case 'dhis2_generate_ui_data_display':
        const displayArgs = args as any;
        const displayCode = generateUIDataDisplayPatterns(displayArgs);
        return {
          content: [
            { type: 'text', text: displayCode }
          ]
        };

      case 'dhis2_generate_ui_navigation_layout':
        const navArgs = args as any;
        const navCode = generateUINavigationLayout(navArgs);
        return {
          content: [
            { type: 'text', text: navCode }
          ]
        };

      case 'dhis2_generate_design_system':
        const dsArgs = args as any;
        const dsConfig = generateDesignSystemConfig(dsArgs);
        return {
          content: [
            { type: 'text', text: dsConfig }
          ]
        };

      // Android UI pattern tools (Phase 4)
      case 'android_generate_material_form':
        const aFormArgs = args as any;
        const aForm = generateAndroidMaterialForm(aFormArgs);
        return { content: [{ type: 'text', text: aForm }] };

      case 'android_generate_list_adapter':
        const aListArgs = args as any;
        const aList = generateAndroidListAdapter(aListArgs);
        return { content: [{ type: 'text', text: aList }] };

      case 'android_generate_navigation_drawer':
        const aNavArgs = args as any;
        const aNav = generateAndroidNavigationDrawer(aNavArgs);
        return { content: [{ type: 'text', text: aNav }] };

      case 'android_generate_bottom_sheet':
        const aSheetArgs = args as any;
        const aSheet = generateAndroidBottomSheet(aSheetArgs);
        return { content: [{ type: 'text', text: aSheet }] };

      case 'dhis2_generate_test_setup':
        const testArgs = args as any;
        const testSetup = generateTestSetup(testArgs);
        return {
          content: [
            {
              type: 'text',
              text: testSetup,
            },
          ],
        };

      // DHIS2 Debugging and Troubleshooting Tools
      case 'dhis2_diagnose_cors_issues':
        const corsArgs = args as any;
        const corsAnalysis = diagnoseCORSIssues(corsArgs);
        return {
          content: [
            {
              type: 'text',
              text: corsAnalysis,
            },
          ],
        };

      case 'dhis2_configure_cors_allowlist':
        const corsAllowlistArgs = args as any;
        const corsConfig = generateCORSConfiguration(corsAllowlistArgs);
        return {
          content: [
            {
              type: 'text',
              text: corsConfig,
            },
          ],
        };

      case 'dhis2_debug_authentication':
        const authDebugArgs = args as any;
        const authAnalysis = debugAuthentication(authDebugArgs);
        return {
          content: [
            {
              type: 'text',
              text: authAnalysis,
            },
          ],
        };

      case 'dhis2_fix_proxy_configuration':
        const proxyArgs = args as any;
        const proxyConfig = generateProxyConfiguration(proxyArgs);
        return {
          content: [
            {
              type: 'text',
              text: proxyConfig,
            },
          ],
        };

      case 'dhis2_resolve_build_issues':
        const buildIssueArgs = args as any;
        const buildSolution = resolveBuildIssues(buildIssueArgs);
        return {
          content: [
            {
              type: 'text',
              text: buildSolution,
            },
          ],
        };

      case 'dhis2_optimize_performance':
        const perfArgs = args as any;
        const perfOptimizations = generatePerformanceOptimizations(perfArgs);
        return {
          content: [
            {
              type: 'text',
              text: perfOptimizations,
            },
          ],
        };

      case 'dhis2_validate_environment':
        const envArgs = args as any;
        const envValidation = validateEnvironment(envArgs);
        return {
          content: [
            {
              type: 'text',
              text: envValidation,
            },
          ],
        };

      case 'dhis2_migration_assistant':
        const migrationArgs = args as any;
        const migrationGuide = generateMigrationGuide(migrationArgs);
        return {
          content: [
            {
              type: 'text',
              text: migrationGuide,
            },
          ],
        };

      // Phase 3: Android SDK Integration Tools
      case 'dhis2_android_init_project':
        const androidProjectArgs = args as any;
        const androidProjectInstructions = generateAndroidProjectInit(androidProjectArgs);
        return {
          content: [
            {
              type: 'text',
              text: androidProjectInstructions,
            },
          ],
        };

      case 'dhis2_android_configure_gradle':
        const gradleArgs = args as any;
        const gradleConfig = generateGradleBuildConfig(gradleArgs);
        return {
          content: [
            {
              type: 'text',
              text: gradleConfig,
            },
          ],
        };

      case 'dhis2_android_setup_sync':
        const syncArgs = args as any;
        const syncConfig = generateSyncConfiguration(syncArgs);
        return {
          content: [
            {
              type: 'text',
              text: syncConfig,
            },
          ],
        };

      case 'dhis2_android_configure_storage':
        const storageArgs = args as any;
        const storageConfig = generateStorageConfiguration(storageArgs);
        return {
          content: [
            {
              type: 'text',
              text: storageConfig,
            },
          ],
        };

      case 'dhis2_android_setup_location_services':
        const locationArgs = args as any;
        const locationConfig = generateLocationServicesConfig(locationArgs);
        return {
          content: [
            {
              type: 'text',
              text: locationConfig,
            },
          ],
        };

      case 'dhis2_android_configure_camera':
        const cameraArgs = args as any;
        const cameraConfig = generateCameraConfiguration(cameraArgs);
        return {
          content: [
            {
              type: 'text',
              text: cameraConfig,
            },
          ],
        };

      case 'dhis2_android_setup_authentication':
        const androidAuthArgs = args as any;
        const authConfig = generateAndroidAuthenticationConfig(androidAuthArgs);
        return {
          content: [
            {
              type: 'text',
              text: authConfig,
            },
          ],
        };

      case 'dhis2_android_generate_data_models':
        const dataModelsArgs = args as any;
        const dataModelsConfig = generateDataModelsConfiguration(dataModelsArgs);
        return {
          content: [
            {
              type: 'text',
              text: dataModelsConfig,
            },
          ],
        };

      case 'dhis2_android_setup_testing':
        const testingArgs = args as any;
        const testingConfig = generateAndroidTestingConfiguration(testingArgs);
        return {
          content: [
            {
              type: 'text',
              text: testingConfig,
            },
          ],
        };

      case 'dhis2_android_configure_ui_patterns':
        const androidUIArgs = args as any;
        const uiConfig = generateAndroidUIConfiguration(androidUIArgs);
        return {
          content: [
            {
              type: 'text',
              text: uiConfig,
            },
          ],
        };

      case 'dhis2_android_setup_offline_analytics':
        const analyticsArgs = args as any;
        const analyticsConfig = generateOfflineAnalyticsConfiguration(analyticsArgs);
        return {
          content: [
            {
              type: 'text',
              text: analyticsConfig,
            },
          ],
        };

      case 'dhis2_android_configure_notifications':
        const notificationsArgs = args as any;
        const notificationsConfig = generateNotificationsConfiguration(notificationsArgs);
        return {
          content: [
            {
              type: 'text',
              text: notificationsConfig,
            },
          ],
        };

      case 'dhis2_android_performance_optimization':
        const androidPerfArgs = args as any;
        const perfConfig = generatePerformanceOptimizationConfiguration(androidPerfArgs);
        return {
          content: [
            {
              type: 'text',
              text: perfConfig,
            },
          ],
        };

      // System Management and Audit Tools
      case 'dhis2_get_audit_log':
        const { limit = 50 } = args as { limit?: number };
        const auditEntries = auditLogger.getAuditTrail(Math.min(limit, 1000));
        
        // Log successful audit retrieval
        auditLogger.log({
          toolName: name,
          parameters: { limit },
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: `📋 Audit Log (${auditEntries.length} entries)\n\n` + 
                  auditEntries.map(entry => 
                    `🕐 ${entry.timestamp}\n` +
                    `🛠️  Tool: ${entry.toolName}\n` +
                    `👤 User: ${entry.userId || 'unknown'}\n` +
                    `${entry.outcome === 'success' ? '✅' : '❌'} Result: ${entry.outcome}${entry.error ? ` - ${entry.error}` : ''}\n` +
                    `⏱️  Duration: ${entry.executionTime || 0}ms\n` +
                    `📍 Instance: ${entry.dhis2Instance || 'N/A'}\n`
                  ).join('\n')
          }]
        };

      case 'dhis2_get_audit_summary':
        const summary = auditLogger.getAuditSummary();
        const permissionSummary = PermissionSystem.getPermissionSummary(userPermissions);
        
        auditLogger.log({
          toolName: name,
          parameters: {},
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: `📊 DHIS2 MCP Server Audit Summary

🔢 **Usage Statistics:**
  • Total Operations: ${summary.totalOperations}
  • Successful: ${summary.successCount} (${Math.round((summary.successCount / summary.totalOperations) * 100) || 0}%)
  • Errors: ${summary.errorCount} (${Math.round((summary.errorCount / summary.totalOperations) * 100) || 0}%)

👤 **Current Session:**
  • User: ${currentUser?.displayName || 'Unknown'}
  • Permission Level: ${permissionSummary.level}
  • Available Tools: ${PermissionSystem.filterToolsByPermissions(tools, userPermissions).length} of ${tools.length}
  • Connected to: ${dhis2Client?.baseURL || 'Not connected'}

🛠️ **Most Used Tools:**
${summary.mostUsedTools.slice(0, 5).map(tool => `  • ${tool.tool}: ${tool.count} times`).join('\n') || '  • No operations yet'}

${summary.recentErrors.length > 0 ? `⚠️  **Recent Errors:**
${summary.recentErrors.slice(0, 3).map(error => `  • ${error.toolName}: ${error.error}`).join('\n')}` : '✅ No recent errors'}`
          }]
        };

      case 'dhis2_export_audit_log':
        const exportData = auditLogger.exportAuditLog();
        
        auditLogger.log({
          toolName: name,
          parameters: {},
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: `📤 Audit Log Export\n\n${exportData}`
          }]
        };

      case 'dhis2_clear_audit_log':
        auditLogger.clear();
        
        return {
          content: [{
            type: 'text',
            text: `🗑️ Audit log cleared successfully.`
          }]
        };

      case 'dhis2_get_permission_info':
        const filteredTools = PermissionSystem.filterToolsByPermissions(tools, userPermissions);
        const permInfo = PermissionSystem.getPermissionSummary(userPermissions);
        
        auditLogger.log({
          toolName: name,
          parameters: {},
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: `🔐 Permission Information

👤 **User Details:**
  • Name: ${currentUser?.displayName || 'Unknown'}
  • Username: ${currentUser?.username || 'Unknown'}
  • User Groups: ${currentUser?.userGroups?.map((g: any) => g.name).join(', ') || 'None'}

🎯 **Permission Level:** ${permInfo.level}
📝 **Description:** ${permInfo.description}

✅ **Allowed Operations:**
${permInfo.allowedOperations.map(op => `  • ${op}`).join('\n')}

${permInfo.restrictedOperations.length > 0 ? `⛔ **Restricted Operations:**
${permInfo.restrictedOperations.map(op => `  • ${op}`).join('\n')}` : ''}

🛠️ **Available Tools:** ${filteredTools.length} of ${tools.length} total
  • Configuration: ${filteredTools.filter(t => t.name.includes('configure')).length}
  • Data Management: ${filteredTools.filter(t => t.name.includes('list') || t.name.includes('get')).length}
  • Creation Tools: ${filteredTools.filter(t => t.name.includes('create')).length}
  • Analytics: ${filteredTools.filter(t => t.name.includes('analytics')).length}
  • Development: ${filteredTools.filter(t => t.name.includes('init') || t.name.includes('generate')).length}

🔑 **DHIS2 Authorities:** ${userPermissions.authorities.length} authorities assigned`
          }]
        };

      // Multi-Server Composition Tools
      case 'dhis2_get_server_info':
        const serverInfo = multiServerComposition.getServerInfo();
        
        auditLogger.log({
          toolName: name,
          parameters: {},
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: `🖥️ DHIS2 MCP Server Information

**Server Details:**
  • Name: ${serverInfo.name}
  • Version: ${serverInfo.version}
  • Composition Mode: ${serverInfo.compositionMode ? 'Enabled' : 'Disabled'}
  
**Description:** ${serverInfo.description}

**Capabilities:**
${serverInfo.capabilities.map(cap => 
  `  • **${cap.domain}** (v${cap.version}): ${cap.operations.join(', ')}`
).join('\n')}

**Compatible MCP Servers:**
${serverInfo.compatibleWith.map(server => `  • ${server}`).join('\n')}

**Currently Registered Servers:** ${multiServerComposition.getCompatibleServers().length}
${multiServerComposition.getCompatibleServers().map(server => 
  `  • ${server.name} v${server.version}: ${server.description}`
).join('\n') || '  • No servers registered yet'}

🔗 **Integration Status:** 
${multiServerComposition.getCompatibleServers().length > 0 ? 
  `✅ Ready for multi-server workflows with ${multiServerComposition.getCompatibleServers().length} registered server(s)` : 
  '⚠️  No compatible servers registered. Use dhis2_register_compatible_server to enable workflows.'
}`
          }]
        };

      case 'dhis2_get_composition_examples':
        const examples = multiServerComposition.generateIntegrationExamples();
        
        auditLogger.log({
          toolName: name,
          parameters: {},
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: examples
          }]
        };

      case 'dhis2_register_compatible_server':
        const serverRegistrationArgs = args as {
          name: string;
          version: string;
          capabilities: Array<{ domain: string; operations: string[]; version: string }>;
          description: string;
        };
        
        multiServerComposition.registerCompatibleServer({
          name: serverRegistrationArgs.name,
          version: serverRegistrationArgs.version,
          capabilities: serverRegistrationArgs.capabilities,
          description: serverRegistrationArgs.description,
          compatibleWith: ['dhis2-mcp'],
          compositionMode: true
        });
        
        auditLogger.log({
          toolName: name,
          parameters: serverRegistrationArgs,
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: `✅ Successfully registered MCP server: ${serverRegistrationArgs.name} v${serverRegistrationArgs.version}

**Capabilities Added:**
${serverRegistrationArgs.capabilities.map(cap => 
  `  • ${cap.domain}: ${cap.operations.join(', ')}`
).join('\n')}

🔗 **Multi-Server Workflows:** Now enabled with ${multiServerComposition.getCompatibleServers().length} registered server(s)

💡 **Next Steps:**
  • Use dhis2_get_composition_recommendations to see integration suggestions
  • Use dhis2_export_for_composition to share data with other servers
  • Check dhis2_get_composition_examples for workflow ideas`
          }]
        };

      case 'dhis2_get_composition_recommendations':
        const { lastTool } = args as { lastTool?: string };
        const recommendations = multiServerComposition.getCompositionRecommendations(
          lastTool || 'dhis2_general', 
          {}
        );
        
        auditLogger.log({
          toolName: name,
          parameters: { lastTool },
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime
        });
        
        return {
          content: [{
            type: 'text',
            text: `💡 Multi-Server Integration Recommendations

${lastTool ? `**Based on your last operation:** ${lastTool}` : '**General Recommendations:**'}

**Suggested Next Steps:**
${recommendations.length > 0 ? 
  recommendations.map(rec => `  • ${rec}`).join('\n') : 
  '  • No specific recommendations for this operation'
}

**Available Compatible Servers:** ${multiServerComposition.getCompatibleServers().length}
${multiServerComposition.getCompatibleServers().map(server => 
  `  • **${server.name}**: ${server.capabilities.map(c => c.domain).join(', ')}`
).join('\n') || '  • Register servers with dhis2_register_compatible_server'}

**Common Integration Patterns:**
  • **Data Quality**: DHIS2 validation → GitHub issues → Slack notifications
  • **Development**: DHIS2 app generation → Git commits → Pull requests
  • **Analytics**: DHIS2 reports → Database storage → Email distribution
  • **Monitoring**: DHIS2 system info → Log aggregation → Alert systems

🔗 Use **dhis2_export_for_composition** to prepare data for other servers.`
          }]
        };

      case 'dhis2_export_for_composition':
        const exportArgs = args as {
          toolName: string;
          data: any;
          targetServer?: string;
          metadata?: Record<string, any>;
        };
        
        const exportContext = multiServerComposition.exportDataForComposition(
          exportArgs.toolName,
          exportArgs.data,
          {
            targetServer: exportArgs.targetServer,
            ...exportArgs.metadata
          }
        );
        
        auditLogger.log({
          toolName: name,
          parameters: exportArgs,
          outcome: 'success',
          dhis2Instance: dhis2Client?.baseURL,
          userId: currentUser?.username,
          executionTime: Date.now() - startTime,
          resourcesAffected: [exportArgs.toolName]
        });
        
        return {
          content: [{
            type: 'text',
            text: `📤 Data Exported for Multi-Server Composition

**Export Details:**
  • Source Tool: ${exportArgs.toolName}
  • Timestamp: ${exportContext.timestamp}
  • Target Server: ${exportArgs.targetServer || 'Any compatible server'}
  • Operation Type: ${exportContext.operationType}

**Standardized Export Format:**
\`\`\`json
${JSON.stringify(exportContext, null, 2)}
\`\`\`

**Compatible Servers:** ${multiServerComposition.getCompatibleServers().map(s => s.name).join(', ') || 'None registered'}

**Next Steps:**
  • Share this exported data with other MCP servers
  • Use the standardized format for workflow automation
  • Check server documentation for import procedures

💡 **Integration Tip:** This format is designed to work seamlessly with GitHub, Slack, Database, and other MCP servers.`
          }]
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    // Log the error
    auditLogger.log({
      toolName: name,
      parameters: args as Record<string, any>,
      outcome: 'error',
      error: error instanceof Error ? error.message : String(error),
      dhis2Instance: dhis2Client?.baseURL,
      userId: currentUser?.username,
      executionTime: Date.now() - startTime
    });

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