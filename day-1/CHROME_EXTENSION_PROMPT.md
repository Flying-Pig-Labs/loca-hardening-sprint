# MY_APP_CONTEXT.md
## Comprehensive Context Guide for AI-Powered Market Research Platform

**Last Updated:** August 15, 2025  
**Platform Version:** Full-stack React/Express application with AI integration  
**Purpose:** This document provides complete context for external tools to generate precise, actionable requests for platform modifications and enhancements.

---

## 1. APPLICATION OVERVIEW & CORE PURPOSE

### What This Platform Does
This is an **AI-powered market research and business concept development platform** that combines:
- **Intelligent market research generation** using AI assistants
- **Interactive report viewing** with collaborative annotation features
- **Real-time communication** for live chat and streaming responses
- **Business concept architecture** through specialized AI guidance

### Primary User Workflows
1. **Research Creation**: Users input research parameters → AI generates comprehensive market reports
2. **Report Collaboration**: Teams review reports with highlighting, annotations, and guided discussions
3. **Business Development**: AI assistants guide users through strategic business concept development
4. **Knowledge Management**: Document processing and vector-based knowledge base management

### Core Value Proposition
Users get **comprehensive market insights** and **structured business guidance** through AI-powered analysis, eliminating manual research time while ensuring thoroughness and strategic thinking.

---

## 2. TECHNICAL ARCHITECTURE

### Frontend Stack
- **React 18** with TypeScript and hooks-based state management
- **Vite** for build tooling and development server
- **Tailwind CSS** + **shadcn/ui** component library for styling
- **TanStack Query** for data fetching and caching
- **Wouter** for client-side routing

### Backend Stack
- **Express.js** with TypeScript for API layer
- **WebSocket (express-ws)** for real-time communication
- **Drizzle ORM** with PostgreSQL for data persistence
- **Session-based authentication** with JWT tokens
- **Multer** for file upload handling

### AI Integration Architecture
- **Multi-provider setup**: OpenAI GPT models + Anthropic Claude
- **Specialized assistants**: 
  - **Troublemaker** (market research)
  - **LOCA** (business concept architecture)
  - **Centaurchetype** (branding/identity)
- **Vector stores** for knowledge base management
- **Streaming responses** with real-time progress tracking
- **Citation system** with automated source verification

### Database Design
Key entities and relationships:
```
Users → Projects → Workstreams → Reports
                 ↓
        Conversation Messages
                 ↓
        Highlights & Annotations
```

### Real-time Features
- **WebSocket connections** for live chat
- **Server-Sent Events (SSE)** for streaming AI responses
- **Collaborative editing** for highlights and annotations
- **Multi-tab session synchronization**

---

## 3. AI ASSISTANT ECOSYSTEM

### Assistant Specializations
1. **Troublemaker** (`troublemaker` tool type)
   - **Purpose**: Market research, competitive analysis, industry insights
   - **Capabilities**: Web search, data analysis, citation generation
   - **Output Style**: Comprehensive reports with structured sections

2. **LOCA** (`loca` tool type)
   - **Purpose**: Business concept architecture, strategic planning
   - **Capabilities**: Business model development, strategic frameworks
   - **Output Style**: Interactive guidance, step-by-step development

3. **Centaurchetype** (`centaurchetype` tool type)
   - **Purpose**: Branding, identity, positioning
   - **Capabilities**: Brand strategy, messaging, identity development
   - **Output Style**: Creative frameworks, brand guidelines

### Context Management
- **Report-specific conversations**: Each report maintains separate conversation history
- **Workstream tool types**: Determine which assistant is active
- **Context preservation**: Memory and preferences maintained across sessions
- **Knowledge base integration**: Assistants access relevant uploaded documents

### Vector Store Operations
- **Document processing**: Upload → embedding → searchable knowledge base
- **Semantic search**: Context-aware retrieval for assistant responses
- **Knowledge consistency**: Shared knowledge base across all assistants
- **Performance optimization**: Efficient search with indexing strategies

---

## 4. USER EXPERIENCE PATTERNS

### Interface Patterns
- **Form-driven input**: Research parameters through validated forms
- **Progressive disclosure**: Complex features revealed as needed
- **Real-time feedback**: Live progress indicators and streaming responses
- **Collaborative tools**: Highlighting, annotations, comments

### Navigation Structure
```
Dashboard → Projects → Workstreams → Reports
                    ↓
            Chat Interface (Assistant-specific)
                    ↓
            Report Viewer (with annotations)
```

### State Management
- **React Context** for global state (user, projects)
- **TanStack Query** for server state and caching
- **Local state** for UI interactions and form data
- **WebSocket state** for real-time connection management

---

## 5. DATA FLOW & COMMUNICATION PATTERNS

### Request/Response Patterns
1. **Standard REST API**: CRUD operations for projects, workstreams, reports
2. **WebSocket Communication**: Real-time chat and live updates
3. **Server-Sent Events**: Streaming AI responses with progress tracking
4. **File Upload Flow**: Document processing → embedding → vector store

### Authentication Flow
1. **Session-based auth**: Cookie-stored session tokens
2. **JWT validation**: Server-side token verification
3. **Route protection**: Middleware-based authentication checks
4. **Session persistence**: Multi-tab session synchronization

### Error Handling Strategy
- **Graceful degradation**: UI remains functional during API failures
- **Error boundaries**: Component-level error recovery
- **Retry mechanisms**: Automatic retry for transient failures
- **User feedback**: Clear error messages with actionable guidance

---

## 6. DEVELOPMENT PATTERNS & CONVENTIONS

### Code Organization
```
├── client/src/
│   ├── components/    # Reusable UI components
│   ├── pages/         # Route-specific page components
│   ├── hooks/         # Custom React hooks
│   └── lib/           # Utilities and configurations
├── server/
│   ├── routes.ts      # API endpoint definitions
│   ├── storage.ts     # Database operations
│   └── lib/           # Server utilities and services
└── shared/
    └── schema.ts      # Shared types and validation
```

### Type Safety Strategy
- **Shared schemas**: Drizzle + Zod for database and validation
- **API contracts**: Typed request/response interfaces
- **Component props**: Strict TypeScript typing
- **Error types**: Structured error handling with types

### Testing Strategy
- **Comprehensive regression testing**: 35 tests across 8 suites
- **Mock-based validation**: No external dependencies for testing
- **Business logic focus**: Real scenarios over synthetic edge cases
- **Rapid feedback**: Complete test suite runs in ~3 seconds

---

## 7. INTEGRATION POINTS & EXTERNAL DEPENDENCIES

### AI Service Integration
- **OpenAI API**: GPT models, embeddings, assistant management
- **Anthropic Claude**: Advanced reasoning, web search capabilities
- **Rate limiting**: Careful management of API usage and costs
- **Fallback strategies**: Graceful handling of service outages

### Database Dependencies
- **PostgreSQL**: Primary data storage via Neon hosting
- **Migration strategy**: Drizzle-based schema management
- **Connection pooling**: Efficient database connection management
- **Backup considerations**: Data integrity and recovery planning

### File Storage & Processing
- **Document upload**: PDF, DOCX, TXT processing for AI knowledge
- **Vector embeddings**: Semantic search capabilities
- **Storage limits**: File size and type validation
- **Security scanning**: Malicious file detection

---

## 8. COMMON MODIFICATION PATTERNS

### Feature Addition Guidelines
1. **Schema First**: Define data model in `shared/schema.ts`
2. **Storage Layer**: Implement CRUD operations in `server/storage.ts`
3. **API Routes**: Add endpoints in `server/routes.ts`
4. **Frontend Integration**: Create components and hooks
5. **Testing**: Add regression tests for new functionality

### UI Enhancement Patterns
- **Component Library**: Use existing shadcn/ui components
- **Consistent Styling**: Follow established Tailwind patterns
- **Responsive Design**: Mobile-first approach with breakpoints
- **Accessibility**: ARIA labels and keyboard navigation

### AI Integration Expansions
- **Assistant Extensions**: Add new specialized AI capabilities
- **Workflow Integration**: Connect AI outputs to existing flows
- **Performance Optimization**: Efficient prompt engineering
- **Context Management**: Maintain conversation continuity

---

## 9. COMMON USER REQUESTS & SOLUTIONS

### Research & Analytics Enhancements
**User Need**: "Better market analysis"
**Technical Approach**: Enhance Troublemaker prompts, add data visualization, improve citation system

### Collaboration Improvements
**User Need**: "Team workflow optimization"
**Technical Approach**: Enhanced real-time features, notification system, role-based permissions

### AI Assistant Capabilities
**User Need**: "More intelligent responses"
**Technical Approach**: Improved context management, better knowledge base integration, enhanced prompt engineering

### Performance & Reliability
**User Need**: "Faster, more reliable platform"
**Technical Approach**: Caching optimization, error recovery improvements, performance monitoring

---

## 10. ARCHITECTURAL DECISION CONTEXT

### Technology Choices Rationale
- **React**: Component reusability and rich ecosystem
- **Express**: Flexibility for WebSocket and API requirements
- **Drizzle**: Type-safe database operations with migration support
- **Multi-AI providers**: Risk mitigation and capability optimization

### Scalability Considerations
- **Stateless server design**: Horizontal scaling capability
- **Database optimization**: Efficient queries and indexing
- **Caching strategy**: Reduced API calls and improved performance
- **Modular architecture**: Easy feature addition and maintenance

### Security Implementation
- **Input validation**: Comprehensive data sanitization
- **Authentication**: Secure session management
- **File upload security**: Type and content validation
- **API rate limiting**: Protection against abuse

---

## 11. TROUBLESHOOTING CONTEXT

### Common Issues & Solutions
1. **WebSocket Connection Drops**: Auto-reconnection with message queuing
2. **AI Response Timeouts**: Streaming with progress indicators
3. **File Upload Failures**: Comprehensive validation and error handling
4. **Database Migration Issues**: Rollback mechanisms and dependency validation

### Debugging Approaches
- **Comprehensive logging**: Server and client-side error tracking
- **Test coverage**: Regression tests for common failure modes
- **Error boundaries**: Component-level error isolation
- **Performance monitoring**: Real-time metrics and alerting

---

## 12. FUTURE ENHANCEMENT OPPORTUNITIES

### Planned Improvements
- **Advanced analytics**: Enhanced data visualization and insights
- **Enterprise features**: SSO, advanced permissions, audit logging
- **Mobile optimization**: Progressive web app capabilities
- **Integration ecosystem**: Third-party tool connections

### Technical Debt Areas
- **Legacy component refactoring**: Older components to modern patterns
- **Performance optimization**: Bundle size and load time improvements
- **Test coverage expansion**: Integration and end-to-end testing
- **Documentation updates**: Keep pace with rapid development

---

## 13. CONTEXT FOR REQUEST GENERATION

### When Receiving Vague Requests
**Research First**: Before implementing, investigate:
1. **User intent**: What specific problem are they solving?
2. **Current limitations**: What existing functionality needs improvement?
3. **Technical constraints**: What architectural considerations apply?
4. **Impact scope**: How does this change affect other system components?

### Multi-Step Interaction Planning
**Phase 1 - Discovery**: Research and clarify requirements
**Phase 2 - Design**: Propose technical approach and implementation plan
**Phase 3 - Implementation**: Execute changes with testing and validation
**Phase 4 - Verification**: Confirm functionality and user satisfaction

### Request Enhancement Strategies
Transform vague requests like "improve the AI" into specific actions:
- **Identify specific use case**: Which assistant? Which workflow?
- **Define success metrics**: How will improvement be measured?
- **Scope technical changes**: Database, API, UI, or AI prompt modifications?
- **Plan testing approach**: How will changes be validated?

---

This document serves as the comprehensive context foundation for generating precise, actionable requests that align with the platform's architecture, user needs, and technical constraints.
