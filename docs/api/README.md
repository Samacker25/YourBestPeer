# API Reference

All services expose a `/docs` endpoint (Swagger UI) when running locally.

| Service | Swagger UI |
|---------|-----------|
| auth-service | http://localhost:8001/docs |
| ai-agent-service | http://localhost:8002/docs |
| productivity-service | http://localhost:8003/docs |
| finance-service | http://localhost:8004/docs |
| habit-service | http://localhost:8005/docs |
| analytics-service | http://localhost:8006/docs |
| recommendation-service | http://localhost:8007/docs |
| notification-service | http://localhost:8008/docs |
| rag-service | http://localhost:8009/docs |

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Obtain tokens from `POST /auth/login` or `POST /auth/register` on the auth-service.
