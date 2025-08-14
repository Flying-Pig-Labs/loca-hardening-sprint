# 🧪 PromptDoctor Extension - Testing Guide

## 🚀 Quick Start Installation

### Step 1: Load Extension in Chrome
1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"** button
5. Select the `promptdoctor-extension` folder
6. Extension should appear in the list with ID shown

### Step 2: Verify Installation
- Look for the 🩺 icon in Chrome's extension toolbar
- Click it to see the popup showing "PromptDoctor" status
- If icon not visible, click the puzzle piece icon and pin PromptDoctor

## 🎯 Testing on Test Page (Recommended First)

### Local Test Page
1. Open `test-page.html` in Chrome:
   ```
   file:///[full-path]/promptdoctor-extension/test-page.html
   ```
2. Wait 1-2 seconds for button injection
3. Look for "🩺 PromptDoctor" button near the textarea
4. Verify all behaviors listed below

## 🌐 Testing on Real Replit

### Finding Agent Interface
1. Go to [https://replit.com](https://replit.com)
2. Sign in to your account
3. Open any Repl or create a new one
4. Look for the Agent interface:
   - Usually has a large textarea
   - Placeholder text like "Describe what you want to build..."
   - May be in a chat-like interface

### Button Injection Verification
The button should appear within 1-30 seconds, depending on page load

## ✅ Testing Checklist

### Basic Functionality
- [ ] Extension loads without errors
- [ ] No console errors in DevTools
- [ ] Button appears on test page
- [ ] Button appears on real Replit Agent interface
- [ ] Button positioned correctly (top-right of textarea)

### Visual & Interactions
- [ ] Button has gradient purple background
- [ ] Hover effect: lifts slightly with shadow
- [ ] Click animation: scales down briefly
- [ ] Shows 🩺 emoji and "PromptDoctor" text

### Behavior Testing
- [ ] **With prompt text**: Shows green success notification
- [ ] **Empty textarea**: Shows orange warning notification
- [ ] **Scroll page**: Button follows textarea position
- [ ] **Resize window**: Button adjusts position

### Extension Popup
- [ ] Click extension icon in toolbar
- [ ] Shows correct status:
  - ✅ "Active on this Replit page" (when on Replit with button)
  - 🔍 "Looking for Agent interface..." (on Replit, no button yet)
  - 💤 "Navigate to Replit.com to activate" (on other sites)
- [ ] Usage count increments (after using button)
- [ ] Last used time updates

### SPA Navigation (Replit is a Single Page App)
- [ ] Navigate between different Repls
- [ ] Button re-injects on navigation
- [ ] No duplicate buttons appear
- [ ] Previous button is removed properly

## 🐛 Debugging Common Issues

### Button Doesn't Appear

1. **Check Console** (F12 → Console tab):
   ```
   Look for: "PromptDoctor: Initializing..."
   Look for: "PromptDoctor: Button injected successfully"
   ```

2. **Verify Selectors**: The extension looks for textareas with these patterns:
   - placeholder containing: "prompt", "describe", "tell", "ask"
   - aria-label containing: "prompt", "agent"
   - Parent containers with "agent" or "prompt" in class names

3. **Manual Injection Test** (in DevTools Console):
   ```javascript
   // Check if content script is loaded
   if (typeof PromptDoctorInjector !== 'undefined') {
     console.log('Content script is loaded');
   } else {
     console.log('Content script NOT loaded');
   }
   ```

### Button Appears Multiple Times
- Check for navigation events causing re-injection
- Verify `isInjected` flag is working
- Look for duplicate script injections

### Extension Not Working
1. Reload the extension:
   - Go to `chrome://extensions/`
   - Click refresh icon on PromptDoctor card
2. Reload the Replit page
3. Check permissions are granted for replit.com

## 📊 Performance Testing

### Memory Usage
1. Open Chrome Task Manager (Shift+Esc)
2. Find "Extension: PromptDoctor"
3. Should use < 50MB memory
4. No memory leaks on navigation

### Injection Speed
- Measure time from page load to button appearance
- Should be < 2 seconds on fast connections
- Maximum wait time: 30 seconds

## 🔍 Advanced Testing

### Different Replit Environments
Test on various Replit pages:
- [ ] New Repl creation page
- [ ] Existing Repl with Agent
- [ ] Repl without Agent (button shouldn't appear)
- [ ] Mobile view (responsive design)

### Edge Cases
- [ ] Very long prompts (1000+ characters)
- [ ] Special characters in prompts
- [ ] Rapid clicking of button
- [ ] Multiple tabs with Replit open

## 📝 Test Results Template

```markdown
Date: [DATE]
Version: 0.1.0
Tester: [NAME]

Environment:
- Chrome Version: [VERSION]
- OS: [Windows/Mac/Linux]
- Replit URL: [URL]

Results:
- Installation: ✅/❌
- Button Injection: ✅/❌
- Interactions: ✅/❌
- Popup Status: ✅/❌
- Navigation: ✅/❌

Issues Found:
1. [Issue description]
2. [Issue description]

Notes:
[Any additional observations]
```

## 🚦 Success Criteria

The extension is ready when:
1. ✅ All checklist items pass
2. ✅ No console errors
3. ✅ Button appears within 2 seconds on test page
4. ✅ Button appears within 30 seconds on Replit
5. ✅ All user interactions work smoothly

## 🎉 Chunk 1 Complete!

If all tests pass, Chunk 1 is successfully implemented and ready for Chunk 2 (Modal Overlay & UI Framework).