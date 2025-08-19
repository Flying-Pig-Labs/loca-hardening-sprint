/**
 * PromptDoctor AI Analysis Engine
 * Uses Claude Sonnet for intelligent prompt analysis and generation
 */

class AIAnalysisEngine {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'claude-3-5-sonnet-latest'; // Latest Sonnet model
    this.apiUrl = 'https://api.anthropic.com/v1/messages';
    this.fallbackEngine = null; // Will be set to local engine if needed
  }

  async analyzeRequest(userRequest) {
    // If no API key, use fallback immediately
    if (!this.apiKey) {
      return this.useFallbackAnalysis(userRequest);
    }

    try {
      // Prepare the system prompt for Claude
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(userRequest);
      
      // Call Claude API
      const response = await this.callClaudeAPI(systemPrompt, userPrompt);
      
      // Parse and validate the response
      const analysisResult = this.parseClaudeResponse(response);
      
      // Ensure proper structure
      return this.validateAndEnhanceResult(analysisResult, userRequest);
      
    } catch (error) {
      console.error('AI Analysis failed, using fallback:', error);
      return this.useFallbackAnalysis(userRequest);
    }
  }

  buildSystemPrompt() {
    return `You are PromptDoctor, an AI assistant that analyzes software change requests and generates safe deployment prompts for Replit Agent.

Your task is to analyze a user's change request and return a structured JSON response with safety-focused prompts.

RESPONSE FORMAT (You MUST return valid JSON):
{
  "sufficient": boolean,  // false if request is too vague
  "confidence": number,   // 0.0 to 1.0
  "changeTypes": string[], // array of: "web", "api", "auth", "database", "deployment", "testing"
  "riskLevel": string,    // "low", "medium", or "high"
  "riskFactors": string[], // specific risks identified
  "prompts": [
    {
      "title": string,      // Short descriptive title
      "category": string,   // "system", "validation", "implementation", "verification"
      "risk": string,       // "low", "medium", or "high"
      "content": string     // Detailed prompt content with specific instructions
    }
  ],
  "suggestions": [         // Only if sufficient=false
    {
      "label": string,
      "template": string
    }
  ]
}

RISK ASSESSMENT GUIDELINES:
- HIGH RISK: Authentication, database changes, deletions, production deployments, payment systems
- MEDIUM RISK: API changes, user data handling, integrations, configuration changes
- LOW RISK: UI changes, text updates, styling, documentation

PROMPT GENERATION RULES:
1. Always start with a "system" category prompt that sets safety guidelines
2. Include "validation" prompts for pre-implementation checks
3. Add "implementation" prompts with specific, actionable steps
4. For medium/high risk, include "verification" prompts
5. Break complex changes into multiple sequential prompts
6. Each prompt should be specific to the user's request, not generic

SAFETY PRINCIPLES TO EMPHASIZE:
- Test existing functionality before changes
- Make incremental, reversible changes
- Validate inputs and handle errors
- Document changes and decisions
- Prepare rollback plans for risky changes

If the request is vague (like "fix bug" or "update code"), set sufficient=false and provide 2-3 specific suggestions.`;
  }

  buildUserPrompt(userRequest) {
    return `Analyze this software change request and generate safe deployment prompts:

"${userRequest}"

Remember to:
1. Assess the specific risks of this change
2. Generate prompts that are specific to this request (not generic templates)
3. Include concrete steps and checks relevant to the technology mentioned
4. If authentication/database/payments are involved, emphasize security
5. Return valid JSON in the specified format`;
  }

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
        max_tokens: 2000,
        temperature: 0.3, // Lower temperature for more consistent structured output
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

  parseClaudeResponse(responseText) {
    try {
      // Extract JSON from the response (Claude might add explanation text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.hasOwnProperty('sufficient') || !parsed.prompts) {
        throw new Error('Invalid response structure');
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to parse Claude response:', error);
      throw error;
    }
  }

  validateAndEnhanceResult(result, originalRequest) {
    // Ensure all required fields exist
    result.originalRequest = originalRequest;
    result.sufficient = result.sufficient !== false;
    result.confidence = result.confidence || 0.8;
    result.changeTypes = result.changeTypes || ['general'];
    result.riskLevel = result.riskLevel || 'medium';
    result.riskFactors = result.riskFactors || [];
    
    // Ensure prompts have required fields
    if (result.prompts) {
      result.prompts = result.prompts.map((prompt, index) => ({
        title: prompt.title || `Step ${index + 1}`,
        category: prompt.category || 'implementation',
        risk: prompt.risk || result.riskLevel,
        content: prompt.content || 'No content provided'
      }));
    }
    
    // Add suggestions if insufficient
    if (!result.sufficient && !result.suggestions) {
      result.suggestions = this.generateDefaultSuggestions();
    }
    
    return result;
  }

  useFallbackAnalysis(userRequest) {
    // Load the simplified analysis engine as fallback
    if (!this.fallbackEngine) {
      this.fallbackEngine = new SimplifiedAnalysisEngine();
    }
    
    const result = this.fallbackEngine.analyzeRequest(userRequest);
    result.usingFallback = true;
    return result;
  }

  generateDefaultSuggestions() {
    return [
      {
        label: "Add Feature",
        template: "Add [FEATURE_NAME] to [COMPONENT/PAGE] with [SPECIFIC_REQUIREMENTS]"
      },
      {
        label: "Fix Issue",
        template: "Fix [ISSUE_DESCRIPTION] in [COMPONENT/SYSTEM] that causes [PROBLEM]"
      },
      {
        label: "Update System",
        template: "Update [SYSTEM/COMPONENT] to [NEW_VERSION/BEHAVIOR] with [REQUIREMENTS]"
      }
    ];
  }
}

// Simplified fallback engine (same as before but as a class here)
class SimplifiedAnalysisEngine {
  constructor() {
    this.riskFactors = {
      high: [/delete|remove|drop|destroy|auth|password|production|database|payment|billing/i],
      medium: [/update|modify|api|endpoint|user|config|integration/i],
      low: [/add|create|ui|style|display|text|documentation/i]
    };
  }
  
  analyzeRequest(userRequest) {
    const request = userRequest.toLowerCase().trim();
    
    // Check if too vague
    if (request.length < 10 || /^(fix|update|change|modify|help)$/.test(request)) {
      return {
        sufficient: false,
        reason: "Request needs more specific details to generate safe prompts",
        originalRequest: userRequest,
        suggestions: [
          {
            label: "Add Feature",
            template: "Add user authentication with email/password login and secure session management"
          },
          {
            label: "Fix Issue", 
            template: "Fix login form validation to properly check email format and password requirements"
          },
          {
            label: "Update Component",
            template: "Update navigation menu to include dropdown for user profile and settings"
          }
        ]
      };
    }
    
    // Determine risk level
    let riskLevel = 'low';
    if (this.riskFactors.high.some(p => p.test(request))) riskLevel = 'high';
    else if (this.riskFactors.medium.some(p => p.test(request))) riskLevel = 'medium';
    
    // Generate basic prompts
    const prompts = [
      {
        title: "Safety System Instructions",
        category: "system",
        risk: riskLevel,
        content: `🩺 PROMPTDOCTOR SAFETY SYSTEM

CHANGE REQUEST: "${userRequest}"
RISK LEVEL: ${riskLevel.toUpperCase()}

SAFETY PRINCIPLES:
1. STABILITY FIRST - Do not break existing functionality
2. REVERSIBLE CHANGES - Ensure changes can be undone
3. TEST EVERYTHING - Verify after each step

Remember the above rules in the following prompts and reply with 'OK, understood' to confirm your understanding.`
      },
      {
        title: "Pre-Implementation Check",
        category: "validation",
        risk: "low",
        content: `Before implementing "${userRequest}", validate current state:

1. Test existing functionality
2. Document current behavior
3. Identify potential impacts

Only proceed after confirming system is stable.`
      },
      {
        title: "Safe Implementation",
        category: "implementation",
        risk: riskLevel,
        content: `Implement: "${userRequest}"

SAFETY GUIDELINES:
- Make incremental changes
- Test after each modification
- Preserve existing functionality
- Document changes

Follow best practices for your change type.`
      }
    ];
    
    if (riskLevel !== 'low') {
      prompts.push({
        title: "Final Verification",
        category: "verification",
        risk: riskLevel,
        content: `Complete verification for: "${userRequest}"

1. Test all functionality
2. Check performance
3. Verify security
4. Update documentation

Ensure everything works before marking complete.`
      });
    }
    
    return {
      sufficient: true,
      confidence: 0.7,
      changeTypes: ['general'],
      riskLevel: riskLevel,
      prompts: prompts,
      originalRequest: userRequest
    };
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.AIAnalysisEngine = AIAnalysisEngine;
  window.SimplifiedAnalysisEngine = SimplifiedAnalysisEngine;
}