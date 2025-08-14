# AI Intelligence Platform
## Executive Technical Summary

### 🏗️ **Infrastructure Overview**

**Hosting:** Repl.it (single production environment)  
**Deployment:** Preview-to-production pipeline (CEO-managed)  
**Current Limitations:** No backups, logging, monitoring, or rollback capability

---

### 🎯 **Product Portfolio**

#### **Primary Focus: Troublemaker**
*30-minute strategic intelligence engine*

**Core Value Proposition:** Transforms business context into bespoke market research reports through AI-powered external data synthesis and Socratic dialogue refinement.

**User Journey:**
```
Chat Initiation → AI Intelligence Gathering → Report Generation → 
Interactive Highlighting → Socratic Analysis → Business Concepts
```

#### **Secondary Product: Centarchetype**
*Brand personality and content generation platform*

**Function:** Socratic dialogue-driven brand definition with aligned copywriting and editing capabilities.

---

### 🔧 **Technical Architecture**

#### **Frontend Stack (React)**
| Component | Purpose |
|-----------|---------|
| Chat Interface | AI conversation hub |
| Authentication | User management |
| Document Uploader | Content ingestion |
| Reports Dashboard | Intelligence visualization |
| Navigation Suite | UX framework |

**State Management:** Zustand (local) + TanStack Query (server sync)

#### **API Infrastructure (Node/Express)**

**Five Microservice Groups:**

1. **🤖 AI Tools** — OpenAI Assistants API integration (GPT-5, Opus)
2. **🔐 Authentication** — User account operations  
3. **📁 Projects & Workstreams** — Project lifecycle management
4. **📄 Content Management** — Upload and usage tracking
5. **📊 Reports** — Generation, highlighting, annotations

#### **Data Architecture (Neon PostgreSQL)**

**Core Relationships:**
```
Users → Memory
Users → Projects → Workstreams → Reports
Reports → Highlights + Annotations
Content Folders → Content Files → Usage Mapping
```

**Vector Store Integration:**
- Conversations ↔ ConversationMessages
- VectorStore ↔ DocChunks (embeddings)

---

### ⚠️ **Current Challenges**

#### **Technical Debt**
- Chat memory persistence issues
- Performance bottlenecks in report generation
- Single-point-of-failure deployment model

#### **Infrastructure Gaps**
- Automated testing framework
- Centralized prompt management
- Multi-tenancy architecture
- Subscription and payment processing

#### **Product Development**
- Centarchetype architectural mapping incomplete
- Context building inefficiencies
- Generation speed optimization needed

---

### 🚀 **Strategic Roadmap**

**Immediate Priorities:**
- Troublemaker optimization and bug resolution
- Centarchetype architecture definition
- Performance enhancement initiatives

**Future Development:**
- Three additional product launches
- Enterprise-grade infrastructure migration
- Comprehensive monitoring and backup systems

---

### 💡 **Next Actions**

**Architectural Visualization:** Full system diagram available showing component relationships, API integrations, and database schema for seamless Centarchetype integration planning.
