/**
 * PromptDoctor Content Script
 * Injects the PromptDoctor button into Replit Agent interface
 */

// Prevent duplicate initialization if script runs multiple times
if (window.__promptDoctorInitialized) {
  console.log('PromptDoctor: Already initialized, skipping...');
} else {
  window.__promptDoctorInitialized = true;

// Note: We cannot load external scripts directly in content scripts due to Chrome security
// Instead, we'll make the API calls directly from the content script context

// Anthropic API Handler embedded directly
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
      "category": "system|validation|implementation|verification",
      "risk": "low|medium|high",
      "content": "Detailed, actionable prompt with specific safety instructions"
    }
  ],
  "suggestions": [
    {
      "label": "Suggestion name",
      "template": "Complete example request"
    }
  ]
}`;
  }
  
  parseAnalysisResponse(analysisText, userRequest) {
    try {
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
      
      return parsed;
      
    } catch (error) {
      console.error('Failed to parse analysis response:', error);
      
      // Return fallback response
      return {
        sufficient: false,
        confidence: 0.1,
        originalRequest: userRequest,
        reason: "AI analysis failed - please provide more specific details",
        suggestions: [
          {
            label: "Frontend Component",
            template: "Add [component type] to [page/section] with [specific functionality]"
          },
          {
            label: "API Endpoint", 
            template: "Create [HTTP method] API endpoint for [specific feature]"
          }
        ]
      };
    }
  }
}

class PromptDoctorInjector {
  constructor() {
    this.isInjected = false;
    this.retryCount = 0;
    this.maxRetries = 30; // 30 seconds max wait
    
    this.init();
  }
  
  init() {
    console.log('PromptDoctor: Initializing...');
    
    // Start looking for Agent interface
    this.findAndInjectButton();
    
    // Watch for navigation changes (SPA)
    this.watchForNavigation();
    
    // Listen for messages from popup
    this.setupMessageListener();
  }
  
  findAndInjectButton() {
    const checkInterval = setInterval(() => {
      this.retryCount++;
      
      // Debug: Log what we're looking for
      if (this.retryCount === 1) {
        console.log('PromptDoctor: Looking for Agent interface...');
        console.log('PromptDoctor: Current URL:', window.location.href);
        console.log('PromptDoctor: Textareas found:', document.querySelectorAll('textarea').length);
      }
      
      // Look for Replit Agent prompt textarea with multiple selectors
      const agentTextarea = this.findAgentTextarea();
      
      if (agentTextarea && !this.isInjected) {
        clearInterval(checkInterval);
        console.log('PromptDoctor: Found Agent textarea!', agentTextarea);
        this.injectPromptDoctorButton(agentTextarea);
        this.isInjected = true;
        console.log('PromptDoctor: Button injected successfully');
      } else if (this.retryCount >= this.maxRetries) {
        clearInterval(checkInterval);
        console.log('PromptDoctor: Could not find Agent interface after 30 seconds');
        console.log('PromptDoctor: Try opening the Agent chat/prompt area');
      }
    }, 1000);
  }
  
  findAgentTextarea() {
    // First check for CodeMirror editor (Replit Agent uses this)
    const codeMirrorSelectors = [
      // Direct ID match for agent prompt
      '#ai-prompt-input .cm-content',
      // CodeMirror with agent-related containers
      '[data-cy="ai-prompt-input"] .cm-content',
      // Any CodeMirror that might be for prompts
      '.cm-content[role="textbox"]',
      // Look for the placeholder text
      '.cm-placeholder-dom'
    ];
    
    for (const selector of codeMirrorSelectors) {
      const cmElement = document.querySelector(selector);
      if (cmElement) {
        // Check if this is likely the Agent prompt
        const placeholder = cmElement.closest('.cm-editor')?.querySelector('.cm-placeholder-dom')?.textContent || '';
        const isAgentPrompt = placeholder.toLowerCase().includes('agent') || 
                             placeholder.toLowerCase().includes('message') ||
                             cmElement.closest('#ai-prompt-input') !== null ||
                             cmElement.closest('[data-cy="ai-prompt-input"]') !== null;
        
        if (isAgentPrompt) {
          console.log('PromptDoctor: Found CodeMirror Agent interface!', cmElement);
          // Return the content editable element
          const contentEditable = cmElement.closest('.cm-editor')?.querySelector('.cm-content[contenteditable="true"]');
          if (contentEditable) {
            return contentEditable;
          }
        }
      }
    }
    
    // Fallback to standard textarea search
    const textareaSelectors = [
      // Common patterns for Agent interface
      'textarea[placeholder*="prompt" i]',
      'textarea[placeholder*="describe" i]',
      'textarea[placeholder*="tell" i]',
      'textarea[placeholder*="ask" i]',
      'textarea[aria-label*="prompt" i]',
      'textarea[aria-label*="agent" i]',
      
      // Look for textarea in Agent-related containers
      '[data-testid*="agent"] textarea',
      '[class*="agent"] textarea',
      '[class*="prompt"] textarea',
      '[class*="chat"] textarea',
      
      // Fallback: any textarea in main content area
      'main textarea',
      '[role="main"] textarea'
    ];
    
    for (const selector of textareaSelectors) {
      const textarea = document.querySelector(selector);
      if (textarea && this.isLikelyAgentTextarea(textarea)) {
        return textarea;
      }
    }
    
    return null;
  }
  
  isLikelyAgentTextarea(element) {
    // Handle both textarea and CodeMirror contenteditable elements
    if (element.contentEditable === 'true') {
      // This is a CodeMirror element, already validated in findAgentTextarea
      return true;
    }
    
    // Standard textarea validation
    const placeholder = element.placeholder?.toLowerCase() || '';
    const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
    const parentText = element.parentElement?.textContent?.toLowerCase() || '';
    
    // Check for Agent-related keywords
    const agentKeywords = ['prompt', 'describe', 'agent', 'build', 'create', 'ask', 'tell', 'message'];
    const hasAgentKeywords = agentKeywords.some(keyword => 
      placeholder.includes(keyword) || 
      ariaLabel.includes(keyword) || 
      parentText.includes(keyword)
    );
    
    // Check size (Agent textarea is usually large)
    const isLargeTextarea = element.clientHeight > 40 || (element.rows && element.rows > 2);
    
    return hasAgentKeywords && isLargeTextarea;
  }
  
  injectPromptDoctorButton(textarea) {
    // Create the PromptDoctor button
    const button = document.createElement('button');
    button.id = 'promptdoctor-button';
    button.className = 'promptdoctor-inject-btn';
    button.innerHTML = `
      <span class="promptdoctor-icon">🩺</span>
      <span class="promptdoctor-text">PromptDoctor</span>
    `;
    button.title = 'Generate safe, structured prompts for deployment';
    
    // Position button relative to textarea
    this.positionButton(button, textarea);
    
    // Add event listeners
    this.setupButtonEvents(button, textarea);
    
    // Insert button into DOM
    document.body.appendChild(button);
    
    // Add button interactions
    this.addButtonAnimations(button);
    
    // Store reference to textarea
    this.currentTextarea = textarea;
  }
  
  positionButton(button, textarea) {
    // Get textarea position
    const textareaRect = textarea.getBoundingClientRect();
    
    // Position the button to the far right of the textarea's container
    // Look for the parent container that might have padding/margins
    const parentContainer = textarea.closest('.cm-editor') || textarea.parentElement;
    const containerRect = parentContainer ? parentContainer.getBoundingClientRect() : textareaRect;
    
    // Style the button with absolute positioning - far right outside the text area
    button.style.cssText = `
      position: fixed;
      top: ${textareaRect.top + 8}px;
      right: 20px;
      z-index: 10000;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transition: all 0.2s ease;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      gap: 4px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
    `;
    
    // Update position on scroll/resize
    const updatePosition = () => {
      const newRect = textarea.getBoundingClientRect();
      button.style.top = `${newRect.top + 8}px`;
      // Keep it at far right of viewport
      button.style.right = '20px';
      
      // Hide button if textarea is not visible
      if (newRect.top < -100 || newRect.top > window.innerHeight) {
        button.style.display = 'none';
      } else {
        button.style.display = 'flex';
      }
    };
    
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
  }
  
  setupButtonEvents(button, element) {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      // Get current prompt text
      let currentPrompt = '';
      if (element.contentEditable === 'true') {
        // CodeMirror - get text content
        currentPrompt = element.textContent.trim();
      } else {
        // Standard textarea
        currentPrompt = element.value.trim();
      }
      
      this.handleButtonClick(currentPrompt, element);
    });
  }
  
  addButtonAnimations(button) {
    // Hover effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-1px)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    });
    
    // Click animation
    button.addEventListener('mousedown', () => {
      button.style.transform = 'translateY(0) scale(0.98)';
    });
    
    button.addEventListener('mouseup', () => {
      button.style.transform = 'translateY(-1px) scale(1)';
    });
  }
  
  handleButtonClick(prompt, element) {
    console.log('PromptDoctor button clicked with prompt:', prompt);
    
    // Store reference to the textarea/element for later use
    this.targetTextarea = element;
    
    // Open the PromptDoctor modal with the current prompt
    this.openPromptDoctorModal(prompt);
  }
  
  openPromptDoctorModal(initialPrompt = '') {
    // Remove existing modal if present
    this.closeModal();
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'promptdoctor-overlay';
    overlay.className = 'promptdoctor-overlay';
    
    overlay.innerHTML = `
      <div class="promptdoctor-modal">
        <div class="promptdoctor-header">
          <div class="header-content">
            <span class="header-icon">🩺</span>
            <h3 class="header-title">PromptDoctor</h3>
            <span class="header-subtitle">Safe Deployment Assistant</span>
          </div>
          <button class="promptdoctor-close" title="Close">×</button>
        </div>
        
        <div class="promptdoctor-body">
          <!-- Step 1: User Input -->
          <div class="step-container step-1" id="step-1">
            <div class="step-header">
              <h4>What do you want to build or change?</h4>
              <p class="step-description">Describe your request and I'll make it safer with structured prompts.</p>
            </div>
            
            <div class="input-section">
              <textarea 
                id="user-request" 
                class="user-request-input"
                placeholder="e.g., Add user authentication with email/password login"
                rows="3"
              >${initialPrompt}</textarea>
              
              <div class="input-actions">
                <button id="analyze-request" class="btn btn-primary">
                  <span class="btn-icon">🔍</span>
                  Analyze Request
                </button>
              </div>
            </div>
          </div>
          
          <!-- Step 2: Analysis Loading -->
          <div class="step-container step-loading" id="step-loading" style="display: none;">
            <div class="loading-content">
              <div class="loading-spinner"></div>
              <h4>Analyzing your request...</h4>
              <p class="loading-text">Determining safety requirements and breaking down into manageable steps.</p>
            </div>
          </div>
          
          <!-- Step 3: Generated Prompts -->
          <div class="step-container step-results" id="step-results" style="display: none;">
            <div class="step-header">
              <h4>Enhanced Safe Prompts</h4>
              <p class="step-description">Copy these prompts to Replit Agent one at a time for safe deployment.</p>
            </div>
            
            <div class="results-content">
              <!-- Will be populated by JavaScript -->
            </div>
          </div>
          
          <!-- Step 4: Need More Info -->
          <div class="step-container step-clarification" id="step-clarification" style="display: none;">
            <div class="step-header">
              <h4>Need One Quick Detail</h4>
              <p class="step-description">Just need to clarify this to generate safe prompts:</p>
            </div>
            
            <div class="clarification-content">
              <!-- Will be populated by JavaScript -->
            </div>
          </div>
        </div>
        
        <div class="promptdoctor-footer">
          <div class="footer-content">
            <span class="footer-text">Making Replit deployments safer, one prompt at a time</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Setup modal event listeners
    this.setupModalEvents(overlay);
    
    // Focus on input
    const userInput = overlay.querySelector('#user-request');
    userInput.focus();
    userInput.setSelectionRange(userInput.value.length, userInput.value.length);
  }
  
  setupModalEvents(overlay) {
    // Close button
    overlay.querySelector('.promptdoctor-close').addEventListener('click', () => {
      this.closeModal();
    });
    
    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeModal();
      }
    });
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('promptdoctor-overlay')) {
        this.closeModal();
      }
    });
    
    // Analyze request button
    overlay.querySelector('#analyze-request').addEventListener('click', () => {
      const userRequest = overlay.querySelector('#user-request').value.trim();
      if (userRequest) {
        this.analyzeUserRequest(userRequest, overlay);
      } else {
        this.showNotification('Please enter a request first', 'warning');
      }
    });
    
    // Enter key in textarea
    overlay.querySelector('#user-request').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        overlay.querySelector('#analyze-request').click();
      }
    });
  }
  
  closeModal() {
    const existingOverlay = document.getElementById('promptdoctor-overlay');
    if (existingOverlay) {
      existingOverlay.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => {
        existingOverlay.remove();
      }, 200);
    }
  }
  
  async analyzeUserRequest(userRequest, overlay) {
    console.log('Analyzing request:', userRequest);
    
    // Show loading step
    this.showStep(overlay, 'loading');
    
    try {
      // Get user settings (using local storage, not sync)
      const settings = await chrome.storage.local.get(['promptdoctor_mode', 'anthropic_api_key']);
      const mode = settings.promptdoctor_mode || 'basic';
      const apiKey = settings.anthropic_api_key;
      
      let result;
      
      console.log('PromptDoctor mode:', mode, 'Has API key:', !!apiKey);
      
      if (mode === 'ai' && apiKey) {
        // Try AI-enhanced analysis
        console.log('Using AI-enhanced mode with Claude API');
        try {
          const apiHandler = new AnthropicAPIHandler();
          result = await apiHandler.analyzeRequest(userRequest, apiKey);
          
          // Track API usage
          await this.incrementAPIUsage();
          
          console.log('AI analysis successful:', result);
        } catch (error) {
          console.warn('AI analysis failed, falling back to basic:', error);
          // Fall back to local analysis
          result = await this.runBasicAnalysis(userRequest);
        }
      } else {
        // Use basic analysis
        console.log('Using basic analysis mode (no AI)');
        if (mode === 'ai' && !apiKey) {
          console.warn('AI mode selected but no API key found');
        }
        result = await this.runBasicAnalysis(userRequest);
      }
      
      // Display results
      if (result.sufficient) {
        this.displayPromptResults(result.prompts, overlay);
      } else {
        this.displayClarificationRequest(result, overlay);
      }
      
    } catch (error) {
      console.error('Analysis failed:', error);
      this.showStep(overlay, '1');
      this.showNotification('Analysis failed. Please try again.', 'error');
    }
  }
  
  async getAPIKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['anthropic_api_key'], (result) => {
        resolve(result.anthropic_api_key || null);
      });
    });
  }
  
  async callClaudeForAnalysis(userRequest, apiKey) {
    const systemPrompt = `You are PromptDoctor, an AI that analyzes software change requests and generates safe deployment prompts.

Analyze the request and return ONLY valid JSON with this structure:
{
  "sufficient": boolean,
  "confidence": number (0.0-1.0),
  "changeTypes": ["web", "api", "auth", "database", etc],
  "riskLevel": "low" | "medium" | "high",
  "riskFactors": ["specific risks identified"],
  "prompts": [
    {
      "title": "Short title",
      "category": "system" | "validation" | "implementation" | "verification",
      "risk": "low" | "medium" | "high",
      "content": "Detailed safety instructions specific to this change"
    }
  ],
  "suggestions": [
    {
      "label": "Suggestion name",
      "template": "Specific template"
    }
  ]
}

Rules:
- Set sufficient=false if request is too vague
- Generate 2-4 specific prompts based on risk
- Make prompts specific to the request, not generic
- Include concrete technical steps
- Emphasize safety and testing`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 2000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Analyze this change request and generate safety prompts:\n\n"${userRequest}"\n\nReturn ONLY valid JSON.`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text;
    
    // Parse JSON from response
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON in response');
      }
      
      const result = JSON.parse(jsonMatch[0]);
      result.originalRequest = userRequest;
      
      // Ensure required fields
      result.sufficient = result.sufficient !== false;
      result.prompts = result.prompts || [];
      result.suggestions = result.suggestions || [];
      
      return result;
    } catch (error) {
      console.error('Failed to parse Claude response:', error);
      throw error;
    }
  }
  
  loadAnalysisEngine() {
    return new Promise((resolve, reject) => {
      // For file:// URLs, use the simplified built-in engine
      if (window.location.protocol === 'file:') {
        resolve(new this.SimplifiedAnalysisEngine());
      } else {
        // Try to load the full analysis script for http/https
        if (!window.AnalysisEngine) {
          // If not loaded, try to fetch and eval it (avoiding CSP issues)
          fetch(chrome.runtime.getURL('utils/analysis.js'))
            .then(response => response.text())
            .then(scriptText => {
              // Use Function constructor to avoid CSP inline script issues
              const createEngine = new Function(scriptText + '; return AnalysisEngine;');
              const AnalysisEngine = createEngine();
              resolve(new AnalysisEngine());
            })
            .catch(error => {
              console.warn('Could not load full engine, using simplified version:', error);
              resolve(new this.SimplifiedAnalysisEngine());
            });
        } else {
          resolve(new window.AnalysisEngine());
        }
      }
    });
  }
  
  // Simplified Analysis Engine embedded directly in content script
  SimplifiedAnalysisEngine = class {
    constructor() {
      this.riskFactors = {
        high: [/delete|remove|drop|destroy|auth|password|production|database/i],
        medium: [/update|modify|api|endpoint|user/i],
        low: [/add|create|ui|style|display/i]
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
              label: "Example: Add Feature",
              template: "Add user authentication with email/password login and secure session management"
            },
            {
              label: "Example: Fix Issue", 
              template: "Fix login form validation to properly check email format and password requirements"
            },
            {
              label: "Example: Update Component",
              template: "Update navigation menu to include dropdown for user profile and settings"
            }
          ]
        };
      }
      
      // Determine risk level
      let riskLevel = 'low';
      if (this.riskFactors.high.some(p => p.test(request))) riskLevel = 'high';
      else if (this.riskFactors.medium.some(p => p.test(request))) riskLevel = 'medium';
      
      // Generate prompts based on risk
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

Return a detailed pre-planning research document that will give a planning team the confidence to make a deterministic plan for this request.`
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

Define a plan and implement it step by step, skipping nothing and sparing no detail and putting all effort into completing the feature as requested without modifying the original requirements.`
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
        confidence: 0.8,
        changeTypes: ['general'],
        riskLevel: riskLevel,
        prompts: prompts,
        originalRequest: userRequest
      };
    }
  }
  
  // Updated method name to match Chunk 3 spec
  showClarificationNeeded(result, overlay) {
    this.displayClarificationRequest(result, overlay);
  }
  
  displayClarificationRequest(result, overlay) {
    this.showStep(overlay, 'clarification');
    
    const clarificationContent = overlay.querySelector('.clarification-content');
    
    clarificationContent.innerHTML = `
      <div class="clarification-message">
        <p>Your request "<strong>${result.originalRequest}</strong>" needs a bit more detail to generate safe, targeted prompts.</p>
      </div>
      
      <div class="enhanced-request-section">
        <label for="enhanced-request">Enhanced Request:</label>
        <textarea 
          id="enhanced-request" 
          class="enhanced-request-input"
          placeholder="Provide more specific details about what you want to build or change..."
          rows="4"
        >${result.originalRequest}</textarea>
        
        <div class="enhancement-help">
          <p><strong>💡 Try to include:</strong></p>
          <ul>
            <li>What specific feature or component you're working with</li>
            <li>What technology stack you're using (if relevant)</li>
            <li>What the change should accomplish</li>
            <li>Any specific requirements or constraints</li>
          </ul>
        </div>
      </div>
      
      ${result.suggestions && result.suggestions.length > 0 ? `
        <div class="quick-examples">
          <h5>🚀 Or try these examples:</h5>
          <div class="example-buttons">
            ${result.suggestions.map(suggestion => `
              <button class="btn btn-outline btn-sm example-btn" data-action="use-example" data-template="${encodeURIComponent(suggestion.template)}">
                ${suggestion.label}
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <div class="clarification-actions">
        <button class="btn btn-primary" data-action="retry-analysis">
          🔍 Analyze Enhanced Request
        </button>
        <button class="btn btn-secondary" data-action="back-to-input">
          ← Back to Edit
        </button>
      </div>
    `;
    
    // Focus on the enhanced request textarea
    const enhancedInput = clarificationContent.querySelector('#enhanced-request');
    if (enhancedInput) {
      enhancedInput.focus();
      enhancedInput.setSelectionRange(enhancedInput.value.length, enhancedInput.value.length);
    }
    
    // Setup event listeners for clarification buttons
    this.setupClarificationEvents(overlay);
  }
  
  setupClarificationEvents(overlay) {
    const clarificationContent = overlay.querySelector('.clarification-content');
    
    if (clarificationContent) {
      clarificationContent.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.dataset.action;
        
        switch (action) {
          case 'use-example':
            const template = decodeURIComponent(target.dataset.template);
            this.useExampleTemplate(template);
            break;
          case 'retry-analysis':
            this.retryAnalysis();
            break;
          case 'back-to-input':
            this.goBackToInput();
            break;
        }
      });
    }
  }
  
  addClarificationStyles() {
    // Check if styles already added
    if (document.getElementById('promptdoctor-clarification-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'promptdoctor-clarification-styles';
    styles.textContent = `
      .clarification-suggestions {
        padding: 16px 0;
      }
      
      .clarification-reason {
        color: #6b7280;
        margin-bottom: 24px;
        font-size: 14px;
      }
      
      .suggestion-list h5 {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin: 0 0 16px 0;
      }
      
      .suggestion-item {
        margin-bottom: 12px;
      }
      
      .suggestion-btn {
        width: 100%;
        padding: 12px 16px;
        background: #f9fafb;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.2s ease;
        font-family: system-ui, -apple-system, sans-serif;
      }
      
      .suggestion-btn:hover {
        background: #f3f4f6;
        border-color: #667eea;
        transform: translateX(2px);
      }
      
      .suggestion-label {
        font-weight: 600;
        color: #1f2937;
        font-size: 14px;
      }
      
      .suggestion-arrow {
        color: #667eea;
        font-size: 16px;
      }
      
      .suggestion-template {
        padding: 8px 16px;
        margin-top: 8px;
        background: #f0f9ff;
        border-left: 3px solid #667eea;
        border-radius: 4px;
        font-size: 12px;
        color: #475569;
        font-family: 'SF Mono', 'Monaco', monospace;
        line-height: 1.5;
      }
      
      .clarification-actions {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
      }
    `;
    document.head.appendChild(styles);
  }
  
  displayPromptResults(prompts, overlay) {
    this.showStep(overlay, 'results');
    
    const resultsContent = overlay.querySelector('.results-content');
    
    resultsContent.innerHTML = `
      <div class="prompt-sequence">
        <div class="sequence-header">
          <div class="sequence-stats">
            <span class="stat-item">
              <span class="stat-number">${prompts.length}</span>
              <span class="stat-label">Steps</span>
            </span>
            <span class="stat-item">
              <span class="stat-number">0</span>
              <span class="stat-label">Complete</span>
            </span>
          </div>
          <div class="sequence-actions">
            <button class="btn btn-secondary btn-sm" data-action="regenerate">
              🔄 Regenerate
            </button>
          </div>
        </div>
        
        ${prompts.map((prompt, index) => this.createPromptCard(prompt, index)).join('')}
        
        <div class="sequence-footer">
          <div class="completion-message" style="display: none;">
            <span class="completion-icon">🎉</span>
            <span class="completion-text">All steps complete! Your deployment should be safer now.</span>
          </div>
        </div>
      </div>
    `;
    
    // Setup prompt card interactions
    this.setupPromptCardEvents(overlay);
  }
  
  createPromptCard(prompt, index) {
    const riskColors = {
      low: { bg: '#ecfdf5', color: '#065f46', border: '#d1fae5' },
      medium: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
      high: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' }
    };
    
    const risk = riskColors[prompt.risk] || riskColors.medium;
    
    return `
      <div class="prompt-card" data-step="${index}" data-category="${prompt.category}">
        <div class="prompt-header" data-action="toggle" data-index="${index}">
          <div class="prompt-title">
            <span class="step-number">Step ${index + 1}:</span>
            <span class="step-name">${prompt.title}</span>
            <span class="risk-badge" style="background: ${risk.bg}; color: ${risk.color}; border: 1px solid ${risk.border};">
              ${prompt.risk.toUpperCase()} RISK
            </span>
          </div>
          <div class="prompt-controls">
            <span class="category-tag">${prompt.category}</span>
            <span class="expand-icon">▶</span>
          </div>
        </div>
        
        <div class="prompt-body" style="display: none;">
          <div class="prompt-content">
            <textarea class="generated-prompt" readonly>${prompt.content}</textarea>
          </div>
          <div class="prompt-actions">
            <button class="btn btn-success btn-sm copy-prompt" data-action="copy" data-content="${encodeURIComponent(prompt.content)}" data-index="${index}">
              📋 Copy to Replit
            </button>
            <button class="btn btn-outline btn-sm mark-complete" data-action="complete" data-index="${index}">
              ✅ Mark Complete
            </button>
            ${prompt.risk === 'high' ? `
              <button class="btn btn-warning btn-sm" data-action="risk-warning" data-index="${index}">
                ⚠️ Risk Info
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  setupPromptCardEvents(overlay) {
    // Use event delegation instead of inline onclick
    const resultsContainer = overlay.querySelector('.results-content');
    
    if (resultsContainer) {
      // Remove any existing listeners
      resultsContainer.replaceWith(resultsContainer.cloneNode(true));
      const newContainer = overlay.querySelector('.results-content');
      
      // Add event listener for all interactions
      newContainer.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.dataset.action;
        const index = parseInt(target.dataset.index);
        
        switch (action) {
          case 'toggle':
            this.togglePromptCard(index);
            break;
          case 'copy':
            const content = decodeURIComponent(target.dataset.content);
            this.copyPromptToReplit(content, index);
            break;
          case 'complete':
            this.markStepComplete(index);
            break;
          case 'regenerate':
            this.regeneratePrompts();
            break;
          case 'risk-warning':
            this.showRiskWarning(index);
            break;
        }
      });
    }
  }
  
  // New methods for clarification flow from Chunk 3
  useExampleTemplate(encodedTemplate) {
    const template = decodeURIComponent(encodedTemplate);
    const enhancedInput = document.getElementById('enhanced-request');
    if (enhancedInput) {
      enhancedInput.value = template;
      enhancedInput.focus();
      
      // Visual feedback
      enhancedInput.style.background = '#ecfdf5';
      setTimeout(() => enhancedInput.style.background = '', 1000);
    }
  }
  
  retryAnalysis() {
    const enhancedInput = document.getElementById('enhanced-request');
    if (enhancedInput && enhancedInput.value.trim()) {
      const overlay = document.getElementById('promptdoctor-overlay');
      this.analyzeUserRequest(enhancedInput.value.trim(), overlay);
    } else {
      this.showNotification('Please provide more details first', 'warning');
    }
  }
  
  goBackToInput() {
    const overlay = document.getElementById('promptdoctor-overlay');
    if (overlay) {
      this.showStep(overlay, '1');
      
      // Focus on original input
      const userInput = overlay.querySelector('#user-request');
      if (userInput) {
        userInput.focus();
      }
    }
  }
  
  // Add risk warning method
  showRiskWarning(stepIndex) {
    const warnings = {
      'auth-implementation': 'This step involves security-critical authentication code. Have a security expert review before production.',
      'database-implementation': 'This step modifies database structure. Ensure you have backups and rollback plan ready.',
      'api-implementation': 'This step changes API behavior. Verify backward compatibility and test all dependent systems.'
    };
    
    const card = document.querySelector(`[data-step="${stepIndex}"]`);
    const category = card?.dataset.category;
    const warning = warnings[category] || 'This is a high-risk operation. Proceed with extra caution and testing.';
    
    this.showNotification(`⚠️ ${warning}`, 'warning');
  }
  
  // Legacy methods for backward compatibility
  useSuggestion(template) {
    // Go back to input step
    const overlay = document.getElementById('promptdoctor-overlay');
    if (overlay) {
      this.showStep(overlay, '1');
      const userInput = overlay.querySelector('#user-request');
      if (userInput) {
        userInput.value = template;
        userInput.focus();
        if (template.includes('[')) {
          this.showNotification('Update the [BRACKETED] placeholders with your specific details', 'info');
        }
      }
    }
  }
  
  backToInput() {
    this.goBackToInput();
  }
  
  togglePromptCard(index) {
    const card = document.querySelector(`[data-step="${index}"]`);
    const body = card.querySelector('.prompt-body');
    const icon = card.querySelector('.expand-icon');
    
    if (body.style.display === 'none') {
      body.style.display = 'block';
      icon.textContent = '▼';
      card.classList.add('expanded');
    } else {
      body.style.display = 'none';
      icon.textContent = '▶';
      card.classList.remove('expanded');
    }
  }
  
  copyPromptToReplit(content, stepIndex) {
    // Copy to clipboard
    navigator.clipboard.writeText(content).then(() => {
      // Auto-fill the Replit textarea or CodeMirror editor
      if (this.targetTextarea) {
        if (this.targetTextarea.contentEditable === 'true') {
          // This is a CodeMirror contenteditable element
          // Clear existing content
          this.targetTextarea.innerHTML = '';
          
          // Create a new line element with the content
          const lineDiv = document.createElement('div');
          lineDiv.className = 'cm-line';
          lineDiv.textContent = content;
          this.targetTextarea.appendChild(lineDiv);
          
          // Focus the editor
          this.targetTextarea.focus();
          
          // Trigger input events for CodeMirror
          this.targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
          this.targetTextarea.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Also trigger a keyboard event to ensure CodeMirror updates
          const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: content
          });
          this.targetTextarea.dispatchEvent(inputEvent);
        } else {
          // Standard textarea
          this.targetTextarea.value = content;
          this.targetTextarea.focus();
          
          // Trigger events to notify Replit
          this.targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
          this.targetTextarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      
      // Visual feedback
      this.updateCopyButton(stepIndex);
      this.showNotification('Prompt copied and filled in Replit! 🚀', 'success');
      
    }).catch(err => {
      console.error('Copy failed:', err);
      this.showNotification('Copy failed - please copy manually', 'error');
    });
  }
  
  updateCopyButton(stepIndex) {
    const copyBtn = document.querySelector(`[data-step="${stepIndex}"] .copy-prompt`);
    if (copyBtn) {
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '✅ Copied!';
      copyBtn.style.background = '#10b981';
      copyBtn.disabled = true;
      
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.style.background = '';
        copyBtn.disabled = false;
      }, 2000);
    }
  }
  
  markStepComplete(stepIndex) {
    const card = document.querySelector(`[data-step="${stepIndex}"]`);
    const markBtn = card.querySelector('.mark-complete');
    
    // Mark as complete
    card.classList.add('completed');
    markBtn.innerHTML = '✅ Complete';
    markBtn.disabled = true;
    
    // Update progress
    this.updateProgress();
  }
  
  updateProgress() {
    const totalSteps = document.querySelectorAll('.prompt-card').length;
    const completedSteps = document.querySelectorAll('.prompt-card.completed').length;
    
    // Update stats
    const statNumber = document.querySelector('.sequence-stats .stat-item:last-child .stat-number');
    if (statNumber) {
      statNumber.textContent = completedSteps;
    }
    
    // Show completion message if all done
    if (completedSteps === totalSteps) {
      const completionMessage = document.querySelector('.completion-message');
      if (completionMessage) {
        completionMessage.style.display = 'flex';
      }
      this.showNotification('🎉 All steps complete! Your deployment should be safer now.', 'success');
    }
  }
  
  showStep(overlay, stepName) {
    // Hide all steps
    overlay.querySelectorAll('.step-container').forEach(step => {
      step.style.display = 'none';
    });
    
    // Show target step
    const targetStep = overlay.querySelector(`#step-${stepName}`);
    if (targetStep) {
      targetStep.style.display = 'block';
    }
  }
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `promptdoctor-notification notification-${type}`;
    notification.textContent = message;
    
    const colors = {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    };
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 30000;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-weight: 600;
      font-family: system-ui, -apple-system, sans-serif;
      animation: slideIn 0.3s ease;
      max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }
  
  regeneratePrompts() {
    const overlay = document.getElementById('promptdoctor-overlay');
    const userRequest = overlay.querySelector('#user-request').value;
    this.analyzeUserRequest(userRequest, overlay);
  }
  
  async runBasicAnalysis(userRequest) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (window.AnalysisEngine) {
          const engine = new window.AnalysisEngine();
          resolve(engine.analyzeRequest(userRequest));
        } else if (this.SimplifiedAnalysisEngine) {
          const engine = new this.SimplifiedAnalysisEngine();
          resolve(engine.analyzeRequest(userRequest));
        } else {
          // Ultimate fallback
          resolve({
            sufficient: false,
            reason: "Analysis engine not available",
            originalRequest: userRequest,
            suggestions: [{
              label: "Try Again",
              template: `${userRequest} - please add more specific details`
            }]
          });
        }
      }, 500); // Brief delay for UX
    });
  }
  
  async incrementAPIUsage() {
    try {
      const stats = await chrome.storage.local.get(['api_usage_count']);
      const newCount = (stats.api_usage_count || 0) + 1;
      await chrome.storage.local.set({ api_usage_count: newCount });
    } catch (error) {
      console.error('Failed to update API usage:', error);
    }
  }
  
  showTemporaryNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    
    const bgColor = type === 'success' ? '#10b981' : 
                   type === 'warning' ? '#f59e0b' : 
                   '#ef4444';
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 20000;
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-weight: 600;
      font-family: system-ui, -apple-system, sans-serif;
      animation: slideIn 0.3s ease;
      max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  watchForNavigation() {
    // Watch for URL changes in SPA
    let currentURL = location.href;
    new MutationObserver(() => {
      if (location.href !== currentURL) {
        currentURL = location.href;
        // Reset injection state and try again
        this.isInjected = false;
        this.retryCount = 0;
        
        // Remove existing button
        const existingButton = document.getElementById('promptdoctor-button');
        if (existingButton) {
          existingButton.remove();
        }
        
        // Wait a bit then try to inject again
        setTimeout(() => this.findAndInjectButton(), 1000);
      }
    }).observe(document, { subtree: true, childList: true });
  }
  
  setupMessageListener() {
    // Listen for messages from popup or background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'ping') {
        sendResponse({ status: 'active', injected: this.isInjected });
      } else if (request.action === 'inject-button') {
        // Manual trigger from popup
        console.log('PromptDoctor: Manual injection requested');
        const textarea = document.querySelector('textarea');
        if (textarea && !this.isInjected) {
          this.injectPromptDoctorButton(textarea);
          this.isInjected = true;
          sendResponse({ success: true, message: 'Button injected' });
        } else if (this.isInjected) {
          sendResponse({ success: false, message: 'Already injected' });
        } else {
          sendResponse({ success: false, message: 'No textarea found' });
        }
      }
    });
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PromptDoctorInjector();
  });
} else {
  new PromptDoctorInjector();
}

} // End of initialization guard