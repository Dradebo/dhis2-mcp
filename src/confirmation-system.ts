export interface ConfirmationRequest {
  action: string;
  target: string;
  warning: string;
  details?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConfirmationResponse {
  confirmed: boolean;
  userNote?: string;
}

export class ConfirmationSystem {
  // Define which operations require confirmation
  private static readonly DESTRUCTIVE_OPERATIONS = new Map<string, ConfirmationRequest>([
    ['dhis2_delete_data_element', {
      action: 'Delete Data Element',
      target: '',
      warning: 'This will permanently delete the data element and may affect existing data values.',
      severity: 'critical'
    }],
    ['dhis2_delete_data_set', {
      action: 'Delete Data Set',
      target: '',
      warning: 'This will permanently delete the data set and all associated configuration.',
      severity: 'critical'
    }],
    ['dhis2_bulk_import_data_values', {
      action: 'Bulk Import Data Values',
      target: 'data values',
      warning: 'This operation may overwrite existing data values.',
      details: 'Please review the import strategy and ensure data backup is available.',
      severity: 'high'
    }],
    ['dhis2_bulk_import_events', {
      action: 'Bulk Import Events',
      target: 'events',
      warning: 'This operation may create or update multiple events.',
      details: 'Ensure the event data is validated before proceeding.',
      severity: 'high'
    }],
    ['dhis2_run_validation', {
      action: 'Run Data Validation',
      target: 'validation rules',
      warning: 'This will analyze data quality and may flag existing data as invalid.',
      details: 'This operation does not modify data but will generate validation reports.',
      severity: 'medium'
    }],
    ['dhis2_create_validation_rule', {
      action: 'Create Validation Rule',
      target: 'validation rule',
      warning: 'This will create a new validation rule that may affect data quality reports.',
      severity: 'medium'
    }]
  ]);

  static requiresConfirmation(toolName: string): boolean {
    return this.DESTRUCTIVE_OPERATIONS.has(toolName);
  }

  static getConfirmationRequest(toolName: string, context?: Record<string, any>): ConfirmationRequest | null {
    const baseRequest = this.DESTRUCTIVE_OPERATIONS.get(toolName);
    if (!baseRequest) return null;

    // Customize the request based on context
    const request = { ...baseRequest };
    
    if (context) {
      // Add specific target information if available
      if (context.name || context.displayName) {
        request.target = context.name || context.displayName;
      } else if (context.id) {
        request.target = `ID: ${context.id}`;
      }

      // Add additional details based on operation type
      if (toolName === 'dhis2_bulk_import_data_values' && context.dataValues) {
        request.details += ` Importing ${context.dataValues.length} data values.`;
      }
      
      if (toolName === 'dhis2_bulk_import_events' && context.events) {
        request.details += ` Importing ${context.events.length} events.`;
      }
    }

    return request;
  }

  static generateConfirmationMessage(request: ConfirmationRequest): string {
    const severityEmoji = {
      low: '⚠️',
      medium: '🔶',
      high: '⛔',
      critical: '🚨'
    };

    let message = `${severityEmoji[request.severity]} CONFIRMATION REQUIRED\n\n`;
    message += `Action: ${request.action}\n`;
    if (request.target) {
      message += `Target: ${request.target}\n`;
    }
    message += `\nWarning: ${request.warning}\n`;
    
    if (request.details) {
      message += `\nDetails: ${request.details}\n`;
    }

    message += `\nSeverity: ${request.severity.toUpperCase()}\n`;
    message += `\n⚠️  This operation requires careful consideration. Please confirm you want to proceed.\n`;
    message += `\n✅ To confirm this operation, run the tool again with the parameter 'confirmed: true'`;
    
    return message;
  }

  // For future MCP protocol extensions that support interactive confirmation
  static async requestConfirmation(request: ConfirmationRequest): Promise<ConfirmationResponse> {
    // In current MCP implementation, we return the confirmation message
    // In future versions, this could trigger an interactive dialog
    return {
      confirmed: false,
      userNote: 'Confirmation required - please add confirmed: true parameter'
    };
  }
}

// Interfaces already exported above