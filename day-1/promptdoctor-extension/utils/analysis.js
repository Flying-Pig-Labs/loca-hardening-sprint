/**
 * PromptDoctor Analysis Engine
 * Classifies user requests and determines appropriate safety measures
 */

class AnalysisEngine {
  constructor() {
    this.changePatterns = {
      // Frontend/UI patterns
      web: {
        patterns: [
          /ui|interface|form|button|page|component|style|design|frontend|react|vue|html|css|styling|layout|responsive|mobile/i,
          /navbar|header|footer|menu|modal|popup|dropdown|tooltip|banner|card|grid|flex/i,
          /color|font|typography|spacing|margin|padding|border|shadow|animation|transition/i
        ],
        keywords: ['ui', 'interface', 'form', 'button', 'page', 'component', 'style', 'design', 'frontend']
      },
      
      // API/Backend patterns  
      api: {
        patterns: [
          /api|endpoint|server|backend|logic|function|route|controller|service|middleware/i,
          /get|post|put|delete|patch|request|response|json|xml|rest|graphql/i,
          /validation|sanitization|processing|calculation|algorithm|business.?logic/i
        ],
        keywords: ['api', 'endpoint', 'server', 'backend', 'logic', 'function', 'route']
      },
      
      // Authentication patterns
      auth: {
        patterns: [
          /auth|login|logout|signin|signup|register|password|token|jwt|session|cookie/i,
          /oauth|sso|2fa|multi.?factor|permission|role|access|security|encryption/i,
          /user|account|profile|credential|authentication|authorization/i
        ],
        keywords: ['auth', 'login', 'user', 'password', 'token', 'session']
      },
      
      // Database patterns
      database: {
        patterns: [
          /database|db|table|schema|migration|model|entity|collection|document/i,
          /sql|mysql|postgres|mongodb|sqlite|prisma|sequelize|orm|query/i,
          /create.?table|alter.?table|drop.?table|index|constraint|foreign.?key/i,
          /insert|update|delete|select|join|where|order.?by|group.?by/i
        ],
        keywords: ['database', 'db', 'table', 'schema', 'migration', 'model']
      }
    };
    
    this.riskFactors = {
      high: [
        /delete|remove|drop|destroy|clear|wipe|reset/i,
        /migration|schema|alter.?table|database/i,
        /auth|password|security|permission|role|access/i,
        /production|prod|live|deploy/i,
        /payment|billing|charge|money|credit.?card/i
      ],
      medium: [
        /update|modify|change|edit|replace/i,
        /api|endpoint|backend|server/i,
        /user|account|profile/i,
        /validation|sanitization/i,
        /integration|external|third.?party/i
      ],
      low: [
        /add|create|new|build|make/i,
        /ui|interface|style|design|frontend/i,
        /display|show|render|view/i,
        /text|content|copy|label/i
      ]
    };
  }
  
  analyzeRequest(userRequest) {
    const request = userRequest.toLowerCase().trim();
    
    // Check if request is too vague
    if (this.isTooVague(request)) {
      return this.createInsufficientResult(userRequest);
    }
    
    // Classify change types
    const changeTypes = this.classifyChangeTypes(request);
    
    // Assess risk level
    const riskLevel = this.assessRisk(request, changeTypes);
    
    // Generate structured prompts
    const prompts = this.generatePrompts(userRequest, changeTypes, riskLevel);
    
    return {
      sufficient: true,
      confidence: this.calculateConfidence(request, changeTypes),
      changeTypes: changeTypes,
      riskLevel: riskLevel,
      prompts: prompts,
      originalRequest: userRequest
    };
  }
  
  isTooVague(request) {
    // Check for overly vague requests
    const vaguePatterns = [
      /^(fix|update|change|modify|improve|make.+better|enhance)$/,
      /^(help|can you|please|i need|i want)$/,
      /^(bug|error|issue|problem)$/,
      /^(feature|functionality|component)$/,
      /^(add something|create something|build something)$/
    ];
    
    // Also check length - very short requests are often vague
    if (request.length < 10) {
      return true;
    }
    
    return vaguePatterns.some(pattern => pattern.test(request));
  }
  
  classifyChangeTypes(request) {
    const types = [];
    
    // Check each category
    for (const [type, config] of Object.entries(this.changePatterns)) {
      const hasPattern = config.patterns.some(pattern => pattern.test(request));
      const hasKeyword = config.keywords.some(keyword => request.includes(keyword));
      
      if (hasPattern || hasKeyword) {
        types.push(type);
      }
    }
    
    // Default to 'web' if no specific type detected but request seems valid
    if (types.length === 0) {
      types.push('web');
    }
    
    return types;
  }
  
  assessRisk(request, changeTypes) {
    let riskScore = 0;
    
    // Check risk patterns
    for (const [level, patterns] of Object.entries(this.riskFactors)) {
      const matches = patterns.filter(pattern => pattern.test(request)).length;
      
      switch (level) {
        case 'high':
          riskScore += matches * 3;
          break;
        case 'medium':
          riskScore += matches * 2;
          break;
        case 'low':
          riskScore += matches * 1;
          break;
      }
    }
    
    // Adjust based on change types
    if (changeTypes.includes('database')) riskScore += 2;
    if (changeTypes.includes('auth')) riskScore += 2;
    if (changeTypes.includes('api')) riskScore += 1;
    
    // Determine final risk level
    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }
  
  calculateConfidence(request, changeTypes) {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for specific keywords
    if (changeTypes.length > 0) confidence += 0.2;
    if (request.length > 20) confidence += 0.1;
    if (request.includes('with') || request.includes('using')) confidence += 0.1;
    
    // Lower confidence for vague language
    if (request.includes('somehow') || request.includes('maybe')) confidence -= 0.2;
    if (request.includes('better') || request.includes('improve')) confidence -= 0.1;
    
    return Math.min(Math.max(confidence, 0.1), 0.9);
  }
  
  generatePrompts(userRequest, changeTypes, riskLevel) {
    const prompts = [];
    
    // Always start with system prompt
    prompts.push(this.generateSystemPrompt(userRequest, changeTypes, riskLevel));
    
    // Generate type-specific prompts
    for (const type of changeTypes) {
      switch (type) {
        case 'web':
          prompts.push(...this.generateWebPrompts(userRequest, riskLevel));
          break;
        case 'api':
          prompts.push(...this.generateAPIPrompts(userRequest, riskLevel));
          break;
        case 'auth':
          prompts.push(...this.generateAuthPrompts(userRequest, riskLevel));
          break;
        case 'database':
          prompts.push(...this.generateDatabasePrompts(userRequest, riskLevel));
          break;
      }
    }
    
    // Always end with verification prompt for medium/high risk
    if (riskLevel !== 'low') {
      prompts.push(this.generateVerificationPrompt(userRequest, changeTypes, riskLevel));
    }
    
    return prompts;
  }
  
  generateSystemPrompt(userRequest, changeTypes, riskLevel) {
    const riskEmoji = {
      low: '🟢',
      medium: '🟡', 
      high: '🔴'
    };
    
    return {
      title: "Safety System Instructions",
      category: "system",
      risk: riskLevel,
      content: `🩺 PROMPTDOCTOR SAFETY SYSTEM

CHANGE REQUEST: "${userRequest}"
AFFECTED SYSTEMS: ${changeTypes.join(', ').toUpperCase()}
RISK LEVEL: ${riskEmoji[riskLevel]} ${riskLevel.toUpperCase()}

CORE SAFETY PRINCIPLES:
1. STABILITY FIRST - Do not break existing functionality
2. REVERSIBLE CHANGES - Ensure every change can be undone
3. TEST EVERYTHING - Verify functionality after each step
4. DOCUMENT CHANGES - Update relevant documentation

MANDATORY SAFETY ACTIONS:
- [ ] Test existing functionality before making changes
- [ ] Create backup/checkpoint before starting
- [ ] Make incremental changes (one component at a time)
- [ ] Test after each significant modification
- [ ] Document what was changed and why
- [ ] Prepare rollback plan

${riskLevel === 'high' ? `
⚠️ HIGH RISK OPERATION:
This change affects critical systems. Extra caution required:
- Double-check all modifications
- Test thoroughly in development first
- Have rollback plan ready
- Consider impact on users/data
` : ''}

Remember: When in doubt, choose the safer approach. Your goal is a working, stable system.

Now proceed with implementing this change following these safety protocols.`
    };
  }
  
  generateWebPrompts(userRequest, riskLevel) {
    const prompts = [];
    
    // Pre-implementation check
    prompts.push({
      title: "Frontend Pre-Implementation Check",
      category: "web-validation",
      risk: "low",
      content: `Before implementing "${userRequest}", validate the current frontend state:

CURRENT STATE VALIDATION:
1. Test existing UI functionality:
   - Navigate through all major user flows
   - Test forms, buttons, and interactive elements
   - Check responsive design on different screen sizes
   - Note any existing console errors or warnings

2. Document current behavior:
   - Take screenshots of areas that will change
   - Note current styling and layout
   - List any JavaScript dependencies or libraries
   - Record current user experience flows

3. Identify potential impact:
   - What components might be affected?
   - Are there shared CSS classes or styles?
   - Will this change affect other pages/components?
   - Are there any accessibility considerations?

SAFETY CHECKLIST:
- [ ] All existing functionality works properly
- [ ] No console errors in current state
- [ ] Responsive design functions correctly
- [ ] Forms and interactions work as expected
- [ ] Accessibility features are functional

Only proceed after confirming the current frontend is stable and well-documented.`
    });
    
    // Implementation
    prompts.push({
      title: "Safe Frontend Implementation",
      category: "web-implementation",
      risk: riskLevel,
      content: `Implement: "${userRequest}"

SAFE IMPLEMENTATION STRATEGY:
1. Incremental Development:
   - Make one change at a time
   - Test immediately after each change
   - Commit/save work after each working step
   - Don't make multiple simultaneous changes

2. Preserve Existing Functionality:
   - Keep existing CSS classes and IDs where possible
   - Add new styles rather than modifying global ones
   - Ensure new JavaScript doesn't conflict with existing code
   - Maintain current responsive design patterns

3. Code Quality Standards:
   - Use semantic HTML elements
   - Follow consistent naming conventions
   - Add comments for complex functionality
   - Ensure code is readable and maintainable

TESTING DURING IMPLEMENTATION:
- [ ] Component renders correctly in browser
- [ ] No new JavaScript errors in console
- [ ] Responsive design works on mobile/tablet
- [ ] Existing functionality remains unaffected
- [ ] New functionality works as intended
- [ ] Performance hasn't degraded noticeably

${riskLevel === 'high' ? `
⚠️ EXTRA PRECAUTIONS (High Risk):
- Test on multiple browsers if possible
- Verify accessibility compliance
- Check for any security implications
- Consider user data or privacy impact
` : ''}

Document any unexpected issues or deviations from the original plan.`
    });
    
    return prompts;
  }
  
  generateAPIPrompts(userRequest, riskLevel) {
    const prompts = [];
    
    prompts.push({
      title: "API Safety Validation",
      category: "api-validation", 
      risk: "medium",
      content: `Before modifying API functionality for "${userRequest}", establish current baseline:

CURRENT API STATE ASSESSMENT:
1. Test existing endpoints:
   - Verify all current endpoints respond correctly
   - Test with various input parameters
   - Document current response formats and status codes
   - Note current response times and performance

2. Identify system dependencies:
   - What endpoints will be modified or affected?
   - Which functions/modules call the code being changed?
   - Are there external systems depending on this API?
   - What database queries or external services are involved?

3. Document current contracts:
   - Input parameter requirements and types
   - Output response formats (JSON structure)
   - Error handling and error response formats
   - Authentication/authorization requirements

BACKWARD COMPATIBILITY CHECK:
- [ ] Current API contracts documented
- [ ] External dependencies identified
- [ ] Database schema reviewed
- [ ] Authentication flows tested
- [ ] Error handling verified

CRITICAL: Ensure backward compatibility unless explicitly planning breaking changes.`
    });
    
    prompts.push({
      title: "API Implementation with Safety",
      category: "api-implementation",
      risk: riskLevel,
      content: `Implement API changes for: "${userRequest}"

SAFE API IMPLEMENTATION:
1. Preserve Existing Interfaces:
   - Keep current endpoint URLs unchanged
   - Maintain existing parameter names and types
   - Preserve response format structure
   - Don't remove fields that clients might expect

2. Incremental Implementation:
   - Modify one function/endpoint at a time
   - Test each change individually before proceeding
   - Add new functionality before removing old (if applicable)
   - Use feature flags or versioning if available

3. Robust Error Handling:
   - Maintain existing error codes and messages
   - Add proper error handling for new logic
   - Ensure graceful degradation if new features fail
   - Validate all input parameters thoroughly

4. Security Considerations:
   - Sanitize and validate all inputs
   - Maintain existing authentication checks
   - Don't expose sensitive information in responses
   - Follow secure coding practices

TESTING REQUIREMENTS:
- [ ] Unit tests pass for all modified functions
- [ ] Integration tests verify endpoint behavior
- [ ] Error scenarios handled appropriately
- [ ] Performance hasn't degraded significantly
- [ ] Security validations in place
- [ ] Backward compatibility maintained

${riskLevel === 'high' ? `
⚠️ HIGH RISK API CHANGES:
- Consider API versioning for breaking changes
- Plan migration strategy for clients
- Implement comprehensive logging
- Have immediate rollback plan ready
` : ''}

Document any breaking changes or new requirements for API consumers.`
    });
    
    return prompts;
  }
  
  generateAuthPrompts(userRequest, riskLevel) {
    const prompts = [];
    
    prompts.push({
      title: "Authentication Security Assessment",
      category: "auth-validation",
      risk: "high",
      content: `⚠️ SECURITY CRITICAL: Before implementing "${userRequest}", complete security assessment:

CURRENT AUTHENTICATION REVIEW:
1. Document existing auth system:
   - Current authentication methods (password, OAuth, etc.)
   - Session management approach (JWT, cookies, etc.)
   - Password requirements and storage method
   - User data collection and storage

2. Security baseline verification:
   - Passwords are properly hashed (bcrypt, Argon2, etc.)
   - Session tokens are secure and expire appropriately
   - Input validation prevents injection attacks
   - HTTPS is enforced for all auth endpoints

3. Compliance and privacy check:
   - User data handling follows privacy requirements
   - Password reset flow is secure
   - Account lockout policies in place
   - Audit logging for security events

SECURITY CHECKLIST:
- [ ] Current auth system documented and secure
- [ ] Password storage follows best practices
- [ ] Session management is robust
- [ ] Input validation prevents attacks
- [ ] HTTPS enforced
- [ ] Privacy requirements met

DO NOT PROCEED unless current security posture is verified and documented.`
    });
    
    prompts.push({
      title: "Secure Authentication Implementation", 
      category: "auth-implementation",
      risk: "high",
      content: `Implement authentication feature: "${userRequest}"

🔒 SECURITY-FIRST IMPLEMENTATION:

1. Secure Coding Practices:
   - Hash passwords with bcrypt (min 12 rounds) or Argon2
   - Use cryptographically secure random tokens
   - Implement proper session management
   - Validate and sanitize ALL inputs
   - Use parameterized queries to prevent SQL injection

2. Authentication Best Practices:
   - Implement rate limiting on auth endpoints
   - Use secure password requirements (length, complexity)
   - Implement account lockout after failed attempts
   - Secure password reset flow with time-limited tokens
   - Log authentication events for monitoring

3. Session Security:
   - Use secure, httpOnly cookies for sessions
   - Implement proper session expiration
   - Regenerate session IDs after login
   - Secure logout that invalidates sessions
   - Consider JWT with proper validation if used

4. Data Protection:
   - Never store passwords in plain text
   - Minimize collection of sensitive user data
   - Encrypt sensitive data at rest if required
   - Secure transmission with HTTPS only

MANDATORY SECURITY TESTING:
- [ ] Password hashing verified (never plain text)
- [ ] SQL injection prevention tested
- [ ] Session security validated
- [ ] Rate limiting implemented
- [ ] HTTPS enforced
- [ ] Input validation comprehensive
- [ ] Authentication flow secure end-to-end

⚠️ CRITICAL: Have security expert review before production deployment.

Test thoroughly with various attack scenarios before considering complete.`
    });
    
    return prompts;
  }
  
  generateDatabasePrompts(userRequest, riskLevel) {
    const prompts = [];
    
    prompts.push({
      title: "Database Change Safety Protocol",
      category: "database-validation",
      risk: "high", 
      content: `🔴 CRITICAL DATABASE OPERATION: "${userRequest}"

MANDATORY PRE-CHANGE PROCEDURES:
1. Complete Database Backup:
   - Create full database backup and verify it works
   - Test backup restoration process
   - Document backup location and restoration steps
   - Ensure backup includes all relevant data and schema

2. Document Current State:
   - Export current database schema
   - Document all table relationships and constraints
   - Note any stored procedures, triggers, or functions
   - Record current data volumes and key metrics

3. Migration Planning:
   - Plan exact steps for schema changes
   - Prepare rollback migration scripts
   - Identify potential data loss scenarios
   - Estimate downtime requirements

4. Impact Assessment:
   - What applications depend on this database?
   - Which tables/fields will be affected?
   - Are there any foreign key constraints?
   - Will this break existing queries or reports?

SAFETY CHECKLIST:
- [ ] Database backup completed and verified
- [ ] Rollback plan documented and tested
- [ ] All dependencies identified
- [ ] Migration scripts prepared
- [ ] Downtime window planned

DO NOT PROCEED WITHOUT CONFIRMED BACKUP AND ROLLBACK PLAN.`
    });
    
    prompts.push({
      title: "Safe Database Implementation",
      category: "database-implementation", 
      risk: "high",
      content: `Execute database changes for: "${userRequest}"

🔴 CRITICAL IMPLEMENTATION PROTOCOL:

1. Pre-Execution Final Check:
   - Confirm backup is complete and restorable
   - Verify rollback scripts are ready
   - Ensure no active users during change window
   - Have database administrator available if possible

2. Step-by-Step Execution:
   - Execute ONE migration step at a time
   - Verify each step before proceeding to next
   - Check data integrity after each change
   - Monitor for any errors or warnings
   - Document any unexpected behavior

3. Real-Time Monitoring:
   - Watch for database lock contention
   - Monitor database logs for errors
   - Check application connectivity during changes
   - Be prepared to rollback immediately if issues arise

4. Data Integrity Validation:
   - Verify all data migrated correctly
   - Check foreign key constraints still valid
   - Validate data types and constraints
   - Ensure no data corruption occurred

MANDATORY VALIDATION STEPS:
- [ ] Each migration step completed successfully
- [ ] No error messages in database logs
- [ ] Data integrity verified
- [ ] Application can connect and query successfully
- [ ] All constraints and relationships intact
- [ ] Performance hasn't degraded significantly

IMMEDIATE ROLLBACK CONDITIONS:
- Any data loss detected
- Constraint violations
- Application connectivity issues
- Significant performance degradation
- Any unexpected errors

⚠️ STOP IMMEDIATELY if any validation fails. Execute rollback plan.

Only mark complete after thorough post-change verification.`
    });
    
    return prompts;
  }
  
  generateVerificationPrompt(userRequest, changeTypes, riskLevel) {
    return {
      title: "Final Safety Verification",
      category: "verification",
      risk: riskLevel,
      content: `Complete final verification for: "${userRequest}"

POST-IMPLEMENTATION VERIFICATION:

1. System-Wide Testing:
   - Test all major application functionality
   - Verify the specific change works as intended
   - Check that existing features still work properly
   - Test user workflows end-to-end

2. Performance and Stability:
   - Monitor application performance
   - Check for memory leaks or resource issues
   - Verify no new errors in logs
   - Ensure response times are acceptable

3. Security and Data Integrity:
   - Verify no sensitive information exposed
   - Check that data validation still works
   - Ensure authentication/authorization intact
   - Confirm no new security vulnerabilities

4. Documentation and Cleanup:
   - Update relevant documentation
   - Clean up any temporary files or code
   - Document lessons learned
   - Update deployment procedures if needed

FINAL VERIFICATION CHECKLIST:
- [ ] All functionality tested and working
- [ ] Performance within acceptable range
- [ ] No new security vulnerabilities
- [ ] Documentation updated
- [ ] Change properly logged
- [ ] Rollback procedures confirmed

${riskLevel === 'high' ? `
⚠️ HIGH RISK - EXTENDED MONITORING:
- Monitor system for next 24-48 hours
- Have rollback plan ready for immediate use
- Document any issues for future improvements
- Consider gradual rollout if possible
` : ''}

🎉 Congratulations! Your deployment should now be safer and more reliable.`
    };
  }
  
  createInsufficientResult(userRequest) {
    const suggestions = this.generateClarificationSuggestions(userRequest);
    
    return {
      sufficient: false,
      reason: "Request needs more specific details to generate safe prompts",
      originalRequest: userRequest,
      suggestions: suggestions
    };
  }
  
  generateClarificationSuggestions(userRequest) {
    const request = userRequest.toLowerCase();
    const suggestions = [];
    
    // Suggest based on common patterns
    if (request.includes('login') || request.includes('auth')) {
      suggestions.push({
        label: "Email/Password Login",
        template: "Add email/password login form with user registration, password reset, and secure session management"
      });
      suggestions.push({
        label: "OAuth Integration", 
        template: "Add Google OAuth login integration with user profile sync and secure token management"
      });
    }
    
    if (request.includes('form')) {
      suggestions.push({
        label: "Contact Form",
        template: "Add contact form with name, email, message fields, validation, and email submission to admin"
      });
      suggestions.push({
        label: "User Registration",
        template: "Add user registration form with email validation, password requirements, and account confirmation"
      });
    }
    
    if (request.includes('api')) {
      suggestions.push({
        label: "REST API Endpoints",
        template: "Create REST API endpoints for user data with GET/POST/PUT/DELETE operations and proper validation"
      });
      suggestions.push({
        label: "Authentication API",
        template: "Add authentication API endpoints for login, registration, logout, and token validation"
      });
    }
    
    if (request.includes('dashboard') || request.includes('admin')) {
      suggestions.push({
        label: "User Dashboard",
        template: "Create user dashboard with profile management, settings, and data visualization components"
      });
      suggestions.push({
        label: "Admin Panel",
        template: "Build admin panel with user management, analytics, and system configuration features"
      });
    }
    
    // Generic suggestions if no specific patterns
    if (suggestions.length === 0) {
      suggestions.push({
        label: "Frontend Component",
        template: "Add [SPECIFIC_COMPONENT] to the [PAGE_NAME] with [FUNCTIONALITY] and [STYLING_REQUIREMENTS]"
      });
      suggestions.push({
        label: "API Feature",
        template: "Create [ENDPOINT_TYPE] API for [SPECIFIC_FEATURE] with [INPUT_DATA] and [OUTPUT_FORMAT]"
      });
      suggestions.push({
        label: "Database Change",
        template: "Modify database to [SPECIFIC_CHANGE] for [TABLE_NAME] with [FIELD_DETAILS] and [MIGRATION_PLAN]"
      });
    }
    
    return suggestions.slice(0, 3); // Max 3 suggestions
  }
}

// Export for use in content script
window.AnalysisEngine = AnalysisEngine;