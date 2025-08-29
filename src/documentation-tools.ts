import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Documentation access tools that integrate with external MCPs
 */
export function createDocumentationTools(): Tool[] {
  return [
    {
      name: 'dhis2_query_documentation',
      description: 'Query documentation from multiple sources (local Android SDK, web, DHIS2 docs)',
      inputSchema: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'The topic or API to search for (e.g., "LocationManager", "DataElement", "RecyclerView")'
          },
          platform: {
            type: 'string',
            enum: ['android', 'web', 'dhis2', 'general'],
            description: 'Platform-specific documentation to search'
          },
          searchType: {
            type: 'string',
            enum: ['local', 'web', 'both'],
            default: 'both',
            description: 'Search local filesystem, web, or both'
          },
          context: {
            type: 'string',
            description: 'Additional context for the search (e.g., "permissions", "lifecycle", "authentication")'
          },
          language: {
            type: 'string',
            enum: ['kotlin', 'java', 'javascript', 'typescript'],
            description: 'Programming language for code examples'
          },
          apiLevel: {
            type: 'number',
            description: 'Android API level for version-specific documentation'
          }
        },
        required: ['topic', 'platform']
      }
    },
    
    {
      name: 'dhis2_setup_documentation_access',
      description: 'Configure external MCP connections for documentation access',
      inputSchema: {
        type: 'object',
        properties: {
          filesystemMcpPath: {
            type: 'string',
            description: 'Path to filesystem MCP server executable'
          },
          websearchMcpPath: {
            type: 'string', 
            description: 'Path to web search MCP server executable'
          },
          androidSdkPath: {
            type: 'string',
            description: 'Path to Android SDK (ANDROID_HOME)'
          },
          enableWebSearch: {
            type: 'boolean',
            default: true,
            description: 'Enable web search for documentation'
          },
          enableLocalSearch: {
            type: 'boolean', 
            default: true,
            description: 'Enable local filesystem search'
          }
        }
      }
    },

    {
      name: 'dhis2_search_android_sdk',
      description: 'Search specifically in Android SDK documentation (requires filesystem MCP)',
      inputSchema: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Android API or component to search for'
          },
          apiLevel: {
            type: 'number',
            description: 'Target Android API level'
          },
          docType: {
            type: 'string',
            enum: ['reference', 'guide', 'training', 'samples'],
            default: 'reference',
            description: 'Type of documentation to search'
          },
          includeExamples: {
            type: 'boolean',
            default: true,
            description: 'Include code examples in results'
          }
        },
        required: ['topic']
      }
    },

    {
      name: 'dhis2_search_web_docs',
      description: 'Search web documentation (requires web search MCP)',
      inputSchema: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Topic to search for online'
          },
          sites: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific sites to search (e.g., ["developer.android.com", "docs.dhis2.org"])'
          },
          language: {
            type: 'string',
            enum: ['kotlin', 'java', 'javascript', 'typescript', 'any'],
            default: 'any',
            description: 'Programming language for examples'
          },
          includeStackOverflow: {
            type: 'boolean',
            default: true,
            description: 'Include Stack Overflow in web search'
          },
          maxResults: {
            type: 'number',
            default: 5,
            minimum: 1,
            maximum: 20,
            description: 'Maximum number of results to return'
          }
        },
        required: ['topic']
      }
    },

    {
      name: 'dhis2_explain_with_examples',
      description: 'Get detailed explanation with code examples from documentation',
      inputSchema: {
        type: 'object',
        properties: {
          concept: {
            type: 'string',
            description: 'Concept or API to explain (e.g., "Android lifecycle", "DHIS2 data elements")'
          },
          platform: {
            type: 'string',
            enum: ['android', 'web', 'dhis2'],
            description: 'Platform context for explanation'
          },
          level: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'intermediate',
            description: 'Complexity level of explanation'
          },
          useCase: {
            type: 'string',
            description: 'Specific use case or scenario (e.g., "offline data sync", "user authentication")'
          },
          preferredLanguage: {
            type: 'string',
            enum: ['kotlin', 'java', 'javascript', 'typescript'],
            description: 'Preferred programming language for examples'
          }
        },
        required: ['concept', 'platform']
      }
    },

    {
      name: 'dhis2_compare_implementations',
      description: 'Compare different implementation approaches using documentation sources',
      inputSchema: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Topic to compare implementations for'
          },
          approaches: {
            type: 'array',
            items: { type: 'string' },
            description: 'Different approaches to compare (e.g., ["Retrofit", "OkHttp", "HttpURLConnection"])'
          },
          criteria: {
            type: 'array',
            items: { type: 'string' },
            description: 'Comparison criteria (e.g., ["performance", "complexity", "maintenance"])'
          },
          platform: {
            type: 'string',
            enum: ['android', 'web', 'dhis2'],
            description: 'Platform context for comparison'
          }
        },
        required: ['topic', 'approaches']
      }
    },

    {
      name: 'dhis2_generate_integration_guide',
      description: 'Generate step-by-step integration guide using documentation sources',
      inputSchema: {
        type: 'object',
        properties: {
          integration: {
            type: 'string',
            description: 'What to integrate (e.g., "DHIS2 Android SDK with Room database")'
          },
          targetPlatform: {
            type: 'string',
            enum: ['android', 'web', 'hybrid'],
            description: 'Target platform for integration'
          },
          complexity: {
            type: 'string',
            enum: ['basic', 'standard', 'comprehensive'],
            default: 'standard',
            description: 'Complexity level of the integration guide'
          },
          includeErrorHandling: {
            type: 'boolean',
            default: true,
            description: 'Include error handling patterns'
          },
          includeTesting: {
            type: 'boolean',
            default: true,
            description: 'Include testing strategies'
          }
        },
        required: ['integration', 'targetPlatform']
      }
    },

    {
      name: 'dhis2_check_compatibility',
      description: 'Check API compatibility and version requirements using documentation',
      inputSchema: {
        type: 'object',
        properties: {
          components: {
            type: 'array',
            items: { type: 'string' },
            description: 'Components or APIs to check compatibility for'
          },
          targetAndroidVersion: {
            type: 'number',
            description: 'Target Android API level'
          },
          minAndroidVersion: {
            type: 'number',
            description: 'Minimum Android API level'
          },
          dhis2Version: {
            type: 'string',
            description: 'DHIS2 version (e.g., "2.40", "2.39")'
          },
          checkDeprecation: {
            type: 'boolean',
            default: true,
            description: 'Check for deprecated APIs'
          }
        },
        required: ['components']
      }
    },

    {
      name: 'dhis2_troubleshoot_with_docs',
      description: 'Troubleshoot issues using documentation and known solutions',
      inputSchema: {
        type: 'object',
        properties: {
          problem: {
            type: 'string',
            description: 'Description of the problem or error'
          },
          errorMessage: {
            type: 'string',
            description: 'Specific error message if available'
          },
          platform: {
            type: 'string',
            enum: ['android', 'web', 'dhis2'],
            description: 'Platform where the issue occurs'
          },
          context: {
            type: 'string',
            description: 'Additional context (e.g., "during sync", "at app startup", "in production")'
          },
          attempted: {
            type: 'array',
            items: { type: 'string' },
            description: 'Solutions already attempted'
          }
        },
        required: ['problem', 'platform']
      }
    }
  ];
}