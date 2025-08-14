# PromptDoctor Prompt Templates

This directory contains all the prompt templates and system prompts used by the PromptDoctor extension.

## Directory Structure

- `ai-system-prompts/` - Prompts sent to Claude API for analysis
- `basic-templates/` - Templates used in basic (non-AI) mode
- `examples/` - Example prompts shown to users
- `clarification/` - Templates for when requests need clarification

## Files

### AI System Prompts
- `analysis-prompt.md` - Main prompt for analyzing user requests
- `enhancement-prompt.md` - Prompt for enhancing basic prompts with AI

### Basic Templates
- `safety-system.md` - Safety system instructions template
- `pre-implementation.md` - Pre-implementation validation template
- `implementation.md` - Safe implementation guidelines template
- `verification.md` - Final verification checklist template

### Examples
- `quick-examples.md` - Example requests shown in the UI
- `clarification-suggestions.md` - Suggestion templates for vague requests

## Usage

These prompts are loaded by the extension and used to:
1. Analyze user requests with Claude API (AI mode)
2. Generate safety prompts using templates (Basic mode)
3. Provide helpful examples and suggestions

## Customization

To modify prompts:
1. Edit the relevant `.md` file in this directory
2. Update the corresponding loader in the extension code
3. Test thoroughly to ensure prompts generate correctly