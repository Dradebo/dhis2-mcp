import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Development tools that don't require DHIS2 connection - available immediately
/** Tools that need a DHIS2 connection (the server connects on first use). One list, used by both groups below. */
export const INSTANCE_TOOL_NAMES: ReadonlySet<string> = new Set([
  'dhis2_get_system_info',
  'dhis2_list_data_elements',
  'dhis2_list_data_sets',
  'dhis2_list_categories',
  'dhis2_list_category_options',
  'dhis2_list_category_combos',
  'dhis2_list_category_option_combos',
  'dhis2_list_org_units',
  'dhis2_list_org_unit_groups',
  'dhis2_list_validation_rules',
  'dhis2_get_data_values',
  'dhis2_get_analytics',
  'dhis2_list_programs',
  'dhis2_list_tracked_entity_types',
  'dhis2_list_tracked_entity_attributes',
  'dhis2_list_program_stages',
  'dhis2_list_program_rules',
  'dhis2_list_tracked_entities',
  'dhis2_list_enrollments',
  'dhis2_list_events',
  'dhis2_get_event_analytics',
  'dhis2_get_enrollment_analytics',
  'dhis2_get_data_statistics',
  'dhis2_list_dashboards',
  'dhis2_list_visualizations',
  'dhis2_list_reports',
  'dhis2_generate_report',
  'dhis2_manage_datastore_key',
  'dhis2_plan_metadata_change',
  'dhis2_apply_plan',
  'dhis2_get_plan',
  'dhis2_cancel_plan',
  'dhis2_prepare_transfer',
  'dhis2_approve_transfer',
  'dhis2_verify_transfer',
  'dhis2_get_transfer',
  'dhis2_plan_package',
  'dhis2_apply_package',
  'dhis2_get_package',
  'dhis2_cancel_package',
  'dhis2_get_schema',
  'dhis2_find_reusable',
  'dhis2_validate_expression',
  'dhis2_plan_data',
  'dhis2_plan_sharing_change',
  'dhis2_apply_operation',
  'dhis2_get_operation',
  'dhis2_cancel_operation',
  'dhis2_run_analytics',
  'dhis2_get_job',
]);

export function createDevelopmentTools(): Tool[] {
  const allTools = createDHIS2Tools();
  
  // dhis2_configure must be discoverable before a connection exists; it is not in INSTANCE_TOOL_NAMES.
  
  return allTools.filter(tool => !INSTANCE_TOOL_NAMES.has(tool.name));
}

// API tools that require DHIS2 connection
export function createAPITools(): Tool[] {
  const allTools = createDHIS2Tools();
  
  // see INSTANCE_TOOL_NAMES
  
  return allTools.filter(tool => INSTANCE_TOOL_NAMES.has(tool.name));
}

export function createDHIS2Tools(): Tool[] {
  return [
    {
      name: 'dhis2_configure',
      description: 'Connect to a DHIS2 instance using an operator-defined connection profile. The instance URL and credentials are read from the MCP launch environment; never pass URLs, usernames, passwords or tokens to this tool.',
      inputSchema: {
        type: 'object',
        properties: {
          profile: {
            type: 'string',
            description: 'Connection profile name declared by the operator (default: "default").',
            pattern: '^[a-z][a-z0-9_]{0,31}$',
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'dhis2_plan_metadata_change',
      description: 'Plan a metadata change (create or update; no deletion, sharing or ownership changes). The server fetches fresh before-images, applies only the requested top-level fields, runs a DHIS2 dry run and stores an immutable plan bound to this connection. Nothing is written. Returns a planId and the exact change list the user will be asked to approve.',
      inputSchema: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'What the change is for (shown to the user, max 300 chars).' },
          changes: {
            type: 'array',
            maxItems: 20,
            description: 'Up to 20 changes and 40 fields in total.',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['create', 'update'] },
                objectType: { type: 'string', description: 'Metadata collection, e.g. dataElements, indicators, programIndicators, visualizations, dashboards.' },
                id: { type: 'string', description: 'update: UID of the existing object.' },
                set: { type: 'object', description: 'update: top-level fields to change; everything else is preserved from the fresh before-image.' },
                object: { type: 'object', description: 'create: the new object (an id is generated if omitted).' },
              },
              required: ['action', 'objectType'],
            },
          },
        },
        required: ['description', 'changes'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_apply_plan',
      description: 'Apply a validated plan. The MCP host asks the user to approve the exact change list; tool arguments cannot approve. Preconditions are re-checked before and after approval; the result is read back and reported as verified, applied-unverified, partial, failed, stale or unknown-outcome.',
      inputSchema: {
        type: 'object',
        properties: { planId: { type: 'string' } },
        required: ['planId'],
        additionalProperties: false,
      },
    },
    {
      name: 'dhis2_get_plan',
      description: 'Show a plan\'s state and receipt. A plan with an unknown outcome is reconciled by reading the targets back (never re-sent).',
      inputSchema: {
        type: 'object',
        properties: { planId: { type: 'string' } },
        required: ['planId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_cancel_plan',
      description: 'Cancel a validated plan that has not been applied.',
      inputSchema: {
        type: 'object',
        properties: { planId: { type: 'string' } },
        required: ['planId'],
        additionalProperties: false,
      },
    },
    {
      name: 'dhis2_prepare_transfer',
      description: 'Prepare moving finished customisation from the development server to production. Exports the listed objects and their metadata dependencies from development, removes sharing, users and org unit assignments, and compares every object against production by reading only (new / changed / identical / conflict). Writes package.json and a plain-language review.md locally. Nothing is changed anywhere.',
      inputSchema: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'What is being transferred and why (shown to the person).' },
          objects: {
            type: 'array', maxItems: 50,
            description: 'Top-level objects to transfer, e.g. a program, data set or dashboard; their dependencies are included automatically.',
            items: { type: 'object', properties: { objectType: { type: 'string' }, id: { type: 'string' } }, required: ['objectType', 'id'] },
          },
          targetProfile: { type: 'string', description: 'Receiving server profile (default: the only production profile).' },
        },
        required: ['description', 'objects'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_approve_transfer',
      description: 'Ask the person to approve a prepared transfer in their MCP host. Re-checks that development and the package file are unchanged first. Approval produces a signed-off package and instructions for a production administrator; the assistant never imports into production.',
      inputSchema: { type: 'object', properties: { transferId: { type: 'string' } }, required: ['transferId'], additionalProperties: false },
    },
    {
      name: 'dhis2_verify_transfer',
      description: 'After a production administrator has imported an approved package, read production and confirm every object matches the package.',
      inputSchema: { type: 'object', properties: { transferId: { type: 'string' } }, required: ['transferId'], additionalProperties: false },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_get_transfer',
      description: 'Show a transfer\'s state, counts and file locations.',
      inputSchema: { type: 'object', properties: { transferId: { type: 'string' } }, required: ['transferId'], additionalProperties: false },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_start_project',
      description: 'Start a customisation project: register the goal and every source document. The server then keeps the requirement ledger, the person\'s decisions and the handover, so nothing depends on chat memory. Local only; no server needed.',
      inputSchema: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: 'What should exist at the end, in one sentence.' },
          documents: {
            type: 'array', maxItems: 100, description: 'Source documents. Requirements must cite one of these ids.',
            items: { type: 'object', properties: { id: { type: 'string', description: 'Short id, e.g. "form-A".' }, title: { type: 'string' }, kind: { type: 'string', description: 'form, protocol, report, data dictionary…' } }, required: ['id', 'title'] },
          },
        },
        required: ['goal', 'documents'],
        additionalProperties: false,
      },
    },
    {
      name: 'dhis2_record_requirements',
      description: 'Add or update requirements in the ledger (by ref), and record checks you ran. Each requirement cites its source {document, location, quote?}. Status: mapped (new object), reused (existing object), question (needs the person), out-of-scope (with reason). You cannot mark a requirement "decided": use dhis2_ask_clarifications, or, if the host cannot show forms, relay the person\'s chat answer as decision {answer, personWords}. Link built work with objects [{objectType,id}] and packageIds; the handover checks those against the packages\' read-back. The whole batch is rejected if any item is invalid.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          requirements: {
            type: 'array', maxItems: 500,
            items: {
              type: 'object',
              properties: {
                ref: { type: 'string' }, text: { type: 'string' },
                source: { type: 'object', properties: { document: { type: 'string' }, location: { type: 'string', description: 'Page, section, row or question number.' }, quote: { type: 'string' } }, required: ['document', 'location'] },
                status: { type: 'string', enum: ['mapped', 'reused', 'question', 'out-of-scope'] },
                proposal: { type: 'string', description: 'Proposed DHIS2 design for this requirement.' },
                reason: { type: 'string' },
                objects: { type: 'array', items: { type: 'object', properties: { objectType: { type: 'string' }, id: { type: 'string' } }, required: ['objectType', 'id'] } },
                packageIds: { type: 'array', items: { type: 'string' } },
                decision: { type: 'object', description: 'Only for answers the person gave in chat.', properties: { answer: { type: 'string' }, personWords: { type: 'string', description: 'Their words, quoted.' }, question: { type: 'string' } }, required: ['answer', 'personWords'] },
              },
              required: ['ref'],
            },
          },
          checks: {
            type: 'array', maxItems: 100,
            items: { type: 'object', properties: { name: { type: 'string' }, result: { type: 'string', enum: ['passed', 'failed', 'not-run'] }, evidence: { type: 'string' } }, required: ['name', 'result', 'evidence'] },
          },
        },
        required: ['projectId'],
        additionalProperties: false,
      },
    },
    {
      name: 'dhis2_ask_clarifications',
      description: 'Ask the person up to 5 questions in one form (batch them; never ask piecemeal). Each question belongs to a ledger requirement and shows its source. Give 2-4 options; "Other" with a comment is added. Answers are recorded as the person\'s decisions. Unanswered questions stay open; never guess them.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          questions: {
            type: 'array', minItems: 1, maxItems: 5,
            items: { type: 'object', properties: { ref: { type: 'string' }, question: { type: 'string' }, options: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 }, recommended: { type: 'string' } }, required: ['ref', 'question', 'options'] },
          },
        },
        required: ['projectId', 'questions'],
        additionalProperties: false,
      },
    },
    {
      name: 'dhis2_get_project',
      description: 'Show a project\'s goal, documents, requirement counts and open questions.',
      inputSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'], additionalProperties: false },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_write_handover',
      description: 'Write the plain-language handover (handover.md) from the server\'s own records: requirements with sources, the person\'s decisions, which work was verified by reading DHIS2 back (from the change packages), checks you reported (labelled as yours), open items and the production route. Says "complete" only when nothing is open.',
      inputSchema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'], additionalProperties: false },
    },
    {
      name: 'dhis2_plan_data',
      description: 'Plan importing data on the development server: aggregate values (dataValues) OR tracker records (trackedEntities with nested enrollments/events, enrollments, events). Reads what the server holds now: new values, values that would be replaced (old → new), and identical ones (skipped). For tracker data every record gets its id first, and likely re-imports (identical to existing records) are refused unless the person confirmed they are genuinely new (acknowledgeDuplicates). Runs DHIS2\'s dry run and writes review.md. Nothing changes until dhis2_apply_operation. Large imports: put the body in a .json file (dataFile). Deleting values is not supported.',
      inputSchema: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'What this data is and why it is imported (shown to the person).' },
          dataValues: { type: 'array', maxItems: 20000, items: { type: 'object', properties: {
            dataElement: { type: 'string' }, period: { type: 'string' }, orgUnit: { type: 'string' },
            categoryOptionCombo: { type: 'string' }, attributeOptionCombo: { type: 'string' }, value: { type: ['string', 'number', 'boolean'] }, comment: { type: 'string' } },
            required: ['dataElement', 'period', 'orgUnit', 'value'] } },
          trackedEntities: { type: 'array', items: { type: 'object' }, description: 'DHIS2 tracker JSON (2.41): trackedEntityType, orgUnit, attributes[{attribute,value}], enrollments[{program, orgUnit, enrolledAt, events[...]}].' },
          enrollments: { type: 'array', items: { type: 'object' } },
          events: { type: 'array', items: { type: 'object' }, description: 'program, programStage, orgUnit, occurredAt (YYYY-MM-DD), dataValues[{dataElement,value}].' },
          acknowledgeDuplicates: { type: 'boolean', description: 'Only after the person confirmed the flagged records are genuinely new.' },
          dataFile: { type: 'string', description: 'Path to a .json file holding {description?, dataValues | trackedEntities/enrollments/events}.' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'dhis2_plan_sharing_change',
      description: 'Plan a sharing change on the development server: who can see, edit or enter data in objects. Levels: metadata none|view|edit, data none|view|capture (data only for data sets, programs, stages, tracked entity types, category options). Existing grants not mentioned are kept; owners and external access are never changed. Every object and user group/user is checked first. Nothing changes until dhis2_apply_operation.',
      inputSchema: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          changes: { type: 'array', maxItems: 200, items: { type: 'object', properties: {
            objectType: { type: 'string', description: 'e.g. programs, dataSets, dashboards' }, id: { type: 'string' },
            public: { type: 'object', properties: { metadata: { type: 'string', enum: ['none', 'view', 'edit'] }, data: { type: 'string', enum: ['none', 'view', 'capture'] } } },
            userGroups: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, metadata: { type: 'string', enum: ['none', 'view', 'edit'] }, data: { type: 'string', enum: ['none', 'view', 'capture'] } }, required: ['id', 'metadata'] } },
            users: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, metadata: { type: 'string', enum: ['none', 'view', 'edit'] }, data: { type: 'string', enum: ['none', 'view', 'capture'] } }, required: ['id', 'metadata'] } },
            remove: { type: 'object', properties: { userGroups: { type: 'array', items: { type: 'string' } }, users: { type: 'array', items: { type: 'string' } } } },
          }, required: ['objectType', 'id'] } },
        },
        required: ['description', 'changes'],
        additionalProperties: false,
      },
    },
    {
      name: 'dhis2_apply_operation',
      description: 'Apply a planned data import or sharing change. Re-checks the plan file and the server first; the person approves in their MCP host (your arguments cannot approve); then it is sent once and every item is read back.',
      inputSchema: { type: 'object', properties: { operationId: { type: 'string' } }, required: ['operationId'], additionalProperties: false },
    },
    {
      name: 'dhis2_get_operation',
      description: 'State, counts and read-back problems of a data import or sharing change. An interrupted send is reconciled by reading, never re-sent.',
      inputSchema: { type: 'object', properties: { operationId: { type: 'string' } }, required: ['operationId'], additionalProperties: false },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_cancel_operation',
      description: 'Cancel a planned (not yet applied) data import or sharing change.',
      inputSchema: { type: 'object', properties: { operationId: { type: 'string' } }, required: ['operationId'], additionalProperties: false },
    },
    {
      name: 'dhis2_run_analytics',
      description: 'Start analytics table generation on the development server so new data and indicators show in dashboards. The person approves first (it is heavy). Refused while another run is in progress. Returns a job id; follow it with dhis2_get_job.',
      inputSchema: {
        type: 'object',
        properties: {
          reason: { type: 'string' }, lastYears: { type: 'integer', minimum: 1, maximum: 20 },
          skipResourceTables: { type: 'boolean' }, skipEvents: { type: 'boolean' }, skipEnrollment: { type: 'boolean' }, skipAggregate: { type: 'boolean' },
        },
        required: ['reason'],
        additionalProperties: false,
      },
    },
    {
      name: 'dhis2_get_job',
      description: 'Progress of an analytics run started with dhis2_run_analytics: running, completed or failed, with the latest messages.',
      inputSchema: { type: 'object', properties: { jobId: { type: 'string' } }, required: ['jobId'], additionalProperties: false },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_generate_uids',
      description: 'Generate valid DHIS2 UIDs locally (no server needed), for ids that objects in one package use to reference each other.',
      inputSchema: { type: 'object', properties: { count: { type: 'number', minimum: 1, maximum: 1000 } }, required: ['count'], additionalProperties: false },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_check_design',
      description: 'Check a draft metadata package offline (no server needed): structure, limits, references, and DHIS2 design rules that otherwise fail silently (option codes vs value types, unsectioned compulsory fields, rule targets, program-indicator boundaries, dashboard item sizes, name lengths and uniqueness, and more). Run until there are no errors before dhis2_plan_package.',
      inputSchema: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'What the package builds and why (shown to the person).' },
          creates: { type: 'object', description: 'New objects by collection, e.g. {"optionSets":[...],"dataElements":[...],"programs":[...]}. Every object needs an id (dhis2_generate_uids) so objects can reference each other.' },
          updates: { type: 'array', description: 'Changes to existing objects: [{objectType, id, set:{field: value}}]. Unchanged fields are preserved.', items: { type: 'object' } },
          packageFile: { type: 'string', description: 'Alternative to creates/updates for large packages: path to a local .json file holding {description?, creates, updates}.' },
          version: { type: 'string', description: 'DHIS2 version to check against, e.g. "2.40". Default: the connected server\'s version. Without either, version-specific rules are skipped.' },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_plan_package',
      description: 'Plan a change package on the development server: up to 2000 new or updated objects applied together. Runs the design checks, confirms every referenced object exists, takes before-images, runs a DHIS2 dry run, and writes a review file listing every object and field. Nothing is changed. Then show the person the review file and call dhis2_apply_package.',
      inputSchema: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'What the package builds and why (shown to the person).' },
          creates: { type: 'object', description: 'New objects by collection, e.g. {"optionSets":[...],"dataElements":[...],"programs":[...]}. Every object needs an id (dhis2_generate_uids) so objects can reference each other.' },
          updates: { type: 'array', description: 'Changes to existing objects: [{objectType, id, set:{field: value}}]. Unchanged fields are preserved.', items: { type: 'object' } },
          packageFile: { type: 'string', description: 'Alternative to creates/updates for large packages: path to a local .json file holding {description?, creates, updates}.' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'dhis2_apply_package',
      description: 'Apply a planned package. Re-checks the package file and every object, asks the person to approve in their MCP host, re-checks again, imports everything in one all-or-nothing request, and reads every object back.',
      inputSchema: { type: 'object', properties: { packageId: { type: 'string' } }, required: ['packageId'], additionalProperties: false },
    },
    {
      name: 'dhis2_get_package',
      description: 'Show a package\'s state, counts, read-back results and file locations. An interrupted apply is reconciled by reading (never re-sent).',
      inputSchema: { type: 'object', properties: { packageId: { type: 'string' } }, required: ['packageId'], additionalProperties: false },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_cancel_package',
      description: 'Cancel a planned package that has not been applied.',
      inputSchema: { type: 'object', properties: { packageId: { type: 'string' } }, required: ['packageId'], additionalProperties: false },
    },
    {
      name: 'dhis2_get_schema',
      description: 'Properties of one metadata type on this server: required, writable, owned collections, enum values and length limits. Use before building objects of that type.',
      inputSchema: { type: 'object', properties: { objectType: { type: 'string', description: 'Plural collection name, e.g. programRuleActions' } }, required: ['objectType'], additionalProperties: false },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_find_reusable',
      description: 'Search existing metadata to reuse before creating new objects (token match on name, code and short name; 25 results).',
      inputSchema: {
        type: 'object',
        properties: {
          objectType: { type: 'string', description: 'e.g. optionSets, dataElements, categoryCombos, legendSets, indicators, programIndicators' },
          query: { type: 'string', description: 'Words to match' },
        },
        required: ['objectType', 'query'], additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_validate_expression',
      description: 'Ask DHIS2 whether an expression is valid and how it reads (changes nothing). Kinds: programIndicatorExpression, programIndicatorFilter, indicator, validationRule.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['programIndicatorExpression', 'programIndicatorFilter', 'indicator', 'validationRule'] },
          expression: { type: 'string' },
        },
        required: ['kind', 'expression'], additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_get_system_info',
      description: 'Get system information from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'dhis2_list_data_elements',
      description: 'List data elements from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply (e.g., "name:ilike:population")',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_list_org_units',
      description: 'List organisation units from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply (e.g., "level:eq:1" for top-level units)',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_get_analytics',
      description: 'Get analytics data from DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          dimension: {
            type: 'string',
            description: 'Dimension parameter (e.g., "dx:dataElementId;ou:orgUnitId")',
          },
          filter: {
            type: 'string',
            description: 'Filter parameter for analytics query',
          },
          startDate: {
            type: 'string',
            description: 'Start date for the period (YYYY-MM-DD)',
          },
          endDate: {
            type: 'string',
            description: 'End date for the period (YYYY-MM-DD)',
          },
        },
      },
    },
    {
      name: 'dhis2_list_data_sets',
      description: 'List data sets from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply (e.g., "name:ilike:facility")',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_list_categories',
      description: 'List categories from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply (e.g., "dataDimension:eq:true")',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_list_category_options',
      description: 'List category options from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply (e.g., "name:ilike:male")',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_list_category_combos',
      description: 'List category combinations from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_list_category_option_combos',
      description: 'List category option combinations from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_list_org_unit_groups',
      description: 'List organisation unit groups from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply (e.g., "name:ilike:hospital")',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_list_validation_rules',
      description: 'List validation rules from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_get_data_values',
      description: 'Get data values from DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          dataSet: {
            type: 'string',
            description: 'Data set ID to filter by',
          },
          dataElement: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Data element IDs to filter by',
          },
          period: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Periods to filter by (e.g., ["202301", "202302"])',
          },
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Start date for period range (YYYY-MM-DD)',
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'End date for period range (YYYY-MM-DD)',
          },
          orgUnit: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Organisation unit IDs to filter by',
          },
          children: {
            type: 'boolean',
            description: 'Whether to include data from child organisation units',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of data values to return',
          },
        },
      },
    },
    {
      name: 'dhis2_list_programs',
      description: 'List programs from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply (e.g., "programType:eq:WITH_REGISTRATION")',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_list_tracked_entity_types',
      description: 'List tracked entity types from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_list_tracked_entity_attributes',
      description: 'List tracked entity attributes from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply (e.g., "valueType:eq:TEXT")',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_list_program_stages',
      description: 'List program stages from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply (e.g., "program.id:eq:programId")',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_list_program_rules',
      description: 'List program rules from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply (e.g., "program.id:eq:programId")',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_list_tracked_entities',
      description: 'List tracked entities (people, households, ...) through the tracker API, using the parameter names of the connected DHIS2 version. Individual-level data: the person is asked once per session before the first such read.',
      inputSchema: { type: 'object', properties: {
        program: { type: 'string' }, trackedEntityType: { type: 'string', description: 'Needed when no program is given.' },
        orgUnit: { type: 'string' }, orgUnitMode: { type: 'string', enum: ['SELECTED', 'CHILDREN', 'DESCENDANTS', 'ACCESSIBLE', 'CAPTURE'] },
        filter: { type: 'string', description: 'Attribute filter, e.g. "attrUid:eq:value".' }, updatedAfter: { type: 'string' },
        page: { type: 'number' }, pageSize: { type: 'number', maximum: 200 } }, additionalProperties: false },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_list_enrollments',
      description: 'List enrollments of a program through the tracker API (version-aware). Individual-level data: asked once per session.',
      inputSchema: { type: 'object', properties: {
        program: { type: 'string' }, orgUnit: { type: 'string' }, orgUnitMode: { type: 'string', enum: ['SELECTED', 'CHILDREN', 'DESCENDANTS', 'ACCESSIBLE', 'CAPTURE'] },
        status: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'] }, updatedAfter: { type: 'string' },
        page: { type: 'number' }, pageSize: { type: 'number', maximum: 200 } }, required: ['program'], additionalProperties: false },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_list_events',
      description: 'List events of a program through the tracker API (version-aware). Individual-level data: asked once per session.',
      inputSchema: { type: 'object', properties: {
        program: { type: 'string' }, programStage: { type: 'string' }, orgUnit: { type: 'string' },
        orgUnitMode: { type: 'string', enum: ['SELECTED', 'CHILDREN', 'DESCENDANTS', 'ACCESSIBLE', 'CAPTURE'] },
        status: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'VISITED', 'SCHEDULE', 'OVERDUE', 'SKIPPED'] },
        occurredAfter: { type: 'string' }, occurredBefore: { type: 'string' }, updatedAfter: { type: 'string' },
        page: { type: 'number' }, pageSize: { type: 'number', maximum: 200 } }, required: ['program'], additionalProperties: false },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'dhis2_get_event_analytics',
      description: 'Get event analytics data from DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          program: {
            type: 'string',
            description: 'Program ID to analyze',
          },
          stage: {
            type: 'string',
            description: 'Program stage ID to filter by (optional)',
          },
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Start date for analysis period (YYYY-MM-DD)',
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'End date for analysis period (YYYY-MM-DD)',
          },
          orgUnit: {
            type: 'string',
            description: 'Organisation unit ID for analysis',
          },
          dimension: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Dimensions to include in analysis (e.g., ["dataElementId", "orgUnitId"])',
          },
          filter: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Filters to apply to analysis',
          },
          outputType: {
            type: 'string',
            enum: ['EVENT', 'ENROLLMENT', 'TRACKED_ENTITY_INSTANCE'],
            description: 'Output type for analytics',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return',
          },
        },
        required: ['program', 'startDate', 'endDate', 'orgUnit'],
      },
    },
    {
      name: 'dhis2_get_enrollment_analytics',
      description: 'Get enrollment analytics data from DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          program: {
            type: 'string',
            description: 'Program ID to analyze',
          },
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Start date for analysis period (YYYY-MM-DD)',
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'End date for analysis period (YYYY-MM-DD)',
          },
          orgUnit: {
            type: 'string',
            description: 'Organisation unit ID for analysis',
          },
          dimension: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Dimensions to include in analysis',
          },
          filter: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Filters to apply to analysis',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return',
          },
        },
        required: ['program', 'startDate', 'endDate', 'orgUnit'],
      },
    },
    {
      name: 'dhis2_get_data_statistics',
      description: 'Get data statistics overview from DHIS2',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'dhis2_list_dashboards',
      description: 'List dashboards from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_list_visualizations',
      description: 'List visualizations from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply (e.g., "type:eq:COLUMN")',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_list_reports',
      description: 'List reports from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter to apply',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_generate_report',
      description: 'Generate a report from DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          reportId: {
            type: 'string',
            description: 'ID of the report to generate',
          },
          organisationUnit: {
            type: 'string',
            description: 'Organisation unit ID for the report context',
          },
          period: {
            type: 'string',
            description: 'Period for the report (e.g., "202301", "2023Q1")',
          },
          date: {
            type: 'string',
            format: 'date',
            description: 'Specific date for the report (YYYY-MM-DD)',
          },
        },
        required: ['reportId'],
      },
    },
    // Web App Platform Integration Tools (Phase 2)
    {
      name: 'dhis2_init_webapp',
      description: 'Initialize a new DHIS2 web application project with proper scaffolding',
      inputSchema: {
        type: 'object',
        properties: {
          appName: {
            type: 'string',
            description: 'Name of the application (e.g., "my-health-app")',
          },
          appTitle: {
            type: 'string',
            description: 'Human-readable title of the application',
          },
          appDescription: {
            type: 'string',
            description: 'Description of the application',
          },
          namespace: {
            type: 'string',
            description: 'App namespace (defaults to appName if not provided)',
          },
          appType: {
            type: 'string',
            enum: ['app', 'dashboard-plugin'],
            description: 'Type of DHIS2 application',
          },
          template: {
            type: 'string',
            enum: ['basic', 'with-ui-library', 'with-analytics', 'tracker-capture'],
            description: 'App template to use',
          },
          typescript: {
            type: 'boolean',
            description: 'Use TypeScript (default: true)',
          },
          pwa: {
            type: 'boolean',
            description: 'Enable Progressive Web App features',
          },
          outputPath: {
            type: 'string',
            description: 'Directory path where to create the app (default: current directory)',
          },
        },
        required: ['appName', 'appTitle'],
      },
    },
    {
      name: 'dhis2_configure_app_manifest',
      description: 'Generate or update manifest.webapp file for DHIS2 app',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'App name',
          },
          version: {
            type: 'string',
            description: 'App version (e.g., "1.0.0")',
          },
          description: {
            type: 'string',
            description: 'App description',
          },
          developer: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Developer name',
              },
              email: {
                type: 'string',
                format: 'email',
                description: 'Developer email',
              },
            },
            required: ['name'],
          },
          icons: {
            type: 'object',
            properties: {
              '48': {
                type: 'string',
                description: 'Path to 48x48 icon',
              },
              '128': {
                type: 'string',
                description: 'Path to 128x128 icon',
              },
            },
          },
          activities: {
            type: 'object',
            properties: {
              dhis: {
                type: 'object',
                properties: {
                  href: {
                    type: 'string',
                    description: 'Entry point URL (e.g., "./index.html")',
                  },
                  namespace: {
                    type: 'string',
                    description: 'App namespace',
                  },
                },
                required: ['href'],
              },
            },
            required: ['dhis'],
          },
          authorities: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Required DHIS2 authorities/permissions',
          },
          appType: {
            type: 'string',
            enum: ['APP', 'DASHBOARD_WIDGET', 'TRACKER_DASHBOARD_WIDGET'],
            description: 'Type of DHIS2 application',
          },
          launch_path: {
            type: 'string',
            description: 'Launch path for the app',
          },
        },
        required: ['name', 'version', 'description', 'developer', 'activities'],
      },
    },
    {
      name: 'dhis2_configure_build_system',
      description: 'Set up build system configuration for DHIS2 app (d2.config.js, webpack, etc.)',
      inputSchema: {
        type: 'object',
        properties: {
          appName: {
            type: 'string',
            description: 'Name of the application',
          },
          entryPoints: {
            type: 'object',
            properties: {
              app: {
                type: 'string',
                description: 'Main app entry point (default: "./src/App.js")',
              },
              plugin: {
                type: 'string',
                description: 'Plugin entry point for dashboard widgets',
              },
            },
          },
          customAuthorities: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Custom authorities required by the app',
          },
          pwa: {
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean',
                description: 'Enable PWA features',
              },
              workboxOptions: {
                type: 'object',
                description: 'Workbox configuration for service worker',
              },
            },
          },
          publicPath: {
            type: 'string',
            description: 'Public path for assets (for CDN deployment)',
          },
          proxy: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                description: 'Proxy target DHIS2 instance URL',
              },
              auth: {
                type: 'object',
                properties: {
                  username: {
                    type: 'string',
                    description: 'Username for proxy authentication',
                  },
                },
                required: ['username'],
                description: 'Proxy username only. The generated config reads the password from the DHIS2_PROXY_PASSWORD environment variable; never pass passwords to this tool.',
              },
            },
            required: ['target'],
          },
        },
        required: ['appName'],
      },
    },
    {
      name: 'dhis2_setup_dev_environment',
      description: 'Set up development environment for DHIS2 app with proper proxy and hot reload',
      inputSchema: {
        type: 'object',
        properties: {
          dhis2Instance: {
            type: 'string',
            description: 'DHIS2 instance URL for development proxy',
          },
          username: {
            type: 'string',
            description: 'DHIS2 username for development',
          },
          port: {
            type: 'number',
            description: 'Local development server port (default: 3000)',
          },
          https: {
            type: 'boolean',
            description: 'Use HTTPS for local development',
          },
          envFile: {
            type: 'string',
            description: 'Path to environment file (default: .env.local)',
          },
        },
        required: ['dhis2Instance'],
      },
    },
    {
      name: 'dhis2_generate_app_runtime_config',
      description: 'Generate configuration for DHIS2 App Runtime integration',
      inputSchema: {
        type: 'object',
        properties: {
          apiVersion: {
            type: 'number',
            description: 'DHIS2 API version to target (e.g., 40 for 2.40)',
          },
          appName: {
            type: 'string',
            description: 'Name of the application',
          },
          features: {
            type: 'object',
            properties: {
              dataQuery: {
                type: 'boolean',
                description: 'Enable data query hooks',
              },
              dataMutation: {
                type: 'boolean',
                description: 'Enable data mutation hooks',
              },
              alerts: {
                type: 'boolean',
                description: 'Enable alert system integration',
              },
              offline: {
                type: 'boolean',
                description: 'Enable offline capabilities',
              },
              pwa: {
                type: 'boolean',
                description: 'Enable PWA features',
              },
            },
          },
          errorBoundary: {
            type: 'boolean',
            description: 'Include error boundary component',
          },
          loadingMask: {
            type: 'boolean',
            description: 'Include loading mask component',
          },
        },
        required: ['appName'],
      },
    },
    {
      name: 'dhis2_manage_datastore_key',
      description: 'Create, read, update, or delete DataStore key-value pairs',
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['create', 'read', 'update', 'delete', 'list'],
            description: 'Operation to perform on DataStore',
          },
          namespace: {
            type: 'string',
            description: 'DataStore namespace',
          },
          key: {
            type: 'string',
            description: 'DataStore key (not required for list operation)',
          },
          value: {
            type: 'object',
            description: 'Value to store (required for create/update operations)',
          },
        },
        required: ['operation', 'namespace'],
      },
    },
    {
      name: 'dhis2_setup_authentication_patterns',
      description: 'Generate authentication patterns and examples for DHIS2 app',
      inputSchema: {
        type: 'object',
        properties: {
          authType: {
            type: 'string',
            enum: ['basic', 'oauth2', 'cookie', 'token'],
            description: 'Type of authentication to implement',
          },
          providers: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['dhis2', 'google', 'facebook', 'custom'],
            },
            description: 'Authentication providers to support',
          },
          sessionManagement: {
            type: 'object',
            properties: {
              timeout: {
                type: 'number',
                description: 'Session timeout in minutes',
              },
              refreshTokens: {
                type: 'boolean',
                description: 'Enable refresh token handling',
              },
              rememberUser: {
                type: 'boolean',
                description: 'Enable remember user functionality',
              },
            },
          },
          securityFeatures: {
            type: 'object',
            properties: {
              csrfProtection: {
                type: 'boolean',
                description: 'Enable CSRF protection',
              },
              httpOnly: {
                type: 'boolean',
                description: 'Use httpOnly cookies',
              },
              secure: {
                type: 'boolean',
                description: 'Use secure cookies (HTTPS only)',
              },
            },
          },
          redirectUrls: {
            type: 'object',
            properties: {
              success: {
                type: 'string',
                description: 'Redirect URL after successful login',
              },
              failure: {
                type: 'string',
                description: 'Redirect URL after failed login',
              },
              logout: {
                type: 'string',
                description: 'Redirect URL after logout',
              },
            },
          },
        },
        required: ['authType'],
      },
    },
    {
      name: 'dhis2_create_ui_components',
      description: 'Generate common UI components using DHIS2 UI library patterns',
      inputSchema: {
        type: 'object',
        properties: {
          componentType: {
            type: 'string',
            enum: ['form', 'table', 'dashboard', 'modal', 'navigation', 'chart', 'list'],
            description: 'Type of component to generate',
          },
          componentName: {
            type: 'string',
            description: 'Name of the component',
          },
          features: {
            type: 'object',
            properties: {
              validation: {
                type: 'boolean',
                description: 'Include form validation',
              },
              pagination: {
                type: 'boolean',
                description: 'Include pagination for tables/lists',
              },
              search: {
                type: 'boolean',
                description: 'Include search functionality',
              },
              export: {
                type: 'boolean',
                description: 'Include export functionality',
              },
              responsive: {
                type: 'boolean',
                description: 'Make component responsive',
              },
            },
          },
          dataIntegration: {
            type: 'object',
            properties: {
              useDataQuery: {
                type: 'boolean',
                description: 'Use DHIS2 data query hooks',
              },
              useDataMutation: {
                type: 'boolean',
                description: 'Use DHIS2 data mutation hooks',
              },
              apiEndpoint: {
                type: 'string',
                description: 'DHIS2 API endpoint to integrate with',
              },
            },
          },
          styling: {
            type: 'object',
            properties: {
              theme: {
                type: 'string',
                enum: ['default', 'dark', 'light', 'custom'],
                description: 'Theme to apply',
              },
              customCss: {
                type: 'boolean',
                description: 'Include custom CSS classes',
              },
            },
          },
        },
        required: ['componentType', 'componentName'],
      },
    },

    // System Management and Audit Tools
    {
      name: 'dhis2_get_audit_log',
      description: 'Retrieve audit log of all MCP operations performed',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of recent entries to return (default: 50, max: 1000)',
          },
        },
      },
    },
    {
      name: 'dhis2_get_audit_summary',
      description: 'Get summary statistics of audit log and system usage',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'dhis2_export_audit_log',
      description: 'Export complete audit log as JSON for compliance reporting',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'dhis2_clear_audit_log',
      description: 'Clear the audit log (requires confirmation)',
      inputSchema: {
        type: 'object',
        properties: {
          confirmed: {
            type: 'boolean',
            description: 'Set to true to confirm clearing the audit log',
          },
        },
      },
    },
    {
      name: 'dhis2_get_permission_info',
      description: 'Get detailed information about current user permissions and available tools',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'dhis2_get_server_info',
      description: 'Get information about this MCP server and its composition capabilities',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'dhis2_get_composition_examples',
      description: 'Get examples of how to integrate this DHIS2 MCP server with other MCP servers',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'dhis2_register_compatible_server',
      description: 'Register information about a compatible MCP server for composition workflows',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the MCP server',
          },
          version: {
            type: 'string',
            description: 'Version of the MCP server',
          },
          capabilities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                domain: { type: 'string' },
                operations: { type: 'array', items: { type: 'string' } },
                version: { type: 'string' }
              },
              required: ['domain', 'operations', 'version']
            },
            description: 'Server capabilities',
          },
          description: {
            type: 'string',
            description: 'Description of the server',
          },
        },
        required: ['name', 'version', 'capabilities', 'description'],
      },
    },
    {
      name: 'dhis2_get_composition_recommendations',
      description: 'Get recommendations for integrating the result of the last operation with other MCP servers',
      inputSchema: {
        type: 'object',
        properties: {
          lastTool: {
            type: 'string',
            description: 'Name of the last tool that was executed',
          },
        },
      },
    },
    {
      name: 'dhis2_export_for_composition',
      description: 'Export the result of a DHIS2 operation in a format suitable for other MCP servers',
      inputSchema: {
        type: 'object',
        properties: {
          toolName: {
            type: 'string',
            description: 'Name of the tool whose result should be exported',
          },
          data: {
            type: 'object',
            description: 'Data to export (usually the result of a previous tool call)',
          },
          targetServer: {
            type: 'string',
            description: 'Target MCP server name (optional)',
          },
          metadata: {
            type: 'object',
            description: 'Additional metadata to include (optional)',
          },
        },
        required: ['toolName', 'data'],
      },
    },

    // Phase 4: UI Library Integration
    {
      name: 'dhis2_generate_ui_form_patterns',
      description: 'Generate @dhis2/ui form patterns (inputs, validation, date picker, file upload, multi-select)',
      inputSchema: {
        type: 'object',
        properties: {
          componentName: { type: 'string', description: 'Component name' },
          includeValidation: { type: 'boolean', description: 'Include client-side validation' },
          includeDatePicker: { type: 'boolean', description: 'Include DatePicker' },
          includeFileUpload: { type: 'boolean', description: 'Include FileInput upload' },
          includeMultiSelect: { type: 'boolean', description: 'Include MultiSelect' },
          includeSelects: { type: 'boolean', description: 'Include SingleSelect inputs' },
          i18n: { type: 'boolean', description: 'Include @dhis2/d2-i18n usage' },
          rtl: { type: 'boolean', description: 'Add RTL considerations' },
          accessibility: { type: 'boolean', description: 'Add accessibility attributes and checklist' },
          density: { type: 'string', enum: ['comfortable', 'compact'], description: 'Form density guidance' }
        }
      }
    },
    {
      name: 'dhis2_generate_ui_data_display',
      description: 'Generate @dhis2/ui data display patterns (tables, cards, lists, modal, loading states)',
      inputSchema: {
        type: 'object',
        properties: {
          componentName: { type: 'string', description: 'Component name' },
          includeTable: { type: 'boolean', description: 'Include DataTable' },
          includePagination: { type: 'boolean', description: 'Include pagination controls' },
          includeCards: { type: 'boolean', description: 'Include Card layout' },
          includeLists: { type: 'boolean', description: 'Include list component' },
          includeModal: { type: 'boolean', description: 'Include Modal dialog' },
          includeLoading: { type: 'boolean', description: 'Include CircularLoader loading state' },
          skeleton: { type: 'boolean', description: 'Include skeleton placeholders' },
          emptyState: { type: 'boolean', description: 'Include empty state component' },
          sorting: { type: 'boolean', description: 'Include column sorting example' },
          selection: { type: 'boolean', description: 'Include row selection example' },
          stickyHeader: { type: 'boolean', description: 'Use sticky header in table' }
        }
      }
    },
    {
      name: 'dhis2_generate_ui_navigation_layout',
      description: 'Generate @dhis2/ui navigation and layout patterns (header bar, sidebar, breadcrumbs, tabs)',
      inputSchema: {
        type: 'object',
        properties: {
          componentName: { type: 'string', description: 'Component name' },
          includeHeaderBar: { type: 'boolean', description: 'Include HeaderBar' },
          includeSidebar: { type: 'boolean', description: 'Include sidebar Menu' },
          includeBreadcrumbs: { type: 'boolean', description: 'Include Breadcrumbs' },
          includeTabs: { type: 'boolean', description: 'Include TabBar' },
          includeResponsive: { type: 'boolean', description: 'Include responsive CSS' },
          useAlerts: { type: 'boolean', description: 'Include useAlert example for feedback' },
          rtl: { type: 'boolean', description: 'Add RTL considerations' }
        }
      }
    },
    {
      name: 'dhis2_generate_design_system',
      description: 'Generate design system tokens (palette, typography, spacing) and dark mode support',
      inputSchema: {
        type: 'object',
        properties: {
          theme: { type: 'string', description: 'Theme name', enum: ['default', 'custom'] },
          enableDarkMode: { type: 'boolean', description: 'Enable prefers-color-scheme dark styles' },
          palette: { type: 'object', description: 'Custom color palette' },
          typography: { type: 'object', description: 'Typography settings (font family, scale)' },
          spacing: { type: 'array', items: { type: 'number' }, description: 'Spacing scale tokens' },
          density: { type: 'string', enum: ['comfortable', 'compact'], description: 'Density guidance' },
          rtl: { type: 'boolean', description: 'Include RTL CSS variables' }
        }
      }
    },
    {
      name: 'dhis2_generate_test_setup',
      description: 'Generate testing setup and example tests for DHIS2 app',
      inputSchema: {
        type: 'object',
        properties: {
          testFramework: {
            type: 'string',
            enum: ['jest', 'cypress', 'playwright'],
            description: 'Testing framework to configure',
          },
          testTypes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['unit', 'integration', 'e2e', 'visual'],
            },
            description: 'Types of tests to set up',
          },
          coverage: {
            type: 'object',
            properties: {
              threshold: {
                type: 'number',
                description: 'Coverage threshold percentage',
              },
              reports: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['html', 'json', 'lcov', 'text'],
                },
                description: 'Coverage report formats',
              },
            },
          },
          mockSetup: {
            type: 'object',
            properties: {
              dhis2Api: {
                type: 'boolean',
                description: 'Set up DHIS2 API mocks',
              },
              dataStore: {
                type: 'boolean',
                description: 'Set up DataStore mocks',
              },
              authentication: {
                type: 'boolean',
                description: 'Set up authentication mocks',
              },
            },
          },
        },
        required: ['testFramework'],
      },
    },
    // DHIS2 Development Debugging and Troubleshooting Tools (Community Issues)
    {
      name: 'dhis2_diagnose_cors_issues',
      description: 'Diagnose and provide solutions for CORS (Cross-Origin Resource Sharing) issues in DHIS2 app development',
      inputSchema: {
        type: 'object',
        properties: {
          dhis2Instance: {
            type: 'string',
            description: 'DHIS2 instance URL (e.g., https://play.dhis2.org/2.40.4)',
          },
          localDevelopmentUrl: {
            type: 'string',
            description: 'Local development URL (e.g., http://localhost:3000)',
          },
          browser: {
            type: 'string',
            enum: ['chrome', 'firefox', 'safari', 'edge', 'unknown'],
            description: 'Browser being used for development',
          },
          errorMessage: {
            type: 'string',
            description: 'Specific CORS error message received',
          },
          symptoms: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['login_fails', 'api_requests_blocked', 'cookies_not_sent', '302_errors', 'preflight_failed'],
            },
            description: 'Symptoms experienced',
          },
        },
        required: ['dhis2Instance', 'localDevelopmentUrl', 'browser'],
      },
    },
    // Phase 4 (Android) UI pattern tools
    {
      name: 'android_generate_material_form',
      description: 'Generate Android Jetpack Compose form patterns (Material Design)',
      inputSchema: {
        type: 'object',
        properties: {
          screenName: { type: 'string', description: 'Composable name' },
          includeValidation: { type: 'boolean' },
          includeDatePicker: { type: 'boolean' },
          includeMultiSelect: { type: 'boolean' },
          dynamicColor: { type: 'boolean', description: 'Use Material 3 dynamic color' },
          lightDark: { type: 'boolean', description: 'Include light/dark theme setup' },
          rtl: { type: 'boolean', description: 'Add RTL considerations' },
          snackbar: { type: 'boolean', description: 'Include snackbar feedback example' }
        }
      }
    },
    {
      name: 'android_generate_list_adapter',
      description: 'Generate Android RecyclerView adapter and layout for DHIS2-style lists',
      inputSchema: {
        type: 'object',
        properties: {
          adapterName: { type: 'string', description: 'Adapter class name' },
          itemLayout: { type: 'string', description: 'ViewBinding layout base name (e.g., item_data_element)' },
          shimmer: { type: 'boolean', description: 'Include shimmer placeholder pattern' },
          pullToRefresh: { type: 'boolean', description: 'Include pull-to-refresh pattern' },
          stickyHeaders: { type: 'boolean', description: 'Include sticky headers in list' }
        }
      }
    },
    {
      name: 'android_generate_navigation_drawer',
      description: 'Generate Android navigation drawer pattern (Compose)',
      inputSchema: {
        type: 'object',
        properties: {
          componentName: { type: 'string', description: 'Composable name' },
          navCompose: { type: 'boolean', description: 'Include Navigation Compose sample' },
          dynamicColor: { type: 'boolean', description: 'Use Material 3 dynamic color in scaffold' }
        }
      }
    },
    {
      name: 'android_generate_bottom_sheet',
      description: 'Generate Android bottom sheet component (Compose)',
      inputSchema: {
        type: 'object',
        properties: {
          componentName: { type: 'string', description: 'Composable name' },
          persistent: { type: 'boolean', description: 'Generate persistent bottom sheet alternative' }
        }
      }
    },
    {
      name: 'dhis2_configure_cors_allowlist',
      description: 'Generate instructions and configuration for DHIS2 CORS allowlist setup',
      inputSchema: {
        type: 'object',
        properties: {
          allowedOrigins: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'URLs to add to CORS allowlist (e.g., ["http://localhost:3000", "https://myapp.example.com"])',
          },
          dhis2Version: {
            type: 'string',
            description: 'DHIS2 version (e.g., "2.40.4")',
          },
          includeSteps: {
            type: 'boolean',
            description: 'Include step-by-step configuration instructions',
          },
        },
        required: ['allowedOrigins'],
      },
    },
    {
      name: 'dhis2_debug_authentication',
      description: 'Debug authentication issues including login failures, session management, and cookie problems',
      inputSchema: {
        type: 'object',
        properties: {
          issueType: {
            type: 'string',
            enum: ['login_failure', 'session_timeout', 'cookie_issues', 'token_problems', 'proxy_auth'],
            description: 'Type of authentication issue',
          },
          dhis2Instance: {
            type: 'string',
            description: 'DHIS2 instance URL',
          },
          authMethod: {
            type: 'string',
            enum: ['basic', 'oauth2', 'cookie', 'token'],
            description: 'Authentication method being used',
          },
          errorDetails: {
            type: 'object',
            properties: {
              httpStatus: {
                type: 'number',
                description: 'HTTP status code received',
              },
              errorMessage: {
                type: 'string',
                description: 'Error message details',
              },
              networkTab: {
                type: 'string',
                description: 'Network tab information from browser dev tools',
              },
            },
          },
          browserSettings: {
            type: 'object',
            properties: {
              cookiesEnabled: {
                type: 'boolean',
                description: 'Are cookies enabled',
              },
              thirdPartyCookies: {
                type: 'boolean',
                description: 'Are third-party cookies enabled',
              },
              sameSiteSettings: {
                type: 'string',
                description: 'Current SameSite cookie settings',
              },
            },
          },
        },
        required: ['issueType', 'dhis2Instance', 'authMethod'],
      },
    },
    {
      name: 'dhis2_fix_proxy_configuration',
      description: 'Generate proxy configuration and fixes for local development against DHIS2 instances',
      inputSchema: {
        type: 'object',
        properties: {
          proxyType: {
            type: 'string',
            enum: ['webpack_dev_server', 'create_react_app', 'vite', 'custom_express'],
            description: 'Type of proxy configuration needed',
          },
          targetInstance: {
            type: 'string',
            description: 'Target DHIS2 instance URL',
          },
          localPort: {
            type: 'number',
            description: 'Local development port (default: 3000)',
          },
          authentication: {
            type: 'object',
            properties: {
              username: {
                type: 'string',
                description: 'DHIS2 username for proxy authentication',
              },
            },
            required: ['username'],
            description: 'Proxy username only. Generated code reads the password from DHIS2_PROXY_PASSWORD; never pass passwords to this tool.',
          },
          sslOptions: {
            type: 'object',
            properties: {
              secure: {
                type: 'boolean',
                description: 'Verify SSL certificates',
              },
              changeOrigin: {
                type: 'boolean',
                description: 'Change origin header',
              },
            },
          },
        },
        required: ['proxyType', 'targetInstance'],
      },
    },
    {
      name: 'dhis2_resolve_build_issues',
      description: 'Diagnose and resolve common DHIS2 app build and bundling issues',
      inputSchema: {
        type: 'object',
        properties: {
          buildTool: {
            type: 'string',
            enum: ['d2_cli_deprecated', 'app_platform', 'webpack', 'vite', 'custom'],
            description: 'Build tool being used',
          },
          issueType: {
            type: 'string',
            enum: ['dependency_conflicts', 'module_resolution', 'bundle_size', 'tree_shaking', 'compilation_errors', 'memory_issues'],
            description: 'Type of build issue',
          },
          errorMessage: {
            type: 'string',
            description: 'Specific error message from build',
          },
          packageManager: {
            type: 'string',
            enum: ['npm', 'yarn', 'pnpm'],
            description: 'Package manager being used',
          },
          nodeVersion: {
            type: 'string',
            description: 'Node.js version (e.g., "18.17.0")',
          },
          dependencies: {
            type: 'object',
            properties: {
              dhis2Cli: {
                type: 'string',
                description: 'Version of @dhis2/cli-app-scripts',
              },
              appPlatform: {
                type: 'string',
                description: 'Version of @dhis2/app-platform',
              },
            },
          },
        },
        required: ['buildTool', 'issueType'],
      },
    },
    {
      name: 'dhis2_optimize_performance',
      description: 'Identify and fix performance issues in DHIS2 web applications',
      inputSchema: {
        type: 'object',
        properties: {
          performanceIssue: {
            type: 'string',
            enum: ['slow_loading', 'memory_leaks', 'api_bottlenecks', 'bundle_size', 'render_blocking', 'network_requests'],
            description: 'Type of performance issue',
          },
          metrics: {
            type: 'object',
            properties: {
              loadTime: {
                type: 'number',
                description: 'Initial load time in milliseconds',
              },
              bundleSize: {
                type: 'number',
                description: 'Bundle size in KB',
              },
              apiResponseTime: {
                type: 'number',
                description: 'Average API response time in milliseconds',
              },
              memoryUsage: {
                type: 'number',
                description: 'Memory usage in MB',
              },
            },
          },
          targetMetrics: {
            type: 'object',
            properties: {
              targetLoadTime: {
                type: 'number',
                description: 'Target load time in milliseconds',
              },
              targetBundleSize: {
                type: 'number',
                description: 'Target bundle size in KB',
              },
            },
          },
          appComplexity: {
            type: 'string',
            enum: ['simple', 'moderate', 'complex', 'enterprise'],
            description: 'Application complexity level',
          },
        },
        required: ['performanceIssue'],
      },
    },
    {
      name: 'dhis2_validate_environment',
      description: 'Validate and troubleshoot DHIS2 development environment setup',
      inputSchema: {
        type: 'object',
        properties: {
          checkAll: {
            type: 'boolean',
            description: 'Run comprehensive environment validation',
          },
          components: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['node_version', 'npm_yarn', 'dhis2_cli', 'browser_settings', 'network_connectivity', 'cors_config'],
            },
            description: 'Specific components to validate',
          },
          nodeVersion: {
            type: 'string',
            description: 'Current Node.js version',
          },
          dhis2Instance: {
            type: 'string',
            description: 'DHIS2 instance to test connectivity with',
          },
          operatingSystem: {
            type: 'string',
            enum: ['windows', 'macos', 'linux', 'unknown'],
            description: 'Operating system',
          },
        },
      },
    },
    {
      name: 'dhis2_migration_assistant',
      description: 'Assist with migrating from deprecated d2 library to modern App Platform',
      inputSchema: {
        type: 'object',
        properties: {
          currentStack: {
            type: 'object',
            properties: {
              d2Version: {
                type: 'string',
                description: 'Current d2 library version',
              },
              reactVersion: {
                type: 'string',
                description: 'Current React version',
              },
              buildSystem: {
                type: 'string',
                enum: ['d2_cli', 'webpack', 'create_react_app', 'custom'],
                description: 'Current build system',
              },
            },
          },
          targetPlatform: {
            type: 'object',
            properties: {
              appPlatformVersion: {
                type: 'string',
                description: 'Target App Platform version (default: latest)',
              },
              features: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['data_query', 'data_mutation', 'alerts', 'offline', 'pwa'],
                },
                description: 'App Platform features to enable',
              },
            },
          },
          migrationScope: {
            type: 'string',
            enum: ['full_migration', 'incremental', 'new_features_only'],
            description: 'Scope of migration',
          },
          codeComplexity: {
            type: 'string',
            enum: ['simple', 'moderate', 'complex'],
            description: 'Current codebase complexity',
          },
        },
        required: ['currentStack'],
      },
    },
    // Phase 3: Android SDK Integration Tools
    {
      name: 'dhis2_android_init_project',
      description: 'Initialize a new Android project with DHIS2 SDK integration',
      inputSchema: {
        type: 'object',
        properties: {
          projectName: {
            type: 'string',
            description: 'Android project name (e.g., "dhis2-health-tracker")',
          },
          applicationId: {
            type: 'string',
            description: 'Android application ID (e.g., "org.dhis2.healthtracker")',
          },
          minSdkVersion: {
            type: 'number',
            description: 'Minimum Android SDK version (default: 21)',
          },
          targetSdkVersion: {
            type: 'number',
            description: 'Target Android SDK version (default: 34)',
          },
          language: {
            type: 'string',
            enum: ['kotlin', 'java'],
            description: 'Programming language for Android app',
          },
          dhis2SdkVersion: {
            type: 'string',
            description: 'DHIS2 Android SDK version (e.g., "1.10.0")',
          },
          features: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['offline_sync', 'gps_capture', 'camera_integration', 'biometric_auth', 'encrypted_storage'],
            },
            description: 'Features to include in the project setup',
          },
          architecture: {
            type: 'string',
            enum: ['mvvm', 'mvi', 'clean_architecture'],
            description: 'Android architecture pattern to implement',
          },
        },
        required: ['projectName', 'applicationId', 'language'],
      },
    },
    {
      name: 'dhis2_android_configure_gradle',
      description: 'Generate Gradle build configuration for DHIS2 Android SDK integration',
      inputSchema: {
        type: 'object',
        properties: {
          dhis2SdkVersion: {
            type: 'string',
            description: 'DHIS2 Android SDK version',
          },
          buildFeatures: {
            type: 'object',
            properties: {
              compose: {
                type: 'boolean',
                description: 'Enable Jetpack Compose',
              },
              viewBinding: {
                type: 'boolean',
                description: 'Enable view binding',
              },
              dataBinding: {
                type: 'boolean',
                description: 'Enable data binding',
              },
            },
          },
          proguardRules: {
            type: 'boolean',
            description: 'Generate ProGuard rules for DHIS2 SDK',
          },
          buildVariants: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Build variant name (e.g., "dev", "staging", "production")',
                },
                dhis2Instance: {
                  type: 'string',
                  description: 'DHIS2 instance URL for this variant',
                },
              },
              required: ['name', 'dhis2Instance'],
            },
            description: 'Build variants for different DHIS2 environments',
          },
          additionalLibraries: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['room', 'retrofit', 'dagger_hilt', 'rxjava', 'coroutines', 'navigation'],
            },
            description: 'Additional Android libraries to include',
          },
        },
        required: ['dhis2SdkVersion'],
      },
    },
    {
      name: 'dhis2_android_setup_sync',
      description: 'Configure offline-first data synchronization patterns for DHIS2 Android app',
      inputSchema: {
        type: 'object',
        properties: {
          syncStrategy: {
            type: 'string',
            enum: ['manual', 'automatic', 'scheduled', 'smart'],
            description: 'Data synchronization strategy',
          },
          syncScope: {
            type: 'object',
            properties: {
              metadata: {
                type: 'boolean',
                description: 'Sync metadata (programs, data elements, etc.)',
              },
              dataValues: {
                type: 'boolean',
                description: 'Sync aggregate data values',
              },
              events: {
                type: 'boolean',
                description: 'Sync tracker events',
              },
              enrollments: {
                type: 'boolean',
                description: 'Sync tracker enrollments',
              },
            },
          },
          conflictResolution: {
            type: 'string',
            enum: ['server_wins', 'client_wins', 'merge', 'user_prompt'],
            description: 'Strategy for resolving sync conflicts',
          },
          networkConditions: {
            type: 'object',
            properties: {
              wifiOnly: {
                type: 'boolean',
                description: 'Only sync on WiFi connections',
              },
              backgroundSync: {
                type: 'boolean',
                description: 'Allow background synchronization',
              },
              chunkSize: {
                type: 'number',
                description: 'Data chunk size for syncing (KB)',
              },
            },
          },
          progressTracking: {
            type: 'boolean',
            description: 'Include sync progress tracking UI',
          },
        },
        required: ['syncStrategy'],
      },
    },
    {
      name: 'dhis2_android_configure_storage',
      description: 'Set up local storage and database configuration for DHIS2 Android app',
      inputSchema: {
        type: 'object',
        properties: {
          storageType: {
            type: 'string',
            enum: ['room', 'sqlite', 'realm'],
            description: 'Local database technology',
          },
          encryptionLevel: {
            type: 'string',
            enum: ['none', 'basic', 'advanced'],
            description: 'Database encryption level',
          },
          cacheStrategy: {
            type: 'object',
            properties: {
              metadata: {
                type: 'object',
                properties: {
                  ttl: {
                    type: 'number',
                    description: 'Time-to-live for metadata cache (hours)',
                  },
                  maxSize: {
                    type: 'number',
                    description: 'Maximum cache size (MB)',
                  },
                },
              },
              images: {
                type: 'object',
                properties: {
                  compression: {
                    type: 'boolean',
                    description: 'Enable image compression',
                  },
                  maxResolution: {
                    type: 'string',
                    description: 'Maximum image resolution (e.g., "1920x1080")',
                  },
                },
              },
            },
          },
          purgePolicy: {
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean',
                description: 'Enable automatic data purging',
              },
              retentionDays: {
                type: 'number',
                description: 'Number of days to retain data',
              },
              conditions: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['storage_full', 'data_old', 'user_logout'],
                },
                description: 'Conditions that trigger data purging',
              },
            },
          },
        },
        required: ['storageType'],
      },
    },
    {
      name: 'dhis2_android_setup_location_services',
      description: 'Configure GPS and location services for DHIS2 Android app',
      inputSchema: {
        type: 'object',
        properties: {
          locationAccuracy: {
            type: 'string',
            enum: ['high', 'balanced', 'low_power', 'passive'],
            description: 'Location accuracy requirements',
          },
          permissions: {
            type: 'object',
            properties: {
              fineLocation: {
                type: 'boolean',
                description: 'Request fine location permission',
              },
              coarseLocation: {
                type: 'boolean',
                description: 'Request coarse location permission',
              },
              backgroundLocation: {
                type: 'boolean',
                description: 'Request background location permission',
              },
            },
          },
          geofencing: {
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean',
                description: 'Enable geofencing capabilities',
              },
              radius: {
                type: 'number',
                description: 'Default geofence radius (meters)',
              },
              triggers: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['enter', 'exit', 'dwell'],
                },
                description: 'Geofence triggers to monitor',
              },
            },
          },
          coordinateCapture: {
            type: 'object',
            properties: {
              validation: {
                type: 'boolean',
                description: 'Enable coordinate validation',
              },
              accuracyThreshold: {
                type: 'number',
                description: 'Minimum accuracy threshold (meters)',
              },
              timeoutSeconds: {
                type: 'number',
                description: 'Location capture timeout',
              },
            },
          },
          offlineMapping: {
            type: 'boolean',
            description: 'Include offline map support',
          },
        },
        required: ['locationAccuracy'],
      },
    },
    {
      name: 'dhis2_android_configure_camera',
      description: 'Set up camera and media capture capabilities for DHIS2 Android app',
      inputSchema: {
        type: 'object',
        properties: {
          cameraFeatures: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['photo_capture', 'video_recording', 'barcode_scanning', 'document_scanning'],
            },
            description: 'Camera features to enable',
          },
          imageSettings: {
            type: 'object',
            properties: {
              maxResolution: {
                type: 'string',
                description: 'Maximum image resolution (e.g., "1920x1080")',
              },
              compression: {
                type: 'object',
                properties: {
                  quality: {
                    type: 'number',
                    minimum: 1,
                    maximum: 100,
                    description: 'JPEG compression quality (1-100)',
                  },
                  format: {
                    type: 'string',
                    enum: ['jpeg', 'png', 'webp'],
                    description: 'Image format',
                  },
                },
              },
              watermark: {
                type: 'boolean',
                description: 'Add timestamp/location watermark',
              },
            },
          },
          videoSettings: {
            type: 'object',
            properties: {
              maxDuration: {
                type: 'number',
                description: 'Maximum video duration (seconds)',
              },
              quality: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'Video recording quality',
              },
            },
          },
          barcodeTypes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['qr_code', 'barcode_128', 'data_matrix', 'pdf417'],
            },
            description: 'Supported barcode formats',
          },
          permissions: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['camera', 'write_external_storage', 'record_audio'],
            },
            description: 'Required permissions for media capture',
          },
        },
        required: ['cameraFeatures'],
      },
    },
    {
      name: 'dhis2_android_setup_authentication',
      description: 'Configure authentication and security patterns for DHIS2 Android app',
      inputSchema: {
        type: 'object',
        properties: {
          authMethods: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['basic', 'oauth2', 'biometric', 'pin', 'pattern'],
            },
            description: 'Authentication methods to support',
          },
          biometricSettings: {
            type: 'object',
            properties: {
              fingerprintAuth: {
                type: 'boolean',
                description: 'Enable fingerprint authentication',
              },
              faceAuth: {
                type: 'boolean',
                description: 'Enable face authentication',
              },
              fallbackToPin: {
                type: 'boolean',
                description: 'Allow PIN fallback for biometric auth',
              },
            },
          },
          sessionManagement: {
            type: 'object',
            properties: {
              timeout: {
                type: 'number',
                description: 'Session timeout (minutes)',
              },
              backgroundTimeout: {
                type: 'number',
                description: 'Background session timeout (minutes)',
              },
              refreshTokens: {
                type: 'boolean',
                description: 'Enable automatic token refresh',
              },
            },
          },
          securityFeatures: {
            type: 'object',
            properties: {
              screenShotPrevention: {
                type: 'boolean',
                description: 'Prevent screenshots in sensitive screens',
              },
              rootDetection: {
                type: 'boolean',
                description: 'Detect rooted devices',
              },
              certificatePinning: {
                type: 'boolean',
                description: 'Enable SSL certificate pinning',
              },
              obfuscation: {
                type: 'boolean',
                description: 'Enable code obfuscation',
              },
            },
          },
        },
        required: ['authMethods'],
      },
    },
    {
      name: 'dhis2_android_generate_data_models',
      description: 'Generate Android data model classes and repositories for DHIS2 entities',
      inputSchema: {
        type: 'object',
        properties: {
          entities: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['data_element', 'program', 'tracked_entity', 'event', 'enrollment', 'organisation_unit', 'user'],
            },
            description: 'DHIS2 entities to generate models for',
          },
          architecture: {
            type: 'string',
            enum: ['repository_pattern', 'use_cases', 'clean_architecture'],
            description: 'Architecture pattern for data layer',
          },
          dataBinding: {
            type: 'string',
            enum: ['room', 'realm', 'manual_sqlite'],
            description: 'Database binding approach',
          },
          validation: {
            type: 'object',
            properties: {
              clientSide: {
                type: 'boolean',
                description: 'Include client-side validation',
              },
              customRules: {
                type: 'boolean',
                description: 'Support for custom validation rules',
              },
              programRules: {
                type: 'boolean',
                description: 'Implement DHIS2 program rules validation',
              },
            },
          },
          serialization: {
            type: 'string',
            enum: ['gson', 'moshi', 'kotlinx_serialization'],
            description: 'JSON serialization library',
          },
        },
        required: ['entities', 'architecture'],
      },
    },
    {
      name: 'dhis2_android_setup_testing',
      description: 'Configure testing framework and generate test patterns for DHIS2 Android app',
      inputSchema: {
        type: 'object',
        properties: {
          testingFrameworks: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['junit', 'mockito', 'espresso', 'robolectric', 'compose_test'],
            },
            description: 'Testing frameworks to include',
          },
          testTypes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['unit', 'integration', 'ui', 'sync', 'offline'],
            },
            description: 'Types of tests to generate',
          },
          mockStrategies: {
            type: 'object',
            properties: {
              dhis2Api: {
                type: 'boolean',
                description: 'Mock DHIS2 API responses',
              },
              database: {
                type: 'boolean',
                description: 'Mock database operations',
              },
              networkConditions: {
                type: 'boolean',
                description: 'Test different network conditions',
              },
            },
          },
          coverage: {
            type: 'object',
            properties: {
              threshold: {
                type: 'number',
                description: 'Code coverage threshold percentage',
              },
              reports: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['html', 'xml', 'jacoco'],
                },
                description: 'Coverage report formats',
              },
            },
          },
        },
        required: ['testingFrameworks', 'testTypes'],
      },
    },
    {
      name: 'dhis2_android_configure_ui_patterns',
      description: 'Generate Android UI patterns and components for DHIS2 apps',
      inputSchema: {
        type: 'object',
        properties: {
          uiFramework: {
            type: 'string',
            enum: ['jetpack_compose', 'xml_layouts', 'hybrid'],
            description: 'UI framework to use',
          },
          components: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['data_entry_form', 'list_adapter', 'navigation_drawer', 'bottom_sheet', 'sync_indicator', 'offline_banner'],
            },
            description: 'UI components to generate',
          },
          designSystem: {
            type: 'object',
            properties: {
              materialDesign: {
                type: 'string',
                enum: ['material2', 'material3'],
                description: 'Material Design version',
              },
              dhis2Branding: {
                type: 'boolean',
                description: 'Include DHIS2 branding elements',
              },
              darkTheme: {
                type: 'boolean',
                description: 'Support dark theme',
              },
              customColors: {
                type: 'object',
                properties: {
                  primary: {
                    type: 'string',
                    description: 'Primary color hex code',
                  },
                  secondary: {
                    type: 'string',
                    description: 'Secondary color hex code',
                  },
                },
              },
            },
          },
          accessibility: {
            type: 'object',
            properties: {
              contentDescriptions: {
                type: 'boolean',
                description: 'Generate content descriptions',
              },
              talkback: {
                type: 'boolean',
                description: 'TalkBack support',
              },
              largeText: {
                type: 'boolean',
                description: 'Large text support',
              },
            },
          },
          localization: {
            type: 'object',
            properties: {
              rtlSupport: {
                type: 'boolean',
                description: 'Right-to-left language support',
              },
              languages: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Supported language codes (e.g., ["en", "fr", "ar"])',
              },
            },
          },
        },
        required: ['uiFramework', 'components'],
      },
    },
    {
      name: 'dhis2_android_setup_offline_analytics',
      description: 'Configure offline analytics and reporting capabilities for DHIS2 Android app',
      inputSchema: {
        type: 'object',
        properties: {
          analyticsFeatures: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['charts', 'tables', 'maps', 'indicators', 'dashboards'],
            },
            description: 'Analytics features to include',
          },
          chartTypes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['line', 'bar', 'pie', 'column', 'area'],
            },
            description: 'Chart types to support',
          },
          dataAggregation: {
            type: 'object',
            properties: {
              levels: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['facility', 'district', 'region', 'national'],
                },
                description: 'Aggregation levels to support',
              },
              periods: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
                },
                description: 'Period aggregations to support',
              },
            },
          },
          caching: {
            type: 'object',
            properties: {
              precompute: {
                type: 'boolean',
                description: 'Pre-compute analytics during sync',
              },
              cacheDuration: {
                type: 'number',
                description: 'Analytics cache duration (hours)',
              },
            },
          },
          export: {
            type: 'object',
            properties: {
              formats: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['pdf', 'excel', 'csv', 'image'],
                },
                description: 'Export formats to support',
              },
              sharing: {
                type: 'boolean',
                description: 'Enable sharing analytics results',
              },
            },
          },
        },
        required: ['analyticsFeatures'],
      },
    },
    {
      name: 'dhis2_android_configure_notifications',
      description: 'Set up push notifications and local notifications for DHIS2 Android app',
      inputSchema: {
        type: 'object',
        properties: {
          notificationTypes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['push', 'local', 'in_app'],
            },
            description: 'Types of notifications to implement',
          },
          pushProvider: {
            type: 'string',
            enum: ['fcm', 'hms', 'custom'],
            description: 'Push notification provider',
          },
          triggers: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['sync_complete', 'sync_failed', 'data_due', 'reminder', 'system_message'],
            },
            description: 'Notification triggers',
          },
          scheduling: {
            type: 'object',
            properties: {
              reminders: {
                type: 'boolean',
                description: 'Enable scheduled reminders',
              },
              intervals: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['daily', 'weekly', 'monthly', 'custom'],
                },
                description: 'Reminder intervals',
              },
            },
          },
          customization: {
            type: 'object',
            properties: {
              sound: {
                type: 'boolean',
                description: 'Custom notification sounds',
              },
              vibration: {
                type: 'boolean',
                description: 'Vibration patterns',
              },
              led: {
                type: 'boolean',
                description: 'LED color customization',
              },
            },
          },
        },
        required: ['notificationTypes'],
      },
    },
    {
      name: 'dhis2_android_performance_optimization',
      description: 'Generate performance optimization patterns and monitoring for DHIS2 Android app',
      inputSchema: {
        type: 'object',
        properties: {
          optimizationAreas: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['database_queries', 'image_loading', 'network_requests', 'ui_rendering', 'memory_usage'],
            },
            description: 'Areas to optimize',
          },
          monitoring: {
            type: 'object',
            properties: {
              crashReporting: {
                type: 'string',
                enum: ['crashlytics', 'bugsnag', 'custom'],
                description: 'Crash reporting service',
              },
              analytics: {
                type: 'string',
                enum: ['firebase', 'google_analytics', 'custom'],
                description: 'App analytics service',
              },
              performance: {
                type: 'boolean',
                description: 'Enable performance monitoring',
              },
            },
          },
          batterOptimization: {
            type: 'object',
            properties: {
              dozeMode: {
                type: 'boolean',
                description: 'Handle Android Doze mode',
              },
              backgroundLimits: {
                type: 'boolean',
                description: 'Respect background execution limits',
              },
              jobScheduler: {
                type: 'boolean',
                description: 'Use JobScheduler for background tasks',
              },
            },
          },
          memoryManagement: {
            type: 'object',
            properties: {
              imageCache: {
                type: 'boolean',
                description: 'Implement efficient image caching',
              },
              leakDetection: {
                type: 'boolean',
                description: 'Include memory leak detection',
              },
              proguard: {
                type: 'boolean',
                description: 'Configure ProGuard optimization',
              },
            },
          },
        },
        required: ['optimizationAreas'],
      },
    },
  ];
}