/**
 * Documentation Access System for DHIS2 MCP Server
 * Integrates with filesystem and web search MCPs for comprehensive documentation access
 */

export interface DocumentationQuery {
  topic: string;
  platform: 'android' | 'web' | 'dhis2' | 'general';
  searchType: 'local' | 'web' | 'both';
  context?: string;
  apiLevel?: number;
  language?: 'kotlin' | 'java' | 'javascript' | 'typescript';
}

export interface DocumentationSource {
  type: 'filesystem' | 'web' | 'cache';
  path?: string;
  url?: string;
  priority: number;
  lastUpdated?: Date;
}

export interface DocumentationResult {
  source: DocumentationSource;
  content: string;
  relevanceScore: number;
  examples?: string[];
  relatedTopics?: string[];
}

export class DocumentationAccessSystem {
  private mcpClients: Map<string, any> = new Map();
  private cache: Map<string, DocumentationResult[]> = new Map();
  private cacheExpiry: Map<string, Date> = new Map();

  constructor() {
    // Initialize with common documentation paths
    this.initializeDocumentationSources();
  }

  private initializeDocumentationSources(): void {
    // Android SDK documentation paths
    const androidPaths = [
      '$ANDROID_HOME/docs/reference/',
      '$ANDROID_HOME/platforms/android-*/docs/',
      '~/Android/Sdk/docs/',
      '/usr/local/android-sdk/docs/',
      '/opt/android-sdk/docs/'
    ];

    // Web documentation URLs
    const webSources = [
      'https://developer.android.com/',
      'https://docs.dhis2.org/',
      'https://developer.mozilla.org/',
      'https://kotlinlang.org/docs/',
      'https://docs.oracle.com/javase/'
    ];
  }

  /**
   * Register external MCP clients for filesystem and web search
   */
  registerMCPClient(type: 'filesystem' | 'websearch' | 'github', client: any): void {
    this.mcpClients.set(type, client);
  }

  /**
   * Query documentation from multiple sources
   */
  async queryDocumentation(query: DocumentationQuery): Promise<DocumentationResult[]> {
    const cacheKey = this.generateCacheKey(query);
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey) || [];
    }

    const results: DocumentationResult[] = [];

    try {
      // Search local filesystem if requested
      if (query.searchType === 'local' || query.searchType === 'both') {
        const localResults = await this.searchLocalDocumentation(query);
        results.push(...localResults);
      }

      // Search web if requested
      if (query.searchType === 'web' || query.searchType === 'both') {
        const webResults = await this.searchWebDocumentation(query);
        results.push(...webResults);
      }

      // Sort by relevance and cache
      const sortedResults = this.sortByRelevance(results, query);
      this.cacheResults(cacheKey, sortedResults);

      return sortedResults;

    } catch (error) {
      console.error('Documentation query failed:', error);
      return [];
    }
  }

  /**
   * Search local filesystem for documentation
   */
  private async searchLocalDocumentation(query: DocumentationQuery): Promise<DocumentationResult[]> {
    const filesystemClient = this.mcpClients.get('filesystem');
    if (!filesystemClient) {
      return [];
    }

    const results: DocumentationResult[] = [];

    try {
      if (query.platform === 'android') {
        // Search Android SDK documentation
        const androidResults = await this.searchAndroidSDKDocs(query, filesystemClient);
        results.push(...androidResults);
      }

      if (query.platform === 'web' || query.platform === 'general') {
        // Search for local web documentation, cached docs, etc.
        const localWebDocs = await this.searchLocalWebDocs(query, filesystemClient);
        results.push(...localWebDocs);
      }

      return results;

    } catch (error) {
      console.error('Local documentation search failed:', error);
      return [];
    }
  }

  /**
   * Search Android SDK documentation locally
   */
  private async searchAndroidSDKDocs(query: DocumentationQuery, filesystemClient: any): Promise<DocumentationResult[]> {
    const results: DocumentationResult[] = [];
    
    // Common Android SDK documentation patterns
    const searchPatterns = [
      `${query.topic}.html`,
      `*${query.topic}*.html`,
      `reference/*/${query.topic}.html`,
      `guide/*${query.topic}*.html`
    ];

    const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
    if (!androidHome) {
      return results;
    }

    const docsPaths = [
      `${androidHome}/docs/reference/`,
      `${androidHome}/platforms/android-${query.apiLevel || 'latest'}/docs/`,
    ];

    for (const docsPath of docsPaths) {
      try {
        // Use filesystem MCP to search for documentation files
        const searchResult = await filesystemClient.callTool({
          name: 'search_files',
          arguments: {
            path: docsPath,
            patterns: searchPatterns,
            recursive: true
          }
        });

        if (searchResult.files && searchResult.files.length > 0) {
          for (const file of searchResult.files) {
            // Read the documentation content
            const content = await filesystemClient.callTool({
              name: 'read_file',
              arguments: { path: file.path }
            });

            results.push({
              source: {
                type: 'filesystem',
                path: file.path,
                priority: this.calculatePriority(file.path, query)
              },
              content: content.text || '',
              relevanceScore: this.calculateRelevanceScore(content.text || '', query),
              examples: this.extractCodeExamples(content.text || '', query.language),
              relatedTopics: this.extractRelatedTopics(content.text || '')
            });
          }
        }

      } catch (error) {
        console.warn(`Failed to search docs in ${docsPath}:`, error);
      }
    }

    return results;
  }

  /**
   * Search local web documentation (cached HTML docs, etc.)
   */
  private async searchLocalWebDocs(query: DocumentationQuery, filesystemClient: any): Promise<DocumentationResult[]> {
    const results: DocumentationResult[] = [];

    // Common local documentation directories
    const localDocPaths = [
      '~/.local/share/docs/',
      '/usr/share/doc/',
      '/opt/docs/',
      './docs/',
      './documentation/'
    ];

    for (const docPath of localDocPaths) {
      try {
        const searchResult = await filesystemClient.callTool({
          name: 'search_files',
          arguments: {
            path: docPath,
            patterns: [`*${query.topic}*.html`, `*${query.topic}*.md`, `*${query.topic}*.txt`],
            recursive: true
          }
        });

        if (searchResult.files) {
          for (const file of searchResult.files) {
            const content = await filesystemClient.callTool({
              name: 'read_file',
              arguments: { path: file.path }
            });

            results.push({
              source: {
                type: 'filesystem',
                path: file.path,
                priority: 2
              },
              content: content.text || '',
              relevanceScore: this.calculateRelevanceScore(content.text || '', query)
            });
          }
        }

      } catch (error) {
        console.warn(`Failed to search local docs in ${docPath}:`, error);
      }
    }

    return results;
  }

  /**
   * Search web documentation
   */
  private async searchWebDocumentation(query: DocumentationQuery): Promise<DocumentationResult[]> {
    const webSearchClient = this.mcpClients.get('websearch');
    if (!webSearchClient) {
      return [];
    }

    const results: DocumentationResult[] = [];

    try {
      // Platform-specific web searches
      const searchQueries = this.buildWebSearchQueries(query);

      for (const searchQuery of searchQueries) {
        const searchResult = await webSearchClient.callTool({
          name: 'web_search',
          arguments: {
            query: searchQuery.query,
            sites: searchQuery.sites,
            limit: 5
          }
        });

        if (searchResult.results) {
          for (const result of searchResult.results) {
            // Fetch content if needed
            let content = result.snippet || '';
            
            // For documentation sites, try to fetch full content
            if (this.isDocumentationSite(result.url)) {
              try {
                const fullContent = await webSearchClient.callTool({
                  name: 'fetch_page',
                  arguments: { url: result.url }
                });
                content = fullContent.content || content;
              } catch (error) {
                console.warn(`Failed to fetch full content from ${result.url}`);
              }
            }

            results.push({
              source: {
                type: 'web',
                url: result.url,
                priority: this.getWebSourcePriority(result.url)
              },
              content,
              relevanceScore: this.calculateRelevanceScore(content, query),
              examples: this.extractCodeExamples(content, query.language),
              relatedTopics: this.extractRelatedTopics(content)
            });
          }
        }
      }

      return results;

    } catch (error) {
      console.error('Web documentation search failed:', error);
      return [];
    }
  }

  /**
   * Build platform-specific web search queries
   */
  private buildWebSearchQueries(query: DocumentationQuery): Array<{query: string, sites: string[]}> {
    const queries: Array<{query: string, sites: string[]}> = [];

    switch (query.platform) {
      case 'android':
        queries.push({
          query: `Android ${query.topic} ${query.language || 'kotlin'} documentation example`,
          sites: ['developer.android.com', 'kotlinlang.org']
        });
        if (query.context) {
          queries.push({
            query: `Android ${query.topic} ${query.context} ${query.apiLevel ? `API ${query.apiLevel}` : ''}`,
            sites: ['developer.android.com', 'stackoverflow.com']
          });
        }
        break;

      case 'dhis2':
        queries.push({
          query: `DHIS2 ${query.topic} documentation API`,
          sites: ['docs.dhis2.org', 'github.com/dhis2']
        });
        break;

      case 'web':
        queries.push({
          query: `${query.topic} ${query.language || 'javascript'} documentation MDN`,
          sites: ['developer.mozilla.org', 'web.dev']
        });
        break;

      case 'general':
        queries.push({
          query: `${query.topic} documentation ${query.language || ''} example`,
          sites: []
        });
        break;
    }

    return queries;
  }

  /**
   * Calculate relevance score for documentation content
   */
  private calculateRelevanceScore(content: string, query: DocumentationQuery): number {
    let score = 0;
    const contentLower = content.toLowerCase();
    const topicLower = query.topic.toLowerCase();

    // Topic match in title/headers
    if (contentLower.includes(`<h1>${topicLower}`) || contentLower.includes(`# ${topicLower}`)) {
      score += 10;
    }

    // Topic frequency
    const topicCount = (contentLower.match(new RegExp(topicLower, 'g')) || []).length;
    score += topicCount * 2;

    // Code examples present
    if (contentLower.includes('```') || contentLower.includes('<code>')) {
      score += 5;
    }

    // Platform-specific bonuses
    if (query.platform === 'android' && (contentLower.includes('android') || contentLower.includes('kotlin'))) {
      score += 3;
    }

    if (query.language && contentLower.includes(query.language)) {
      score += 2;
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Extract code examples from content
   */
  private extractCodeExamples(content: string, language?: string): string[] {
    const examples: string[] = [];
    
    // Markdown code blocks
    const markdownPattern = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = markdownPattern.exec(content)) !== null) {
      const codeLanguage = match[1];
      const code = match[2];
      
      if (code && (!language || !codeLanguage || codeLanguage === language)) {
        examples.push(code.trim());
      }
    }

    // HTML code blocks
    const htmlPattern = /<code[^>]*>([\s\S]*?)<\/code>/g;
    while ((match = htmlPattern.exec(content)) !== null) {
      if (match[1]) {
        examples.push(match[1].trim());
      }
    }

    return examples.slice(0, 5); // Limit to 5 examples
  }

  /**
   * Extract related topics from content
   */
  private extractRelatedTopics(content: string): string[] {
    const topics: string[] = [];
    
    // Look for "See also", "Related", etc. sections
    const relatedPattern = /(?:see also|related|similar):\s*([^\n]+)/gi;
    let match;
    
    while ((match = relatedPattern.exec(content)) !== null) {
      const relatedText = match[1];
      if (relatedText) {
        const links = relatedText.match(/\b[A-Z][a-zA-Z]+(?:[A-Z][a-zA-Z]*)*\b/g) || [];
        topics.push(...links);
      }
    }

    return [...new Set(topics)].slice(0, 10); // Unique topics, limit to 10
  }

  /**
   * Helper methods
   */
  private generateCacheKey(query: DocumentationQuery): string {
    return `${query.platform}-${query.topic}-${query.searchType}-${query.language || 'any'}`;
  }

  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey);
    if (!expiry) return false;
    
    return new Date() < expiry;
  }

  private cacheResults(cacheKey: string, results: DocumentationResult[]): void {
    this.cache.set(cacheKey, results);
    // Cache for 1 hour
    this.cacheExpiry.set(cacheKey, new Date(Date.now() + 60 * 60 * 1000));
  }

  private sortByRelevance(results: DocumentationResult[], query: DocumentationQuery): DocumentationResult[] {
    return results.sort((a, b) => {
      // Primary sort by relevance score
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      
      // Secondary sort by source priority
      return b.source.priority - a.source.priority;
    });
  }

  private calculatePriority(path: string, query: DocumentationQuery): number {
    let priority = 1;
    
    // Official SDK docs get higher priority
    if (path.includes('/reference/')) priority += 3;
    if (path.includes('/guide/')) priority += 2;
    
    // API level match
    if (query.apiLevel && path.includes(`android-${query.apiLevel}`)) {
      priority += 2;
    }
    
    return priority;
  }

  private isDocumentationSite(url: string): boolean {
    const docSites = [
      'developer.android.com',
      'docs.dhis2.org', 
      'developer.mozilla.org',
      'kotlinlang.org',
      'docs.oracle.com'
    ];
    
    return docSites.some(site => url.includes(site));
  }

  private getWebSourcePriority(url: string): number {
    const priorities: {[key: string]: number} = {
      'developer.android.com': 5,
      'docs.dhis2.org': 5,
      'developer.mozilla.org': 4,
      'kotlinlang.org': 4,
      'github.com': 3,
      'stackoverflow.com': 2
    };

    for (const [site, priority] of Object.entries(priorities)) {
      if (url.includes(site)) {
        return priority;
      }
    }

    return 1;
  }

  /**
   * Generate comprehensive documentation response
   */
  generateDocumentationResponse(results: DocumentationResult[], query: DocumentationQuery): string {
    if (results.length === 0) {
      return `❌ No documentation found for "${query.topic}" on ${query.platform} platform.

💡 **Suggestions:**
- Check spelling of the topic
- Try broader search terms
- Ensure ${query.platform === 'android' ? 'Android SDK is installed' : 'web connection is available'}
- Try searching with 'both' to check local and web sources`;
    }

    let response = `📚 Documentation Results for "${query.topic}" (${query.platform})\n\n`;

    // Group results by source type
    const localResults = results.filter(r => r.source.type === 'filesystem');
    const webResults = results.filter(r => r.source.type === 'web');

    if (localResults.length > 0) {
      response += `## 📁 Local Documentation (${localResults.length} results)\n\n`;
      
      localResults.slice(0, 3).forEach((result, index) => {
        response += `### ${index + 1}. ${this.getFileTitle(result.source.path!)} (Score: ${result.relevanceScore})\n`;
        response += `**Path:** \`${result.source.path}\`\n\n`;
        
        if (result.examples && result.examples.length > 0) {
          response += `**Code Example:**\n\`\`\`${query.language || 'kotlin'}\n${result.examples[0]}\n\`\`\`\n\n`;
        }

        response += `**Content Preview:**\n${this.truncateContent(result.content, 200)}\n\n`;
      });
    }

    if (webResults.length > 0) {
      response += `## 🌐 Web Documentation (${webResults.length} results)\n\n`;
      
      webResults.slice(0, 3).forEach((result, index) => {
        response += `### ${index + 1}. ${this.getUrlTitle(result.source.url!)} (Score: ${result.relevanceScore})\n`;
        response += `**URL:** ${result.source.url}\n\n`;
        
        if (result.examples && result.examples.length > 0) {
          response += `**Code Example:**\n\`\`\`${query.language || 'kotlin'}\n${result.examples[0]}\n\`\`\`\n\n`;
        }

        response += `**Content Preview:**\n${this.truncateContent(result.content, 200)}\n\n`;
      });
    }

    // Add related topics if found
    const allRelatedTopics = results.flatMap(r => r.relatedTopics || []);
    const uniqueRelated = [...new Set(allRelatedTopics)].slice(0, 5);
    
    if (uniqueRelated.length > 0) {
      response += `## 🔗 Related Topics\n${uniqueRelated.map(topic => `- ${topic}`).join('\n')}\n\n`;
    }

    response += `💡 **Tips:**\n`;
    response += `- Use more specific terms for better results\n`;
    response += `- Try different platforms (android, web, dhis2, general)\n`;
    response += `- Combine with context for targeted searches`;

    return response;
  }

  private getFileTitle(path: string): string {
    return path.split('/').pop()?.replace('.html', '').replace('.md', '') || 'Unknown';
  }

  private getUrlTitle(url: string): string {
    const domain = new URL(url).hostname.replace('www.', '');
    const path = new URL(url).pathname.split('/').filter(p => p).pop() || '';
    return `${domain}/${path}`;
  }

  private truncateContent(content: string, maxLength: number): string {
    // Strip HTML tags for preview
    const stripped = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (stripped.length <= maxLength) {
      return stripped;
    }
    
    return stripped.substring(0, maxLength) + '...';
  }
}