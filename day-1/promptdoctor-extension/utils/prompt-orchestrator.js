/**
 * Advanced Prompt Orchestrator
 * Transforms vague requests into multi-step, research-driven interactions
 * using context from .context file
 */

class PromptOrchestrator {
  constructor() {
    this.contextLoader = null;
    this.context = null;
  }

  /**
   * Initialize with context loader
   */
  async initialize() {
    if (typeof ContextLoader !== 'undefined') {
      this.contextLoader = new ContextLoader();
      this.context = await this.contextLoader.loadStoredContext();
    }
  }

  /**
   * Main orchestration method - transforms vague request into multi-step workflow
   */
  async orchestrateRequest(userRequest, apiKey = null) {
    // Load fresh context
    if (this.contextLoader) {
      this.context = await this.contextLoader.loadStoredContext();
    }

    // Analyze the request to understand intent and complexity
    const analysis = this.analyzeRequest(userRequest);
    
    // Generate research questions based on request and context
    const researchQuestions = this.generateResearchQuestions(userRequest, analysis);
    
    // Create multi-step workflow
    const workflow = this.createWorkflow(userRequest, analysis, researchQuestions);
    
    // If we have an API key, enhance with AI
    if (apiKey) {
      return await this.enhanceWithAI(workflow, apiKey);
    }
    
    return workflow;
  }

  /**
   * Analyze request to understand intent, scope, and risk
   */
  analyzeRequest(userRequest) {
    const requestLower = userRequest.toLowerCase();
    
    const analysis = {
      intent: this.detectIntent(requestLower),
      scope: this.detectScope(requestLower),
      riskLevel: this.assessRisk(requestLower),
      affectedSystems: this.detectAffectedSystems(requestLower),
      complexity: this.assessComplexity(requestLower),
      requiresResearch: true,
      suggestedPhases: [],
      contextRelevance: []
    };

    // Dynamically determine phases based on complexity and risk
    analysis.suggestedPhases = this.determineRequiredPhases(analysis);

    // Find relevant context sections
    if (this.context) {
      analysis.contextRelevance = this.findRelevantContextSections(requestLower);
    }

    return analysis;
  }

  /**
   * Determine required phases based on analysis
   */
  determineRequiredPhases(analysis) {
    const phases = [];
    
    // Trivial changes (text, color, minor UI) - minimal workflow
    if (analysis.complexity === 'trivial' && analysis.riskLevel === 'low') {
      phases.push('planning');  // Always include planning
      phases.push('implementation');
      // No verification needed for truly trivial changes
      return phases;
    }
    
    // Simple changes (single component, clear requirements)
    if (analysis.complexity === 'low' && analysis.riskLevel === 'low') {
      phases.push('planning');  // Always include planning
      phases.push('implementation');
      // No verification for low risk simple changes
      return phases;
    }
    
    // Medium complexity OR medium risk
    if (analysis.complexity === 'medium' || analysis.riskLevel === 'medium') {
      // Add research only if requirements are unclear
      if (analysis.intent === 'unknown' || analysis.scope === 'unclear' || 
          analysis.complexity === 'medium') {
        phases.push('research');
      }
      
      phases.push('planning');  // Always include planning
      
      // Add validation for medium risk operations
      if (analysis.riskLevel === 'medium') {
        phases.push('validation');
      }
      
      phases.push('implementation');
      phases.push('verification');  // Medium risk gets verification
      
      return phases;
    }
    
    // High complexity OR high risk - comprehensive workflow
    if (analysis.complexity === 'high' || analysis.riskLevel === 'high') {
      phases.push('research');
      phases.push('planning');  // Always include planning
      phases.push('validation');
      phases.push('implementation');
      phases.push('testing');
      phases.push('verification');  // High risk always gets verification
      
      // Add deployment phase for critical changes
      if (analysis.riskLevel === 'high' || 
          analysis.affectedSystems.includes('infrastructure') ||
          analysis.affectedSystems.includes('database') ||
          analysis.affectedSystems.includes('payment')) {
        phases.push('deployment');
      }
      
      return phases;
    }
    
    // Default fallback - moderate workflow with planning
    return ['planning', 'implementation', 'verification'];
  }

  /**
   * Detect the primary intent of the request
   */
  detectIntent(request) {
    const intents = {
      create: ['add', 'create', 'new', 'implement', 'build', 'develop', 'make'],
      modify: ['update', 'change', 'modify', 'edit', 'alter', 'adjust', 'refactor'],
      fix: ['fix', 'repair', 'debug', 'solve', 'resolve', 'patch', 'correct'],
      remove: ['delete', 'remove', 'drop', 'destroy', 'eliminate', 'clean'],
      optimize: ['optimize', 'improve', 'enhance', 'speed up', 'performance'],
      integrate: ['integrate', 'connect', 'link', 'sync', 'api', 'webhook'],
      migrate: ['migrate', 'upgrade', 'move', 'transfer', 'port'],
      analyze: ['analyze', 'investigate', 'check', 'review', 'audit', 'assess']
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => request.includes(keyword))) {
        return intent;
      }
    }

    return 'unknown';
  }

  /**
   * Detect the scope of the change
   */
  detectScope(request) {
    if (request.includes('entire') || request.includes('all') || request.includes('whole') || 
        request.includes('system') || request.includes('application')) {
      return 'system-wide';
    }
    
    if (request.includes('page') || request.includes('component') || request.includes('feature') ||
        request.includes('endpoint') || request.includes('function')) {
      return 'feature-level';
    }
    
    if (request.includes('button') || request.includes('field') || request.includes('style') ||
        request.includes('text') || request.includes('color')) {
      return 'component-level';
    }

    return 'unclear';
  }

  /**
   * Assess risk level based on keywords and context
   */
  assessRisk(request) {
    const highRiskKeywords = [
      'production', 'payment', 'auth', 'security', 'delete', 'drop',
      'password', 'credential', 'financial', 'billing', 'sensitive',
      'database', 'migration', 'schema', 'user data', 'personal'
    ];

    const mediumRiskKeywords = [
      'api', 'integration', 'update', 'modify', 'endpoint', 'service',
      'config', 'setting', 'permission', 'role', 'workflow'
    ];

    if (highRiskKeywords.some(keyword => request.includes(keyword))) {
      return 'high';
    }

    if (mediumRiskKeywords.some(keyword => request.includes(keyword))) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Detect which systems will be affected
   */
  detectAffectedSystems(request) {
    const systems = [];
    
    const systemKeywords = {
      frontend: ['ui', 'frontend', 'react', 'component', 'page', 'display', 'style', 'css', 'layout'],
      backend: ['api', 'backend', 'server', 'endpoint', 'service', 'node', 'express'],
      database: ['database', 'db', 'table', 'schema', 'query', 'sql', 'postgres', 'migration'],
      auth: ['auth', 'login', 'user', 'permission', 'role', 'jwt', 'session', 'oauth'],
      payment: ['payment', 'stripe', 'billing', 'subscription', 'invoice', 'charge'],
      infrastructure: ['deploy', 'aws', 'docker', 'ci/cd', 'environment', 'config'],
      testing: ['test', 'jest', 'cypress', 'coverage', 'unit', 'integration']
    };

    for (const [system, keywords] of Object.entries(systemKeywords)) {
      if (keywords.some(keyword => request.includes(keyword))) {
        systems.push(system);
      }
    }

    return systems.length > 0 ? systems : ['general'];
  }

  /**
   * Assess complexity based on various factors
   */
  assessComplexity(request) {
    const requestLower = request.toLowerCase();
    
    // Analyze the request holistically
    let complexityScore = 0;
    
    // 1. Scope Analysis
    const scopeIndicators = {
      high: ['entire', 'all', 'system', 'architecture', 'infrastructure', 'redesign', 'refactor', 'migrate'],
      medium: ['multiple', 'several', 'various', 'integration', 'workflow'],
      low: ['single', 'specific', 'one', 'just', 'only', 'simple']
    };
    
    if (scopeIndicators.high.some(word => requestLower.includes(word))) {
      complexityScore += 3;
    } else if (scopeIndicators.medium.some(word => requestLower.includes(word))) {
      complexityScore += 2;
    } else if (scopeIndicators.low.some(word => requestLower.includes(word))) {
      complexityScore -= 1;
    }
    
    // 2. Technical Complexity Indicators
    const technicalComplexity = {
      high: ['api', 'database', 'authentication', 'payment', 'security', 'encryption', 'migration', 'deployment'],
      medium: ['validation', 'logic', 'algorithm', 'calculation', 'integration', 'service'],
      low: ['display', 'show', 'hide', 'toggle', 'style']
    };
    
    if (technicalComplexity.high.some(word => requestLower.includes(word))) {
      complexityScore += 2;
    } else if (technicalComplexity.medium.some(word => requestLower.includes(word))) {
      complexityScore += 1;
    }
    
    // 3. Ambiguity Analysis
    const ambiguityIndicators = ['somehow', 'maybe', 'probably', 'might', 'could', 'should', 'somewhere', 'something'];
    const ambiguityCount = ambiguityIndicators.filter(term => requestLower.includes(term)).length;
    complexityScore += ambiguityCount * 2;
    
    // 4. Request Specificity
    const hasSpecificValues = request.includes('"') || request.includes("'");
    const hasSpecificTargets = /\b(button|field|page|component|function|method|class)\b/.test(requestLower);
    const hasExactInstructions = requestLower.includes('change') && requestLower.includes('to');
    
    if (hasSpecificValues && hasSpecificTargets && hasExactInstructions) {
      complexityScore -= 2; // Very specific request
    }
    
    // 5. Multiple Operations
    const multiOperationWords = ['and', 'then', 'also', 'plus', 'with', 'as well', 'additionally'];
    const operationCount = multiOperationWords.filter(word => requestLower.includes(word)).length;
    complexityScore += operationCount;
    
    // 6. Request Length Analysis (but not as primary factor)
    if (requestLower.length < 15) {
      complexityScore += 2; // Very short = likely vague
    } else if (requestLower.length > 200) {
      complexityScore += 1; // Very long = likely complex
    }
    
    // 7. Check for truly trivial patterns (must be very specific)
    const isTrivialPattern = 
      // Text change patterns (with or without quotes)
      (requestLower.match(/update\s+(\w+\s+)?(text|label|title|message|copy|page)\s+.*(to say|to read|to display|to show|to)\s+.*(instead of|from)/i) ||
       requestLower.match(/change\s+(\w+\s+)?(text|label|title|message|copy)\s+.*(to|from)/i) ||
       requestLower.match(/(change|update|modify)\s+.*(text|label|title|copy|message).*(from|to)/i) ||
       // Fix typo patterns
       requestLower.match(/fix\s+(the\s+)?typo/i) ||
       requestLower.match(/correct\s+(the\s+)?spelling/i) ||
       // Simple style changes
       requestLower.match(/change\s+(\w+\s+)?(color|background|font|style)\s+to/i) ||
       // Update specific version/number
       requestLower.match(/update\s+(\w+\s+)?(version|number)\s+to\s+[\d.]+/));
    
    // For trivial patterns, check if it's really about UI text/display (not logic)
    const isUITextChange = (requestLower.includes('text') || requestLower.includes('label') || 
                           requestLower.includes('title') || requestLower.includes('message') ||
                           requestLower.includes('copy') || requestLower.includes('typo')) &&
                          (requestLower.includes('to say') || requestLower.includes('instead of') ||
                           requestLower.includes('change') || requestLower.includes('update'));
    
    // More aggressive trivial detection for clear text changes
    if ((isTrivialPattern || isUITextChange) && complexityScore < 4) {
      // Extra check: make sure it's not involving complex systems
      const hasComplexSystem = technicalComplexity.high.some(word => requestLower.includes(word));
      if (!hasComplexSystem) {
        return 'trivial';
      }
    }
    
    // Final scoring
    if (complexityScore >= 6) return 'high';
    if (complexityScore >= 3) return 'medium';
    if (complexityScore >= 1) return 'low';
    
    // Only return trivial if we're very confident it's a simple change
    return 'low'; // Default to low rather than trivial to be safe
  }

  /**
   * Find relevant sections from the loaded context
   */
  findRelevantContextSections(request) {
    if (!this.context) return [];

    const relevant = [];

    // Check tech stack relevance
    if (this.context.techStack && this.context.techStack.length > 0) {
      this.context.techStack.forEach(tech => {
        if (tech.toLowerCase().split(/\s+/).some(word => 
            request.includes(word.toLowerCase()) && word.length > 3)) {
          relevant.push({ type: 'tech', content: tech });
        }
      });
    }

    // Check business rules relevance
    if (this.context.businessRules && this.context.businessRules.length > 0) {
      this.context.businessRules.forEach(rule => {
        const keywords = ['payment', 'security', 'compliance', 'audit', 'data', 'user'];
        if (keywords.some(keyword => 
            request.includes(keyword) && rule.toLowerCase().includes(keyword))) {
          relevant.push({ type: 'rule', content: rule });
        }
      });
    }

    // Check patterns relevance
    if (this.context.patterns && this.context.patterns.length > 0) {
      this.context.patterns.forEach(pattern => {
        if (this.contextLoader && this.contextLoader.isRelevant(request, pattern.toLowerCase())) {
          relevant.push({ type: 'pattern', content: pattern });
        }
      });
    }

    // Check known issues
    if (this.context.issues && this.context.issues.length > 0) {
      this.context.issues.forEach(issue => {
        if (this.contextLoader && this.contextLoader.isRelevant(request, issue.toLowerCase())) {
          relevant.push({ type: 'issue', content: issue });
        }
      });
    }

    return relevant;
  }

  /**
   * Generate research questions based on request and context
   */
  generateResearchQuestions(userRequest, analysis) {
    const questions = [];

    // Always start with understanding current state
    questions.push({
      category: 'current_state',
      question: `What is the current implementation/state of the ${analysis.affectedSystems.join(', ')} system(s) that will be affected by this change?`,
      why: 'Understanding the existing implementation prevents breaking changes and ensures compatibility'
    });

    // Add intent-specific questions
    switch (analysis.intent) {
      case 'create':
        questions.push({
          category: 'requirements',
          question: 'What are the specific functional and non-functional requirements for this new feature?',
          why: 'Clear requirements prevent scope creep and ensure the implementation meets actual needs'
        });
        questions.push({
          category: 'integration',
          question: 'How will this new feature integrate with existing systems and workflows?',
          why: 'Planning integration points early prevents architectural conflicts'
        });
        break;

      case 'modify':
        questions.push({
          category: 'dependencies',
          question: 'What components, services, or features depend on the current implementation?',
          why: 'Identifying dependencies prevents cascade failures'
        });
        questions.push({
          category: 'migration',
          question: 'Will this change require data migration or backwards compatibility considerations?',
          why: 'Planning for migration ensures smooth transitions without data loss'
        });
        break;

      case 'fix':
        questions.push({
          category: 'root_cause',
          question: 'What is the root cause of the issue, and what are its symptoms vs underlying problems?',
          why: 'Fixing root causes prevents recurring issues'
        });
        questions.push({
          category: 'impact',
          question: 'What is the scope of impact of this bug, and who/what is affected?',
          why: 'Understanding impact helps prioritize and plan the fix appropriately'
        });
        break;

      case 'remove':
        questions.push({
          category: 'dependencies',
          question: 'What systems, features, or data depend on what is being removed?',
          why: 'Ensuring safe removal without breaking dependencies'
        });
        questions.push({
          category: 'alternatives',
          question: 'What alternatives or migrations paths exist for users of the removed functionality?',
          why: 'Providing migration paths ensures continuity for users'
        });
        break;

      case 'optimize':
        questions.push({
          category: 'metrics',
          question: 'What are the current performance metrics and what are the target improvements?',
          why: 'Establishing baselines ensures optimization efforts are measurable'
        });
        questions.push({
          category: 'bottlenecks',
          question: 'What are the identified bottlenecks and their root causes?',
          why: 'Targeting actual bottlenecks ensures effective optimization'
        });
        break;
    }

    // Add context-specific questions
    if (analysis.contextRelevance.length > 0) {
      const rules = analysis.contextRelevance.filter(r => r.type === 'rule');
      if (rules.length > 0) {
        questions.push({
          category: 'compliance',
          question: `How will this change comply with the following business rules: ${rules.map(r => r.content).join('; ')}?`,
          why: 'Ensuring compliance with established business rules and regulations'
        });
      }

      const issues = analysis.contextRelevance.filter(r => r.type === 'issue');
      if (issues.length > 0) {
        questions.push({
          category: 'constraints',
          question: `How will you handle these known constraints: ${issues.map(r => r.content).join('; ')}?`,
          why: 'Accounting for known issues prevents predictable failures'
        });
      }
    }

    // Add risk-specific questions
    if (analysis.riskLevel === 'high') {
      questions.push({
        category: 'rollback',
        question: 'What is the rollback plan if this change causes issues in production?',
        why: 'Having a rollback plan ensures quick recovery from potential failures'
      });
      questions.push({
        category: 'testing',
        question: 'What testing strategy will validate this high-risk change before deployment?',
        why: 'Comprehensive testing reduces the risk of production issues'
      });
    }

    // Add security questions if relevant
    if (analysis.affectedSystems.includes('auth') || analysis.affectedSystems.includes('payment') || 
        analysis.riskLevel === 'high') {
      questions.push({
        category: 'security',
        question: 'What security implications does this change have, and how will they be addressed?',
        why: 'Proactive security consideration prevents vulnerabilities'
      });
    }

    return questions;
  }

  /**
   * Create a structured workflow with phases
   */
  createWorkflow(userRequest, analysis, researchQuestions) {
    const workflow = {
      sufficient: true,
      confidence: 0.85,
      originalRequest: userRequest,
      analysis: analysis,
      changeTypes: analysis.affectedSystems,
      riskLevel: analysis.riskLevel,
      riskFactors: this.identifyRiskFactors(analysis),
      complexity: analysis.complexity,
      prompts: []
    };

    // Build workflow based on required phases
    let phaseNumber = 1;
    
    analysis.suggestedPhases.forEach(phase => {
      switch(phase) {
        case 'research':
          workflow.prompts.push({
            title: "Research & Discovery Phase",
            category: "research",
            phase: phaseNumber++,
            risk: "low",
            content: this.generateResearchPrompt(userRequest, researchQuestions, analysis)
          });
          break;
          
        case 'planning':
          workflow.prompts.push({
            title: analysis.complexity === 'trivial' ? "Quick Planning" : "Planning & Architecture Phase",
            category: "planning",
            phase: phaseNumber++,
            risk: "low",
            content: analysis.complexity === 'trivial' ? 
              this.generateSimplePlanningPrompt(userRequest, analysis) :
              this.generatePlanningPrompt(userRequest, analysis)
          });
          break;
          
        case 'validation':
          workflow.prompts.push({
            title: "Pre-Implementation Validation",
            category: "validation",
            phase: phaseNumber++,
            risk: analysis.riskLevel,
            content: this.generateValidationPrompt(userRequest, analysis)
          });
          break;
          
        case 'implementation':
          if (analysis.complexity === 'trivial' || analysis.complexity === 'low') {
            // Single implementation step for simple changes
            workflow.prompts.push({
              title: "Implementation",
              category: "implementation",
              phase: phaseNumber++,
              risk: analysis.riskLevel,
              content: this.generateSimpleImplementationPrompt(userRequest, analysis)
            });
          } else {
            // Multiple implementation steps for complex changes
            const implementationSteps = this.generateImplementationSteps(userRequest, analysis);
            const implPhase = phaseNumber++;
            implementationSteps.forEach((step, index) => {
              workflow.prompts.push({
                title: implementationSteps.length > 1 ? 
                  `Implementation Step ${index + 1}: ${step.title}` : 
                  `Implementation: ${step.title}`,
                category: "implementation",
                phase: implPhase,
                subPhase: implementationSteps.length > 1 ? index + 1 : undefined,
                risk: step.risk || analysis.riskLevel,
                content: step.content
              });
            });
          }
          break;
          
        case 'testing':
          workflow.prompts.push({
            title: "Testing Phase",
            category: "testing",
            phase: phaseNumber++,
            risk: "medium",
            content: this.generateTestingPrompt(userRequest, analysis)
          });
          break;
          
        case 'verification':
          workflow.prompts.push({
            title: "Verification & Quality Check",
            category: "verification",
            phase: phaseNumber++,
            risk: analysis.riskLevel,
            content: this.generateVerificationPrompt(userRequest, analysis)
          });
          break;
          
        case 'deployment':
          workflow.prompts.push({
            title: "Deployment & Monitoring Phase",
            category: "deployment",
            phase: phaseNumber++,
            risk: "high",
            content: this.generateDeploymentPrompt(userRequest, analysis)
          });
          break;
      }
    });

    return workflow;
  }

  /**
   * Generate simple planning prompt for trivial changes
   */
  generateSimplePlanningPrompt(userRequest, analysis) {
    let prompt = `📋 QUICK PLANNING

TASK: "${userRequest}"
COMPLEXITY: ${analysis.complexity.toUpperCase()}
RISK: ${analysis.riskLevel.toUpperCase()}

📝 QUICK CHECKLIST:
1. Identify the specific change needed
2. Locate the file(s) to modify
3. Understand the current implementation
4. Plan the exact modification
5. Consider any side effects`;

    if (this.context && analysis.contextRelevance.length > 0) {
      prompt += `

📌 RELEVANT CONTEXT:`;
      analysis.contextRelevance.slice(0, 2).forEach(item => {
        prompt += `\n- ${item.content}`;
      });
    }

    prompt += `

✅ PROCEED WHEN:
- You know exactly what to change
- You understand the current code
- You've considered impacts

This is a simple change - keep it focused and clean.`;

    return prompt;
  }

  /**
   * Generate simple implementation prompt
   */
  generateSimpleImplementationPrompt(userRequest, analysis) {
    let prompt = `✏️ IMPLEMENTATION

TASK: "${userRequest}"
RISK: ${analysis.riskLevel.toUpperCase()}

📋 IMPLEMENTATION STEPS:
1. Make the requested change
2. Ensure formatting is consistent
3. Test the change works
4. Check for any side effects`;

    if (analysis.complexity === 'trivial') {
      prompt += `

This is a trivial change. Focus on:
- Making the exact change requested
- Maintaining code style
- Not breaking anything else`;
    } else {
      prompt += `

⚠️ REMEMBER:
- Follow existing patterns
- Test your change
- Document if needed
- Keep changes minimal`;
    }

    return prompt;
  }

  /**
   * Generate verification prompt
   */
  generateVerificationPrompt(userRequest, analysis) {
    let prompt = `✅ VERIFICATION & QUALITY CHECK

ORIGINAL REQUEST: "${userRequest}"
RISK LEVEL: ${analysis.riskLevel.toUpperCase()}

📋 VERIFICATION CHECKLIST:`;

    if (analysis.riskLevel === 'high') {
      prompt += `
1. CRITICAL CHECKS
   ⬜ No existing functionality broken
   ⬜ Security implications reviewed
   ⬜ Performance impact acceptable
   ⬜ Rollback plan available
   ⬜ All error cases handled

2. BUSINESS VALIDATION
   ⬜ Requirements fully met
   ⬜ Business rules enforced
   ⬜ Data integrity maintained
   ⬜ Compliance requirements met`;
    } else if (analysis.riskLevel === 'medium') {
      prompt += `
1. FUNCTIONAL CHECKS
   ⬜ Change works as expected
   ⬜ No regressions introduced
   ⬜ Edge cases handled
   ⬜ Error handling in place

2. QUALITY CHECKS
   ⬜ Code follows standards
   ⬜ Tests updated/added
   ⬜ Documentation current`;
    } else {
      prompt += `
1. BASIC CHECKS
   ⬜ Change implemented correctly
   ⬜ No obvious issues
   ⬜ Code style consistent`;
    }

    prompt += `

3. FINAL REVIEW
   ⬜ Original request satisfied
   ⬜ No unintended changes
   ⬜ Ready for use

✅ SIGN-OFF CRITERIA:
- All checks passed
- System stable
- Change tested`;

    if (analysis.riskLevel === 'high') {
      prompt += `
- Stakeholders notified
- Monitoring active
- Rollback ready`;
    }

    return prompt;
  }

  /**
   * Generate research phase prompt
   */
  generateResearchPrompt(userRequest, researchQuestions, analysis) {
    let prompt = `🔍 RESEARCH & DISCOVERY PHASE

ORIGINAL REQUEST: "${userRequest}"

Before taking any action, conduct thorough research to understand the full scope and implications of this change.

📋 RESEARCH CHECKLIST:
`;

    researchQuestions.forEach((q, index) => {
      prompt += `
${index + 1}. ${q.question}
   📌 Why: ${q.why}
   ⬜ Status: [Not Started]
   📝 Findings: [Document your findings here]
`;
    });

    if (this.context && this.context.overview) {
      prompt += `
\n🏗️ APPLICATION CONTEXT:
${this.context.overview}
`;
    }

    if (analysis.contextRelevance.length > 0) {
      prompt += `
\n⚠️ RELEVANT CONTEXT ITEMS:`;
      analysis.contextRelevance.forEach(item => {
        prompt += `\n- [${item.type.toUpperCase()}] ${item.content}`;
      });
    }

    prompt += `

📊 DELIVERABLES FROM THIS PHASE:
1. Complete understanding of current system state
2. List of all dependencies and integration points
3. Identified risks and mitigation strategies
4. Clear requirements and success criteria
5. Recommended implementation approach

⏱️ ESTIMATED TIME: 15-30 minutes of research

✅ COMPLETION CRITERIA:
- All research questions answered with specific findings
- No critical unknowns remaining
- Clear path forward identified

🚫 DO NOT PROCEED TO IMPLEMENTATION until this research is complete and documented.`;

    return prompt;
  }

  /**
   * Generate planning phase prompt
   */
  generatePlanningPrompt(userRequest, analysis) {
    let prompt = `📐 PLANNING & ARCHITECTURE PHASE

ORIGINAL REQUEST: "${userRequest}"
RISK LEVEL: ${analysis.riskLevel.toUpperCase()}
AFFECTED SYSTEMS: ${analysis.affectedSystems.join(', ')}

Based on your research findings, create a detailed implementation plan.

📋 PLANNING CHECKLIST:

1. ARCHITECTURE DECISIONS
   ⬜ Design approach chosen
   ⬜ Technology selections justified
   ⬜ Integration patterns defined
   ⬜ Data flow documented

2. IMPLEMENTATION SEQUENCE
   ⬜ Break down into atomic, reversible steps
   ⬜ Identify dependencies between steps
   ⬜ Define rollback points
   ⬜ Estimate time for each step

3. RISK MITIGATION
   ⬜ Identify potential failure points
   ⬜ Create contingency plans
   ⬜ Define success metrics
   ⬜ Plan monitoring approach
`;

    if (this.context && this.context.guidelines.length > 0) {
      prompt += `
\n📏 DEVELOPMENT GUIDELINES TO FOLLOW:`;
      this.context.guidelines.slice(0, 5).forEach(guideline => {
        prompt += `\n- ${guideline}`;
      });
    }

    if (this.context && this.context.patterns.length > 0) {
      prompt += `
\n🎯 RECOMMENDED PATTERNS:`;
      this.context.patterns.slice(0, 3).forEach(pattern => {
        prompt += `\n- ${pattern}`;
      });
    }

    prompt += `

📊 DELIVERABLES FROM THIS PHASE:
1. Technical design document
2. Step-by-step implementation plan
3. Test plan and success criteria
4. Rollback procedures
5. Time and resource estimates

⚠️ CONSIDERATIONS:
- Ensure all changes are reversible
- Plan for graceful degradation
- Consider performance implications
- Account for edge cases

✅ COMPLETION CRITERIA:
- Plan reviewed and validated
- All stakeholder concerns addressed
- Clear implementation path with no ambiguity
- Rollback strategy documented`;

    return prompt;
  }

  /**
   * Generate validation phase prompt
   */
  generateValidationPrompt(userRequest, analysis) {
    let prompt = `🛡️ PRE-IMPLEMENTATION VALIDATION

ORIGINAL REQUEST: "${userRequest}"
RISK LEVEL: ${analysis.riskLevel.toUpperCase()}

Before making any changes, validate the current system state and ensure safety.

🔍 VALIDATION CHECKLIST:

1. SYSTEM STATE VERIFICATION
   ⬜ Current functionality working correctly
   ⬜ No existing errors or warnings
   ⬜ Performance metrics baseline captured
   ⬜ Recent backups verified

2. DEPENDENCY CHECK
   ⬜ All dependencies identified and documented
   ⬜ Version compatibility confirmed
   ⬜ API contracts understood
   ⬜ Integration points mapped
`;

    if (analysis.riskLevel === 'high') {
      prompt += `
\n3. HIGH-RISK VALIDATIONS
   ⬜ Production data backed up
   ⬜ Rollback procedure tested in staging
   ⬜ Stakeholders notified
   ⬜ Monitoring alerts configured
   ⬜ Incident response team on standby`;
    }

    if (this.context && this.context.security.length > 0) {
      prompt += `
\n🔒 SECURITY VALIDATIONS:`;
      this.context.security.slice(0, 3).forEach(sec => {
        prompt += `\n   ⬜ ${sec}`;
      });
    }

    prompt += `

⚠️ CRITICAL CHECKS:
- Confirm you have rollback capability
- Verify testing environment matches production
- Ensure logging is enabled for debugging
- Validate backup restoration procedure

🚫 STOP CONDITIONS:
- If any validation fails, do not proceed
- If unexpected system state discovered, investigate first
- If dependencies are unclear, research further

✅ PROCEED ONLY WHEN:
- All validations pass
- System is in known good state
- Rollback plan is tested and ready
- You have confidence in the implementation plan`;

    return prompt;
  }

  /**
   * Generate implementation steps
   */
  generateImplementationSteps(userRequest, analysis) {
    const steps = [];

    // Determine steps based on intent and complexity
    switch (analysis.intent) {
      case 'create':
        steps.push({
          title: 'Setup and Scaffolding',
          risk: 'low',
          content: this.generateSetupStep(userRequest, analysis)
        });
        steps.push({
          title: 'Core Implementation',
          risk: 'medium',
          content: this.generateCoreImplementationStep(userRequest, analysis)
        });
        steps.push({
          title: 'Integration and Connection',
          risk: 'medium',
          content: this.generateIntegrationStep(userRequest, analysis)
        });
        break;

      case 'modify':
        steps.push({
          title: 'Prepare Changes',
          risk: 'low',
          content: this.generatePreparationStep(userRequest, analysis)
        });
        steps.push({
          title: 'Apply Modifications',
          risk: analysis.riskLevel,
          content: this.generateModificationStep(userRequest, analysis)
        });
        break;

      case 'fix':
        steps.push({
          title: 'Isolate and Reproduce',
          risk: 'low',
          content: this.generateIsolationStep(userRequest, analysis)
        });
        steps.push({
          title: 'Apply Fix',
          risk: 'medium',
          content: this.generateFixStep(userRequest, analysis)
        });
        break;

      default:
        steps.push({
          title: 'Implementation',
          risk: analysis.riskLevel,
          content: this.generateGenericImplementationStep(userRequest, analysis)
        });
    }

    return steps;
  }

  /**
   * Generate setup/scaffolding step
   */
  generateSetupStep(userRequest, analysis) {
    let prompt = `🔧 SETUP AND SCAFFOLDING

TASK: Prepare the foundation for "${userRequest}"

📋 SETUP CHECKLIST:

1. FILE STRUCTURE
   ⬜ Create necessary directories
   ⬜ Set up file structure following project conventions
   ⬜ Initialize configuration files
   ⬜ Set up environment variables`;

    if (analysis.affectedSystems.includes('frontend')) {
      prompt += `

2. FRONTEND SETUP
   ⬜ Create component structure
   ⬜ Set up routing if needed
   ⬜ Initialize state management
   ⬜ Prepare styling files`;
    }

    if (analysis.affectedSystems.includes('backend')) {
      prompt += `

2. BACKEND SETUP
   ⬜ Create service structure
   ⬜ Set up route handlers
   ⬜ Initialize middleware
   ⬜ Prepare data models`;
    }

    if (analysis.affectedSystems.includes('database')) {
      prompt += `

2. DATABASE SETUP
   ⬜ Create migration files
   ⬜ Define schema changes
   ⬜ Set up seed data if needed
   ⬜ Prepare rollback migrations`;
    }

    prompt += `

🎯 IMPLEMENTATION GUIDELINES:
- Follow existing project patterns
- Use consistent naming conventions
- Add appropriate comments
- Include error handling from the start

✅ COMPLETION CRITERIA:
- All scaffolding in place
- No breaking changes to existing code
- Structure follows project conventions
- Ready for core implementation`;

    return prompt;
  }

  /**
   * Generate core implementation step
   */
  generateCoreImplementationStep(userRequest, analysis) {
    let prompt = `💻 CORE IMPLEMENTATION

TASK: Implement the main functionality for "${userRequest}"

📋 IMPLEMENTATION CHECKLIST:`;

    if (this.context && this.context.techStack.length > 0) {
      prompt += `

TECHNOLOGY STACK TO USE:
${this.context.techStack.slice(0, 5).map(tech => `- ${tech}`).join('\n')}`;
    }

    prompt += `

1. CORE LOGIC
   ⬜ Implement main business logic
   ⬜ Add input validation
   ⬜ Include error handling
   ⬜ Add logging for debugging

2. DATA HANDLING
   ⬜ Implement data models/schemas
   ⬜ Add data validation
   ⬜ Include data transformation logic
   ⬜ Handle edge cases

3. INTEGRATION POINTS
   ⬜ Connect to existing services
   ⬜ Implement API contracts
   ⬜ Add authentication/authorization
   ⬜ Handle communication errors`;

    if (this.context && this.context.businessRules.length > 0) {
      prompt += `

📏 BUSINESS RULES TO ENFORCE:`;
      this.context.businessRules.slice(0, 3).forEach(rule => {
        prompt += `\n   ⬜ ${rule}`;
      });
    }

    prompt += `

⚠️ CRITICAL REQUIREMENTS:
- Maintain backward compatibility
- Include comprehensive error handling
- Follow security best practices
- Add appropriate logging
- Write self-documenting code

🧪 TESTING AS YOU GO:
- Test each component in isolation
- Verify integration points
- Check error scenarios
- Validate business rules

✅ COMPLETION CRITERIA:
- Core functionality working
- All business rules implemented
- Error handling in place
- Code follows project standards`;

    return prompt;
  }

  /**
   * Generate testing phase prompt
   */
  generateTestingPrompt(userRequest, analysis) {
    let prompt = `🧪 TESTING & VERIFICATION PHASE

ORIGINAL REQUEST: "${userRequest}"
RISK LEVEL: ${analysis.riskLevel.toUpperCase()}

Thoroughly test the implementation to ensure quality and reliability.

📋 TESTING CHECKLIST:

1. UNIT TESTING
   ⬜ All new functions have unit tests
   ⬜ Edge cases covered
   ⬜ Error scenarios tested
   ⬜ Mock external dependencies

2. INTEGRATION TESTING
   ⬜ API endpoints tested
   ⬜ Database operations verified
   ⬜ Service interactions validated
   ⬜ Authentication/authorization tested

3. FUNCTIONAL TESTING
   ⬜ User workflows validated
   ⬜ Business rules enforced correctly
   ⬜ Data integrity maintained
   ⬜ Performance acceptable`;

    if (analysis.riskLevel === 'high') {
      prompt += `

4. HIGH-RISK TESTING
   ⬜ Load testing performed
   ⬜ Security testing completed
   ⬜ Rollback procedure tested
   ⬜ Monitoring verified
   ⬜ Failure scenarios validated`;
    }

    if (this.context && this.context.performance.length > 0) {
      prompt += `

⚡ PERFORMANCE REQUIREMENTS:`;
      this.context.performance.slice(0, 3).forEach(perf => {
        prompt += `\n   ⬜ ${perf}`;
      });
    }

    prompt += `

🔍 REGRESSION TESTING:
- Verify existing functionality still works
- Check for unintended side effects
- Validate dependent systems
- Ensure no performance degradation

📊 TEST COVERAGE TARGETS:
- Unit test coverage: ≥ 80%
- Integration test coverage: ≥ 70%
- Critical paths: 100% coverage

✅ COMPLETION CRITERIA:
- All tests passing
- No regression issues
- Performance targets met
- Security requirements validated
- Documentation updated

🚀 READY FOR DEPLOYMENT WHEN:
- All tests green
- Code review completed
- Stakeholders approved
- Rollback plan tested`;

    return prompt;
  }

  /**
   * Generate deployment phase prompt
   */
  generateDeploymentPrompt(userRequest, analysis) {
    let prompt = `🚀 DEPLOYMENT & MONITORING PHASE

ORIGINAL REQUEST: "${userRequest}"
RISK LEVEL: ${analysis.riskLevel.toUpperCase()}

Deploy the changes safely with proper monitoring and rollback capability.

📋 DEPLOYMENT CHECKLIST:

1. PRE-DEPLOYMENT
   ⬜ All tests passing in staging
   ⬜ Deployment window scheduled
   ⬜ Stakeholders notified
   ⬜ Rollback plan ready
   ⬜ Monitoring dashboards prepared

2. DEPLOYMENT STEPS
   ⬜ Create deployment artifacts
   ⬜ Deploy to canary/beta first
   ⬜ Monitor initial deployment
   ⬜ Gradual rollout to production
   ⬜ Full production deployment`;

    if (this.context && this.context.deployment) {
      prompt += `

📦 DEPLOYMENT PROCESS:
${this.context.deployment}`;
    }

    if (this.context && this.context.monitoring) {
      prompt += `

📊 MONITORING SETUP:`;
      Object.entries(this.context.monitoring).slice(0, 5).forEach(([key, value]) => {
        prompt += `\n   ⬜ ${key}: ${value}`;
      });
    }

    prompt += `

3. POST-DEPLOYMENT
   ⬜ Verify functionality in production
   ⬜ Monitor error rates
   ⬜ Check performance metrics
   ⬜ Validate business metrics
   ⬜ Document deployment

⚠️ MONITORING ALERTS:
- Error rate > 1% - investigate immediately
- Response time > 2x baseline - check performance
- Failed transactions - verify payment system
- Memory/CPU spike - check for leaks

🔄 ROLLBACK TRIGGERS:
- Error rate > 5%
- Critical functionality broken
- Performance degradation > 50%
- Security vulnerability detected

✅ DEPLOYMENT SUCCESS CRITERIA:
- All health checks passing
- Error rate < 0.1%
- Performance within targets
- No customer complaints
- Business metrics normal

📝 POST-DEPLOYMENT TASKS:
- Update documentation
- Notify stakeholders of success
- Schedule post-mortem if issues
- Plan follow-up improvements`;

    return prompt;
  }

  /**
   * Helper methods for generating specific step types
   */
  generateIntegrationStep(userRequest, analysis) {
    return `🔗 INTEGRATION AND CONNECTION

Connect the new implementation with existing systems.

📋 INTEGRATION TASKS:
- Connect to existing APIs/services
- Set up data flow between components
- Configure authentication/authorization
- Establish monitoring and logging
- Test integration points thoroughly

Ensure all connections are secure and properly error-handled.`;
  }

  generatePreparationStep(userRequest, analysis) {
    return `📝 PREPARE MODIFICATIONS

Set up everything needed before making changes.

📋 PREPARATION TASKS:
- Create backup of current state
- Document current behavior
- Set up feature flags if needed
- Prepare migration scripts
- Notify affected users/systems

Ensure you can rollback if needed.`;
  }

  generateModificationStep(userRequest, analysis) {
    return `✏️ APPLY MODIFICATIONS

Carefully apply the planned changes.

📋 MODIFICATION TASKS:
- Make changes incrementally
- Test after each change
- Maintain backward compatibility
- Update documentation as you go
- Monitor for immediate issues

Apply changes in small, reversible steps.`;
  }

  generateIsolationStep(userRequest, analysis) {
    return `🔍 ISOLATE AND REPRODUCE

Understand the issue completely before fixing.

📋 ISOLATION TASKS:
- Reproduce the issue consistently
- Identify root cause
- Document reproduction steps
- Check for related issues
- Understand the impact scope

Don't proceed until you fully understand the problem.`;
  }

  generateFixStep(userRequest, analysis) {
    return `🔧 APPLY FIX

Implement the solution to resolve the issue.

📋 FIX TASKS:
- Apply minimal fix for the root cause
- Add tests to prevent regression
- Verify fix doesn't break other features
- Document the solution
- Consider preventive measures

Ensure the fix is complete and doesn't introduce new issues.`;
  }

  generateGenericImplementationStep(userRequest, analysis) {
    return `⚙️ IMPLEMENTATION

Execute the planned changes carefully.

📋 IMPLEMENTATION TASKS:
- Follow the implementation plan
- Make incremental changes
- Test continuously
- Document as you go
- Monitor for issues

Proceed methodically and safely.`;
  }

  /**
   * Identify risk factors
   */
  identifyRiskFactors(analysis) {
    const factors = [];

    if (analysis.riskLevel === 'high') {
      factors.push('High-risk operation requiring extra caution');
    }

    if (analysis.affectedSystems.includes('database')) {
      factors.push('Database changes require careful migration planning');
    }

    if (analysis.affectedSystems.includes('auth')) {
      factors.push('Authentication changes have security implications');
    }

    if (analysis.affectedSystems.includes('payment')) {
      factors.push('Payment system changes require PCI compliance');
    }

    if (analysis.scope === 'system-wide') {
      factors.push('System-wide changes have broad impact');
    }

    if (analysis.complexity === 'high') {
      factors.push('High complexity requires careful planning and testing');
    }

    return factors;
  }

  /**
   * Enhance workflow with AI if API key is available
   */
  async enhanceWithAI(workflow, apiKey) {
    // This would call Claude API to further refine the prompts
    // For now, return the workflow as-is
    return workflow;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PromptOrchestrator;
}

// Make available to browser environment
if (typeof window !== 'undefined') {
  window.PromptOrchestrator = PromptOrchestrator;
}