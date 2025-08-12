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
      description: 'Delete a data element from DHIS2',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID of the data element to delete',
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
      description: 'Bulk import data values into DHIS2',
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
  ];
}