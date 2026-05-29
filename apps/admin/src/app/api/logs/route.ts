import { NextResponse } from "next/server";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? "http://localhost:8001";
const ADMIN_KEY = process.env.ADMIN_KEY ?? "admin_dev_key";

interface LogEntry {
  id: string;
  timestamp: string;
  service: string;
  level: "info" | "warn" | "error";
  message: string;
  endpoint?: string;
  latency_ms?: number;
  status_code?: number;
}

const SERVICE_PORTS: Record<string, number> = {
  "auth-service": 8001,
  "ai-agent-service": 8002,
  "productivity-service": 8003,
  "finance-service": 8004,
  "habit-service": 8005,
  "analytics-service": 8006,
  "recommendation-service": 8007,
  "notification-service": 8008,
  "rag-service": 8009,
  "career-service": 8010,
  "integrations-service": 8011,
  "automation-service": 8012,
};

export async function GET() {
  const now = new Date().toISOString();
  const entries: LogEntry[] = [];

  const healthChecks = await Promise.allSettled(
    Object.entries(SERVICE_PORTS).map(async ([service, port]) => {
      const started = Date.now();
      const endpoint = "/health";
      let level: LogEntry["level"] = "info";
      let message = `${service} healthy`;
      let latency_ms = 0;
      let status_code = 200;

      try {
        const res = await fetch(`http://localhost:${port}${endpoint}`, {
          signal: AbortSignal.timeout(3000),
        });
        latency_ms = Date.now() - started;
        status_code = res.status;

        if (!res.ok) {
          level = "error";
          message = `${service} returned ${res.status} from ${endpoint}`;
        } else {
          message = `${service} healthy`;
        }
      } catch {
        level = "error";
        latency_ms = Date.now() - started;
        status_code = 503;
        message = `${service} unavailable`;
      }

      return {
        id: `${service}-${now}`,
        timestamp: now,
        service,
        level,
        message,
        endpoint,
        latency_ms,
        status_code,
      } satisfies LogEntry;
    })
  );

  for (const result of healthChecks) {
    if (result.status === "fulfilled") {
      entries.push(result.value);
    } else {
      entries.push({
        id: `unknown-${now}`,
        timestamp: now,
        service: "system",
        level: "error",
        message: `Failed to inspect service health: ${result.reason}`,
      });
    }
  }

  try {
    const authStarted = Date.now();
    const usersRes = await fetch(`${AUTH_SERVICE_URL}/users/admin/list`, {
      headers: { "X-Admin-Key": ADMIN_KEY },
      signal: AbortSignal.timeout(5000),
    });
    const authLatency = Date.now() - authStarted;

    if (usersRes.ok) {
      const users = await usersRes.json();
      entries.push({
        id: `auth-users-${now}`,
        timestamp: now,
        service: "auth-service",
        level: "info",
        message: `${Array.isArray(users) ? users.length : 0} users reported by auth-service`,
        endpoint: "/users/admin/list",
        latency_ms: authLatency,
        status_code: usersRes.status,
      });
    } else {
      entries.push({
        id: `auth-users-${now}`,
        timestamp: now,
        service: "auth-service",
        level: "warn",
        message: `Auth-service admin user list unavailable (${usersRes.status})`,
        endpoint: "/users/admin/list",
        latency_ms: authLatency,
        status_code: usersRes.status,
      });
    }
  } catch {
    entries.push({
      id: `auth-users-${now}`,
      timestamp: now,
      service: "auth-service",
      level: "warn",
      message: "Auth-service admin user list unavailable",
      endpoint: "/users/admin/list",
      status_code: 503,
    });
  }

  return NextResponse.json(
    entries.sort((a, b) => {
      const order = { error: 0, warn: 1, info: 2 };
      if (a.level !== b.level) return order[a.level] - order[b.level];
      return a.service.localeCompare(b.service);
    })
  );
}
