/**
 * Enhanced AI Analysis Engine
 * Integrates context-aware prompt orchestration with Claude API
 */

class EnhancedAIAnalysisEngine {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'claude-3-5-sonnet-latest';
    this.apiUrl = 'https://api.anthropic.com/v1/messages';
    this.orchestrator = null;
    this.contextLoader = null;
    this.context = null;
  }

  async initialize() {
    // Initialize orchestrator and context loader
    if (typeof PromptOrchestrator !== 'undefined') {
      this.orchestrator = new PromptOrchestrator();
      await this.orchestrator.initialize();
    }
    
    if (typeof ContextLoader !== 'undefined') {
      this.contextLoader = new ContextLoader();
      this.context = await this.contextLoader.loadStoredContext();
    }
  }

  /**
   * Main analysis method - uses orchestrator for structure, then enhances with AI
   */
  async analyzeRequest(userRequest) {
    // First, use orchestrator to create structured workflow
    let workflow;
    if (this.orchestrator) {
      workflow = await this.orchestrator.orchestrateRequest(userRequest, null);
    } else {
      // Fallback to basic workflow if orchestrator not available
      workflow = this.createBasicWorkflow(userRequest);
    }

    // If we have an API key, enhance the workflow with AI
    if (this.apiKey) {
      try {
        workflow = await this.enhanceWorkflowWithAI(workflow, userRequest);
      } catch (error) {
        console.error('AI enhancement failed, using orchestrated workflow:', error);
      }
    }

    // Add safety wrappers to all prompts
    workflow.prompts = this.addSafetyWrappers(workflow.prompts, workflow.riskLevel);

    return workflow;
  }

  /**
   * Enhance workflow with Claude AI
   */
  async enhanceWorkflowWithAI(workflow, userRequest) {
    const systemPrompt = this.buildEnhancedSystemPrompt();
    const userPrompt = this.buildEnhancedUserPrompt(userRequest, workflow);
    
    try {
      const response = await this.callClaudeAPI(systemPrompt, userPrompt);
      const enhanced = this.parseEnhancedResponse(response);
      
      // Debug logging to understand what AI is returning
      console.log('🔍 AI Analysis for request:', userRequest);
      console.log('📊 AI determined complexity:', enhanced.analysis?.complexity);
      console.log('📋 AI generated prompts count:', enhanced.prompts?.length);
      console.log('🎯 Original orchestrator complexity:', workflow.analysis?.complexity);
      console.log('📝 Original orchestrator phase count:', workflow.prompts?.length);
      
      // Merge AI enhancements with orchestrated workflow
      return this.mergeEnhancements(workflow, enhanced);
    } catch (error) {
      console.error('Failed to enhance with AI:', error);
      return workflow; // Return original workflow if enhancement fails
    }
  }

  /**
   * Build enhanced system prompt that understands multi-phase workflows
   */
  buildEnhancedSystemPrompt() {
    return `You are PromptDoctor, a JSON-only response system that analyzes development requests and generates structured workflows.

CRITICAL INSTRUCTION: You MUST respond ONLY with valid JSON. No explanations, no text before or after the JSON. You are a JSON generator that speaks exclusively in JSON format.

Your task is to:
1. Analyze the request to determine its TRUE complexity and risk level
2. Create an appropriately-sized workflow (don't over-engineer simple requests)
3. Generate specific, actionable prompts for each phase of work
4. Return ONLY a valid JSON object following the exact schema provided

COMPLEXITY ASSESSMENT RULES:
- TRIVIAL: Simple text/label/copy changes, typo fixes, basic UI text updates
  Examples: 
    * "change button text from 'Login' to 'Sign In'"
    * "update the login page text to say Welcome You! instead of Welcome"
    * "fix typo in header"
    * "change color to blue"
  IMPORTANT: If it's just changing display text/labels (not logic), it's TRIVIAL
  
- LOW: Single component changes, clear requirements, no system interactions
  Examples:
    * "add a loading spinner to the form"
    * "hide the footer on mobile"
    * "add a new static page"
  
- MEDIUM: Multiple components, some integration, moderate uncertainty
  Examples:
    * "add user profile page with edit functionality"
    * "integrate with external API for weather data"
    * "add form validation logic"
  
- HIGH: System-wide changes, external integrations, payment/auth/database operations
  Examples:
    * "implement OAuth login with Google"
    * "add payment processing"
    * "migrate database schema"
    * "refactor authentication system"

CRITICAL: Assess based on the COMPLETE request context:
- "add tooltip" → Could be TRIVIAL if static text
- "add tooltip showing user payment history" → HIGH (payment system integration)
- "update all error messages" → MEDIUM/HIGH (scope is "all")
- Always consider technical implications, not just keywords

HANDLING VAGUE OR INSUFFICIENT REQUESTS:
When a request is too vague to properly assess (clarity="vague" or insufficient detail):
1. Set "sufficient": false
2. Set "clarity": "vague" in the analysis
3. Generate 3-5 specific clarifying questions in "clarifyingQuestions" array
4. Questions should be specific and actionable, not generic
5. Focus on the critical missing information needed to proceed safely

Example clarifying questions for vague requests:
- "Fix login" → ["What specific issue are you experiencing with login?", "Is this affecting all users or specific cases?", "Which login method (email/OAuth/SSO)?"]
- "Make it faster" → ["Which specific page/feature is slow?", "What is the current load time?", "What is your target performance goal?"]
- "Add feature" → ["What specific functionality do you need?", "Who will use this feature?", "What problem does it solve?"]

WORKFLOW STRUCTURE:
Adapt the workflow phases based on the complexity and risk of the request:

COMPLEXITY & RISK ASSESSMENT:
First, assess the request to determine:
- Complexity: trivial, low, medium, or high
- Risk: low, medium, or high
- Clarity: Is the request specific or vague?
- Scope: Single change or system-wide impact?

PHASE SELECTION:
Based on your assessment, choose appropriate phases:

TRIVIAL (e.g., "change button text to 'Submit'"):
- Planning (simplified)
- Implementation (single step)

LOW COMPLEXITY/RISK (e.g., "add loading spinner"):
- Planning
- Implementation
- Optional: Quick verification

MEDIUM COMPLEXITY/RISK (e.g., "add user profile page"):
- Research (if requirements unclear)
- Planning
- Validation (if medium risk)
- Implementation (1-3 steps)
- Verification

HIGH COMPLEXITY/RISK (e.g., "implement payment processing"):
- Research & Discovery (comprehensive)
- Planning & Architecture
- Validation
- Implementation (multiple steps)
- Testing
- Verification
- Deployment (if production/critical)

IMPORTANT PRINCIPLES:
1. ALWAYS include Planning phase, but adjust depth based on complexity
2. Research phase only when requirements are unclear or complexity is high
3. Verification only for medium/high risk changes
4. Don't over-engineer simple requests - match the response to the need
5. Be specific about WHY you chose certain phases in your assessment

RESPONSE FORMAT:
Return a JSON structure with your assessment and enhanced prompts:

{
  "analysis": {
    "complexity": "trivial|low|medium|high",
    "riskLevel": "low|medium|high", 
    "intent": "create|modify|fix|remove|optimize|integrate|migrate|analyze",
    "scope": "component-level|feature-level|system-wide",
    "clarity": "specific|moderate|vague",
    "reasoning": "Brief explanation of why you assessed this complexity/risk level"
  },
  "sufficient": boolean,
  "confidence": 0.0-1.0,
  "changeTypes": ["frontend", "backend", "database", "auth", "payment", etc],
  "riskFactors": ["specific risks identified"],
  "clarifyingQuestions": ["Only if sufficient=false or clarity=vague"],
  "prompts": [
    {
      "title": "Clear, descriptive title",
      "category": "research|planning|validation|implementation|testing|verification|deployment",
      "phase": 1-7,
      "risk": "low|medium|high",
      "content": "Detailed, actionable prompt content",
      "context_relevance": ["Specific context items that apply"],
      "success_criteria": ["Clear completion criteria"]
    }
  ]
}

IMPORTANT PRINCIPLES:
1. Always start with research - never jump straight to implementation
2. Be specific to the user's technology stack and constraints
3. Include safety checks and rollback plans for risky operations
4. Break complex tasks into smaller, manageable steps
5. Provide clear success criteria for each phase
6. Consider the human/agent executing these prompts may not have full context

JSON OUTPUT ENFORCEMENT:
- You MUST respond with ONLY valid JSON
- Start your response with { and end with }
- No text, markdown, or explanations outside the JSON
- No code blocks or backticks
- Your entire response must be parseable by JSON.parse()
- Include the "analysis" object with complexity assessment
- If you cannot process the request, return: {"error": "reason", "sufficient": false}

EXAMPLE RESPONSE FORMAT:
{
  "analysis": {
    "complexity": "low",
    "riskLevel": "low",
    "intent": "modify",
    "scope": "component-level",
    "clarity": "specific",
    "reasoning": "Simple text change with specific values provided"
  },
  "sufficient": true,
  "confidence": 0.95,
  "changeTypes": ["frontend"],
  "riskFactors": [],
  "prompts": [...]
}

REMEMBER: You are a JSON API. Return ONLY valid JSON.`;
  }

  /**
   * Build enhanced user prompt with context
   */
  buildEnhancedUserPrompt(userRequest, workflow) {
    let prompt = `Enhance this development workflow with specific, actionable guidance:

ORIGINAL REQUEST: "${userRequest}"

INITIAL ANALYSIS:
- Intent: ${workflow.analysis?.intent || 'unknown'}
- Scope: ${workflow.analysis?.scope || 'unclear'}
- Risk Level: ${workflow.riskLevel}
- Affected Systems: ${workflow.changeTypes.join(', ')}
- Complexity: ${workflow.analysis?.complexity || 'medium'}

IDENTIFIED RISK FACTORS:
${workflow.riskFactors.map(factor => `- ${factor}`).join('\n')}
`;

    // Add context if available
    if (this.context && this.context.overview) {
      prompt += `

APPLICATION CONTEXT:
${this.context.overview}

TECHNOLOGY STACK:
${this.context.techStack.join(', ')}

KEY BUSINESS RULES:
${this.context.businessRules.slice(0, 5).map(rule => `- ${rule}`).join('\n')}

KNOWN CONSTRAINTS:
${this.context.issues.slice(0, 3).map(issue => `- ${issue}`).join('\n')}
`;
    }

    // Add current workflow structure
    prompt += `

CURRENT WORKFLOW PHASES:
${workflow.prompts.map(p => `${p.phase || 0}. ${p.title} (${p.category})`).join('\n')}

Please enhance each phase with:
1. More specific research questions based on the technology stack
2. Detailed implementation steps that account for the constraints
3. Context-aware safety checks and validations
4. Clear, measurable success criteria
5. Specific commands, code patterns, or configurations where applicable

Return ONLY a JSON object with the enhanced workflow structure. Each prompt should be highly specific to this request and context, not generic.

Focus on making the prompts so detailed that someone unfamiliar with the project could successfully complete the task by following them.`;

    return prompt;
  }

  /**
   * Call Claude API with enhanced prompts
   */
  async callClaudeAPI(systemPrompt, userPrompt) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4000, // Increased for detailed multi-phase responses
        temperature: 0.3, // Low temperature for consistent structured output
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * Parse enhanced response from Claude
   */
  parseEnhancedResponse(responseText) {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate structure
      if (!parsed.prompts || !Array.isArray(parsed.prompts)) {
        throw new Error('Invalid response structure');
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to parse enhanced response:', error);
      return { prompts: [] };
    }
  }

  /**
   * Merge AI enhancements with orchestrated workflow
   */
  mergeEnhancements(workflow, enhanced) {
    // If AI provided analysis, use it to override the initial assessment
    if (enhanced.analysis) {
      // Special case: If orchestrator detected trivial text change, be conservative
      // about letting AI override to higher complexity
      const orchestratorSaysTrivial = workflow.analysis?.complexity === 'trivial';
      const aiSaysHigherComplexity = enhanced.analysis.complexity && 
        enhanced.analysis.complexity !== 'trivial';
      const isLikelyTextChange = workflow.originalRequest && 
        (workflow.originalRequest.toLowerCase().includes('text') ||
         workflow.originalRequest.toLowerCase().includes('label') ||
         workflow.originalRequest.toLowerCase().includes('to say') ||
         workflow.originalRequest.toLowerCase().includes('instead of'));
      
      if (orchestratorSaysTrivial && aiSaysHigherComplexity && isLikelyTextChange) {
        console.log('⚠️ AI wants to override trivial->higher complexity for likely text change. Keeping trivial.');
        // Keep the orchestrator's trivial assessment
        enhanced.analysis.complexity = 'trivial';
        enhanced.analysis.riskLevel = 'low';
      }
      
      workflow.analysis = {
        ...workflow.analysis,
        ...enhanced.analysis
      };
      
      // Update workflow metadata based on AI analysis
      workflow.complexity = enhanced.analysis.complexity || workflow.complexity;
      workflow.riskLevel = enhanced.analysis.riskLevel || workflow.riskLevel;
      
      // If AI determined different complexity, regenerate phases
      if (enhanced.analysis.complexity !== workflow.analysis.complexity) {
        // The AI has better context, trust its judgment (unless we overrode above)
        workflow.analysis.suggestedPhases = this.orchestrator ? 
          this.orchestrator.determineRequiredPhases(enhanced.analysis) : 
          workflow.analysis.suggestedPhases;
      }
    }
    
    // Update confidence and risk factors from AI
    if (enhanced.confidence !== undefined) {
      workflow.confidence = enhanced.confidence;
    }
    if (enhanced.riskFactors) {
      workflow.riskFactors = enhanced.riskFactors;
    }
    if (enhanced.changeTypes) {
      workflow.changeTypes = enhanced.changeTypes;
    }
    
    // Handle clarifying questions for vague requests
    if (enhanced.clarifyingQuestions && enhanced.clarifyingQuestions.length > 0) {
      workflow.clarifyingQuestions = enhanced.clarifyingQuestions;
      workflow.sufficient = false;
      console.log('📝 Request needs clarification. Questions generated:', enhanced.clarifyingQuestions.length);
    }
    
    // If request is insufficient, update the workflow
    if (enhanced.sufficient === false) {
      workflow.sufficient = false;
      workflow.needsClarification = true;
      
      // Create a clarification prompt as the first phase
      if (workflow.clarifyingQuestions && workflow.clarifyingQuestions.length > 0) {
        const clarificationPrompt = {
          title: "Clarification Needed",
          category: "clarification",
          phase: 0,
          risk: "low",
          content: this.generateClarificationPrompt(workflow.originalRequest, workflow.clarifyingQuestions),
          enhanced: true
        };
        
        // Insert clarification prompt at the beginning
        workflow.prompts = [clarificationPrompt, ...(workflow.prompts || [])];
      }
    }
    
    if (!enhanced.prompts || enhanced.prompts.length === 0) {
      return workflow;
    }

    // Create a map of enhanced prompts by phase/category
    const enhancedMap = new Map();
    enhanced.prompts.forEach(prompt => {
      const key = `${prompt.phase || 0}-${prompt.category}`;
      enhancedMap.set(key, prompt);
    });

    // Enhance existing prompts with AI improvements
    workflow.prompts = workflow.prompts.map(originalPrompt => {
      const key = `${originalPrompt.phase || 0}-${originalPrompt.category}`;
      const enhancement = enhancedMap.get(key);
      
      if (enhancement) {
        // Merge enhanced content while preserving structure
        return {
          ...originalPrompt,
          content: enhancement.content || originalPrompt.content,
          context_relevance: enhancement.context_relevance || [],
          success_criteria: enhancement.success_criteria || [],
          enhanced: true
        };
      }
      
      return originalPrompt;
    });

    // Add any new prompts from AI that weren't in original
    enhanced.prompts.forEach(prompt => {
      const key = `${prompt.phase || 0}-${prompt.category}`;
      const exists = workflow.prompts.some(p => 
        `${p.phase || 0}-${p.category}` === key
      );
      
      if (!exists) {
        workflow.prompts.push({
          ...prompt,
          enhanced: true
        });
      }
    });

    // Sort prompts by phase and subphase
    workflow.prompts.sort((a, b) => {
      const phaseA = a.phase || 0;
      const phaseB = b.phase || 0;
      if (phaseA !== phaseB) return phaseA - phaseB;
      
      const subPhaseA = a.subPhase || 0;
      const subPhaseB = b.subPhase || 0;
      return subPhaseA - subPhaseB;
    });

    // Final check: If complexity is trivial, ensure we only have 2 phases
    if (workflow.complexity === 'trivial' || workflow.analysis?.complexity === 'trivial') {
      console.log('🎯 Enforcing trivial complexity: limiting to 2 phases');
      // Filter to keep only planning and implementation phases
      const planningPrompt = workflow.prompts.find(p => 
        p.category === 'planning' || p.title?.toLowerCase().includes('planning')
      );
      const implementationPrompt = workflow.prompts.find(p => 
        p.category === 'implementation' || p.title?.toLowerCase().includes('implementation')
      );
      
      workflow.prompts = [];
      if (planningPrompt) {
        planningPrompt.phase = 1;
        planningPrompt.title = "Planning Phase (Simplified)";
        planningPrompt.content = `Plan the simple text change: "${workflow.originalRequest}"
        
1. Identify the exact location where the text needs to be changed
2. Determine the current text value
3. Replace with the new text value
4. Verify no other locations need the same change`;
        workflow.prompts.push(planningPrompt);
      }
      
      if (implementationPrompt) {
        implementationPrompt.phase = 2;
        implementationPrompt.title = "Implementation";
        implementationPrompt.content = `Execute the text change: "${workflow.originalRequest}"

1. Locate the file containing the text to be changed
2. Find the exact line with the current text
3. Replace the old text with the new text
4. Save the file
5. Test that the change appears correctly`;
        workflow.prompts.push(implementationPrompt);
      }
      
      // If we somehow don't have the right prompts, create minimal ones
      if (workflow.prompts.length === 0) {
        workflow.prompts = [
          {
            title: "Planning Phase (Simplified)",
            category: "planning",
            phase: 1,
            risk: "low",
            content: `Plan the simple change: "${workflow.originalRequest}"`
          },
          {
            title: "Implementation",
            category: "implementation", 
            phase: 2,
            risk: "low",
            content: `Implement the change: "${workflow.originalRequest}"`
          }
        ];
      }
    }

    workflow.enhanced = true;
    workflow.aiAssessment = enhanced.analysis || null;
    return workflow;
  }

  /**
   * Add safety wrappers to all prompts
   */
  addSafetyWrappers(prompts, riskLevel) {
    // Wrap ALL prompts with safety header (not just implementation/deployment)
    const wrappedPrompts = prompts.map(prompt => {
      // Every prompt gets the safety wrapper prepended to its content
      const wrappedPrompt = {
        ...prompt,
        content: this.wrapPromptWithFullSafety(prompt.content, prompt.risk || riskLevel, prompt.category)
      };
      return wrappedPrompt;
    });
    
    // Add final verification prompt for medium/high risk
    if (riskLevel !== 'low' && riskLevel !== 'trivial') {
      wrappedPrompts.push(this.createFinalVerificationPrompt(riskLevel));
    }
    
    return wrappedPrompts;
  }

  /**
   * Create safety system prompt
   */
  createSafetySystemPrompt(riskLevel) {
    const riskEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🔴'
    };

    return {
      title: "Safety System Instructions",
      category: "system",
      phase: 0,
      risk: riskLevel,
      content: `🩺 PROMPTDOCTOR SAFETY SYSTEM

RISK LEVEL: ${riskEmoji[riskLevel]} ${riskLevel.toUpperCase()}

MANDATORY SAFETY PRINCIPLES:
1. STABILITY FIRST - Do not break existing functionality
2. REVERSIBLE CHANGES - Ensure every change can be undone
3. TEST EVERYTHING - Verify functionality after each step
4. DOCUMENT CHANGES - Keep clear records of what was modified
5. MONITOR IMPACT - Watch for unexpected side effects

${riskLevel === 'high' ? `
⚠️ HIGH-RISK OPERATION DETECTED
Additional precautions required:
- Create full system backup before starting
- Have rollback plan ready and tested
- Ensure monitoring is active
- Have incident response team on standby
- Proceed with extreme caution
` : ''}

BEFORE PROCEEDING:
✓ Read and understand all phases
✓ Ensure you have necessary permissions
✓ Verify system is in stable state
✓ Have rollback capability ready

This is a multi-phase operation. Complete each phase fully before moving to the next.`,
      enhanced: true
    };
  }

  /**
   * Wrap prompt with full PROMPTDOCTOR SAFETY SYSTEM header
   */
  wrapPromptWithFullSafety(content, riskLevel, category) {
    const riskEmoji = {
      low: '🟢',
      medium: '🟡', 
      high: '🔴',
      trivial: '🟢'
    };

    const emoji = riskEmoji[riskLevel] || '🟡';
    
    // The essential PROMPTDOCTOR SAFETY SYSTEM wrapper that must appear at the beginning
    const safetyHeader = `🩺 PROMPTDOCTOR SAFETY SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ SAFETY-FIRST AI AGENT INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RISK LEVEL: ${emoji} ${(riskLevel || 'medium').toUpperCase()}
PHASE: ${(category || 'implementation').toUpperCase()}

🔒 MANDATORY SAFETY PROTOCOLS:
1. PRESERVE STABILITY - Never break existing functionality
2. INCREMENTAL CHANGES - Make small, testable modifications
3. VALIDATE CONTINUOUSLY - Test after every change
4. DOCUMENT EVERYTHING - Track all modifications
5. MONITOR IMPACT - Watch for side effects

${riskLevel === 'high' ? `
⚠️ HIGH-RISK OPERATION DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXTREME CAUTION REQUIRED:
• Create full backup before starting
• Prepare and test rollback plan
• Enable active monitoring
• Keep incident response ready
• Proceed with maximum care
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

✅ PRE-FLIGHT CHECKLIST:
□ Understand the complete request
□ Review all safety protocols
□ Verify necessary permissions
□ Confirm system stability
□ Prepare rollback capability

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 TASK INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${content}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 POST-EXECUTION VERIFICATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After completing this task:
✓ Verify successful completion
✓ Check for errors or warnings
✓ Confirm system stability
✓ Document all changes made
${riskLevel === 'high' ? '✓ Verify rollback availability' : ''}
${riskLevel !== 'low' && riskLevel !== 'trivial' ? '✓ Check monitoring metrics' : ''}

⚠️ STOP if anything seems wrong and investigate before continuing.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END PROMPTDOCTOR SAFETY SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return safetyHeader;
  }

  /**
   * Wrap content with safety considerations
   */
  wrapWithSafety(content, riskLevel) {
    const safetyPrefix = riskLevel === 'high' ? 
      `⚠️ HIGH-RISK OPERATION - PROCEED WITH CAUTION\n\n` :
      riskLevel === 'medium' ?
      `⚡ MEDIUM-RISK OPERATION - VERIFY EACH STEP\n\n` :
      '';

    const safetySuffix = `

🔒 SAFETY CHECKPOINT:
Before proceeding to the next step:
- ✓ Verify this step completed successfully
- ✓ Check for any errors or warnings
- ✓ Ensure system is still functioning
- ✓ Document what was changed
${riskLevel === 'high' ? '- ✓ Verify rollback is still available' : ''}
${riskLevel !== 'low' ? '- ✓ Check monitoring for anomalies' : ''}

⚠️ If anything seems wrong, STOP and investigate before continuing.`;

    return safetyPrefix + content + safetySuffix;
  }

  /**
   * Create final verification prompt
   */
  createFinalVerificationPrompt(riskLevel) {
    return {
      title: "Final System Verification",
      category: "verification",
      phase: 99,
      risk: riskLevel,
      content: `✅ FINAL SYSTEM VERIFICATION

All implementation phases are complete. Perform final verification:

📋 FINAL CHECKLIST:
1. FUNCTIONALITY
   ⬜ Original request has been fulfilled
   ⬜ All new features working as expected
   ⬜ No existing features broken
   ⬜ Edge cases handled properly

2. QUALITY
   ⬜ Code follows project standards
   ⬜ Tests are passing
   ⬜ Documentation updated
   ⬜ Performance acceptable

3. SAFETY
   ⬜ No security vulnerabilities introduced
   ⬜ Data integrity maintained
   ⬜ Rollback plan still available
   ⬜ Monitoring shows normal metrics

${riskLevel === 'high' ? `
4. HIGH-RISK VERIFICATION
   ⬜ Production systems stable
   ⬜ No customer impact detected
   ⬜ Business metrics normal
   ⬜ Stakeholders notified of completion
` : ''}

📊 SUCCESS CRITERIA MET?
- All checklist items complete: YES / NO
- System functioning correctly: YES / NO
- Ready for production use: YES / NO

If any item is NO, document the issue and plan remediation.

🎉 IMPLEMENTATION COMPLETE
Document lessons learned and any follow-up tasks needed.`,
      enhanced: true
    };
  }

  /**
   * Generate clarification prompt when request is vague
   */
  generateClarificationPrompt(originalRequest, questions) {
    return `🤔 CLARIFICATION NEEDED

Your request: "${originalRequest}"

This request needs more specific details to ensure safe and accurate implementation. Please provide answers to the following questions:

${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

📝 HOW TO PROCEED:
1. Answer the questions above to clarify your requirements
2. Provide specific examples if possible
3. Include any constraints or dependencies
4. Mention any existing systems that will be affected

⚠️ WHY THIS MATTERS:
- Vague requests can lead to incorrect implementations
- Clarification prevents wasted effort and potential bugs
- Specific requirements ensure the solution meets your needs
- Understanding the full context helps assess risks properly

Once you provide these details, I can generate a proper implementation plan with:
- Appropriate safety checks
- Correct risk assessment
- Specific implementation steps
- Relevant testing procedures

Please update your request with the additional information and try again.`;
  }

  /**
   * Create basic workflow when orchestrator is not available
   */
  createBasicWorkflow(userRequest) {
    return {
      sufficient: true,
      confidence: 0.7,
      originalRequest: userRequest,
      changeTypes: ['general'],
      riskLevel: 'medium',
      riskFactors: ['Unable to fully analyze without orchestrator'],
      prompts: [
        {
          title: "Research Phase",
          category: "research",
          phase: 1,
          risk: "low",
          content: `Research and understand the requirements for: "${userRequest}"`
        },
        {
          title: "Implementation Phase",
          category: "implementation",
          phase: 2,
          risk: "medium",
          content: `Implement the requested change: "${userRequest}"`
        },
        {
          title: "Testing Phase",
          category: "testing",
          phase: 3,
          risk: "low",
          content: `Test and verify the implementation`
        }
      ]
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedAIAnalysisEngine;
}

// Make available to browser environment
if (typeof window !== 'undefined') {
  window.EnhancedAIAnalysisEngine = EnhancedAIAnalysisEngine;
}