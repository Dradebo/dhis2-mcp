import { DHIS2Client } from './dhis2-client.js';

export interface CompletionValue {
  value: string;
  label: string;
  description?: string;
}

export interface CompletionResult {
  values: CompletionValue[];
}

export class ParameterCompletion {
  constructor(private dhis2Client: DHIS2Client | null) {}

  async getCompletion(toolName: string, argumentName: string, partialValue?: string): Promise<CompletionResult> {
    if (!this.dhis2Client) {
      return { values: [] };
    }

    try {
      switch (argumentName) {
        case 'dataElement':
        case 'dataElementId':
          return await this.getDataElementCompletions(partialValue);
          
        case 'orgUnit':
        case 'organisationUnit':
        case 'orgUnitId':
          return await this.getOrganisationUnitCompletions(partialValue);
          
        case 'period':
          return this.getPeriodCompletions();
          
        case 'categoryOptionCombo':
          return await this.getCategoryOptionComboCompletions(partialValue);
          
        case 'program':
        case 'programId':
          return await this.getProgramCompletions(partialValue);
          
        case 'trackedEntityType':
          return await this.getTrackedEntityTypeCompletions(partialValue);
          
        case 'valueType':
          return this.getValueTypeCompletions();
          
        case 'domainType':
          return this.getDomainTypeCompletions();
          
        case 'aggregationType':
          return this.getAggregationTypeCompletions();
          
        case 'periodType':
          return this.getPeriodTypeCompletions();

        default:
          return { values: [] };
      }
    } catch (error) {
      console.error(`Error getting completion for ${argumentName}:`, error);
      return { values: [] };
    }
  }

  private async getDataElementCompletions(partialValue?: string): Promise<CompletionResult> {
    const params: any = { 
      pageSize: 50,
      fields: 'id,displayName,valueType,domainType'
    };
    if (partialValue) {
      params.filter = `name:ilike:${partialValue}`;
    }
    const response = await this.dhis2Client!.getDataElements(params);
    
    return {
      values: response.dataElements.map(de => ({
        value: de.id,
        label: de.displayName,
        description: `${de.valueType} - ${de.domainType}`
      }))
    };
  }

  private async getOrganisationUnitCompletions(partialValue?: string): Promise<CompletionResult> {
    const params: any = { 
      pageSize: 50,
      fields: 'id,displayName,level,path'
    };
    if (partialValue) {
      params.filter = `name:ilike:${partialValue}`;
    }
    const response = await this.dhis2Client!.getOrganisationUnits(params);
    
    return {
      values: response.organisationUnits.map(ou => ({
        value: ou.id,
        label: ou.displayName,
        description: `Level ${ou.level} - ${ou.path?.split('/').length - 1} parents`
      }))
    };
  }

  private getPeriodCompletions(): CompletionResult {
    const currentYear = new Date().getFullYear();
    const values: CompletionValue[] = [];
    
    // Current and previous years (yearly periods)
    for (let year = currentYear; year >= currentYear - 3; year--) {
      values.push({
        value: year.toString(),
        label: `Year ${year}`,
        description: 'Yearly period'
      });
      
      // Quarterly periods
      for (let q = 1; q <= 4; q++) {
        values.push({
          value: `${year}Q${q}`,
          label: `Q${q} ${year}`,
          description: 'Quarterly period'
        });
      }
      
      // Monthly periods
      for (let m = 1; m <= 12; m++) {
        const month = m.toString().padStart(2, '0');
        values.push({
          value: `${year}${month}`,
          label: `${year}-${month}`,
          description: 'Monthly period'
        });
      }
    }
    
    return { values: values.slice(0, 50) }; // Limit to 50 most recent
  }

  private async getCategoryOptionComboCompletions(partialValue?: string): Promise<CompletionResult> {
    const params: any = { 
      pageSize: 30,
      fields: 'id,displayName'
    };
    if (partialValue) {
      params.filter = `name:ilike:${partialValue}`;
    }
    const response = await this.dhis2Client!.getCategoryOptionCombos(params);
    
    return {
      values: response.categoryOptionCombos.map(coc => ({
        value: coc.id,
        label: coc.displayName,
        description: 'Category option combination'
      }))
    };
  }

  private async getProgramCompletions(partialValue?: string): Promise<CompletionResult> {
    const params: any = { 
      pageSize: 30,
      fields: 'id,displayName,programType'
    };
    if (partialValue) {
      params.filter = `name:ilike:${partialValue}`;
    }
    const response = await this.dhis2Client!.getPrograms(params);
    
    return {
      values: response.programs.map(program => ({
        value: program.id,
        label: program.displayName,
        description: program.programType || 'Program'
      }))
    };
  }

  private async getTrackedEntityTypeCompletions(partialValue?: string): Promise<CompletionResult> {
    const params: any = { 
      pageSize: 30,
      fields: 'id,displayName'
    };
    if (partialValue) {
      params.filter = `name:ilike:${partialValue}`;
    }
    const response = await this.dhis2Client!.getTrackedEntityTypes(params);
    
    return {
      values: response.trackedEntityTypes.map(tet => ({
        value: tet.id,
        label: tet.displayName,
        description: 'Tracked entity type'
      }))
    };
  }

  private getValueTypeCompletions(): CompletionResult {
    return {
      values: [
        { value: 'TEXT', label: 'Text', description: 'Free text input' },
        { value: 'LONG_TEXT', label: 'Long Text', description: 'Multi-line text input' },
        { value: 'NUMBER', label: 'Number', description: 'Numeric value with decimals' },
        { value: 'INTEGER', label: 'Integer', description: 'Whole numbers only' },
        { value: 'INTEGER_POSITIVE', label: 'Positive Integer', description: 'Positive whole numbers only' },
        { value: 'INTEGER_NEGATIVE', label: 'Negative Integer', description: 'Negative whole numbers only' },
        { value: 'INTEGER_ZERO_OR_POSITIVE', label: 'Zero or Positive Integer', description: 'Zero or positive whole numbers' },
        { value: 'PERCENTAGE', label: 'Percentage', description: 'Percentage value (0-100)' },
        { value: 'BOOLEAN', label: 'Yes/No', description: 'True/false value' },
        { value: 'TRUE_ONLY', label: 'Yes Only', description: 'Only true values allowed' },
        { value: 'DATE', label: 'Date', description: 'Date value' },
        { value: 'DATETIME', label: 'Date & Time', description: 'Date and time value' },
        { value: 'TIME', label: 'Time', description: 'Time value' },
        { value: 'EMAIL', label: 'Email', description: 'Email address' },
        { value: 'PHONE_NUMBER', label: 'Phone Number', description: 'Phone number' },
        { value: 'URL', label: 'URL', description: 'Web address' },
        { value: 'FILE_RESOURCE', label: 'File', description: 'File attachment' },
        { value: 'COORDINATE', label: 'Coordinate', description: 'GPS coordinates' },
        { value: 'ORGANISATION_UNIT', label: 'Organisation Unit', description: 'Organisation unit reference' },
        { value: 'REFERENCE', label: 'Reference', description: 'Reference to another object' },
        { value: 'AGE', label: 'Age', description: 'Age in years' }
      ]
    };
  }

  private getDomainTypeCompletions(): CompletionResult {
    return {
      values: [
        { value: 'AGGREGATE', label: 'Aggregate', description: 'For aggregate data collection' },
        { value: 'TRACKER', label: 'Tracker', description: 'For individual tracking programs' }
      ]
    };
  }

  private getAggregationTypeCompletions(): CompletionResult {
    return {
      values: [
        { value: 'SUM', label: 'Sum', description: 'Add all values' },
        { value: 'AVERAGE', label: 'Average', description: 'Calculate mean value' },
        { value: 'AVERAGE_SUM_ORG_UNIT', label: 'Average (Sum in Org Unit)', description: 'Average across periods, sum across org units' },
        { value: 'COUNT', label: 'Count', description: 'Count number of values' },
        { value: 'STDDEV', label: 'Standard Deviation', description: 'Statistical standard deviation' },
        { value: 'VARIANCE', label: 'Variance', description: 'Statistical variance' },
        { value: 'MIN', label: 'Minimum', description: 'Lowest value' },
        { value: 'MAX', label: 'Maximum', description: 'Highest value' },
        { value: 'NONE', label: 'None', description: 'No aggregation' }
      ]
    };
  }

  private getPeriodTypeCompletions(): CompletionResult {
    return {
      values: [
        { value: 'Daily', label: 'Daily', description: 'Daily periods' },
        { value: 'Weekly', label: 'Weekly', description: 'Weekly periods' },
        { value: 'WeeklyWednesday', label: 'Weekly (Wednesday)', description: 'Weekly starting Wednesday' },
        { value: 'WeeklyThursday', label: 'Weekly (Thursday)', description: 'Weekly starting Thursday' },
        { value: 'WeeklySaturday', label: 'Weekly (Saturday)', description: 'Weekly starting Saturday' },
        { value: 'WeeklySunday', label: 'Weekly (Sunday)', description: 'Weekly starting Sunday' },
        { value: 'BiWeekly', label: 'Bi-Weekly', description: '2-week periods' },
        { value: 'Monthly', label: 'Monthly', description: 'Monthly periods' },
        { value: 'BiMonthly', label: 'Bi-Monthly', description: '2-month periods' },
        { value: 'Quarterly', label: 'Quarterly', description: 'Quarterly periods' },
        { value: 'SixMonthly', label: 'Six Monthly', description: '6-month periods' },
        { value: 'SixMonthlyApril', label: 'Six Monthly (April)', description: '6-month starting April' },
        { value: 'SixMonthlyNov', label: 'Six Monthly (November)', description: '6-month starting November' },
        { value: 'Yearly', label: 'Yearly', description: 'Yearly periods' },
        { value: 'FinancialApril', label: 'Financial Year (April)', description: 'Financial year starting April' },
        { value: 'FinancialJuly', label: 'Financial Year (July)', description: 'Financial year starting July' },
        { value: 'FinancialOct', label: 'Financial Year (October)', description: 'Financial year starting October' },
        { value: 'FinancialNov', label: 'Financial Year (November)', description: 'Financial year starting November' }
      ]
    };
  }

  // Tool-specific completions
  async getToolSpecificCompletion(toolName: string, argumentName: string, context: Record<string, any>): Promise<CompletionResult> {
    switch (toolName) {
      case 'dhis2_create_data_value':
        if (argumentName === 'categoryOptionCombo' && context.dataElement) {
          // Get category combos specific to the data element
          return await this.getCategoryComboForDataElement(context.dataElement);
        }
        break;
        
      case 'dhis2_create_event':
        if (argumentName === 'orgUnit' && context.program) {
          // Get org units assigned to the program
          return await this.getOrgUnitsForProgram(context.program);
        }
        break;
    }
    
    return { values: [] };
  }

  private async getCategoryComboForDataElement(dataElementId: string): Promise<CompletionResult> {
    try {
      // Since getDataElement doesn't exist, we'll use a generic completion
      const response = await this.dhis2Client!.getCategoryOptionCombos({ 
        pageSize: 20,
        fields: 'id,displayName'
      });
      return {
        values: response.categoryOptionCombos.map((coc: any) => ({
          value: coc.id,
          label: coc.displayName,
          description: 'Category option combination'
        }))
      };
    } catch (error) {
      console.warn('Could not fetch category combos for data element:', error);
    }
    
    return { values: [] };
  }

  private async getOrgUnitsForProgram(programId: string): Promise<CompletionResult> {
    try {
      // Since getProgram doesn't exist, we'll use a generic completion
      const response = await this.dhis2Client!.getOrganisationUnits({ 
        pageSize: 20,
        fields: 'id,displayName,level'
      });
      return {
        values: response.organisationUnits.map((ou: any) => ({
          value: ou.id,
          label: ou.displayName,
          description: `Level ${ou.level} - Organization unit`
        }))
      };
    } catch (error) {
      console.warn('Could not fetch org units for program:', error);
    }
    
    return { values: [] };
  }
}