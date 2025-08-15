/**
 * Context Loader Module
 * Loads and processes .context files for intelligent prompt enhancement
 */

class ContextLoader {
  constructor() {
    this.contextCache = null;
    this.lastLoadTime = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Load context from file system (for extension use)
   * This will be called from background script
   */
  async loadContextFile() {
    try {
      // Check cache first
      if (this.contextCache && this.lastLoadTime && 
          (Date.now() - this.lastLoadTime) < this.cacheTimeout) {
        return this.contextCache;
      }

      // Try to fetch the .context file from the extension's directory
      const response = await fetch(chrome.runtime.getURL('.context'));
      
      if (!response.ok) {
        console.log('No .context file found, will use default context');
        return this.getDefaultContext();
      }

      const contextText = await response.text();
      const parsedContext = this.parseContextFile(contextText);
      
      // Cache the result
      this.contextCache = parsedContext;
      this.lastLoadTime = Date.now();
      
      return parsedContext;
    } catch (error) {
      console.error('Failed to load context file:', error);
      return this.getDefaultContext();
    }
  }

  /**
   * Load context from storage (for user-provided context)
   */
  async loadStoredContext() {
    try {
      const stored = await chrome.storage.local.get(['pd:userContext']);
      if (stored['pd:userContext']) {
        return this.parseContextFile(stored['pd:userContext']);
      }
      return this.getDefaultContext();
    } catch (error) {
      console.error('Failed to load stored context:', error);
      return this.getDefaultContext();
    }
  }

  /**
   * Save user-provided context to storage
   */
  async saveContext(contextText) {
    try {
      const parsed = this.parseContextFile(contextText);
      await chrome.storage.local.set({ 'pd:userContext': contextText });
      
      // Clear cache to force reload
      this.contextCache = null;
      this.lastLoadTime = null;
      
      return parsed;
    } catch (error) {
      console.error('Failed to save context:', error);
      throw error;
    }
  }

  /**
   * Parse context file into structured format
   */
  parseContextFile(contextText) {
    const context = {
      overview: '',
      techStack: [],
      businessRules: [],
      apiStructure: '',
      databaseSchema: '',
      security: [],
      performance: [],
      guidelines: [],
      patterns: [],
      issues: [],
      environment: {},
      monitoring: {},
      deployment: '',
      raw: contextText
    };

    // Parse sections from the context file
    const sections = contextText.split(/^##\s+/m);
    
    sections.forEach(section => {
      const lines = section.trim().split('\n');
      if (lines.length === 0) return;
      
      const title = lines[0].toLowerCase();
      const content = lines.slice(1).join('\n').trim();
      
      if (title.includes('overview')) {
        context.overview = content;
      } else if (title.includes('technology') || title.includes('stack')) {
        context.techStack = this.extractListItems(content);
      } else if (title.includes('business') || title.includes('rules')) {
        context.businessRules = this.extractListItems(content);
      } else if (title.includes('api')) {
        context.apiStructure = content;
      } else if (title.includes('database') || title.includes('schema')) {
        context.databaseSchema = content;
      } else if (title.includes('security')) {
        context.security = this.extractListItems(content);
      } else if (title.includes('performance')) {
        context.performance = this.extractListItems(content);
      } else if (title.includes('guideline') || title.includes('development')) {
        context.guidelines = this.extractListItems(content);
      } else if (title.includes('pattern') || title.includes('common')) {
        context.patterns = this.extractListItems(content);
      } else if (title.includes('issue') || title.includes('constraint')) {
        context.issues = this.extractListItems(content);
      } else if (title.includes('environment')) {
        context.environment = this.parseKeyValuePairs(content);
      } else if (title.includes('monitoring') || title.includes('observability')) {
        context.monitoring = this.parseKeyValuePairs(content);
      } else if (title.includes('deployment') || title.includes('deploy')) {
        context.deployment = content;
      }
    });

    return context;
  }

  /**
   * Extract list items from content
   */
  extractListItems(content) {
    const items = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      // Match numbered lists, bullet points, or dashed lists
      const match = line.match(/^[\s]*[-*•]\s+(.+)$/) || 
                   line.match(/^[\s]*\d+\.\s+(.+)$/);
      if (match) {
        items.push(match[1].trim());
      }
    });
    
    return items;
  }

  /**
   * Parse key-value pairs from content
   */
  parseKeyValuePairs(content) {
    const pairs = {};
    const lines = content.split('\n');
    
    lines.forEach(line => {
      const match = line.match(/^[\s]*[-*•]?\s*([^:]+):\s*(.+)$/);
      if (match) {
        const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
        pairs[key] = match[2].trim();
      }
    });
    
    return pairs;
  }

  /**
   * Get default context when no .context file is available
   */
  getDefaultContext() {
    return {
      overview: 'Generic web application',
      techStack: [
        'Modern JavaScript/TypeScript framework',
        'Standard backend technology',
        'Relational or NoSQL database'
      ],
      businessRules: [
        'Maintain data integrity',
        'Ensure security best practices',
        'Follow accessibility guidelines'
      ],
      apiStructure: 'RESTful API or GraphQL endpoints',
      databaseSchema: 'Standard relational or document-based schema',
      security: [
        'Input validation required',
        'Authentication and authorization checks',
        'Data encryption for sensitive information'
      ],
      performance: [
        'Optimize for reasonable response times',
        'Implement caching where appropriate',
        'Monitor resource usage'
      ],
      guidelines: [
        'Follow existing code patterns',
        'Write tests for new functionality',
        'Document significant changes'
      ],
      patterns: [],
      issues: [],
      environment: {},
      monitoring: {},
      deployment: 'Standard CI/CD pipeline',
      raw: ''
    };
  }

  /**
   * Generate context summary for prompt injection
   */
  generateContextSummary(context) {
    const sections = [];
    
    if (context.overview) {
      sections.push(`APPLICATION: ${context.overview}`);
    }
    
    if (context.techStack.length > 0) {
      sections.push(`TECH STACK: ${context.techStack.slice(0, 5).join(', ')}`);
    }
    
    if (context.businessRules.length > 0) {
      sections.push(`KEY RULES: ${context.businessRules.slice(0, 3).join('; ')}`);
    }
    
    if (context.security.length > 0) {
      sections.push(`SECURITY: ${context.security.slice(0, 3).join('; ')}`);
    }
    
    if (context.issues.length > 0) {
      sections.push(`CONSTRAINTS: ${context.issues.slice(0, 2).join('; ')}`);
    }
    
    return sections.join('\n');
  }

  /**
   * Get relevant context for a specific request
   */
  getRelevantContext(userRequest, fullContext) {
    const requestLower = userRequest.toLowerCase();
    const relevant = {
      ...fullContext,
      relevantRules: [],
      relevantPatterns: [],
      relevantIssues: [],
      relevantSecurity: []
    };

    // Filter business rules based on request
    relevant.relevantRules = fullContext.businessRules.filter(rule => {
      const ruleLower = rule.toLowerCase();
      return this.isRelevant(requestLower, ruleLower);
    });

    // Filter patterns based on request
    relevant.relevantPatterns = fullContext.patterns.filter(pattern => {
      const patternLower = pattern.toLowerCase();
      return this.isRelevant(requestLower, patternLower);
    });

    // Filter issues based on request
    relevant.relevantIssues = fullContext.issues.filter(issue => {
      const issueLower = issue.toLowerCase();
      return this.isRelevant(requestLower, issueLower);
    });

    // Filter security requirements based on request
    relevant.relevantSecurity = fullContext.security.filter(sec => {
      const secLower = sec.toLowerCase();
      return this.isRelevant(requestLower, secLower) || 
             this.isHighRiskRequest(requestLower);
    });

    return relevant;
  }

  /**
   * Check if content is relevant to request
   */
  isRelevant(request, content) {
    // Keywords that indicate relevance
    const keywords = [
      'api', 'database', 'auth', 'user', 'payment', 'security',
      'frontend', 'backend', 'component', 'endpoint', 'table',
      'migration', 'deployment', 'test', 'performance', 'cache'
    ];

    // Check for keyword matches
    for (const keyword of keywords) {
      if (request.includes(keyword) && content.includes(keyword)) {
        return true;
      }
    }

    // Check for specific technology mentions
    const techKeywords = [
      'react', 'node', 'express', 'postgres', 'redis', 'docker',
      'aws', 'stripe', 'jwt', 'graphql', 'typescript'
    ];

    for (const tech of techKeywords) {
      if (request.includes(tech) && content.includes(tech)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if request is high risk
   */
  isHighRiskRequest(request) {
    const highRiskKeywords = [
      'delete', 'drop', 'remove', 'payment', 'auth', 'password',
      'production', 'migration', 'security', 'credential', 'key',
      'token', 'sensitive', 'financial', 'billing', 'invoice'
    ];

    return highRiskKeywords.some(keyword => request.includes(keyword));
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContextLoader;
}

// Make available to browser environment
if (typeof window !== 'undefined') {
  window.ContextLoader = ContextLoader;
}