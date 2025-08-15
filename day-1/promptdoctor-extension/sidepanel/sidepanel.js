/**
 * PromptDoctor Side Panel Script
 * Persistent UI for managing prompt generation and history
 */

class PromptDoctorSidePanel {
  constructor() {
    this.currentSession = null;
    this.sessions = [];
    this.currentMode = 'basic';
    this.apiKey = null;
    this.port = null;
    this.applicationContext = null;
    this.contextEnabled = true;
    
    this.init();
  }
  
  async init() {
    console.log('PromptDoctor Side Panel initializing...');
    
    // Connect to background script
    this.connectToBackground();
    
    // Load saved state
    await this.loadState();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load last session if exists
    await this.loadLastSession();
    
    // Update UI
    this.updateUI();
  }
  
  connectToBackground() {
    // Create long-lived connection to background
    this.port = chrome.runtime.connect({ name: 'sidepanel' });
    
    this.port.onMessage.addListener((msg) => {
      console.log('Received message from background:', msg);
      this.handleBackgroundMessage(msg);
    });
    
    this.port.onDisconnect.addListener(() => {
      console.log('Disconnected from background, reconnecting...');
      setTimeout(() => this.connectToBackground(), 1000);
    });
  }
  
  handleBackgroundMessage(msg) {
    switch (msg.type) {
      case 'SESSION_UPDATE':
        this.updateSession(msg.session);
        break;
      case 'SESSION_COMPLETE':
        this.completeSession(msg.session);
        break;
      case 'SESSION_ERROR':
        this.handleSessionError(msg.error);
        break;
      case 'API_TEST_RESULT':
        this.handleAPITestResult(msg.success, msg.error);
        break;
    }
  }
  
  async loadState() {
    try {
      const state = await chrome.storage.local.get([
        'pd:currentMode',
        'pd:sessions',
        'pd:lastSession',
        'pd:settings',
        'anthropic_api_key',
        'pd:applicationContext',
        'pd:contextEnabled'
      ]);
      
      this.currentMode = state['pd:currentMode'] || 'basic';
      this.sessions = state['pd:sessions'] || [];
      this.apiKey = state.anthropic_api_key;
      this.applicationContext = state['pd:applicationContext'] || null;
      this.contextEnabled = state['pd:contextEnabled'] !== false; // Default to true
      
      // Update mode buttons
      this.setMode(this.currentMode);
      
      // Load context if exists
      if (this.applicationContext) {
        const contextInput = document.getElementById('context-input');
        if (contextInput) {
          contextInput.value = this.applicationContext;
          this.updateContextCharCount(this.applicationContext.length);
        }
      }
      
      // Update context enabled checkbox
      const contextEnabledCheckbox = document.getElementById('context-enabled');
      if (contextEnabledCheckbox) {
        contextEnabledCheckbox.checked = this.contextEnabled;
      }
      
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }
  
  async loadLastSession() {
    try {
      // First check for pending prompt from content script
      const pendingData = await chrome.storage.local.get(['pd:pendingPrompt']);
      
      if (pendingData['pd:pendingPrompt']) {
        // Load the pending prompt into the input
        const userInput = document.getElementById('user-request');
        if (userInput) {
          userInput.value = pendingData['pd:pendingPrompt'];
          // Clear the pending prompt
          chrome.storage.local.remove(['pd:pendingPrompt']);
          
          // Focus on the input
          userInput.focus();
          
          // Show a notification
          this.showNotification('Prompt loaded from Replit Agent', 'success');
        }
        return; // Don't load last session if we have a pending prompt
      }
      
      // Otherwise load last session
      const state = await chrome.storage.local.get(['pd:lastSession']);
      
      if (state['pd:lastSession']) {
        const session = this.sessions.find(s => s.id === state['pd:lastSession']);
        if (session) {
          this.displaySession(session);
        }
      }
    } catch (error) {
      console.error('Failed to load last session:', error);
    }
  }
  
  setupEventListeners() {
    // Mode toggle
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setMode(e.target.dataset.mode);
      });
    });
    
    // Analyze button
    document.getElementById('analyze-btn').addEventListener('click', () => {
      this.analyzeRequest();
    });
    
    // Clear button
    document.getElementById('clear-btn').addEventListener('click', () => {
      this.clearInput();
    });
    
    // Application Context button
    document.getElementById('context-btn').addEventListener('click', () => {
      this.toggleContextSection();
    });
    
    // Context section buttons
    document.getElementById('save-context').addEventListener('click', () => {
      this.saveApplicationContext();
    });
    
    document.getElementById('clear-context').addEventListener('click', () => {
      this.clearApplicationContext();
    });
    
    document.getElementById('close-context').addEventListener('click', () => {
      this.hideContextSection();
    });
    
    // Context enabled checkbox
    document.getElementById('context-enabled').addEventListener('change', (e) => {
      this.contextEnabled = e.target.checked;
      this.saveContextState();
    });
    
    // Context textarea character count
    document.getElementById('context-input').addEventListener('input', (e) => {
      this.updateContextCharCount(e.target.value.length);
    });
    
    // New session button
    document.getElementById('new-session').addEventListener('click', () => {
      this.newSession();
    });
    
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
      this.toggleSettings();
    });
    
    // History button
    document.getElementById('history-btn').addEventListener('click', () => {
      this.toggleHistory();
    });
    
    // API key management
    document.getElementById('save-api-key').addEventListener('click', () => {
      this.saveAPIKey();
    });
    
    document.getElementById('test-api-key').addEventListener('click', () => {
      this.testAPIKey();
    });
    
    // Example buttons
    document.querySelectorAll('.example-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const example = e.target.dataset.example;
        document.getElementById('user-request').value = example;
      });
    });
    
    // Copy all button
    document.getElementById('copy-all').addEventListener('click', () => {
      this.copyAllPrompts();
    });
    
    // Regenerate button
    document.getElementById('regenerate').addEventListener('click', () => {
      this.regeneratePrompts();
    });
    
    // Panel close buttons
    document.getElementById('close-history').addEventListener('click', () => {
      document.getElementById('history-panel').classList.remove('open');
    });
    
    document.getElementById('close-settings').addEventListener('click', () => {
      document.getElementById('settings-panel').classList.remove('open');
    });
    
    // Settings inputs
    document.getElementById('clear-all-data').addEventListener('click', () => {
      this.clearAllData();
    });
    
    // Enter key in textarea
    document.getElementById('user-request').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.analyzeRequest();
      }
    });
  }
  
  setMode(mode) {
    this.currentMode = mode;
    
    // Update UI
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Show/hide API section
    const apiSection = document.getElementById('api-key-section');
    const collapsedDiv = document.getElementById('api-key-collapsed');
    
    if (mode === 'ai') {
      if (this.apiKey) {
        // If we have an API key, show collapsed state
        if (!collapsedDiv) {
          apiSection.style.display = 'none';
          this.collapseAPISection();
        }
      } else {
        // No API key, show full section
        if (collapsedDiv) {
          collapsedDiv.remove();
        }
        apiSection.style.display = 'block';
        this.showNotification('AI mode requires an Anthropic API key', 'warning');
      }
    } else {
      // Basic mode - hide everything
      apiSection.style.display = 'none';
      if (collapsedDiv) {
        collapsedDiv.remove();
      }
    }
    
    // Save mode
    chrome.storage.local.set({ 'pd:currentMode': mode });
  }
  
  async analyzeRequest() {
    const userRequest = document.getElementById('user-request').value.trim();
    
    if (!userRequest) {
      this.showNotification('Please enter a request first', 'warning');
      return;
    }
    
    // Check API key for AI mode
    if (this.currentMode === 'ai' && !this.apiKey) {
      this.showNotification('Please add your API key for AI mode', 'error');
      this.setMode('basic');
      return;
    }
    
    // Create new session
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      createdAt: Date.now(),
      status: 'running',
      mode: this.currentMode,
      request: userRequest,
      prompts: []
    };
    
    this.currentSession = session;
    this.sessions.unshift(session);
    
    // Limit sessions
    if (this.sessions.length > 10) {
      this.sessions = this.sessions.slice(0, 10);
    }
    
    // Save state
    await this.saveState();
    
    // Update UI to show loading
    this.showLoadingState();
    
    // Get application context if enabled
    const context = this.getContextForAPICall();
    
    // Send to background for processing
    this.port.postMessage({
      type: 'ANALYZE_REQUEST',
      sessionId: sessionId,
      request: userRequest,
      mode: this.currentMode,
      apiKey: this.currentMode === 'ai' ? this.apiKey : null,
      applicationContext: context
    });
  }
  
  updateSession(session) {
    // Update session in memory
    const index = this.sessions.findIndex(s => s.id === session.id);
    if (index !== -1) {
      this.sessions[index] = session;
    }
    
    // Update current session
    if (this.currentSession && this.currentSession.id === session.id) {
      this.currentSession = session;
      
      // Update UI
      if (session.status === 'done') {
        this.displayResults(session.prompts);
      }
    }
    
    // Save state
    this.saveState();
  }
  
  completeSession(session) {
    console.log('Session complete:', session);
    this.updateSession(session);
    this.hideLoadingState();
    
    // Check if request was insufficient (needs clarification)
    if (session.insufficient || (session.prompts && session.prompts.length === 0)) {
      console.log('Request needs clarification:', session);
      this.displayClarificationNeeded(session);
    } else if (session.prompts && session.prompts.length > 0) {
      this.displayResults(session.prompts);
      this.updateStatus('Complete', 'success');
    } else {
      console.warn('No prompts in completed session:', session);
      this.showNotification('Analysis complete but no prompts generated', 'warning');
      this.updateStatus('Ready', 'idle');
    }
  }
  
  handleSessionError(error) {
    this.hideLoadingState();
    this.showNotification(`Analysis failed: ${error}`, 'error');
    this.updateStatus('Error', 'error');
    
    if (this.currentSession) {
      this.currentSession.status = 'error';
      this.currentSession.error = error;
      this.saveState();
    }
  }
  
  displayResults(prompts) {
    console.log('Displaying results:', prompts);
    
    if (!prompts || prompts.length === 0) {
      this.showNotification('No prompts generated', 'warning');
      console.error('No prompts to display');
      return;
    }
    
    // Hide other sections
    const emptyState = document.getElementById('empty-state');
    const loadingState = document.getElementById('loading-state');
    if (emptyState) emptyState.style.display = 'none';
    if (loadingState) loadingState.style.display = 'none';
    
    // Show results section
    const resultsSection = document.getElementById('results-section');
    if (!resultsSection) {
      console.error('Results section not found in DOM');
      return;
    }
    
    resultsSection.style.display = 'flex';
    
    // Clear and populate results
    const container = document.getElementById('results-container');
    if (!container) {
      console.error('Results container not found in DOM');
      return;
    }
    
    container.innerHTML = '';
    
    console.log(`Creating ${prompts.length} prompt cards`);
    prompts.forEach((prompt, index) => {
      const card = this.createPromptCard(prompt, index);
      container.appendChild(card);
    });
    
    // Scroll to top of results
    container.scrollTop = 0;
  }
  
  createPromptCard(prompt, index) {
    const card = document.createElement('div');
    card.className = 'prompt-card';
    card.dataset.index = index;
    
    const riskEmojis = {
      low: '🟢',
      medium: '🟡',
      high: '🔴'
    };
    
    const riskLevel = prompt.risk || 'medium';
    const riskEmoji = riskEmojis[riskLevel] || riskEmojis.medium;
    
    card.innerHTML = `
      <div class="prompt-header">
        <div class="prompt-title">
          <span class="step-number">Step ${index + 1}:</span>
          <span class="step-name">${prompt.title}</span>
        </div>
        <div class="prompt-controls">
          <span class="risk-emoji" title="${riskLevel === 'low' ? 'Easy' : riskLevel === 'high' ? 'Danger' : 'Caution'}" style="font-size: 14px;">
            ${riskEmoji}
          </span>
          <span class="category-tag">${prompt.category || 'general'}</span>
          <span class="expand-icon">▶</span>
        </div>
      </div>
      <div class="prompt-body">
        <div class="prompt-content">${prompt.content}</div>
        <div class="prompt-actions">
          <button class="btn btn-small btn-primary copy-btn" data-content="${this.escapeHtml(prompt.content)}">
            📋 Copy
          </button>
          <button class="btn btn-small btn-secondary complete-btn">
            ✓ Mark Complete
          </button>
        </div>
      </div>
    `;
    
    // Add event listeners
    const header = card.querySelector('.prompt-header');
    header.addEventListener('click', () => {
      card.classList.toggle('expanded');
    });
    
    const copyBtn = card.querySelector('.copy-btn');
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const content = e.target.dataset.content;
      this.copyToClipboard(this.unescapeHtml(content));
    });
    
    const completeBtn = card.querySelector('.complete-btn');
    completeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      card.classList.toggle('completed');
      completeBtn.textContent = card.classList.contains('completed') ? '↺ Undo' : '✓ Mark Complete';
    });
    
    return card;
  }
  
  displaySession(session) {
    // Clear input
    document.getElementById('user-request').value = session.request || '';
    
    // Display results if available
    if (session.prompts && session.prompts.length > 0) {
      this.displayResults(session.prompts);
    }
    
    this.currentSession = session;
  }
  
  displayClarificationNeeded(session) {
    console.log('Displaying clarification needed:', session);
    
    // Hide other sections
    const emptyState = document.getElementById('empty-state');
    const loadingState = document.getElementById('loading-state');
    const resultsSection = document.getElementById('results-section');
    
    if (emptyState) emptyState.style.display = 'none';
    if (loadingState) loadingState.style.display = 'none';
    if (resultsSection) resultsSection.style.display = 'none';
    
    // Create clarification UI
    const container = document.getElementById('results-container');
    if (!container) {
      // Use the main content area
      const contentArea = document.querySelector('.input-section').parentElement;
      const clarificationDiv = document.createElement('div');
      clarificationDiv.className = 'clarification-section';
      clarificationDiv.style.padding = '20px';
      clarificationDiv.style.background = '#fef3c7';
      clarificationDiv.style.borderRadius = '8px';
      clarificationDiv.style.margin = '16px';
      
      clarificationDiv.innerHTML = `
        <h3 style="color: #92400e; margin-bottom: 12px;">Need More Details</h3>
        <p style="color: #78350f; margin-bottom: 16px;">
          ${session.insufficientReason || 'Your request needs more specific details to generate safe prompts.'}
        </p>
        ${session.suggestions && session.suggestions.length > 0 ? `
          <div class="suggestions" style="margin-top: 16px;">
            <h4 style="color: #92400e; margin-bottom: 8px;">Try one of these examples:</h4>
            ${session.suggestions.map(s => `
              <button class="suggestion-btn" style="
                display: block;
                width: 100%;
                padding: 12px;
                margin-bottom: 8px;
                background: white;
                border: 1px solid #fbbf24;
                border-radius: 6px;
                text-align: left;
                cursor: pointer;
                font-size: 13px;
              " onclick="document.getElementById('user-request').value = '${s.template.replace(/'/g, "\\'")}'; this.parentElement.parentElement.remove();">
                <strong>${s.label}</strong><br>
                <span style="color: #6b7280; font-size: 12px;">${s.template}</span>
              </button>
            `).join('')}
          </div>
        ` : ''}
      `;
      
      // Insert after input section
      const inputSection = document.querySelector('.input-section');
      inputSection.parentNode.insertBefore(clarificationDiv, inputSection.nextSibling);
      
      // Update status
      this.updateStatus('Needs clarification', 'warning');
      
      return;
    }
    
    // If we have a results container, use it
    if (resultsSection) {
      resultsSection.style.display = 'flex';
      container.innerHTML = `
        <div class="clarification-content" style="padding: 20px; background: #fef3c7; border-radius: 8px;">
          <h3 style="color: #92400e;">Need More Details</h3>
          <p style="color: #78350f; margin: 12px 0;">
            ${session.insufficientReason || 'Your request needs more specific details to generate safe prompts.'}
          </p>
          ${session.suggestions && session.suggestions.length > 0 ? `
            <div class="suggestions">
              <h4 style="color: #92400e; margin: 16px 0 8px 0;">Try one of these examples:</h4>
              ${session.suggestions.map(s => `
                <button class="suggestion-btn" style="
                  display: block;
                  width: 100%;
                  padding: 12px;
                  margin-bottom: 8px;
                  background: white;
                  border: 1px solid #fbbf24;
                  border-radius: 6px;
                  text-align: left;
                  cursor: pointer;
                " onclick="document.getElementById('user-request').value = '${s.template.replace(/'/g, "\\'")}'; document.getElementById('analyze-btn').click();">
                  <strong>${s.label}</strong><br>
                  <span style="color: #6b7280; font-size: 12px;">${s.template}</span>
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }
    
    this.updateStatus('Needs clarification', 'warning');
  }
  
  showLoadingState() {
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('loading-state').style.display = 'flex';
    this.updateStatus('Analyzing...', 'running');
  }
  
  hideLoadingState() {
    document.getElementById('loading-state').style.display = 'none';
  }
  
  updateStatus(text, type = 'idle') {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    indicator.className = `status-indicator ${type}`;
    statusText.textContent = text;
  }
  
  async saveAPIKey() {
    const apiKeyInput = document.getElementById('api-key-input');
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      this.showNotification('Please enter an API key', 'error');
      return;
    }
    
    if (!apiKey.startsWith('sk-ant-')) {
      this.showNotification('Invalid API key format', 'error');
      return;
    }
    
    // Save API key
    await chrome.storage.local.set({ anthropic_api_key: apiKey });
    this.apiKey = apiKey;
    
    // Clear input for security
    apiKeyInput.value = '';
    apiKeyInput.placeholder = 'API key saved (hidden)';
    
    this.showNotification('API key saved successfully', 'success');
    
    // Test the key
    setTimeout(() => this.testAPIKey(), 500);
  }
  
  async testAPIKey() {
    if (!this.apiKey) {
      this.showNotification('No API key found', 'error');
      return;
    }
    
    const testBtn = document.getElementById('test-api-key');
    testBtn.textContent = 'Testing...';
    testBtn.disabled = true;
    
    // Send test request to background
    this.port.postMessage({
      type: 'TEST_API_KEY',
      apiKey: this.apiKey
    });
  }
  
  handleAPITestResult(success, error) {
    const testBtn = document.getElementById('test-api-key');
    testBtn.textContent = 'Test';
    testBtn.disabled = false;
    
    const statusDiv = document.getElementById('api-status');
    
    if (success) {
      statusDiv.className = 'api-status success';
      statusDiv.textContent = '✅ API key is working!';
      this.showNotification('API key verified', 'success');
      
      // Collapse the API section after successful test
      setTimeout(() => {
        this.collapseAPISection();
      }, 2000); // Wait 2 seconds so user sees the success message
    } else {
      statusDiv.className = 'api-status error';
      statusDiv.textContent = `❌ API test failed: ${error || 'Unknown error'}`;
      this.showNotification('API key test failed', 'error');
    }
  }
  
  collapseAPISection() {
    const apiSection = document.getElementById('api-key-section');
    if (apiSection) {
      // Create a collapsed version
      const collapsedDiv = document.createElement('div');
      collapsedDiv.id = 'api-key-collapsed';
      collapsedDiv.style.cssText = `
        padding: 8px 16px;
        background: #ecfdf5;
        border-bottom: 1px solid #10b981;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        transition: background 0.2s;
      `;
      
      collapsedDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #065f46; font-size: 13px;">✅ API Key Configured</span>
          <span style="color: #6b7280; font-size: 11px;">(Click to expand)</span>
        </div>
        <button id="expand-api-btn" style="
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          font-size: 12px;
          padding: 4px 8px;
        ">Change Key</button>
      `;
      
      // Add hover effect
      collapsedDiv.onmouseenter = () => {
        collapsedDiv.style.background = '#d1fae5';
      };
      collapsedDiv.onmouseleave = () => {
        collapsedDiv.style.background = '#ecfdf5';
      };
      
      // Add click handler to expand
      collapsedDiv.onclick = (e) => {
        if (!e.target.closest('#expand-api-btn')) {
          this.expandAPISection();
        }
      };
      
      // Add specific handler for change key button
      const expandBtn = collapsedDiv.querySelector('#expand-api-btn');
      if (expandBtn) {
        expandBtn.onclick = (e) => {
          e.stopPropagation();
          this.expandAPISection();
        };
      }
      
      // Hide the full section and show collapsed
      apiSection.style.display = 'none';
      apiSection.parentNode.insertBefore(collapsedDiv, apiSection);
    }
  }
  
  expandAPISection() {
    const apiSection = document.getElementById('api-key-section');
    const collapsedDiv = document.getElementById('api-key-collapsed');
    
    if (apiSection && collapsedDiv) {
      apiSection.style.display = 'block';
      collapsedDiv.remove();
      
      // Clear the success status message if it's still showing
      const statusDiv = document.getElementById('api-status');
      if (statusDiv && statusDiv.className === 'api-status success') {
        setTimeout(() => {
          statusDiv.style.display = 'none';
        }, 3000);
      }
    }
  }
  
  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showNotification('Copied to clipboard!', 'success');
    }).catch(err => {
      console.error('Copy failed:', err);
      this.showNotification('Copy failed', 'error');
    });
  }
  
  copyAllPrompts() {
    const prompts = document.querySelectorAll('.prompt-content');
    const allContent = Array.from(prompts).map(p => p.textContent).join('\n\n---\n\n');
    
    this.copyToClipboard(allContent);
  }
  
  regeneratePrompts() {
    if (this.currentSession && this.currentSession.request) {
      document.getElementById('user-request').value = this.currentSession.request;
      this.analyzeRequest();
    }
  }
  
  clearInput() {
    document.getElementById('user-request').value = '';
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('empty-state').style.display = 'flex';
  }
  
  newSession() {
    this.clearInput();
    this.currentSession = null;
    this.updateStatus('Ready', 'idle');
  }
  
  toggleHistory() {
    const panel = document.getElementById('history-panel');
    panel.classList.toggle('open');
    
    if (panel.classList.contains('open')) {
      this.populateHistory();
    }
  }
  
  populateHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    if (this.sessions.length === 0) {
      list.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">No sessions yet</p>';
      return;
    }
    
    this.sessions.forEach(session => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div class="history-date">${new Date(session.createdAt).toLocaleString()}</div>
        <div class="history-preview">${session.request || 'Untitled session'}</div>
      `;
      
      item.addEventListener('click', () => {
        this.displaySession(session);
        document.getElementById('history-panel').classList.remove('open');
      });
      
      list.appendChild(item);
    });
  }
  
  toggleSettings() {
    document.getElementById('settings-panel').classList.toggle('open');
  }
  
  async clearAllData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      await chrome.storage.local.remove([
        'pd:sessions',
        'pd:lastSession',
        'pd:currentMode',
        'pd:settings'
      ]);
      
      this.sessions = [];
      this.currentSession = null;
      this.clearInput();
      this.showNotification('All data cleared', 'success');
    }
  }
  
  async saveState() {
    try {
      await chrome.storage.local.set({
        'pd:sessions': this.sessions,
        'pd:lastSession': this.currentSession?.id || null
      });
      
      // Update session count
      document.getElementById('session-count').textContent = `${this.sessions.length} sessions`;
      
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }
  
  updateUI() {
    // Update session count
    document.getElementById('session-count').textContent = `${this.sessions.length} sessions`;
    
    // Show appropriate section
    if (this.currentSession && this.currentSession.prompts && this.currentSession.prompts.length > 0) {
      this.displayResults(this.currentSession.prompts);
    } else {
      document.getElementById('empty-state').style.display = 'flex';
    }
  }
  
  // Application Context Management Methods
  toggleContextSection() {
    const contextSection = document.getElementById('context-section');
    const resultsSection = document.getElementById('results-section');
    
    if (contextSection.style.display === 'none' || !contextSection.style.display) {
      contextSection.style.display = 'block';
      resultsSection.style.display = 'none';
    } else {
      contextSection.style.display = 'none';
    }
  }
  
  hideContextSection() {
    const contextSection = document.getElementById('context-section');
    contextSection.style.display = 'none';
  }
  
  async saveApplicationContext() {
    const contextInput = document.getElementById('context-input');
    const contextStatus = document.getElementById('context-status');
    
    if (!contextInput) return;
    
    const context = contextInput.value.trim();
    
    if (!context) {
      this.showNotification('Context cannot be empty', 'warning');
      return;
    }
    
    try {
      // Save to storage
      await chrome.storage.local.set({
        'pd:applicationContext': context,
        'pd:contextEnabled': this.contextEnabled
      });
      
      this.applicationContext = context;
      
      // Update status
      contextStatus.textContent = 'Saved';
      contextStatus.className = 'context-status saved';
      
      this.showNotification('Application context saved', 'success');
      
      // Clear status after 3 seconds
      setTimeout(() => {
        contextStatus.textContent = '';
        contextStatus.className = 'context-status';
      }, 3000);
      
    } catch (error) {
      console.error('Failed to save context:', error);
      contextStatus.textContent = 'Error saving';
      contextStatus.className = 'context-status error';
      this.showNotification('Failed to save context', 'error');
    }
  }
  
  async clearApplicationContext() {
    const contextInput = document.getElementById('context-input');
    const contextStatus = document.getElementById('context-status');
    
    if (contextInput) {
      contextInput.value = '';
      this.updateContextCharCount(0);
    }
    
    try {
      // Remove from storage
      await chrome.storage.local.remove(['pd:applicationContext']);
      this.applicationContext = null;
      
      // Update status
      contextStatus.textContent = 'Cleared';
      contextStatus.className = 'context-status';
      
      this.showNotification('Application context cleared', 'success');
      
      // Clear status after 3 seconds
      setTimeout(() => {
        contextStatus.textContent = '';
        contextStatus.className = 'context-status';
      }, 3000);
      
    } catch (error) {
      console.error('Failed to clear context:', error);
      this.showNotification('Failed to clear context', 'error');
    }
  }
  
  async saveContextState() {
    try {
      await chrome.storage.local.set({
        'pd:contextEnabled': this.contextEnabled
      });
    } catch (error) {
      console.error('Failed to save context state:', error);
    }
  }
  
  updateContextCharCount(count) {
    const charCountElement = document.getElementById('context-char-count');
    if (charCountElement) {
      charCountElement.textContent = `${count.toLocaleString()} characters`;
    }
  }
  
  getContextForAPICall() {
    if (!this.contextEnabled || !this.applicationContext) {
      return null;
    }
    
    return this.applicationContext;
  }
  
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
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
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      background: ${colors[type]};
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideUp 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  unescapeHtml(text) {
    const div = document.createElement('div');
    div.innerHTML = text;
    return div.textContent;
  }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    to {
      opacity: 0;
      transform: translateX(-50%) translateY(-10px);
    }
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PromptDoctorSidePanel();
  });
} else {
  new PromptDoctorSidePanel();
}