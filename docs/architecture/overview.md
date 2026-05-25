# System Architecture Overview

## AI Life OS — YourBestPeer

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                         │
│   Next.js Web App (Vercel)  │  React Native Mobile App  │
└───────────────┬─────────────────────────────────────────┘
                │ HTTPS / WebSocket
┌───────────────▼─────────────────────────────────────────┐
│                     API Gateway                          │
│            (Nginx / AWS API Gateway)                     │
│         Rate Limiting │ Auth Validation │ Routing        │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│                   Microservices Layer                    │
│                                                         │
│  ┌──────────────┐  ┌───────────────────┐               │
│  │ auth-service │  │ ai-agent-service  │               │
│  │   :8001      │  │   :8002           │               │
│  └──────────────┘  └───────────────────┘               │
│                                                         │
│  ┌────────────────────┐  ┌─────────────────┐           │
│  │ productivity-svc   │  │ finance-service │           │
│  │   :8003            │  │   :8004         │           │
│  └────────────────────┘  └─────────────────┘           │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────────┐        │
│  │  habit-service   │  │ analytics-service    │        │
│  │   :8005          │  │   :8006              │        │
│  └──────────────────┘  └──────────────────────┘        │
│                                                         │
│  ┌──────────────────────┐  ┌────────────────────┐      │
│  │ recommendation-svc   │  │ notification-svc   │      │
│  │   :8007              │  │   :8008            │      │
│  └──────────────────────┘  └────────────────────┘      │
│                                                         │
│  ┌────────────────┐                                     │
│  │  rag-service   │                                     │
│  │   :8009        │                                     │
│  └────────────────┘                                     │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│                     Data Layer                           │
│                                                         │
│  ┌────────────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  PostgreSQL 16 │  │ Redis 7  │  │    Pinecone      │  │
│  │  (Primary DB)  │  │ (Cache + │  │  (Vector DB)   │  │
│  │                │  │  Queue)  │  │                │  │
│  └────────────────┘  └──────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## AI Agent Architecture

```
User Request
     │
     ▼
┌──────────────────────┐
│  CoordinatorAgent    │  ← Routes to domain agents
│  (LangGraph)         │
└──────────┬───────────┘
           │
    ┌──────┴────────────────────────────────┐
    │      │           │          │         │
    ▼      ▼           ▼          ▼         ▼
 Prod.  Finance   Knowledge   Career    Habit
 Agent  Agent     Agent       Agent     Agent
    │      │           │          │         │
    └──────┴───────────┴──────────┴─────────┘
                        │
                   Tool Calls:
              ┌─────────┴──────────┐
              │                    │
         DB queries          RAG retrieval
         (PostgreSQL)        (Pinecone)
```

---

## RAG Pipeline

```
Document Upload (PDF, TXT, MD, voice note)
        │
        ▼
  Text Extraction
        │
        ▼
  Chunking (512 tokens, 50 overlap)
        │
        ▼
  Embedding Generation
  (Sentence Transformers: all-MiniLM-L6-v2)
        │
        ▼
  Pinecone Vector Storage
  (collection per user)
        │
   Query Time:
        │
        ▼
  Query Embedding → Semantic Search → Top-K Chunks
        │
        ▼
  Context Assembly → Gemini API
        │
        ▼
  Grounded Response
```

---

## Data Flow: User Creates a Task via AI

```
User: "Schedule an ML study session tomorrow at 3pm"
        │
        ▼
  Web App → AI Agent Service (WebSocket)
        │
        ▼
  CoordinatorAgent parses intent
        │
        ▼
  ProductivityAgent.create_task(
    title="ML Study Session",
    due_date="tomorrow 3pm",
    priority="high"
  )
        │
        ▼
  productivity-service POST /tasks
        │
        ▼
  PostgreSQL INSERT
        │
        ▼
  notification-service schedules reminder
        │
        ▼
  Response streamed back to user
```

---

## Inter-Service Communication

| Pattern | Use Case |
|---------|----------|
| REST HTTP | Synchronous CRUD operations |
| WebSocket | AI assistant real-time streaming |
| Redis Pub/Sub | Async events (task created → notify) |
| Redis Queue + Celery | Background jobs (email, analytics) |

---

## Database Schema (Core Tables)

```sql
-- Users (auth-service)
users (id, email, name, avatar_url, created_at)
refresh_tokens (id, user_id, token_hash, expires_at)

-- Productivity (productivity-service)
tasks (id, user_id, title, description, status, priority, due_date, project_id)
projects (id, user_id, name, color, archived)
notes (id, user_id, title, content, tags, embedding_id)

-- Habits (habit-service)
habits (id, user_id, name, frequency, target, icon, color)
habit_logs (id, habit_id, completed_at, value, note)
streaks (id, habit_id, current_streak, longest_streak)

-- Finance (finance-service)
expenses (id, user_id, amount, category, description, date)
budgets (id, user_id, category, monthly_limit, month)
subscriptions (id, user_id, name, amount, billing_cycle, next_billing)

-- Knowledge (rag-service)
documents (id, user_id, title, type, storage_path, created_at)
document_chunks (id, document_id, content, pinecone_vector_id, page_num)

-- Analytics (analytics-service)
daily_metrics (id, user_id, date, productivity_score, habit_score, focus_hours)
ai_insights (id, user_id, insight_text, category, generated_at)
```

---

## Deployment Architecture (Production)

```
GitHub Push → GitHub Actions CI
        │
        ▼
  Docker Build + Push (ECR)
        │
        ▼
  Kubernetes Deployment (EKS)
        │
        ▼
  Services: HorizontalPodAutoscaler
  DB: RDS PostgreSQL (managed)
  Cache: ElastiCache Redis
  Vector: Pinecone Cloud / self-hosted
  Frontend: Vercel (CDN + edge)
```

---

## Security Architecture

- JWT access tokens (15min) + refresh tokens (30 days) in httpOnly cookies
- Rate limiting via slowapi on all public endpoints
- All secrets via environment variables / AWS Secrets Manager in prod
- PostgreSQL row-level security for multi-tenant data isolation
- CORS configured per environment (strict in production)
- Audit log for all write operations (user_id, action, timestamp, ip)
