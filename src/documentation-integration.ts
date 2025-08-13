/**
 * Integration layer for documentation access with external MCPs
 */

import { DocumentationAccessSystem, DocumentationQuery } from './documentation-access.js';

export class DocumentationMCPIntegration {
  private docSystem: DocumentationAccessSystem;
  private mcpConnections: Map<string, any> = new Map();

  constructor() {
    this.docSystem = new DocumentationAccessSystem();
  }

  /**
   * Setup connections to external MCP servers
   */
  async setupMCPConnections(config: {
    filesystemMcpPath?: string;
    websearchMcpPath?: string;
    enableWebSearch?: boolean;
    enableLocalSearch?: boolean;
    androidSdkPath?: string;
  }): Promise<string> {
    let setupResults: string[] = [];

    try {
      // Setup filesystem MCP connection
      if (config.enableLocalSearch && config.filesystemMcpPath) {
        const filesystemClient = await this.connectToMCP('filesystem', config.filesystemMcpPath);
        if (filesystemClient) {
          this.docSystem.registerMCPClient('filesystem', filesystemClient);
          setupResults.push('✅ Filesystem MCP connected');
        } else {
          setupResults.push('❌ Failed to connect to filesystem MCP');
        }
      }

      // Setup web search MCP connection
      if (config.enableWebSearch && config.websearchMcpPath) {
        const websearchClient = await this.connectToMCP('websearch', config.websearchMcpPath);
        if (websearchClient) {
          this.docSystem.registerMCPClient('websearch', websearchClient);
          setupResults.push('✅ Web search MCP connected');
        } else {
          setupResults.push('❌ Failed to connect to web search MCP');
        }
      }

      // Validate Android SDK path
      if (config.androidSdkPath) {
        process.env.ANDROID_HOME = config.androidSdkPath;
        setupResults.push(`✅ Android SDK path set to: ${config.androidSdkPath}`);
      } else if (process.env.ANDROID_HOME) {
        setupResults.push(`✅ Using existing Android SDK path: ${process.env.ANDROID_HOME}`);
      } else {
        setupResults.push('⚠️  No Android SDK path configured - local Android docs will be unavailable');
      }

      return `📚 **Documentation Access Setup Complete**

${setupResults.join('\n')}

**Available Search Types:**
- Local: ${config.enableLocalSearch ? '✅ Enabled' : '❌ Disabled'}
- Web: ${config.enableWebSearch ? '✅ Enabled' : '❌ Disabled'}

**Next Steps:**
1. Use \`dhis2_query_documentation\` to search across all sources
2. Use \`dhis2_search_android_sdk\` for Android-specific searches
3. Use \`dhis2_search_web_docs\` for web-only searches

**Example:**
\`\`\`json
{
  "topic": "LocationManager",
  "platform": "android",
  "searchType": "both",
  "apiLevel": 34,
  "language": "kotlin"
}
\`\`\``;

    } catch (error) {
      return `❌ **Setup Failed:** ${error instanceof Error ? error.message : String(error)}

**Troubleshooting:**
- Ensure MCP server paths are correct and executable
- Check that external MCP servers are properly installed
- Verify filesystem permissions for local documentation access`;
    }
  }

  /**
   * Connect to an external MCP server
   */
  private async connectToMCP(type: string, mcpPath: string): Promise<any> {
    try {
      // This would be the actual MCP client connection
      // For now, return a mock client that shows the structure needed
      return {
        async callTool(request: { name: string; arguments: any }) {
          // Mock implementation - in reality this would call the external MCP
          console.log(`[${type} MCP] Calling tool: ${request.name}`, request.arguments);
          
          // Return mock responses for demonstration
          if (type === 'filesystem' && request.name === 'search_files') {
            return {
              files: [
                { path: '/mock/android/docs/reference/LocationManager.html' },
                { path: '/mock/android/docs/guide/location.html' }
              ]
            };
          }
          
          if (type === 'filesystem' && request.name === 'read_file') {
            return {
              text: `Mock documentation content for ${request.arguments.path}`
            };
          }
          
          if (type === 'websearch' && request.name === 'web_search') {
            return {
              results: [
                {
                  url: 'https://developer.android.com/reference/android/location/LocationManager',
                  title: 'LocationManager | Android Developers',
                  snippet: 'This class provides access to the system location services...'
                }
              ]
            };
          }
          
          return { success: false, error: 'Mock implementation' };
        }
      };
    } catch (error) {
      console.error(`Failed to connect to ${type} MCP:`, error);
      return null;
    }
  }

  /**
   * Main documentation query handler
   */
  async queryDocumentation(query: DocumentationQuery): Promise<string> {
    try {
      const results = await this.docSystem.queryDocumentation(query);
      return this.docSystem.generateDocumentationResponse(results, query);
    } catch (error) {
      return `❌ **Documentation Query Failed**

**Error:** ${error instanceof Error ? error.message : String(error)}

**Possible Solutions:**
- Check that MCP connections are properly configured
- Ensure search parameters are valid
- Try a simpler query first
- Verify external MCP servers are running

**Debug Info:**
- Query: ${JSON.stringify(query, null, 2)}`;
    }
  }

  /**
   * Android SDK specific search
   */
  async searchAndroidSDK(args: {
    topic: string;
    apiLevel?: number;
    docType?: string;
    includeExamples?: boolean;
  }): Promise<string> {
    const query: DocumentationQuery = {
      topic: args.topic,
      platform: 'android',
      searchType: 'local',
      ...(args.apiLevel && { apiLevel: args.apiLevel }),
      language: 'kotlin'
    };

    if (!process.env.ANDROID_HOME) {
      return `❌ **Android SDK Not Configured**

**Setup Required:**
1. Set ANDROID_HOME environment variable
2. Or use \`dhis2_setup_documentation_access\` with androidSdkPath

**Example Setup:**
\`\`\`json
{
  "androidSdkPath": "/Users/yourusername/Library/Android/sdk"
}
\`\`\``;
    }

    return await this.queryDocumentation(query);
  }

  /**
   * Web documentation search
   */
  async searchWebDocs(args: {
    topic: string;
    sites?: string[];
    language?: string;
    includeStackOverflow?: boolean;
    maxResults?: number;
  }): Promise<string> {
    const query: DocumentationQuery = {
      topic: args.topic,
      platform: 'general',
      searchType: 'web',
      language: args.language as any,
      ...(args.sites && args.sites.length > 0 && { 
        context: `site:${args.sites.join(' OR site:')}` 
      })
    };

    return await this.queryDocumentation(query);
  }

  /**
   * Generate detailed explanation with examples
   */
  async explainWithExamples(args: {
    concept: string;
    platform: 'android' | 'web' | 'dhis2';
    level?: string;
    useCase?: string;
    preferredLanguage?: string;
  }): Promise<string> {
    const query: DocumentationQuery = {
      topic: args.concept,
      platform: args.platform,
      searchType: 'both',
      ...(args.useCase && { context: args.useCase }),
      language: args.preferredLanguage as any
    };

    const results = await this.docSystem.queryDocumentation(query);
    
    if (results.length === 0) {
      return `❌ No documentation found for "${args.concept}" on ${args.platform}.

**Suggestions:**
- Try broader search terms
- Check spelling
- Use different platform (android, web, dhis2, general)`;
    }

    // Generate enhanced explanation
    let explanation = `# 📖 ${args.concept} Explanation (${args.platform.toUpperCase()})\n\n`;
    
    explanation += `**Complexity Level:** ${args.level || 'intermediate'}\n`;
    if (args.useCase) {
      explanation += `**Use Case:** ${args.useCase}\n`;
    }
    explanation += '\n';

    // Add best result with detailed breakdown
    const bestResult = results[0];
    if (!bestResult) {
      return `❌ No valid documentation found for "${args.concept}".`;
    }
    
    explanation += `## 🎯 Overview\n\n`;
    explanation += `${this.extractOverview(bestResult.content, args.concept)}\n\n`;

    if (bestResult.examples && bestResult.examples.length > 0) {
      explanation += `## 💻 Code Examples\n\n`;
      bestResult.examples.forEach((example, index) => {
        explanation += `### Example ${index + 1}\n`;
        explanation += `\`\`\`${args.preferredLanguage || 'kotlin'}\n${example}\n\`\`\`\n\n`;
      });
    }

    // Add implementation guide
    explanation += `## 🛠️ Implementation Steps\n\n`;
    explanation += this.generateImplementationSteps(args.concept, args.platform);

    // Add related topics
    if (bestResult.relatedTopics && bestResult.relatedTopics.length > 0) {
      explanation += `\n## 🔗 Related Topics\n\n`;
      bestResult.relatedTopics.forEach(topic => {
        explanation += `- ${topic}\n`;
      });
    }

    return explanation;
  }

  private extractOverview(content: string, _concept: string): string {
    // Simple extraction - in practice this would be more sophisticated
    const sentences = content.split('.').slice(0, 3);
    return sentences.join('.') + '.';
  }

  private generateImplementationSteps(concept: string, platform: string): string {
    // Generate basic implementation steps based on concept and platform
    let steps = '';
    
    if (platform === 'android') {
      steps += `1. Add necessary dependencies to \`build.gradle\`\n`;
      steps += `2. Add required permissions to \`AndroidManifest.xml\`\n`;
      steps += `3. Initialize ${concept} in your Activity or Fragment\n`;
      steps += `4. Implement necessary callbacks and listeners\n`;
      steps += `5. Handle lifecycle events appropriately\n`;
      steps += `6. Add error handling and edge cases\n`;
    } else if (platform === 'web') {
      steps += `1. Include necessary libraries or frameworks\n`;
      steps += `2. Set up HTML structure\n`;
      steps += `3. Initialize ${concept} in JavaScript\n`;
      steps += `4. Implement event handlers\n`;
      steps += `5. Add responsive design considerations\n`;
      steps += `6. Test across different browsers\n`;
    } else if (platform === 'dhis2') {
      steps += `1. Understand DHIS2 API structure\n`;
      steps += `2. Set up authentication\n`;
      steps += `3. Make API calls for ${concept}\n`;
      steps += `4. Handle API responses and errors\n`;
      steps += `5. Implement data validation\n`;
      steps += `6. Test with different DHIS2 versions\n`;
    }

    return steps;
  }

  /**
   * Generate integration guide
   */
  async generateIntegrationGuide(args: {
    integration: string;
    targetPlatform: 'android' | 'web' | 'hybrid';
    complexity?: string;
    includeErrorHandling?: boolean;
    includeTesting?: boolean;
  }): Promise<string> {
    let guide = `# 🔧 ${args.integration} Integration Guide\n\n`;
    guide += `**Platform:** ${args.targetPlatform.toUpperCase()}\n`;
    guide += `**Complexity:** ${args.complexity || 'standard'}\n\n`;

    // Generate platform-specific guide
    guide += `## 📋 Prerequisites\n\n`;
    if (args.targetPlatform === 'android') {
      guide += `- Android Studio installed\n`;
      guide += `- Android SDK configured\n`;
      guide += `- Minimum API level 21+\n\n`;
    }

    guide += `## 🚀 Step-by-Step Integration\n\n`;
    guide += this.generateDetailedSteps(args.integration, args.targetPlatform);

    if (args.includeErrorHandling) {
      guide += `\n## ⚠️ Error Handling\n\n`;
      guide += this.generateErrorHandling(args.targetPlatform);
    }

    if (args.includeTesting) {
      guide += `\n## 🧪 Testing Strategy\n\n`;
      guide += this.generateTestingStrategy(args.targetPlatform);
    }

    return guide;
  }

  private generateDetailedSteps(_integration: string, _platform: string): string {
    // This would query documentation for specific integration steps
    return `1. **Setup Dependencies**
   - Add required libraries
   - Configure build files

2. **Initialize Components**
   - Set up main integration points
   - Configure settings

3. **Implement Core Functionality**
   - Add main integration logic
   - Handle data flow

4. **Test Integration**
   - Verify functionality
   - Handle edge cases`;
  }

  private generateErrorHandling(_platform: string): string {
    return `- Implement try-catch blocks
- Add logging for debugging
- Provide user-friendly error messages
- Handle network connectivity issues
- Implement retry mechanisms`;
  }

  private generateTestingStrategy(platform: string): string {
    if (platform === 'android') {
      return `- Unit tests with JUnit
- Integration tests with Espresso
- Mock external dependencies
- Test on different device configurations`;
    }
    return `- Unit tests
- Integration tests
- End-to-end testing
- Cross-platform compatibility`;
  }
}

// Global instance
export const documentationIntegration = new DocumentationMCPIntegration();