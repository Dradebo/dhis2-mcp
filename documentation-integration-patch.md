# Documentation Access Integration Patch

This patch adds comprehensive documentation access capabilities to the DHIS2 MCP server, allowing it to query both local Android SDK documentation and web resources through external MCP servers.

## Files Added

1. **`src/documentation-access.ts`** - Core documentation access system
2. **`src/documentation-tools.ts`** - Tool definitions for documentation access
3. **`src/documentation-integration.ts`** - Integration layer for external MCPs

## Integration Steps

### 1. Add imports to `src/index.ts`

```typescript
// Add these imports at the top
import { documentationIntegration } from './documentation-integration.js';
import { createDocumentationTools } from './documentation-tools.js';
```

### 2. Update tool creation in `src/index.ts`

```typescript
// Update the createDevelopmentTools function call around line 98
let tools: Tool[] = [...createDevelopmentTools(), ...createDocumentationTools()];

// Update the tools array after DHIS2 configuration around line 209
tools = [...createDevelopmentTools(), ...createAPITools(), ...createDocumentationTools()];
```

### 3. Add documentation tool handlers in `src/index.ts`

Add these case handlers in the main switch statement (around line 1740):

```typescript
// Documentation Access Tools
case 'dhis2_setup_documentation_access':
  const setupArgs = args as {
    filesystemMcpPath?: string;
    websearchMcpPath?: string; 
    androidSdkPath?: string;
    enableWebSearch?: boolean;
    enableLocalSearch?: boolean;
  };
  const setupResult = await documentationIntegration.setupMCPConnections(setupArgs);
  logSuccessfulOperation(name, setupArgs, { configured: true }, startTime);
  return {
    content: [{ type: 'text', text: setupResult }]
  };

case 'dhis2_query_documentation':
  const queryArgs = args as {
    topic: string;
    platform: 'android' | 'web' | 'dhis2' | 'general';
    searchType?: 'local' | 'web' | 'both';
    context?: string;
    language?: 'kotlin' | 'java' | 'javascript' | 'typescript';
    apiLevel?: number;
  };
  const queryResult = await documentationIntegration.queryDocumentation(queryArgs);
  logSuccessfulOperation(name, queryArgs, { resultCount: queryResult.length }, startTime);
  return {
    content: [{ type: 'text', text: queryResult }]
  };

case 'dhis2_search_android_sdk':
  const androidArgs = args as {
    topic: string;
    apiLevel?: number;
    docType?: string;
    includeExamples?: boolean;
  };
  const androidResult = await documentationIntegration.searchAndroidSDK(androidArgs);
  logSuccessfulOperation(name, androidArgs, { searched: true }, startTime);
  return {
    content: [{ type: 'text', text: androidResult }]
  };

case 'dhis2_search_web_docs':
  const webArgs = args as {
    topic: string;
    sites?: string[];
    language?: string;
    includeStackOverflow?: boolean;
    maxResults?: number;
  };
  const webResult = await documentationIntegration.searchWebDocs(webArgs);
  logSuccessfulOperation(name, webArgs, { searched: true }, startTime);
  return {
    content: [{ type: 'text', text: webResult }]
  };

case 'dhis2_explain_with_examples':
  const explainArgs = args as {
    concept: string;
    platform: 'android' | 'web' | 'dhis2';
    level?: string;
    useCase?: string;
    preferredLanguage?: string;
  };
  const explanation = await documentationIntegration.explainWithExamples(explainArgs);
  logSuccessfulOperation(name, explainArgs, { explained: true }, startTime);
  return {
    content: [{ type: 'text', text: explanation }]
  };

case 'dhis2_generate_integration_guide':
  const guideArgs = args as {
    integration: string;
    targetPlatform: 'android' | 'web' | 'hybrid';
    complexity?: string;
    includeErrorHandling?: boolean;
    includeTesting?: boolean;
  };
  const integrationGuide = await documentationIntegration.generateIntegrationGuide(guideArgs);
  logSuccessfulOperation(name, guideArgs, { generated: true }, startTime);
  return {
    content: [{ type: 'text', text: integrationGuide }]
  };

// Add other documentation tool cases as needed...
```

## Usage Examples

### 1. Setup Documentation Access

```json
{
  "tool": "dhis2_setup_documentation_access",
  "arguments": {
    "filesystemMcpPath": "/path/to/filesystem-mcp",
    "websearchMcpPath": "/path/to/websearch-mcp", 
    "androidSdkPath": "/Users/username/Library/Android/sdk",
    "enableWebSearch": true,
    "enableLocalSearch": true
  }
}
```

### 2. Query Android Documentation

```json
{
  "tool": "dhis2_query_documentation",
  "arguments": {
    "topic": "LocationManager",
    "platform": "android",
    "searchType": "both",
    "language": "kotlin",
    "apiLevel": 34,
    "context": "permissions and lifecycle"
  }
}
```

### 3. Search Web Documentation

```json
{
  "tool": "dhis2_search_web_docs",
  "arguments": {
    "topic": "DHIS2 data elements API",
    "sites": ["docs.dhis2.org", "github.com/dhis2"],
    "maxResults": 5
  }
}
```

### 4. Get Detailed Explanation

```json
{
  "tool": "dhis2_explain_with_examples",
  "arguments": {
    "concept": "Android data binding",
    "platform": "android", 
    "level": "intermediate",
    "useCase": "DHIS2 form creation",
    "preferredLanguage": "kotlin"
  }
}
```

### 5. Generate Integration Guide

```json
{
  "tool": "dhis2_generate_integration_guide",
  "arguments": {
    "integration": "DHIS2 Android SDK with Room database",
    "targetPlatform": "android",
    "complexity": "comprehensive",
    "includeErrorHandling": true,
    "includeTesting": true
  }
}
```

## External MCP Server Requirements

This integration assumes you have these external MCP servers available:

### Filesystem MCP
- Can read local files
- Can search directories with glob patterns
- Required for Android SDK documentation access

### Web Search MCP  
- Can perform web searches
- Can fetch webpage content
- Required for online documentation access

## Benefits

1. **Unified Documentation Access** - Query local and web sources from one tool
2. **Android SDK Integration** - Direct access to locally installed Android documentation
3. **Smart Caching** - Results cached for better performance
4. **Context-Aware Search** - Platform and language-specific results
5. **Code Example Extraction** - Automatically extracts relevant code snippets
6. **Integration Guides** - Generates step-by-step implementation guides

## Next Steps

1. Install and configure external MCP servers
2. Apply this patch to the DHIS2 MCP server
3. Test with sample queries
4. Extend with additional documentation sources as needed

## Note on External MCPs

The current implementation includes mock responses for external MCP calls. To fully utilize this feature, you'll need to:

1. Install actual filesystem and web search MCP servers
2. Update the connection logic in `documentation-integration.ts`
3. Handle real MCP protocol communication

This provides a complete framework that can be extended to work with any MCP-compatible documentation access tools.