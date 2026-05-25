# Terraform — AWS Infrastructure

Infrastructure as Code for AI Life OS on AWS.

## Planned Resources (Phase 3)

- **EKS** — Kubernetes cluster for microservices
- **RDS** — Managed PostgreSQL 16
- **ElastiCache** — Managed Redis
- **ECR** — Container registry for service images
- **S3** — Document storage for RAG service uploads
- **CloudFront** — CDN
- **Route 53** — DNS
- **Secrets Manager** — Secure environment variables
- **IAM** — Least-privilege roles per service

## Phase 1 / 2 (simpler)

For MVP, use:
- Vercel for Next.js frontend
- Railway or Render for Python services
- Supabase or Neon for managed PostgreSQL
- Upstash for managed Redis
- Pinecone for vector DB
