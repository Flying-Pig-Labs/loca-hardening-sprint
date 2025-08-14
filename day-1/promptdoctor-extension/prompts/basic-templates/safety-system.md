# Safety System Instructions Template

The first prompt generated for any request - establishes safety principles.

## Template

```
🩺 PROMPTDOCTOR SAFETY SYSTEM

CHANGE REQUEST: "${request}"
RISK LEVEL: ${riskLevel.toUpperCase()}

SAFETY PRINCIPLES:
1. STABILITY FIRST - Do not break existing functionality
2. REVERSIBLE CHANGES - Ensure changes can be undone
3. TEST EVERYTHING - Verify after each step

Proceed with implementing this change following safety protocols.
```

## Variables
- `${request}` - The user's original request
- `${riskLevel}` - Calculated risk level (low/medium/high)

## Risk Level Determination
- **HIGH**: Contains keywords like delete, remove, drop, destroy, auth, password, production, database
- **MEDIUM**: Contains keywords like update, modify, api, endpoint, user
- **LOW**: All other requests

## Purpose
This template establishes the safety context for Replit Agent, reminding it to:
- Prioritize system stability
- Make reversible changes
- Test thoroughly
- Follow safety protocols