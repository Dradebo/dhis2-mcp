import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function createDHIS2Tools(): Tool[] {
  return [
    {
      name: 'dhis2_configure',
      description: 'Configure connection to a DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          baseUrl: {
            type: 'string',
            description: 'Base URL of the DHIS2 instance (e.g., https://play.dhis2.org/2.40.4)',
          },
          username: {
            type: 'string',
            description: 'Username for DHIS2 authentication',
          },
          password: {
            type: 'string',
            description: 'Password for DHIS2 authentication',
          },
        },
        required: ['baseUrl', 'username', 'password'],
      },
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
      name: 'dhis2_create_data_element',
      description: 'Create a new data element in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the data element',
          },
          shortName: {
            type: 'string',
            description: 'Short name of the data element',
          },
          code: {
            type: 'string',
            description: 'Code for the data element',
          },
          valueType: {
            type: 'string',
            enum: ['NUMBER', 'INTEGER', 'POSITIVE_INT', 'NEGATIVE_INT', 'ZERO_OR_POSITIVE_INT', 'TEXT', 'LONG_TEXT', 'LETTER', 'PHONE_NUMBER', 'EMAIL', 'BOOLEAN', 'TRUE_ONLY', 'DATE', 'DATETIME', 'TIME', 'URL', 'FILE_RESOURCE', 'IMAGE', 'COORDINATE', 'ORGANISATION_UNIT', 'REFERENCE', 'AGE', 'USERNAME', 'TRACKER_ASSOCIATE'],
            description: 'Value type of the data element',
          },
          domainType: {
            type: 'string',
            enum: ['AGGREGATE', 'TRACKER'],
            description: 'Domain type of the data element',
          },
          aggregationType: {
            type: 'string',
            enum: ['SUM', 'AVERAGE', 'AVERAGE_SUM_ORG_UNIT', 'COUNT', 'STDDEV', 'VARIANCE', 'MIN', 'MAX', 'NONE', 'CUSTOM', 'DEFAULT'],
            description: 'Aggregation type for the data element',
          },
          description: {
            type: 'string',
            description: 'Description of the data element',
          },
          zeroIsSignificant: {
            type: 'boolean',
            description: 'Whether zero values are significant for this data element',
          },
        },
        required: ['name', 'shortName', 'valueType', 'domainType', 'aggregationType'],
      },
    },
    {
      name: 'dhis2_update_data_element',
      description: 'Update an existing data element in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID of the data element to update',
          },
          name: {
            type: 'string',
            description: 'Name of the data element',
          },
          shortName: {
            type: 'string',
            description: 'Short name of the data element',
          },
          code: {
            type: 'string',
            description: 'Code for the data element',
          },
          valueType: {
            type: 'string',
            enum: ['NUMBER', 'INTEGER', 'POSITIVE_INT', 'NEGATIVE_INT', 'ZERO_OR_POSITIVE_INT', 'TEXT', 'LONG_TEXT', 'LETTER', 'PHONE_NUMBER', 'EMAIL', 'BOOLEAN', 'TRUE_ONLY', 'DATE', 'DATETIME', 'TIME', 'URL', 'FILE_RESOURCE', 'IMAGE', 'COORDINATE', 'ORGANISATION_UNIT', 'REFERENCE', 'AGE', 'USERNAME', 'TRACKER_ASSOCIATE'],
            description: 'Value type of the data element',
          },
          domainType: {
            type: 'string',
            enum: ['AGGREGATE', 'TRACKER'],
            description: 'Domain type of the data element',
          },
          aggregationType: {
            type: 'string',
            enum: ['SUM', 'AVERAGE', 'AVERAGE_SUM_ORG_UNIT', 'COUNT', 'STDDEV', 'VARIANCE', 'MIN', 'MAX', 'NONE', 'CUSTOM', 'DEFAULT'],
            description: 'Aggregation type for the data element',
          },
          description: {
            type: 'string',
            description: 'Description of the data element',
          },
          zeroIsSignificant: {
            type: 'boolean',
            description: 'Whether zero values are significant for this data element',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'dhis2_delete_data_element',
      description: 'Delete a data element from DHIS2 (requires confirmation)',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID of the data element to delete',
          },
          confirmed: {
            type: 'boolean',
            description: 'Set to true to confirm deletion after reviewing the confirmation message',
          },
        },
        required: ['id'],
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
      name: 'dhis2_create_data_set',
      description: 'Create a new data set in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the data set',
          },
          shortName: {
            type: 'string',
            description: 'Short name of the data set',
          },
          code: {
            type: 'string',
            description: 'Code for the data set',
          },
          description: {
            type: 'string',
            description: 'Description of the data set',
          },
          periodType: {
            type: 'string',
            enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'SixMonthly', 'Yearly', 'FinancialApril', 'FinancialJuly', 'FinancialOct'],
            description: 'Period type for the data set',
          },
          expiryDays: {
            type: 'number',
            description: 'Number of days after period end when data entry expires',
          },
          timelyDays: {
            type: 'number',
            description: 'Number of days after period end when data is considered timely',
          },
          openFuturePeriods: {
            type: 'number',
            description: 'Number of future periods that can be opened for data entry',
          },
        },
        required: ['name', 'shortName', 'periodType'],
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
      name: 'dhis2_create_category',
      description: 'Create a new category in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the category',
          },
          shortName: {
            type: 'string',
            description: 'Short name of the category',
          },
          code: {
            type: 'string',
            description: 'Code for the category',
          },
          dataDimension: {
            type: 'boolean',
            description: 'Whether this category should be available as a data dimension',
          },
          dataDimensionType: {
            type: 'string',
            enum: ['DISAGGREGATION', 'ATTRIBUTE'],
            description: 'Type of data dimension',
          },
        },
        required: ['name', 'shortName', 'dataDimension', 'dataDimensionType'],
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
      name: 'dhis2_create_category_option',
      description: 'Create a new category option in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the category option',
          },
          shortName: {
            type: 'string',
            description: 'Short name of the category option',
          },
          code: {
            type: 'string',
            description: 'Code for the category option',
          },
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Start date for when this option is valid (YYYY-MM-DD)',
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'End date for when this option is valid (YYYY-MM-DD)',
          },
        },
        required: ['name', 'shortName'],
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
      name: 'dhis2_create_category_combo',
      description: 'Create a new category combination in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the category combination',
          },
          shortName: {
            type: 'string',
            description: 'Short name of the category combination',
          },
          code: {
            type: 'string',
            description: 'Code for the category combination',
          },
          dataDimensionType: {
            type: 'string',
            enum: ['DISAGGREGATION', 'ATTRIBUTE'],
            description: 'Type of data dimension',
          },
          categories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'ID of the category',
                },
              },
              required: ['id'],
            },
            description: 'Categories that make up this combination',
          },
        },
        required: ['name', 'shortName', 'dataDimensionType', 'categories'],
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
      name: 'dhis2_create_org_unit_group',
      description: 'Create a new organisation unit group in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the organisation unit group',
          },
          shortName: {
            type: 'string',
            description: 'Short name of the organisation unit group',
          },
          code: {
            type: 'string',
            description: 'Code for the organisation unit group',
          },
          symbol: {
            type: 'string',
            description: 'Symbol for the organisation unit group',
          },
          organisationUnits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'ID of the organisation unit',
                },
              },
              required: ['id'],
            },
            description: 'Organisation units that belong to this group',
          },
        },
        required: ['name', 'shortName'],
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
      name: 'dhis2_create_validation_rule',
      description: 'Create a new validation rule in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the validation rule',
          },
          description: {
            type: 'string',
            description: 'Description of the validation rule',
          },
          instruction: {
            type: 'string',
            description: 'Instruction text for the validation rule',
          },
          importance: {
            type: 'string',
            enum: ['HIGH', 'MEDIUM', 'LOW'],
            description: 'Importance level of the validation rule',
          },
          operator: {
            type: 'string',
            enum: ['equal_to', 'not_equal_to', 'greater_than', 'greater_than_or_equal_to', 'less_than', 'less_than_or_equal_to', 'compulsory_pair', 'exclusive_pair'],
            description: 'Operator for the validation rule comparison',
          },
          leftSideExpression: {
            type: 'string',
            description: 'Expression for the left side of the validation rule',
          },
          rightSideExpression: {
            type: 'string',
            description: 'Expression for the right side of the validation rule',
          },
          periodType: {
            type: 'string',
            description: 'Period type for the validation rule',
          },
        },
        required: ['name', 'importance', 'operator', 'leftSideExpression', 'rightSideExpression'],
      },
    },
    {
      name: 'dhis2_run_validation',
      description: 'Run validation analysis on DHIS2 data',
      inputSchema: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Start date for validation period (YYYY-MM-DD)',
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'End date for validation period (YYYY-MM-DD)',
          },
          organisationUnits: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Organisation unit IDs to validate',
          },
          validationRuleGroups: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Validation rule group IDs to run (optional)',
          },
          sendNotifications: {
            type: 'boolean',
            description: 'Whether to send validation notifications',
          },
        },
        required: ['startDate', 'endDate', 'organisationUnits'],
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
      name: 'dhis2_bulk_import_data_values',
      description: 'Bulk import data values into DHIS2 (requires confirmation)',
      inputSchema: {
        type: 'object',
        properties: {
          dataValues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dataElement: {
                  type: 'string',
                  description: 'Data element ID',
                },
                period: {
                  type: 'string',
                  description: 'Period (e.g., "202301", "2023Q1", "2023")',
                },
                orgUnit: {
                  type: 'string',
                  description: 'Organisation unit ID',
                },
                value: {
                  type: 'string',
                  description: 'Data value',
                },
                categoryOptionCombo: {
                  type: 'string',
                  description: 'Category option combo ID (optional)',
                },
                attributeOptionCombo: {
                  type: 'string',
                  description: 'Attribute option combo ID (optional)',
                },
                comment: {
                  type: 'string',
                  description: 'Comment for the data value (optional)',
                },
              },
              required: ['dataElement', 'period', 'orgUnit', 'value'],
            },
            description: 'Array of data values to import',
          },
          confirmed: {
            type: 'boolean',
            description: 'Set to true to confirm bulk import after reviewing the confirmation message',
          },
        },
        required: ['dataValues'],
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
      name: 'dhis2_create_program',
      description: 'Create a new program in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the program',
          },
          shortName: {
            type: 'string',
            description: 'Short name of the program',
          },
          code: {
            type: 'string',
            description: 'Code for the program',
          },
          description: {
            type: 'string',
            description: 'Description of the program',
          },
          programType: {
            type: 'string',
            enum: ['WITH_REGISTRATION', 'WITHOUT_REGISTRATION'],
            description: 'Type of the program',
          },
          trackedEntityType: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the tracked entity type (required for WITH_REGISTRATION programs)',
              },
            },
            required: ['id'],
          },
          onlyEnrollOnce: {
            type: 'boolean',
            description: 'Whether a tracked entity can only be enrolled once',
          },
          displayFrontPageList: {
            type: 'boolean',
            description: 'Whether to display this program on the front page list',
          },
        },
        required: ['name', 'shortName', 'programType'],
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
      name: 'dhis2_create_tracked_entity_type',
      description: 'Create a new tracked entity type in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the tracked entity type',
          },
          shortName: {
            type: 'string',
            description: 'Short name of the tracked entity type',
          },
          code: {
            type: 'string',
            description: 'Code for the tracked entity type',
          },
          description: {
            type: 'string',
            description: 'Description of the tracked entity type',
          },
          allowAuditLog: {
            type: 'boolean',
            description: 'Whether to allow audit log for this type',
          },
          minAttributesRequiredToSearch: {
            type: 'number',
            description: 'Minimum number of attributes required for search',
          },
          maxTeiCountToReturn: {
            type: 'number',
            description: 'Maximum number of TEIs to return in search',
          },
        },
        required: ['name', 'shortName'],
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
      name: 'dhis2_create_tracked_entity_attribute',
      description: 'Create a new tracked entity attribute in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the tracked entity attribute',
          },
          shortName: {
            type: 'string',
            description: 'Short name of the tracked entity attribute',
          },
          code: {
            type: 'string',
            description: 'Code for the tracked entity attribute',
          },
          description: {
            type: 'string',
            description: 'Description of the tracked entity attribute',
          },
          valueType: {
            type: 'string',
            enum: ['NUMBER', 'INTEGER', 'POSITIVE_INT', 'NEGATIVE_INT', 'ZERO_OR_POSITIVE_INT', 'TEXT', 'LONG_TEXT', 'LETTER', 'PHONE_NUMBER', 'EMAIL', 'BOOLEAN', 'TRUE_ONLY', 'DATE', 'DATETIME', 'TIME', 'URL', 'FILE_RESOURCE', 'IMAGE', 'COORDINATE', 'ORGANISATION_UNIT', 'REFERENCE', 'AGE', 'USERNAME', 'TRACKER_ASSOCIATE'],
            description: 'Value type of the tracked entity attribute',
          },
          unique: {
            type: 'boolean',
            description: 'Whether this attribute should be unique across the system',
          },
          inherit: {
            type: 'boolean',
            description: 'Whether this attribute should be inherited from parent organisation units',
          },
          pattern: {
            type: 'string',
            description: 'Validation pattern for this attribute',
          },
          confidential: {
            type: 'boolean',
            description: 'Whether this attribute contains confidential information',
          },
        },
        required: ['name', 'shortName', 'valueType'],
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
      name: 'dhis2_create_program_stage',
      description: 'Create a new program stage in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the program stage',
          },
          shortName: {
            type: 'string',
            description: 'Short name of the program stage',
          },
          code: {
            type: 'string',
            description: 'Code for the program stage',
          },
          description: {
            type: 'string',
            description: 'Description of the program stage',
          },
          program: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the program this stage belongs to',
              },
            },
            required: ['id'],
          },
          sortOrder: {
            type: 'number',
            description: 'Sort order of this stage within the program',
          },
          repeatable: {
            type: 'boolean',
            description: 'Whether this stage can be repeated',
          },
          minDaysFromStart: {
            type: 'number',
            description: 'Minimum days from program start date',
          },
          openAfterEnrollment: {
            type: 'boolean',
            description: 'Whether this stage opens immediately after enrollment',
          },
          generatedByEnrollmentDate: {
            type: 'boolean',
            description: 'Whether due date is generated by enrollment date',
          },
        },
        required: ['name', 'shortName', 'program', 'sortOrder'],
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
      name: 'dhis2_create_program_rule',
      description: 'Create a new program rule in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the program rule',
          },
          description: {
            type: 'string',
            description: 'Description of the program rule',
          },
          program: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the program this rule belongs to',
              },
            },
            required: ['id'],
          },
          programStage: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the program stage (optional, for stage-specific rules)',
              },
            },
          },
          condition: {
            type: 'string',
            description: 'Condition expression for the rule',
          },
          priority: {
            type: 'number',
            description: 'Priority of the rule (optional)',
          },
          programRuleActions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                programRuleActionType: {
                  type: 'string',
                  enum: ['DISPLAYTEXT', 'DISPLAYKEYVALUEPAIR', 'HIDEFIELD', 'HIDESECTION', 'HIDEPROGRAM', 'ASSIGN', 'SHOWWARNING', 'SHOWERROR', 'WARNINGONFIELDINTERACTION', 'ERRORONFIELDINTERACTION', 'CREATEEVENT', 'SETMANDATORYFIELD', 'SENDMESSAGE', 'SCHEDULEMESSAGE'],
                  description: 'Type of action to perform',
                },
                data: {
                  type: 'string',
                  description: 'Data expression for the action',
                },
                content: {
                  type: 'string',
                  description: 'Content/message for the action',
                },
              },
              required: ['programRuleActionType'],
            },
            description: 'Actions to perform when the rule condition is met',
          },
        },
        required: ['name', 'program', 'condition', 'programRuleActions'],
      },
    },
    {
      name: 'dhis2_list_tracked_entity_instances',
      description: 'List tracked entity instances from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          trackedEntityType: {
            type: 'string',
            description: 'Tracked entity type ID to filter by',
          },
          program: {
            type: 'string',
            description: 'Program ID to filter by',
          },
          orgUnit: {
            type: 'string',
            description: 'Organisation unit ID to filter by',
          },
          orgUnitMode: {
            type: 'string',
            enum: ['SELECTED', 'CHILDREN', 'DESCENDANTS', 'ACCESSIBLE'],
            description: 'Organisation unit selection mode',
          },
          query: {
            type: 'string',
            description: 'Query string for searching TEIs',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
          programStatus: {
            type: 'string',
            enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
            description: 'Program enrollment status to filter by',
          },
        },
      },
    },
    {
      name: 'dhis2_create_tracked_entity_instance',
      description: 'Create a new tracked entity instance in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          trackedEntityType: {
            type: 'string',
            description: 'ID of the tracked entity type',
          },
          orgUnit: {
            type: 'string',
            description: 'ID of the organisation unit where the TEI is registered',
          },
          attributes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                attribute: {
                  type: 'string',
                  description: 'ID of the tracked entity attribute',
                },
                value: {
                  type: 'string',
                  description: 'Value of the attribute',
                },
              },
              required: ['attribute', 'value'],
            },
            description: 'Attribute values for the TEI',
          },
        },
        required: ['trackedEntityType', 'orgUnit'],
      },
    },
    {
      name: 'dhis2_list_enrollments',
      description: 'List enrollments from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          program: {
            type: 'string',
            description: 'Program ID to filter by',
          },
          trackedEntityInstance: {
            type: 'string',
            description: 'Tracked entity instance ID to filter by',
          },
          orgUnit: {
            type: 'string',
            description: 'Organisation unit ID to filter by',
          },
          programStatus: {
            type: 'string',
            enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
            description: 'Enrollment status to filter by',
          },
          programStartDate: {
            type: 'string',
            format: 'date',
            description: 'Start date for enrollment date range (YYYY-MM-DD)',
          },
          programEndDate: {
            type: 'string',
            format: 'date',
            description: 'End date for enrollment date range (YYYY-MM-DD)',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_create_enrollment',
      description: 'Create a new enrollment in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          trackedEntityInstance: {
            type: 'string',
            description: 'ID of the tracked entity instance to enroll',
          },
          program: {
            type: 'string',
            description: 'ID of the program to enroll in',
          },
          orgUnit: {
            type: 'string',
            description: 'ID of the organisation unit for enrollment',
          },
          enrollmentDate: {
            type: 'string',
            format: 'date',
            description: 'Enrollment date (YYYY-MM-DD)',
          },
          incidentDate: {
            type: 'string',
            format: 'date',
            description: 'Incident date (YYYY-MM-DD)',
          },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
            description: 'Enrollment status',
          },
          attributes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                attribute: {
                  type: 'string',
                  description: 'ID of the tracked entity attribute',
                },
                value: {
                  type: 'string',
                  description: 'Value of the attribute',
                },
              },
              required: ['attribute', 'value'],
            },
            description: 'Attribute values for the enrollment',
          },
        },
        required: ['trackedEntityInstance', 'program', 'orgUnit', 'enrollmentDate', 'incidentDate'],
      },
    },
    {
      name: 'dhis2_list_events',
      description: 'List events from the DHIS2 instance',
      inputSchema: {
        type: 'object',
        properties: {
          program: {
            type: 'string',
            description: 'Program ID to filter by',
          },
          programStage: {
            type: 'string',
            description: 'Program stage ID to filter by',
          },
          enrollment: {
            type: 'string',
            description: 'Enrollment ID to filter by',
          },
          trackedEntityInstance: {
            type: 'string',
            description: 'Tracked entity instance ID to filter by',
          },
          orgUnit: {
            type: 'string',
            description: 'Organisation unit ID to filter by',
          },
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Start date for event date range (YYYY-MM-DD)',
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'End date for event date range (YYYY-MM-DD)',
          },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'COMPLETED', 'VISITED', 'SCHEDULE', 'OVERDUE', 'SKIPPED'],
            description: 'Event status to filter by',
          },
          pageSize: {
            type: 'number',
            description: 'Number of results to return (default: 50)',
          },
        },
      },
    },
    {
      name: 'dhis2_create_event',
      description: 'Create a new event in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          program: {
            type: 'string',
            description: 'ID of the program',
          },
          programStage: {
            type: 'string',
            description: 'ID of the program stage',
          },
          orgUnit: {
            type: 'string',
            description: 'ID of the organisation unit',
          },
          enrollment: {
            type: 'string',
            description: 'ID of the enrollment (for tracker programs)',
          },
          trackedEntityInstance: {
            type: 'string',
            description: 'ID of the tracked entity instance (for tracker programs)',
          },
          eventDate: {
            type: 'string',
            format: 'date',
            description: 'Event date (YYYY-MM-DD)',
          },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'COMPLETED', 'VISITED', 'SCHEDULE', 'OVERDUE', 'SKIPPED'],
            description: 'Event status',
          },
          coordinate: {
            type: 'object',
            properties: {
              latitude: {
                type: 'number',
                description: 'Latitude coordinate',
              },
              longitude: {
                type: 'number',
                description: 'Longitude coordinate',
              },
            },
            required: ['latitude', 'longitude'],
          },
          dataValues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dataElement: {
                  type: 'string',
                  description: 'ID of the data element',
                },
                value: {
                  type: 'string',
                  description: 'Value of the data element',
                },
              },
              required: ['dataElement', 'value'],
            },
            description: 'Data values for the event',
          },
        },
        required: ['program', 'programStage', 'orgUnit'],
      },
    },
    {
      name: 'dhis2_bulk_import_events',
      description: 'Bulk import events into DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                program: {
                  type: 'string',
                  description: 'ID of the program',
                },
                programStage: {
                  type: 'string',
                  description: 'ID of the program stage',
                },
                orgUnit: {
                  type: 'string',
                  description: 'ID of the organisation unit',
                },
                eventDate: {
                  type: 'string',
                  format: 'date',
                  description: 'Event date (YYYY-MM-DD)',
                },
                status: {
                  type: 'string',
                  enum: ['ACTIVE', 'COMPLETED', 'VISITED', 'SCHEDULE', 'OVERDUE', 'SKIPPED'],
                  description: 'Event status',
                },
                dataValues: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      dataElement: {
                        type: 'string',
                        description: 'ID of the data element',
                      },
                      value: {
                        type: 'string',
                        description: 'Value of the data element',
                      },
                    },
                    required: ['dataElement', 'value'],
                  },
                  description: 'Data values for the event',
                },
              },
              required: ['program', 'programStage', 'orgUnit'],
            },
            description: 'Array of events to import',
          },
        },
        required: ['events'],
      },
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
      name: 'dhis2_create_dashboard',
      description: 'Create a new dashboard in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the dashboard',
          },
          description: {
            type: 'string',
            description: 'Description of the dashboard',
          },
          dashboardItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['VISUALIZATION', 'MAP', 'CHART', 'REPORT_TABLE', 'EVENT_CHART', 'EVENT_REPORT', 'TEXT', 'MESSAGES', 'RESOURCES', 'REPORTS', 'USERS', 'REPORT_TABLES', 'CHARTS', 'MAPS'],
                  description: 'Type of dashboard item',
                },
                x: {
                  type: 'number',
                  description: 'X position of the item',
                },
                y: {
                  type: 'number',
                  description: 'Y position of the item',
                },
                width: {
                  type: 'number',
                  description: 'Width of the item',
                },
                height: {
                  type: 'number',
                  description: 'Height of the item',
                },
                visualization: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'ID of the visualization',
                    },
                  },
                },
                text: {
                  type: 'string',
                  description: 'Text content for TEXT type items',
                },
              },
              required: ['type', 'x', 'y', 'width', 'height'],
            },
            description: 'Items to include in the dashboard',
          },
        },
        required: ['name'],
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
      name: 'dhis2_create_visualization',
      description: 'Create a new visualization in DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the visualization',
          },
          type: {
            type: 'string',
            enum: ['COLUMN', 'STACKED_COLUMN', 'BAR', 'STACKED_BAR', 'LINE', 'AREA', 'STACKED_AREA', 'PIE', 'RADAR', 'GAUGE', 'YEAR_OVER_YEAR_LINE', 'YEAR_OVER_YEAR_COLUMN', 'SINGLE_VALUE', 'PIVOT_TABLE', 'SCATTER', 'BUBBLE'],
            description: 'Type of visualization',
          },
          dataDimensionItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dataDimensionItemType: {
                  type: 'string',
                  enum: ['DATA_ELEMENT', 'DATA_ELEMENT_OPERAND', 'INDICATOR', 'REPORTING_RATE', 'PROGRAM_DATA_ELEMENT', 'PROGRAM_ATTRIBUTE', 'PROGRAM_INDICATOR'],
                  description: 'Type of data dimension item',
                },
                dataElement: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'ID of the data element',
                    },
                  },
                },
                indicator: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'ID of the indicator',
                    },
                  },
                },
              },
              required: ['dataDimensionItemType'],
            },
            description: 'Data items to include in the visualization',
          },
          columns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Dimension ID',
                },
                dimensionType: {
                  type: 'string',
                  description: 'Type of dimension',
                },
              },
              required: ['id', 'dimensionType'],
            },
            description: 'Column dimensions for the visualization',
          },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Dimension ID',
                },
                dimensionType: {
                  type: 'string',
                  description: 'Type of dimension',
                },
              },
              required: ['id', 'dimensionType'],
            },
            description: 'Row dimensions for the visualization',
          },
        },
        required: ['name', 'type', 'dataDimensionItems'],
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
                  password: {
                    type: 'string',
                    description: 'Password for proxy authentication',
                  },
                },
                required: ['username', 'password'],
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
          password: {
            type: 'string',
            description: 'DHIS2 password for development',
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
        required: ['dhis2Instance', 'username', 'password'],
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
      name: 'dhis2_create_datastore_namespace',
      description: 'Create or configure a DataStore namespace for app-specific data storage',
      inputSchema: {
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            description: 'Namespace for DataStore (should match app namespace)',
          },
          description: {
            type: 'string',
            description: 'Description of the namespace usage',
          },
          sharing: {
            type: 'object',
            properties: {
              public: {
                type: 'string',
                enum: ['r-------', 'rw------', '--------'],
                description: 'Public access level',
              },
              external: {
                type: 'boolean',
                description: 'Allow external access',
              },
            },
          },
          initialKeys: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: {
                  type: 'string',
                  description: 'DataStore key name',
                },
                value: {
                  type: 'object',
                  description: 'Initial value for the key',
                },
              },
              required: ['key', 'value'],
            },
            description: 'Initial key-value pairs to create',
          },
        },
        required: ['namespace'],
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
          encrypt: {
            type: 'boolean',
            description: 'Encrypt the value (for sensitive data)',
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
              password: {
                type: 'string',
                description: 'DHIS2 password for proxy authentication',
              },
            },
            required: ['username', 'password'],
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