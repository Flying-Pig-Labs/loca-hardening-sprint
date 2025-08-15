// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Welcome page DOM loaded');
  
  // Context management
  const contextInput = document.getElementById('context-input');
  const charCount = document.getElementById('char-count');
  const contextStatus = document.getElementById('context-status');
  const saveBtn = document.getElementById('save-context-btn');
  const skipBtn = document.getElementById('skip-context-btn');
  
  // Log elements to ensure they exist
  console.log('Elements found:', {
    contextInput: !!contextInput,
    charCount: !!charCount,
    contextStatus: !!contextStatus,
    saveBtn: !!saveBtn,
    skipBtn: !!skipBtn
  });
  
  // Load existing context if any
  chrome.storage.local.get(['pd:applicationContext'], (result) => {
    if (result['pd:applicationContext']) {
      contextInput.value = result['pd:applicationContext'];
      updateCharCount();
    }
  });
  
  // Update character count
  function updateCharCount() {
    if (contextInput && charCount) {
      const count = contextInput.value.length;
      charCount.textContent = `${count.toLocaleString()} characters`;
      console.log('Character count updated:', count);
    }
  }
  
  // Listen for context input changes
  if (contextInput) {
    contextInput.addEventListener('input', updateCharCount);
    console.log('Input listener added');
  }
  
  // Save context button
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      console.log('Save button clicked');
      const context = contextInput.value.trim();
      
      if (!context) {
        showStatus('Please enter some context before saving', 'error');
        return;
      }
      
      try {
        await chrome.storage.local.set({
          'pd:applicationContext': context,
          'pd:contextEnabled': true
        });
        
        showStatus('Context saved successfully! You can now close this page.', 'success');
        console.log('Context saved successfully');
        
        // Auto-close after successful save
        setTimeout(() => {
          window.close();
        }, 3000);
        
      } catch (error) {
        showStatus('Failed to save context. Please try again.', 'error');
        console.error('Failed to save context:', error);
      }
    });
    console.log('Save button listener added');
  } else {
    console.error('Save button not found!')
  }
  
  // Skip button
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      window.close();
    });
  }
  
  // Show status message
  function showStatus(message, type) {
    contextStatus.textContent = message;
    contextStatus.style.color = type === 'success' ? '#10b981' : 
                                type === 'error' ? '#ef4444' : '#6b7280';
    
    // Clear status after 5 seconds
    setTimeout(() => {
      contextStatus.textContent = '';
    }, 5000);
  }

  // Auto-close after 5 minutes if no action taken
  setTimeout(() => {
    window.close();
  }, 300000); // 5 minutes
  
  // Open Prompt Doctor button
  const openBtn = document.getElementById('open-promptdoctor');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      // Open the side panel
      chrome.runtime.sendMessage({ action: 'openSidePanel' }, () => {
        // Close the welcome page after opening side panel
        setTimeout(() => {
          window.close();
        }, 500);
      });
    });
  }
}); // End of DOMContentLoaded