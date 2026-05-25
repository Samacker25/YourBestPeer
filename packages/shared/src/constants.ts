export const SERVICE_URLS = {
  auth: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ?? "http://localhost:8001",
  aiAgent: process.env.NEXT_PUBLIC_AI_AGENT_SERVICE_URL ?? "http://localhost:8002",
  productivity: process.env.NEXT_PUBLIC_PRODUCTIVITY_SERVICE_URL ?? "http://localhost:8003",
  finance: process.env.NEXT_PUBLIC_FINANCE_SERVICE_URL ?? "http://localhost:8004",
  habit: process.env.NEXT_PUBLIC_HABIT_SERVICE_URL ?? "http://localhost:8005",
  analytics: process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL ?? "http://localhost:8006",
  recommendation: process.env.NEXT_PUBLIC_RECOMMENDATION_SERVICE_URL ?? "http://localhost:8007",
  notification: process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL ?? "http://localhost:8008",
  rag: process.env.NEXT_PUBLIC_RAG_SERVICE_URL ?? "http://localhost:8009",
} as const;

export const TASK_STATUS_LABELS = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
} as const;

export const PRIORITY_COLORS = {
  low: "#6b7280",
  medium: "#f59e0b",
  high: "#f97316",
  urgent: "#ef4444",
} as const;
