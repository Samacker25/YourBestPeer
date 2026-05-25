# Deployment Guide

## Overview

Two GitHub Actions workflows handle all CI/CD:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push to `main`/`dev`, PR to `main` | Lint, type-check, build, integration tests |
| `deploy.yml` | Push to `main` (after CI) | Build images → deploy frontend + backend |

---

## CI Pipeline Stages

```
STAGE 1 — FRONTEND
  frontend-install
       ├── frontend-lint
       ├── frontend-type-check
       └── (both pass) → frontend-build ✓

STAGE 2 — BACKEND (all run in parallel)
  auth-service          ← lint + type-check + startup health check
  ai-agent-service      ← lint + type-check + startup health check
  productivity-service  ← lint + startup health check
  finance-service       ← lint + startup health check
  habit-service         ← lint + startup health check
  analytics-service     ← lint + startup health check
  recommendation-service ← lint + startup health check
  notification-service  ← lint + startup health check
  rag-service           ← lint + startup health check

STAGE 3 — INTEGRATION (needs ALL above to pass)
  docker-compose up → health check all 9 /health endpoints → docker-compose down
```

---

## Deploy Pipeline Stages

```
Push to main
    │
    ▼
STAGE 1 — BUILD IMAGES (parallel, 9 services)
  → ghcr.io/<org>/yourbestpeer/<service>:sha-<hash>
  → ghcr.io/<org>/yourbestpeer/<service>:latest

STAGE 2 — DEPLOY FRONTEND
  → Vercel (automatic, uses vercel-action)

STAGE 3 — DEPLOY BACKEND (sequential by dependency)
  auth-service
      └── ai-agent-service
              └── productivity, finance, habit, analytics,
                  recommendation, notification  (parallel, max 3)
                      └── rag-service

STAGE 4 — SMOKE TESTS
  curl production /health endpoints
```

---

## GitHub Secrets Required

Go to: **GitHub → Settings → Secrets and variables → Actions → New repository secret**

### Vercel (Frontend)

| Secret | How to get |
|--------|-----------|
| `VERCEL_TOKEN` | Vercel dashboard → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel dashboard → Settings → General → Team ID |
| `VERCEL_PROJECT_ID` | Vercel project → Settings → General → Project ID |
| `NEXT_PUBLIC_API_URL` | Your Railway API gateway URL, e.g. `https://api.yourbestpeer.up.railway.app` |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL, e.g. `https://yourbestpeer.vercel.app` |

### Railway (Backend)

| Secret | How to get |
|--------|-----------|
| `RAILWAY_TOKEN` | Railway dashboard → Account → API Tokens |
| `AUTH_SERVICE_URL` | Railway service URL for auth-service |
| `AI_AGENT_SERVICE_URL` | Railway service URL for ai-agent-service |
| `RAG_SERVICE_URL` | Railway service URL for rag-service |

### App Secrets (set in Railway environment variables, NOT GitHub Secrets)

Set these per-service in Railway dashboard → Variables:

| Variable | Services |
|----------|---------|
| `DATABASE_URL` | all services |
| `REDIS_URL` | all services |
| `JWT_SECRET` | auth-service |
| `GOOGLE_CLIENT_ID` | auth-service |
| `GOOGLE_CLIENT_SECRET` | auth-service |
| `GOOGLE_API_KEY` | ai-agent, analytics, rag |
| `TAVILY_API_KEY` | ai-agent |
| `LANGCHAIN_API_KEY` | ai-agent, rag (LangSmith tracing) |
| `LANGCHAIN_TRACING_V2` | ai-agent, rag (set `true` in prod) |
| `LANGCHAIN_PROJECT` | ai-agent, rag (e.g. `yourbestpeer`) |
| `PINECONE_API_KEY` | ai-agent, rag |
| `PINECONE_ENVIRONMENT` | ai-agent, rag |
| `PINECONE_INDEX_NAME` | ai-agent, rag |
| `SMTP_HOST/USER/PASS` | notification-service |
| `TELEGRAM_BOT_TOKEN` | notification-service |

---

## Initial Setup Checklist

### Vercel
1. `pnpm i -g vercel`
2. `cd apps/web && vercel` — follow prompts, note project/org IDs
3. Set environment variables in Vercel dashboard

### Railway
1. Create a Railway project: `railway init`
2. Create one service per backend service (9 total)
3. Provision **PostgreSQL** and **Redis** plugins in Railway
4. Set environment variables per service in Railway dashboard
5. Get the `RAILWAY_TOKEN` from Account Settings

### Pinecone
1. Sign up at pinecone.io (free tier: 1 index, 5 GB)
2. Create index named `lifeos`, dimension `384` (all-MiniLM-L6-v2)
3. Copy API key → set as `PINECONE_API_KEY` in Railway

### Manual deploy trigger
```bash
# Deploy only frontend
gh workflow run deploy.yml -f target=frontend-only

# Deploy only backend
gh workflow run deploy.yml -f target=backend-only

# Deploy everything
gh workflow run deploy.yml -f target=all
```
