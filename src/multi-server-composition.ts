export interface ServerCapability {
  domain: string;
  operations: string[];
  version: string;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  capabilities: ServerCapability[];
  compatibleWith: string[];
  compositionMode: boolean;
  description: string;
  authors?: string[];
  documentation?: string;
}

export interface CrossServerContext {
  sourceServer: string;
  targetServer?: string;
  data: any;
  timestamp: string;
  operationType: 'export' | 'import' | 'transform' | 'notify';
  metadata: Record<string, any>;
}

export interface CompositionWorkflow {
  id: string;
  name: string;
  description: string;
  steps: CompositionWorkflowStep[];
  triggers?: string[];
  enabled: boolean;
}

export interface CompositionWorkflowStep {
  id: string;
  server: string;
  tool: string;
  parameters: Record<string, any>;
  conditionCheck?: (context: CrossServerContext) => boolean;
  dataTransform?: (input: any) => any;
  onSuccess?: CompositionWorkflowStep[];
  onError?: CompositionWorkflowStep[];
}

export class MultiServerComposition {
  private serverInfo: MCPServerInfo;
  private compatibleServers: Map<string, MCPServerInfo> = new Map();
  private workflows: Map<string, CompositionWorkflow> = new Map();
  private contextHistory: CrossServerContext[] = [];

  constructor() {
    this.serverInfo = {
      name: 'dhis2-mcp',
      version: '1.0.0',
      capabilities: [
        {
          domain: 'health-data',
          operations: ['data-collection', 'analytics', 'reporting', 'validation'],
          version: '2.40+'
        },
        {
          domain: 'dhis2-api',
          operations: ['metadata-management', 'data-import-export', 'user-management'],
          version: '1.0.0'
        },
        {
          domain: 'mobile-development',
          operations: ['android-sdk', 'offline-sync', 'location-services'],
          version: '1.0.0'
        },
        {
          domain: 'web-development',
          operations: ['app-platform', 'ui-components', 'debugging'],
          version: '1.0.0'
        }
      ],
      compatibleWith: [
        'github-mcp',
        'slack-mcp',
        'database-mcp',
        'git-mcp',
        'filesystem-mcp',
        'email-mcp'
      ],
      compositionMode: true,
      description: 'Comprehensive DHIS2 development and management MCP server',
      authors: ['DHIS2 Community'],
      documentation: 'https://github.com/dhis2/mcp-server'
    };

    this.initializeDefaultWorkflows();
  }

  getServerInfo(): MCPServerInfo {
    return { ...this.serverInfo };
  }

  registerCompatibleServer(serverInfo: MCPServerInfo): void {
    this.compatibleServers.set(serverInfo.name, serverInfo);
    console.log(`[COMPOSITION] Registered compatible server: ${serverInfo.name}`);
  }

  getCompatibleServers(): MCPServerInfo[] {
    return Array.from(this.compatibleServers.values());
  }

  createCrossServerContext(
    sourceServer: string,
    data: any,
    operationType: 'export' | 'import' | 'transform' | 'notify',
    metadata: Record<string, any> = {}
  ): CrossServerContext {
    const context: CrossServerContext = {
      sourceServer,
      data,
      timestamp: new Date().toISOString(),
      operationType,
      metadata
    };

    this.contextHistory.push(context);
    
    // Keep only last 100 contexts
    if (this.contextHistory.length > 100) {
      this.contextHistory = this.contextHistory.slice(-100);
    }

    return context;
  }

  exportDataForComposition(toolName: string, result: any, metadata: Record<string, any> = {}): CrossServerContext {
    return this.createCrossServerContext(
      this.serverInfo.name,
      result,
      'export',
      { toolName, ...metadata }
    );
  }

  generateIntegrationExamples(): string {
    return `# DHIS2 MCP Server - Multi-Server Integration Examples

## 🔗 Compatible Server Integrations

${this.compatibleServers.size > 0 ? 
  Array.from(this.compatibleServers.values()).map(server => 
    `### ${server.name}
**Capabilities**: ${server.capabilities.map(cap => cap.domain).join(', ')}
**Version**: ${server.version}
`).join('\n') : 'No compatible servers registered yet.'}

## 🚀 Workflow Examples

### 1. Data Quality Monitoring
\`\`\`mermaid
graph LR
    A[DHIS2: Run Validation] --> B[GitHub: Create Issue]
    B --> C[Slack: Notify Team]
    C --> D[Database: Log Issue]
\`\`\`

### 2. Development Pipeline
\`\`\`mermaid
graph LR
    A[DHIS2: Generate App] --> B[Git: Commit Changes]
    B --> C[GitHub: Create PR]
    C --> D[Slack: Request Review]
\`\`\`

### 3. Data Export Pipeline
\`\`\`mermaid
graph LR
    A[DHIS2: Export Data] --> B[Database: Store Copy]
    B --> C[Email: Send Report]
    C --> D[Filesystem: Archive]
\`\`\`

## 🛠️ Cross-Server Tool Examples

### Data Quality → Issue Tracking
\`\`\`json
{
  "workflow": "data-quality-monitoring",
  "steps": [
    {
      "server": "dhis2-mcp",
      "tool": "dhis2_run_validation",
      "parameters": { "orgUnit": "country-level" }
    },
    {
      "server": "github-mcp", 
      "tool": "create_issue",
      "parameters": {
        "title": "Data Quality Issues Found",
        "body": "{{previous.validationResults}}"
      }
    }
  ]
}
\`\`\`

### Development → Deployment
\`\`\`json
{
  "workflow": "app-deployment",
  "steps": [
    {
      "server": "dhis2-mcp",
      "tool": "dhis2_init_webapp", 
      "parameters": { "appName": "patient-tracker" }
    },
    {
      "server": "git-mcp",
      "tool": "commit_changes",
      "parameters": { "message": "Initial app scaffolding" }
    },
    {
      "server": "slack-mcp",
      "tool": "send_message", 
      "parameters": { "message": "New DHIS2 app created: {{step1.appName}}" }
    }
  ]
}
\`\`\`

## 📊 Integration Benefits

1. **Automated Workflows**: Chain DHIS2 operations with external systems
2. **Enhanced Monitoring**: Connect DHIS2 analytics to notification systems
3. **Development Integration**: Seamless connection to development toolchains
4. **Data Pipeline**: Build comprehensive data processing workflows
5. **Quality Assurance**: Automated testing and validation across systems

## 🔧 Setup Instructions

1. **Start DHIS2 MCP Server**: This server (already running)
2. **Start Compatible Servers**: GitHub, Slack, Database, etc.
3. **Configure Client**: Point MCP client to all servers
4. **Define Workflows**: Create cross-server automation rules
5. **Test Integration**: Verify data flows between servers

## 📝 Data Exchange Format

All data exported from DHIS2 MCP follows this standard format:

\`\`\`json
{
  "sourceServer": "dhis2-mcp",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "operationType": "export",
  "metadata": {
    "toolName": "dhis2_get_analytics", 
    "dhis2Instance": "https://play.dhis2.org",
    "dataType": "analytics"
  },
  "data": {
    "/* DHIS2 response data */"
  }
}
\`\`\`

This standardized format ensures seamless integration with other MCP servers.`;
  }

  private initializeDefaultWorkflows(): void {
    // Data Quality Monitoring Workflow
    this.workflows.set('data-quality-monitoring', {
      id: 'data-quality-monitoring',
      name: 'Data Quality Monitoring',
      description: 'Automatically monitor data quality and create issues when problems are found',
      enabled: false, // Disabled until compatible servers are registered
      steps: [
        {
          id: 'validate-data',
          server: 'dhis2-mcp',
          tool: 'dhis2_run_validation',
          parameters: {}
        },
        {
          id: 'create-issue',
          server: 'github-mcp',
          tool: 'create_issue',
          parameters: {
            title: 'Data Quality Issues Detected',
            labels: ['data-quality', 'automated']
          }
        },
        {
          id: 'notify-team',
          server: 'slack-mcp',
          tool: 'send_message',
          parameters: {
            channel: '#data-quality',
            message: 'Data validation found issues. Check GitHub for details.'
          }
        }
      ],
      triggers: ['dhis2_run_validation']
    });

    // Development Pipeline Workflow
    this.workflows.set('development-pipeline', {
      id: 'development-pipeline',
      name: 'Development Pipeline',
      description: 'Automate DHIS2 app development workflow with version control',
      enabled: false,
      steps: [
        {
          id: 'init-app',
          server: 'dhis2-mcp',
          tool: 'dhis2_init_webapp',
          parameters: {}
        },
        {
          id: 'commit-code',
          server: 'git-mcp',
          tool: 'commit',
          parameters: {
            message: 'Initial DHIS2 app scaffolding'
          }
        },
        {
          id: 'create-pr',
          server: 'github-mcp', 
          tool: 'create_pull_request',
          parameters: {
            title: 'New DHIS2 Application',
            body: 'Generated using DHIS2 MCP Server'
          }
        }
      ],
      triggers: ['dhis2_init_webapp']
    });
  }

  getWorkflows(): CompositionWorkflow[] {
    return Array.from(this.workflows.values());
  }

  executeWorkflow(workflowId: string, initialContext: Record<string, any> = {}): Promise<CrossServerContext[]> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (!workflow.enabled) {
      throw new Error(`Workflow ${workflowId} is disabled`);
    }

    // This would integrate with other MCP servers
    // For now, return mock execution results
    return Promise.resolve([
      this.createCrossServerContext(
        this.serverInfo.name,
        { workflowId, status: 'started', initialContext },
        'notify',
        { workflow: workflow.name }
      )
    ]);
  }

  getContextHistory(limit: number = 50): CrossServerContext[] {
    return this.contextHistory.slice(-limit);
  }

  clearContextHistory(): void {
    this.contextHistory = [];
  }

  // Check compatibility between servers
  isCompatible(serverName: string): boolean {
    return this.serverInfo.compatibleWith.includes(serverName) ||
           this.compatibleServers.has(serverName);
  }

  // Generate composition recommendations based on current context
  getCompositionRecommendations(currentTool: string, result: any): string[] {
    const recommendations: string[] = [];

    // Analysis of current tool and suggest next steps
    if (currentTool.includes('validation')) {
      recommendations.push('Create GitHub issue for validation failures');
      recommendations.push('Send Slack notification to data team');
      recommendations.push('Log validation results to database');
    }

    if (currentTool.includes('init_webapp')) {
      recommendations.push('Commit generated code to Git repository');
      recommendations.push('Create GitHub pull request');
      recommendations.push('Notify development team via Slack');
    }

    if (currentTool.includes('get_analytics')) {
      recommendations.push('Export analytics data to external database');
      recommendations.push('Generate and email automated report');
      recommendations.push('Create dashboard visualization');
    }

    if (currentTool.includes('create_data_element')) {
      recommendations.push('Backup metadata to version control');
      recommendations.push('Update documentation in Wiki/GitHub');
      recommendations.push('Notify configuration team');
    }

    return recommendations;
  }
}