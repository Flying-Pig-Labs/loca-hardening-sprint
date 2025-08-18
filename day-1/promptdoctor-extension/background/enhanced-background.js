/**
 * Enhanced PromptDoctor Background Service Worker
 * Integrates context-aware multi-phase prompt orchestration
 */

// Import all necessary scripts
importScripts('./api-handler.js');
importScripts('../utils/context-loader.js');
importScripts('../utils/prompt-orchestrator.js');
importScripts('../utils/enhanced-ai-analysis.js');

// Store active connections and state
const connections = new Map();
let contextLoader = null;
let orchestrator = null;
let enhancedAnalyzer = null;

// Initialize modules on startup
async function initializeModules() {
  try {
    // Initialize context loader
    contextLoader = new ContextLoader();
    
    // Initialize orchestrator
    orchestrator = new PromptOrchestrator();
    await orchestrator.initialize();
    
    console.log('Enhanced modules initialized successfully');
  } catch (error) {
    console.error('Failed to initialize modules:', error);
  }
}

// Call initialization
initializeModules();

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('PromptDoctor Enhanced installed:', details.reason);
  
  // Don't set panel behavior since we have a popup that handles opening
  // The popup will open the side panel programmatically
  
  // Set the side panel options to ensure it's enabled globally
  chrome.sidePanel
    .setOptions({
      enabled: true,
      path: 'sidepanel/sidepanel.html'
    })
    .catch(error => console.error('Failed to set panel options:', error));
  
  if (details.reason === 'install') {
    // First time install - create default context file
    chrome.storage.local.set({
      promptdoctor_enabled: true,
      installation_date: Date.now(),
      usage_count: 0,
      last_used: null,
      'pd:sessions': [],
      'pd:currentMode': 'ai', // Default to AI mode for enhanced features
      'pd:userContext': '' // Empty context, user can fill later
    });
    
    // Open welcome page with instructions
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  } else if (details.reason === 'update') {
    console.log('PromptDoctor updated to enhanced version', chrome.runtime.getManifest().version);
    
    // Migrate existing data if needed
    migrateData();
  }
});

// Data migration for updates
async function migrateData() {
  try {
    const data = await chrome.storage.local.get(null);
    
    // Ensure context field exists
    if (!data['pd:userContext']) {
      await chrome.storage.local.set({ 'pd:userContext': '' });
    }
    
    // Set mode to AI if it was basic (to use enhanced features)
    if (data['pd:currentMode'] === 'basic') {
      await chrome.storage.local.set({ 'pd:currentMode': 'ai' });
    }
    
    console.log('Data migration completed');
  } catch (error) {
    console.error('Migration error:', error);
  }
}

// Handle long-lived connections (from side panel)
chrome.runtime.onConnect.addListener((port) => {
  console.log('New connection:', port.name);
  
  if (port.name === 'sidepanel') {
    connections.set('sidepanel', port);
    
    port.onMessage.addListener((msg) => {
      handleSidePanelMessage(msg, port);
    });
    
    port.onDisconnect.addListener(() => {
      console.log('Side panel disconnected');
      connections.delete('sidepanel');
    });
  }
});

// Enhanced message handler
async function handleSidePanelMessage(msg, port) {
  console.log('Side panel message:', msg);
  
  switch (msg.type) {
    case 'ANALYZE_REQUEST':
      await analyzeRequestEnhanced(msg, port);
      break;
      
    case 'LOAD_CONTEXT':
      await loadContext(port);
      break;
      
    case 'SAVE_CONTEXT':
      await saveContext(msg.context, port);
      break;
      
    case 'TEST_API_KEY':
      await testAPIKey(msg.apiKey, port);
      break;
      
    case 'GET_SESSIONS':
      const sessions = await chrome.storage.local.get(['pd:sessions']);
      port.postMessage({
        type: 'SESSIONS_DATA',
        sessions: sessions['pd:sessions'] || []
      });
      break;
  }
}

// Enhanced analysis with multi-phase orchestration
async function analyzeRequestEnhanced(msg, port) {
  const { sessionId, request, mode, apiKey, applicationContext } = msg;
  
  try {
    let result;
    
    // Always use orchestrator for structured workflow
    if (!orchestrator) {
      orchestrator = new PromptOrchestrator();
      await orchestrator.initialize();
    }
    
    // If application context is provided, set it in the orchestrator
    if (applicationContext) {
      console.log('Using application context:', applicationContext.length, 'characters');
      // Store context in orchestrator for use in analysis
      if (orchestrator.contextLoader) {
        orchestrator.context = orchestrator.contextLoader.parseContextFile(applicationContext);
      }
    }
    
    // Check if we should use enhanced AI analysis
    if (mode === 'ai' && apiKey) {
      console.log('Using enhanced AI analysis with orchestration');
      
      // Initialize enhanced analyzer with API key
      enhancedAnalyzer = new EnhancedAIAnalysisEngine(apiKey);
      await enhancedAnalyzer.initialize();
      
      // Set application context in enhanced analyzer
      if (applicationContext && enhancedAnalyzer.contextLoader) {
        enhancedAnalyzer.context = enhancedAnalyzer.contextLoader.parseContextFile(applicationContext);
      }
      
      // Get orchestrated and AI-enhanced workflow
      result = await enhancedAnalyzer.analyzeRequest(request);
    } else {
      console.log('Using orchestration without AI enhancement');
      
      // Use orchestrator alone for structured workflow
      result = await orchestrator.orchestrateRequest(request, null);
    }
    
    // Format session with enhanced structure
    const session = formatEnhancedSession(sessionId, request, result);
    
    console.log('Enhanced analysis complete, session:', session);
    
    // Send progress updates for multi-phase workflow
    if (result.prompts && result.prompts.length > 3) {
      // Send initial update showing phases
      port.postMessage({
        type: 'SESSION_UPDATE',
        session: {
          ...session,
          status: 'analyzing',
          phases: result.prompts.map(p => ({
            title: p.title,
            category: p.category,
            phase: p.phase
          }))
        }
      });
      
      // Small delay for UI effect
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Send complete session
    port.postMessage({
      type: 'SESSION_COMPLETE',
      session: session
    });
    
  } catch (error) {
    console.error('Enhanced analysis error:', error);
    
    // Fallback to basic analysis on error
    try {
      console.log('Falling back to basic orchestration');
      const basicResult = await performBasicOrchestration(request);
      
      const session = formatEnhancedSession(sessionId, request, basicResult);
      
      port.postMessage({
        type: 'SESSION_COMPLETE',
        session: session
      });
    } catch (fallbackError) {
      port.postMessage({
        type: 'SESSION_ERROR',
        error: `Analysis failed: ${error.message}. Fallback also failed: ${fallbackError.message}`
      });
    }
  }
}

// Format enhanced session with multi-phase structure
function formatEnhancedSession(sessionId, request, result) {
  // Group prompts by phase for better organization
  const phaseGroups = {};
  
  if (result.prompts) {
    result.prompts.forEach(prompt => {
      const phase = prompt.phase || 0;
      if (!phaseGroups[phase]) {
        phaseGroups[phase] = [];
      }
      phaseGroups[phase].push(prompt);
    });
  }
  
  return {
    id: sessionId,
    status: 'done',
    prompts: result.prompts || [],
    phaseGroups: phaseGroups,
    confidence: result.confidence,
    riskLevel: result.riskLevel || result.risk,
    riskFactors: result.riskFactors || [],
    changeTypes: result.changeTypes || [],
    request: request,
    originalRequest: result.originalRequest || request,
    analysis: result.analysis || {},
    insufficient: result.sufficient === false,
    insufficientReason: result.insufficient_reason || result.reason,
    suggestions: result.suggestions || [],
    enhanced: result.enhanced || false,
    multiPhase: true,
    phaseCount: Object.keys(phaseGroups).length
  };
}

// Load context file
async function loadContext(port) {
  try {
    if (!contextLoader) {
      contextLoader = new ContextLoader();
    }
    
    // Try to load user-saved context first
    const context = await contextLoader.loadStoredContext();
    
    // If no user context, try to load default .context file
    if (!context || !context.overview) {
      const defaultContext = await loadDefaultContextFile();
      if (defaultContext) {
        await contextLoader.saveContext(defaultContext);
      }
    }
    
    port.postMessage({
      type: 'CONTEXT_LOADED',
      context: context
    });
    
  } catch (error) {
    console.error('Failed to load context:', error);
    port.postMessage({
      type: 'CONTEXT_ERROR',
      error: error.message
    });
  }
}

// Load default .context file from extension
async function loadDefaultContextFile() {
  try {
    const response = await fetch(chrome.runtime.getURL('.context'));
    if (response.ok) {
      return await response.text();
    }
  } catch (error) {
    console.log('No default .context file found');
  }
  return null;
}

// Save user-provided context
async function saveContext(contextText, port) {
  try {
    if (!contextLoader) {
      contextLoader = new ContextLoader();
    }
    
    const parsed = await contextLoader.saveContext(contextText);
    
    // Reinitialize orchestrator with new context
    if (orchestrator) {
      await orchestrator.initialize();
    }
    
    port.postMessage({
      type: 'CONTEXT_SAVED',
      context: parsed
    });
    
  } catch (error) {
    console.error('Failed to save context:', error);
    port.postMessage({
      type: 'CONTEXT_ERROR',
      error: error.message
    });
  }
}

// Basic orchestration fallback
async function performBasicOrchestration(request) {
  const requestLower = request.toLowerCase();
  
  // Determine risk level
  let riskLevel = 'low';
  if (/delete|remove|drop|destroy|auth|password|production|database|payment/i.test(request)) {
    riskLevel = 'high';
  } else if (/update|modify|api|endpoint|user|integration/i.test(request)) {
    riskLevel = 'medium';
  }
  
  // Create multi-phase workflow even in basic mode
  const prompts = [
    {
      title: "Safety System Instructions",
      category: "system",
      phase: 0,
      risk: riskLevel,
      content: `🩺 PROMPTDOCTOR SAFETY SYSTEM - ENHANCED

CHANGE REQUEST: "${request}"
RISK LEVEL: ${riskLevel.toUpperCase()}

MANDATORY SAFETY PRINCIPLES:
1. STABILITY FIRST - Do not break existing functionality
2. REVERSIBLE CHANGES - Ensure every change can be undone
3. TEST EVERYTHING - Verify functionality after each step
4. DOCUMENT CHANGES - Keep clear records of modifications
5. MONITOR IMPACT - Watch for unexpected side effects

This is a multi-phase operation. Complete each phase before proceeding.`
    },
    {
      title: "Research & Discovery Phase",
      category: "research",
      phase: 1,
      risk: "low",
      content: `🔍 RESEARCH & DISCOVERY

Before implementing "${request}", research and understand:

1. Current system state and implementation
2. Dependencies and integration points
3. Potential risks and impacts
4. Similar implementations or patterns
5. Best practices for this type of change

Document your findings before proceeding to planning.`
    },
    {
      title: "Planning & Design Phase",
      category: "planning",
      phase: 2,
      risk: "low",
      content: `📐 PLANNING & DESIGN

Based on research, create an implementation plan for "${request}":

1. Define clear success criteria
2. Break down into atomic steps
3. Identify rollback points
4. Plan testing approach
5. Document architectural decisions

Ensure plan is reviewed before implementation.`
    },
    {
      title: "Pre-Implementation Validation",
      category: "validation",
      phase: 3,
      risk: riskLevel,
      content: `🛡️ PRE-IMPLEMENTATION VALIDATION

Validate system state before changes:

1. Verify current functionality works
2. Check all dependencies available
3. Ensure backups are current
4. Confirm rollback capability
5. Validate test environment ready

Only proceed when all validations pass.`
    },
    {
      title: "Implementation Phase",
      category: "implementation",
      phase: 4,
      risk: riskLevel,
      content: `💻 IMPLEMENTATION

Implement "${request}" following the plan:

SAFETY GUIDELINES:
- Make incremental, atomic changes
- Test after each modification
- Maintain backward compatibility
- Document all changes
- Monitor for issues

Follow the implementation plan step by step.`
    },
    {
      title: "Testing & Verification Phase",
      category: "testing",
      phase: 5,
      risk: "medium",
      content: `🧪 TESTING & VERIFICATION

Thoroughly test the implementation:

1. Unit tests for new code
2. Integration tests for connections
3. Functional tests for features
4. Performance testing
5. Security validation

Ensure all tests pass before deployment.`
    }
  ];
  
  // Add deployment phase for high-risk changes
  if (riskLevel === 'high') {
    prompts.push({
      title: "Deployment & Monitoring Phase",
      category: "deployment",
      phase: 6,
      risk: "high",
      content: `🚀 DEPLOYMENT & MONITORING

Deploy high-risk change with care:

1. Deploy to staging first
2. Monitor key metrics
3. Gradual production rollout
4. Active monitoring during deployment
5. Ready to rollback if needed

Confirm success before closing.`
    });
  }
  
  return {
    sufficient: true,
    confidence: 0.75,
    riskLevel: riskLevel,
    riskFactors: [`Risk level: ${riskLevel}`, 'Multi-phase implementation recommended'],
    changeTypes: ['general'],
    prompts: prompts,
    analysis: {
      intent: 'unknown',
      scope: 'unclear',
      complexity: 'medium'
    }
  };
}

// Test API key functionality
async function testAPIKey(apiKey, port) {
  try {
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
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Test' }]
      })
    });
    
    if (response.ok) {
      port.postMessage({
        type: 'API_TEST_RESULT',
        success: true
      });
    } else {
      const error = await response.text();
      port.postMessage({
        type: 'API_TEST_RESULT',
        success: false,
        error: `API test failed: ${response.status}`
      });
    }
  } catch (error) {
    port.postMessage({
      type: 'API_TEST_RESULT',
      success: false,
      error: error.message
    });
  }
}

// Tab handlers remain the same but with context awareness
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    
    if (tab.url && tab.url.includes('replit.com')) {
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        console.log('Content script already active on tab', tab.id);
      } catch (error) {
        console.log('Injecting enhanced content script into tab', tab.id);
        
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content/content.css']
        });
        
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content.js']
        });
        
        console.log('Enhanced content script injected successfully');
      }
    }
  } catch (error) {
    console.error('Error handling tab activation:', error);
  }
});

// Tab update handler
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('replit.com')) {
    try {
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        } catch (error) {
          console.log('Injecting enhanced content script after navigation');
          
          await chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ['content/content.css']
          });
          
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content/content.js']
          });
        }
      }, 500);
    } catch (error) {
      console.error('Error on tab update:', error);
    }
  }
});

// Message handler for communication with content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Enhanced background received message:', request);
  
  switch (request.action) {
    case 'openSidePanel':
      // Open the side panel
      if (sender.tab) {
        // From content script - use the tab's window
        chrome.sidePanel.open({ windowId: sender.tab.windowId });
      } else {
        // From popup or other context
        chrome.windows.getCurrent(window => {
          chrome.sidePanel.open({ windowId: window.id });
        });
      }
      return false;
      
    case 'ping':
      // Respond to ping from content script
      sendResponse({ success: true });
      return false;
      
    default:
      console.log('Unknown action:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
      return false;
  }
});

// Note: action.onClicked won't fire because we have a popup configured in manifest
// The side panel can be opened via:
// 1. The popup UI (most reliable)
// 2. The fallback modal in content script (works around Chrome bug)
// 3. Manual click on extension icon if setPanelBehavior is configured

console.log('Enhanced PromptDoctor background service initialized');