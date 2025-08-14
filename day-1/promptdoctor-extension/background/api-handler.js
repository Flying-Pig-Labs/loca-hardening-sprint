/**
 * Anthropic API Handler
 * Manages API calls to Claude for intelligent analysis
 */

class AnthropicAPIHandler {
  constructor() {
    this.baseURL = 'https://api.anthropic.com/v1/messages';
    this.model = 'claude-3-5-sonnet-latest';
    this.maxTokens = 1500;
  }
  
  async analyzeRequest(userRequest, apiKey) {
    if (!apiKey) {
      throw new Error('API key required');
    }
    
    const analysisPrompt = this.buildAnalysisPrompt(userRequest);
    
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.maxTokens,
          messages: [{
            role: 'user',
            content: analysisPrompt
          }]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      const analysisText = data.content[0].text;
      
      return this.parseAnalysisResponse(analysisText, userRequest);
      
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }
  
  buildAnalysisPrompt(userRequest) {
    return `You are PromptDoctor, an expert system that analyzes development requests and generates safe, structured deployment prompts.

ANALYZE THIS REQUEST: "${userRequest}"

Your job is to determine:
1. Is this request specific enough to generate safe, targeted prompts?
2. What systems will be affected (frontend/backend/database/auth)?
3. What's the risk level and what safety measures are needed?
4. How should this be broken down into safe, sequential steps?

ONLY mark as insufficient if you genuinely cannot determine what systems are affected or assess the safety implications.

Respond with ONLY valid JSON in this exact format:
{
  "sufficient": boolean,
  "confidence": 0.0-1.0,
  "changeTypes": ["web", "api", "database", "auth"],
  "riskLevel": "low|medium|high",
  "riskFactors": ["what makes this risky"],
  "prompts": [
    {
      "title": "Clear step name",
      "category": "system|web-validation|web-implementation|api-validation|api-implementation|auth-validation|auth-implementation|database-validation|database-implementation|verification",
      "risk": "low|medium|high",
      "content": "Detailed, actionable prompt with specific safety instructions, testing requirements, and validation steps. Include what to check before, during, and after implementation."
    }
  ],
  "insufficient_reason": "Only if sufficient=false - what critical info is missing",
  "suggestions": [
    {
      "label": "Suggestion name",
      "template": "Complete example request"
    }
  ]
}

PROMPT GENERATION GUIDELINES:
- Always start with a system/safety prompt
- Include specific validation steps before implementation
- Add implementation prompts with detailed safety instructions
- Include testing and verification requirements
- For high-risk changes, add extra precautions and warnings
- Make prompts actionable with clear success criteria
- Include rollback instructions for risky operations

EXAMPLES:

For "add user login":
- This is SUFFICIENT (can determine: affects frontend + backend + auth, medium-high risk)
- Generate: system prompt + auth validation + auth implementation + verification

For "fix the bug":
- This is INSUFFICIENT (cannot determine what's broken, what systems affected, or risk level)
- Need: what specific bug, what system, what's the current behavior vs expected

For "update user table schema":
- This is SUFFICIENT (can determine: affects database + possibly API, high risk)
- Generate: system prompt + database validation + database implementation + verification

Be generous with sufficient=true. Only ask for clarification when you truly cannot assess safety or system impact.`;
  }
  
  parseAnalysisResponse(analysisText, userRequest) {
    try {
      // Clean up response - sometimes Claude adds explanation before/after JSON
      let jsonText = analysisText.trim();
      
      // Extract JSON if wrapped in markdown
      const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        // Look for first { to last }
        const start = jsonText.indexOf('{');
        const end = jsonText.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          jsonText = jsonText.substring(start, end + 1);
        }
      }
      
      const parsed = JSON.parse(jsonText);
      
      // Validate response structure
      if (typeof parsed.sufficient !== 'boolean') {
        throw new Error('Invalid response: missing sufficient field');
      }
      
      // Add original request to result
      parsed.originalRequest = userRequest;
      
      // Map AI response format to our expected format
      if (parsed.changeTypes) {
        // Already in correct format
      }
      
      // Ensure we have the correct field names
      if (parsed.riskLevel && !parsed.risk) {
        parsed.risk = parsed.riskLevel;
      }
      
      return parsed;
      
    } catch (error) {
      console.error('Failed to parse analysis response:', error);
      console.log('Raw response:', analysisText);
      
      // Return fallback response
      return {
        sufficient: false,
        confidence: 0.1,
        originalRequest: userRequest,
        reason: "AI analysis failed - please provide more specific details",
        suggestions: [
          {
            label: "Frontend Component",
            template: "Add [component type] to [page/section] with [specific functionality] using [technology]"
          },
          {
            label: "API Endpoint", 
            template: "Create [HTTP method] API endpoint for [specific feature] with [input/output] and [validation]"
          },
          {
            label: "Database Change",
            template: "Modify database to [SPECIFIC_CHANGE] for [TABLE_NAME] with [FIELD_DETAILS]"
          }
        ]
      };
    }
  }
  
  async enhancePromptWithAI(basicPrompt, context, apiKey) {
    if (!apiKey) {
      return basicPrompt; // Return unchanged if no API key
    }
    
    const enhancementPrompt = `You are PromptDoctor. Enhance this deployment prompt to be safer and more detailed:

BASIC PROMPT: "${basicPrompt}"

CONTEXT: ${JSON.stringify(context)}

Make it more specific, add safety checks, include testing requirements, and ensure it follows best practices. Keep the same general structure but add important details.

Respond with ONLY the enhanced prompt text, no explanation:`;
    
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: enhancementPrompt
          }]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.content[0].text.trim();
      }
    } catch (error) {
      console.error('Prompt enhancement failed:', error);
    }
    
    return basicPrompt; // Return original if enhancement fails
  }
}

// Make available to content script
if (typeof window !== 'undefined') {
  window.AnthropicAPIHandler = AnthropicAPIHandler;
}