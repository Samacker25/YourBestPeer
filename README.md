# YourBestPeer — AI Life OS

> **The personal AI operating system for everyday life.**

A full-stack AI-powered platform that unifies productivity, finance, knowledge management, habit tracking, career intelligence, and an AI assistant into one ecosystem — backed by a LangGraph multi-agent system and a 12-service microservices architecture.

---

## Modules

| Module | Description |
|--------|-------------|
| **AI Command Center** | Natural language assistant — multi-agent orchestration via LangGraph, tool calling, streaming chat |
| **Productivity Engine** | Tasks, projects, Kanban boards, notes, Pomodoro timer |
| **Knowledge Vault** | RAG-powered second brain — upload documents, chat with your knowledge base |
| **Finance Hub** | Expense tracking, budgets, AI-powered spending insights, receipt scanner |
| **Habit Arena** | Daily habits, streaks, XP gamification, mood logging, wellness score |
| **Career Lab** | Resume analyser, AI mock interviews, skill gap detection |
| **Analytics Dashboard** | Life metrics aggregation, trend analysis, AI insights |
| **Integrations** | Google Calendar, Gmail OAuth sync |
| **Automation** | Workflow rules engine — triggers, conditions, actions |

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Web frontend | Next.js 15, TypeScript, Tailwind CSS, Framer Motion |
| Mobile | React Native (Expo) |
| Admin dashboard | Next.js 15 (port 3002) |
| Backend | FastAPI (Python 3.12) — 12 microservices |
| AI / LLM | Google Gemini API, LangGraph multi-agents, LangChain tools |
| RAG | Sentence Transformers (embeddings), Pinecone (vector DB) |
| Databases | PostgreSQL 16, Redis 7 |
| Observability | LangSmith (LLM tracing, prompt monitoring) |
| DevOps | Docker Compose, Turborepo, GitHub Actions |

---

## Services

| Service | Port | Responsibility |
|---------|------|----------------|
| auth-service | 8001 | JWT auth, Google OAuth, refresh tokens, RBAC |
| ai-agent-service | 8002 | Multi-agent orchestration, tool calling, streaming |
| productivity-service | 8003 | Tasks, projects, Kanban, notes, Pomodoro |
| finance-service | 8004 | Expenses, budgets, subscriptions, savings goals |
| habit-service | 8005 | Daily habits, streaks, XP, mood, wellness logs |
| analytics-service | 8006 | Life metrics aggregation, trend analysis |
| recommendation-service | 8007 | Personalised AI recommendations |
| notification-service | 8008 | Email, push, Telegram notifications |
| rag-service | 8009 | Document upload, vector search, Q&A synthesis |
| career-service | 8010 | Resume analyser, interview prep, skill gap detection |
| integrations-service | 8011 | Google Calendar, Gmail integration |
| automation-service | 8012 | Workflow rules engine |

---

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm 8+
- Python 3.12+
- Docker + Docker Compose

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your API keys in .env
```

### 3. Start infrastructure + dev tools

```bash
# Databases + pgAdmin + Redis Commander
docker-compose up -d postgres redis pgadmin redis-commander
```

| Tool | URL | Credentials |
|------|-----|-------------|
| pgAdmin (PostgreSQL UI) | http://localhost:5050 | `admin@admin.com` / `admin` |
| Redis Commander | http://localhost:8081 | — |

> In pgAdmin, add a server: host `postgres`, port `5432`, user `lifeos`, password from your `.env`.

### 4. Start frontends

```bash
# Web app
pnpm --filter web dev
# → http://localhost:3001

# Admin dashboard
pnpm --filter @yourbestpeer/admin dev
# → http://localhost:3002
```

### 5. Start backend services

```bash
# Start all services via Docker
docker-compose up -d

# Or start a single service locally (example)
cd services/auth-service
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8001
# → http://localhost:8001/docs
```

---

## Project Structure

```
yourbestpeer/
├── apps/
│   ├── web/               Next.js 15 web app          :3001
│   ├── mobile/            React Native (Expo) app
│   └── admin/             Admin dashboard             :3002
├── services/
│   ├── auth-service/                                  :8001
│   ├── ai-agent-service/                              :8002
│   ├── productivity-service/                          :8003
│   ├── finance-service/                               :8004
│   ├── habit-service/                                 :8005
│   ├── analytics-service/                             :8006
│   ├── recommendation-service/                        :8007
│   ├── notification-service/                          :8008
│   ├── rag-service/                                   :8009
│   ├── career-service/                                :8010
│   ├── integrations-service/                          :8011
│   └── automation-service/                            :8012
├── packages/
│   ├── ui/                Shared React component library
│   ├── types/             Shared TypeScript types
│   ├── shared/            Shared utilities
│   └── configs/           ESLint, TypeScript, Tailwind configs
├── infrastructure/        Docker, Kubernetes, Terraform
├── docs/                  Architecture and API docs
├── .github/workflows/     CI/CD pipelines
├── docker-compose.yml     Full local dev environment
└── .env.example           Environment variable template
```

---

## AI Architecture

The `ai-agent-service` runs a **LangGraph ReAct coordinator** that delegates to domain tools:

```
User message
    │
    ▼
Coordinator Agent (Gemini 2.5 Flash)
    │
    ├── create_task / list_tasks / update_task_status   → productivity-service
    ├── list_habits / log_habit                         → habit-service
    ├── log_expense / get_spending_summary              → finance-service
    ├── search_knowledge / answer_from_knowledge        → rag-service
    └── get_career_suggestions                          → career-service
```

Streaming responses use Server-Sent Events — the frontend receives `tool_start`, `tool_end`, and `token` events in real time.

---

## Development Phases

### Phase 1 — MVP ✅
- Authentication (JWT + Google OAuth)
- AI assistant with multi-agent tool calling
- Task management (CRUD + Kanban)
- Notes system with markdown
- RAG knowledge base
- Habit tracker with streaks and XP
- Finance tracking (expenses + budgets)
- Career intelligence (resume analyser + interview prep)
- Notification system
- Admin dashboard

### Phase 2 — Expansion ✅
- Recommendation engine (ML wellness score, personalised suggestions)
- Google Calendar integration (OAuth, event sync)
- Gmail integration (inbox read, AI summarisation)
- Workflow automation (rules engine — triggers, conditions, actions)

### Phase 3 — Scale 🚧
- Voice assistant ✅ — floating mic button in dashboard, Web Speech API (STT + TTS), streams to AI agent, web-only
- Mobile app — 9 screens built (Login, Dashboard, Tasks, Habits, Chat, Finance, Notes, Knowledge, Career); full parity in progress
- Kubernetes manifests — planned, not yet written
- AWS Terraform — planned, not yet written
- Wearable + fitness API integrations — not started

---

## License

MIT
