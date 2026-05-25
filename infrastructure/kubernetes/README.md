# Kubernetes Infrastructure

Kubernetes manifests for production deployment on AWS EKS.

## Structure (planned)

```
kubernetes/
├── namespaces/
├── deployments/
│   ├── auth-service.yaml
│   ├── ai-agent-service.yaml
│   └── ... (one per service)
├── services/
├── ingress/
├── configmaps/
├── secrets/           # Managed via AWS Secrets Manager / Sealed Secrets
└── hpa/               # HorizontalPodAutoscalers
```

## Phase 3 target
Kubernetes deployment is planned for Phase 3. Phase 1 and 2 use Docker Compose locally and simple EC2/ECS for cloud.
