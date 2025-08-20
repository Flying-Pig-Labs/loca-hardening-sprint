/**
 * PromptDoctor Popup Script
 * Handles settings and API key management
 */

let currentMode = 'basic';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded - DOMContentLoaded fired');
  
  // Debug: Check what elements exist
  console.log('Status element:', document.getElementById('status'));
  console.log('Mode selector:', document.querySelector('.mode-selector'));
  console.log('Mode options:', document.querySelectorAll('.mode-option'));
  
  // Make sure mode selector is visible
  const modeSelector = document.querySelector('.mode-selector');
  if (modeSelector) {
    console.log('Mode selector found, making visible');
    modeSelector.style.display = 'block';
    modeSelector.style.visibility = 'visible';
    modeSelector.style.opacity = '1';
    
    // Set default selected state
    const basicOption = document.getElementById('mode-basic');
    if (basicOption && !basicOption.classList.contains('selected')) {
      basicOption.classList.add('selected');
      console.log('Set basic mode as default selected');
    }
  } else {
    console.error('Mode selector NOT found!');
  }
  
  try {
    await loadSettings();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  
  try {
    await checkExtensionStatus();
  } catch (error) {
    console.error('Error checking status:', error);
  }
  
  try {
    setupEventListeners();
  } catch (error) {
    console.error('Error setting up listeners:', error);
  }
});

async function loadSettings() {
  try {
    const settings = await chrome.storage.local.get(['promptdoctor_mode', 'anthropic_api_key']);
    
    currentMode = settings.promptdoctor_mode || 'basic';
    selectMode(currentMode);
    
    if (settings.anthropic_api_key) {
      const apiKeyInput = document.getElementById('api-key');
      if (apiKeyInput) {
        apiKeyInput.placeholder = 'API key saved (hidden for security)';
        apiKeyInput.setAttribute('data-has-key', 'true');
      }
    }
    
    updateUIForMode();
    
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

function setupEventListeners() {
  // Mode selection
  document.querySelectorAll('.mode-option').forEach(option => {
    option.addEventListener('click', (e) => {
      const mode = e.target.dataset.mode;
      selectMode(mode);
    });
  });
  
  // Save API key button
  const saveBtn = document.getElementById('save-key-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveAPIKey);
  }
  
  // Test API key button
  const testBtn = document.getElementById('test-key-btn');
  if (testBtn) {
    testBtn.addEventListener('click', testAPIKey);
  }
  
  // Open side panel button
  const sidePanelBtn = document.getElementById('open-sidepanel');
  if (sidePanelBtn) {
    sidePanelBtn.addEventListener('click', openSidePanel);
  }
}

function selectMode(mode) {
  console.log('selectMode called with:', mode);
  currentMode = mode;
  
  // Update UI
  const modeOptions = document.querySelectorAll('.mode-option');
  console.log('Found mode options:', modeOptions.length);
  
  modeOptions.forEach(option => {
    option.classList.remove('selected');
  });
  
  const selectedOption = document.getElementById(`mode-${mode}`);
  if (selectedOption) {
    selectedOption.classList.add('selected');
    console.log('Selected option:', selectedOption);
  } else {
    console.error('Could not find mode option:', `mode-${mode}`);
  }
  
  updateUIForMode();
  
  // Save mode
  chrome.storage.local.set({ promptdoctor_mode: mode });
}

function updateUIForMode() {
  const apiSection = document.getElementById('api-section');
  
  if (currentMode === 'ai') {
    apiSection.style.display = 'block';
    loadUsageStats();
  } else {
    apiSection.style.display = 'none';
  }
}

async function saveAPIKey() {
  const apiKey = document.getElementById('api-key').value.trim();
  
  if (!apiKey) {
    showNotification('Please enter a valid API key', 'error');
    return;
  }
  
  if (!apiKey.startsWith('sk-ant-')) {
    showNotification('Invalid API key format. Should start with sk-ant-', 'error');
    return;
  }
  
  try {
    await chrome.storage.local.set({ anthropic_api_key: apiKey });
    
    // Clear the input and update placeholder
    const apiKeyInput = document.getElementById('api-key');
    apiKeyInput.value = '';
    apiKeyInput.placeholder = 'API key saved (hidden for security)';
    apiKeyInput.setAttribute('data-has-key', 'true');
    
    showNotification('API key saved successfully!', 'success');
    
    // Test the key automatically
    setTimeout(testAPIKey, 1000);
    
  } catch (error) {
    console.error('Failed to save API key:', error);
    showNotification('Failed to save API key', 'error');
  }
}

async function testAPIKey() {
  const testBtn = document.getElementById('test-key-btn');
  if (!testBtn) return;
  
  const originalText = testBtn.textContent;
  
  testBtn.textContent = 'Testing...';
  testBtn.disabled = true;
  
  try {
    const settings = await chrome.storage.local.get(['anthropic_api_key']);
    const apiKey = settings.anthropic_api_key;
    
    console.log('Testing API key, found:', apiKey ? 'Yes' : 'No');
    
    if (!apiKey) {
      showNotification('No API key found - please save your key first', 'error');
      testBtn.textContent = originalText;
      testBtn.disabled = false;
      return;
    }
    
    // Use background script to test API (avoids CORS issues)
    console.log('Testing API key via background script...');
    
    const response = await chrome.runtime.sendMessage({
      action: 'testAnthropicAPI',
      apiKey: apiKey
    });
    
    console.log('Test response:', response);
    
    if (response.success) {
      showNotification('✅ API key working!', 'success');
      loadUsageStats();
    } else {
      console.error('API test failed:', response.error);
      showNotification(`API test failed: ${response.error || 'Unknown error'}`, 'error');
    }
    
  } catch (error) {
    console.error('API test failed:', error);
    showNotification('API test failed - check your connection', 'error');
  } finally {
    testBtn.textContent = originalText;
    testBtn.disabled = false;
  }
}

async function loadUsageStats() {
  try {
    const stats = await chrome.storage.local.get(['api_usage_count', 'last_usage_reset']);
    const usageCount = stats.api_usage_count || 0;
    const lastReset = stats.last_usage_reset || Date.now();
    
    // Reset monthly
    const now = Date.now();
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    
    if (now - lastReset > monthMs) {
      await chrome.storage.local.set({
        api_usage_count: 0,
        last_usage_reset: now
      });
      usageCount = 0;
    }
    
    const usageStatsDiv = document.getElementById('usage-stats');
    if (usageStatsDiv) {
      usageStatsDiv.textContent = `API calls this month: ${usageCount}`;
    }
    
  } catch (error) {
    console.error('Failed to load usage stats:', error);
  }
}

async function checkExtensionStatus() {
  const statusDiv = document.getElementById('status');
  
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab.url && tab.url.includes('replit.com')) {
      // On Replit - check if content script is working
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        if (response && response.status === 'active') {
          statusDiv.className = 'status active';
          statusDiv.innerHTML = '<span>✅</span> Active on this Replit page';
        } else {
          statusDiv.className = 'status warning';
          statusDiv.innerHTML = '<span>⚠️</span> Loading - refresh if needed';
        }
      } catch (error) {
        statusDiv.className = 'status inactive';
        statusDiv.innerHTML = '<span>⚠️</span> Not loaded - refresh the page';
      }
    } else {
      statusDiv.className = 'status inactive';
      statusDiv.innerHTML = '<span>💤</span> Only works on Replit.com';
    }
  } catch (error) {
    statusDiv.className = 'status inactive';
    statusDiv.innerHTML = '<span>❌</span> Extension error';
  }
}

function showNotification(message, type) {
  // Create notification element
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    animation: slideIn 0.3s ease;
    ${type === 'success' ? 'background: #10b981; color: white;' : ''}
    ${type === 'error' ? 'background: #ef4444; color: white;' : ''}
    ${type === 'warning' ? 'background: #f59e0b; color: white;' : ''}
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

async function openSidePanel() {
  try {
    // Get current window
    const currentWindow = await chrome.windows.getCurrent();
    
    // Open side panel for the current window
    await chrome.sidePanel.open({ windowId: currentWindow.id });
    
    // Try to close the popup after opening side panel
    // Some contexts may not support window.close()
    try {
      if (typeof window.close === 'function') {
        window.close();
      }
    } catch (closeError) {
      // Silently ignore if window.close() doesn't work
      console.log('Could not close popup window:', closeError);
    }
  } catch (error) {
    console.error('Failed to open side panel:', error);
    showNotification('Failed to open side panel', 'error');
  }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
`;
document.head.appendChild(style);