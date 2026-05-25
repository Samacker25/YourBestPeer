#!/usr/bin/env bash
# Check health of all running services

SERVICES=(
  "auth-service:8001"
  "ai-agent-service:8002"
  "productivity-service:8003"
  "finance-service:8004"
  "habit-service:8005"
  "analytics-service:8006"
  "recommendation-service:8007"
  "notification-service:8008"
  "rag-service:8009"
)

echo "=== AI Life OS Health Check ==="
for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"
  port="${entry##*:}"
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/health" 2>/dev/null)
  if [ "$status" = "200" ]; then
    echo "  ✓ ${name} (port ${port})"
  else
    echo "  ✗ ${name} (port ${port}) — HTTP ${status:-unreachable}"
  fi
done
