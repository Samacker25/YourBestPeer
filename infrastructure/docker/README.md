# Docker Infrastructure

Per-service Dockerfiles live in their respective `services/` directories.

This directory contains shared Docker infrastructure:
- Base images
- Docker Compose overrides for staging/production

## Local Development

Use the root `docker-compose.yml` to start all infrastructure:

```bash
# Start only infrastructure (DB, Redis) — Pinecone is managed cloud, no local container
docker-compose up -d postgres redis pinecone

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f ai-agent-service

# Reset everything
docker-compose down -v
```
