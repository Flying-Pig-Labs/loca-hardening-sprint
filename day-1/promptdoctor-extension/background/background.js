/**
 * PromptDoctor Background Service Worker
 * Handles extension lifecycle, side panel, and API communication
 */

// Import API handler
importScripts('./api-handler.js');

// Store active connections
const connections = new Map();

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('PromptDoctor installed:', details.reason);
  
  // Set side panel behavior - open on toolbar icon click
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(error => console.error('Failed to set panel behavior:', error));
  
  if (details.reason === 'install') {
    // First time install
    chrome.storage.local.set({
      promptdoctor_enabled: true,
      installation_date: Date.now(),
      usage_count: 0,
      last_used: null,
      'pd:sessions': [],
      'pd:currentMode': 'basic'
    });
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('PromptDoctor updated to version', chrome.runtime.getManifest().version);
  }
});

// Tab activation handler - ensure button injection on active tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    
    if (tab.url && tab.url.includes('replit.com')) {
      // Check if content script is already present
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        console.log('Content script already active on tab', tab.id);
      } catch (error) {
        // Content script not present, inject it
        console.log('Injecting content script into tab', tab.id);
        
        // Inject CSS first
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content/content.css']
        });
        
        // Then inject JavaScript
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content.js']
        });
        
        console.log('Content script injected successfully');
      }
    }
  } catch (error) {
    console.error('Error handling tab activation:', error);
  }
});

// Tab update handler - inject on Replit navigation
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('replit.com')) {
    try {
      // Small delay to let page fully load
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        } catch (error) {
          // Content script not present, inject it
          console.log('Injecting content script after navigation');
          
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

// Handle side panel messages
async function handleSidePanelMessage(msg, port) {
  console.log('Side panel message:', msg);
  
  switch (msg.type) {
    case 'ANALYZE_REQUEST':
      await analyzeRequest(msg, port);
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

// Analyze request using appropriate method
async function analyzeRequest(msg, port) {
  const { sessionId, request, mode, apiKey } = msg;
  
  try {
    let result;
    
    if (mode === 'ai' && apiKey) {
      // Use AI analysis
      console.log('Using AI analysis');
      const apiHandler = new AnthropicAPIHandler();
      result = await apiHandler.analyzeRequest(request, apiKey);
    } else {
      // Use basic analysis
      console.log('Using basic analysis');
      result = performBasicAnalysis(request);
    }
    
    // Create session with results
    const session = {
      id: sessionId,
      status: 'done',
      prompts: result.prompts || [],
      confidence: result.confidence,
      riskLevel: result.riskLevel || result.risk,
      request: request,
      insufficient: result.sufficient === false,
      insufficientReason: result.insufficient_reason || result.reason,
      suggestions: result.suggestions || []
    };
    
    console.log('Analysis complete, session:', session);
    
    // Send back to side panel
    port.postMessage({
      type: 'SESSION_COMPLETE',
      session: session
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    port.postMessage({
      type: 'SESSION_ERROR',
      error: error.message
    });
  }
}

// Basic analysis function
function performBasicAnalysis(request) {
  const requestLower = request.toLowerCase();
  
  // Determine risk level
  let riskLevel = 'low';
  if (/delete|remove|drop|destroy|auth|password|production|database/i.test(request)) {
    riskLevel = 'high';
  } else if (/update|modify|api|endpoint|user/i.test(request)) {
    riskLevel = 'medium';
  }
  
  // Generate prompts
  const prompts = [
    {
      title: "Safety System Instructions",
      category: "system",
      risk: riskLevel,
      content: `🩺 PROMPTDOCTOR SAFETY SYSTEM

CHANGE REQUEST: "${request}"
RISK LEVEL: ${riskLevel.toUpperCase()}

SAFETY PRINCIPLES:
1. STABILITY FIRST - Do not break existing functionality
2. REVERSIBLE CHANGES - Ensure changes can be undone
3. TEST EVERYTHING - Verify after each step

Proceed with implementing this change following safety protocols.`
    },
    {
      title: "Pre-Implementation Check",
      category: "validation",
      risk: "low",
      content: `Before implementing "${request}", validate current state:

1. Test existing functionality
2. Document current behavior
3. Identify potential impacts
4. Create backup if needed

Only proceed after confirming system is stable.`
    },
    {
      title: "Safe Implementation",
      category: "implementation",
      risk: riskLevel,
      content: `Implement: "${request}"

SAFETY GUIDELINES:
- Make incremental changes
- Test after each modification
- Preserve existing functionality
- Document all changes
- Use version control

Follow best practices for your specific change type.`
    }
  ];
  
  if (riskLevel !== 'low') {
    prompts.push({
      title: "Final Verification",
      category: "verification",
      risk: riskLevel,
      content: `Complete verification for: "${request}"

CHECKLIST:
□ All functionality tested
□ Performance acceptable
□ Security validated
□ Documentation updated
□ Rollback plan ready

Ensure everything works before marking complete.`
    });
  }
  
  return {
    sufficient: true,
    confidence: 0.8,
    riskLevel: riskLevel,
    prompts: prompts
  };
}

// Test API key
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
        messages: [{ role: 'user', content: 'Hi' }]
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
        error: error
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

// Message handler for communication with content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  switch (request.action) {
    case 'testAnthropicAPI':
      // Test API key by making a simple request
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': request.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      })
      .then(response => response.ok ? 
        response.json().then(data => sendResponse({ success: true })) :
        response.text().then(error => sendResponse({ success: false, error }))
      )
      .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
      
    case 'get_settings':
      chrome.storage.local.get(null, (settings) => {
        sendResponse(settings);
      });
      return true; // Keep message channel open
      
    case 'save_settings':
      chrome.storage.local.set(request.settings, () => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'track_usage':
      // Track when PromptDoctor is used
      chrome.storage.local.get(['usage_count'], (data) => {
        chrome.storage.local.set({
          usage_count: (data.usage_count || 0) + 1,
          last_used: Date.now()
        });
      });
      sendResponse({ success: true });
      return true;
      
    case 'log':
      // Log messages from content script
      console.log('[Content]:', request.message);
      sendResponse({ success: true });
      return true;
      
    case 'openSidePanel':
      // Open the side panel when button is clicked
      chrome.windows.getCurrent((window) => {
        chrome.sidePanel.open({ windowId: window.id })
          .then(() => {
            console.log('Side panel opened successfully');
            // Store the prompt if provided
            if (request.prompt) {
              chrome.storage.local.set({ 'pd:pendingPrompt': request.prompt });
            }
            sendResponse({ success: true });
          })
          .catch(error => {
            console.error('Failed to open side panel:', error);
            sendResponse({ success: false, error: error.message });
          });
      });
      return true; // Keep channel open for async response
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Handle extension icon click (backup if popup doesn't work)
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url && tab.url.includes('replit.com')) {
    // Send message to content script to activate
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'activate' });
    } catch (error) {
      console.error('Could not activate PromptDoctor:', error);
    }
  }
});