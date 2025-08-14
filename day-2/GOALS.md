# Platform Architecture Overview

## System Overview

This platform is hosted entirely on **Repl.it** with no infrastructure-as-code. Currently operates with a **single production environment** featuring preview-to-deploy capability, though rollback reliability is limited. The system lacks backups, logging, monitoring, multi-tenancy, authentication scoping, and subscription tiering.

**Current Focus:** Sprint prioritizes **Troublemaker** development with partial **Centarchetype** definition. Long-term roadmap encompasses five products.

---

## Frontend Layer (React)

### Core Components
- **Chat** — User-facing AI conversation interface
- **Auth** — User login and account management
- **Doc Uploader** — Document ingestion system
- **Reports View** — Intelligence report display interface
- **Navigation & UX Features** — App layout, menus, and utilities

### State Management
- **Zustand** — Local storage management
- **TanStack Query** — Server-state caching and synchronization

---

## API Layer (Express.js / Node)

### Five API Groups

**1. AI Tools**
- Direct integration with OpenAI Assistants API (frontier models: Opus, GPT-5)
- Manages four underlying vector stores/databases:
  - **Conversations** → linked to **ConversationMessages** (foreign key)
  - **VectorStore** → links to **DocChunks** (contains embeddings)
- Powers contextual AI interactions within Troublemaker's chat

**2. Authentication**
- User account operations and management

**3. Projects & Workstreams**
- CRUD operations for user projects and their associated workstreams

**4. Content Management**
- Uploaded content management and usage tracking

**5. Reports**
- Report creation, highlights, and annotation handling

*Note: All groups except AI Tools utilize **DrizzleORM** for Neon database operations.*

---

## Data Layer (Neon Managed PostgreSQL)

### Database Schema (10 Tables)

**Core Entities:**
- **Users** → linked to **Memory** table
- **Projects** → owned by Users
- **Workstreams** → belong to Projects
- **Reports** → belong to Workstreams
  - **Highlights** → linked to Reports
  - **Annotations** → linked to Reports

**Content Management:**
- **Content Folders** → contain **Content Files**
- **Content Usage** → maps files to usage context

**User Data:**
- **Memory** → per-user persistent data storage

---

## Product: Troublemaker

### Function
AI-powered market research engine that transforms business context into **bespoke strategic intelligence reports** in approximately 30 minutes.

### Workflow
1. **Initiation** — User begins via Chat interface
2. **Intelligence Synthesis** — AI pulls and analyzes external web data
3. **Report Review** — User examines generated report in Reports View
4. **Interactive Analysis** — User highlights sections to launch **Socratic dialogue** in chat
5. **Concept Generation** — Dialogue combines user insight with intelligence base to output business concepts

### Known Issues
- Contextual memory loss in chat sessions
- Timing and performance bottlenecks
- Single-environment fragility affecting all users

---

## Product: Centarchetype

### Function
Conducts Socratic dialogue to define brand personality, tone, and writing style. Functions as copywriter and editor, generating brand-aligned content.

### Current Status
- **Incomplete mapping** — architecture diagram placeholder exists
- **Known Issues:** Slow generation, inefficient context building, minor bugs

---

## Operational Concerns

### Deployment & Management
- Entirely Repl.it-managed infrastructure
- CEO-driven deployment via preview → production button
- No automated testing framework

### Missing Infrastructure
- Consolidated prompt management system
- Payment processing integration
- Subscription tier implementation

---

## Next Steps

Full architectural diagram available to illustrate:
- Frontend component relationships
- API group interactions
- Vector store/OpenAI integrations
- Neon table relationships
- Centarchetype integration pathway
