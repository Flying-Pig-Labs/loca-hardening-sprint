# 🩺 PromptDoctor Chrome Extension

## Safe Replit Deployments Made Simple

A Chrome extension that transforms unsafe prompts into structured, safe deployment sequences for Replit Agent.

## 🎯 Core Value
- **Smart Analysis**: Uses Anthropic AI to analyze user requests
- **Safety First**: Creates sequential, safety-first prompts with risk assessment
- **One-Click Integration**: Auto-fills enhanced prompts back into Replit Agent

## 📁 Project Structure
```
promptdoctor-extension/
├── manifest.json              # Extension configuration
├── popup/                     # Settings & API key management
├── content/                   # Main injection logic
├── background/                # Service worker & API handling
├── utils/                     # Analysis & safety logic
└── assets/                    # Icons & branding
```

## 🚀 Development Setup

### Prerequisites
- Chrome browser (latest version)
- Anthropic API key
- Node.js (for development tools)

### Installation
1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `promptdoctor-extension` directory

### Configuration
1. Click the extension icon in Chrome toolbar
2. Enter your Anthropic API key in the popup
3. Save settings

## 📐 Implementation Status

### ✅ Chunk 1: Basic Extension Setup & Button Injection
- [x] Project structure
- [x] Manifest V3 configuration
- [x] Basic content script injection
- [x] Button injection next to Replit prompt

### ⏳ Chunk 2: Modal Overlay & UI Framework
- [ ] Modal overlay component
- [ ] Collapsible cards for prompts
- [ ] Copy functionality
- [ ] Auto-fill integration

### ⏳ Chunk 3: Simple Analysis & Prompt Generation
- [ ] Basic prompt analysis
- [ ] Template generation
- [ ] Safety validation

### ⏳ Chunk 4: Anthropic AI Integration
- [ ] API integration
- [ ] Smart analysis logic
- [ ] Enhanced prompt generation

### ⏳ Chunk 5: Advanced UX & Polish
- [ ] Animations & transitions
- [ ] Error handling
- [ ] User feedback

### ⏳ Chunk 6: Production & Publishing
- [ ] Chrome Web Store preparation
- [ ] Documentation
- [ ] Release

## 🔧 Development

### Testing
```bash
# Load extension in Chrome
# Navigate to replit.com
# Open any Repl with Agent
# Look for 🩺 PromptDoctor button
```

### Building for Production
```bash
# Create distribution package
zip -r promptdoctor.zip . -x ".*" -x "__MACOSX"
```

## 📝 License
MIT

## 🤝 Contributing
Contributions welcome! Please read our contributing guidelines.