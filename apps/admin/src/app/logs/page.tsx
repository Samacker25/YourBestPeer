"use client";

import { useEffect, useState } from "react";

interface LogEntry {
  id: string;
  timestamp: string;
  service: string;
  level: "info" | "warn" | "error";
  message: string;
  user_id?: string;
}

const MOCK_LOGS: LogEntry[] = [
  { id: "1",  timestamp: new Date(Date.now() -  60_000).toISOString(), service: "auth-service",           level: "info",  message: "User login successful",                                          user_id: "usr_123" },
  { id: "2",  timestamp: new Date(Date.now() - 120_000).toISOString(), service: "ai-agent-service",       level: "info",  message: "Chat message processed via Gemini 2.5 Flash (latency: 1240ms)" },
  { id: "3",  timestamp: new Date(Date.now() - 180_000).toISOString(), service: "finance-service",        level: "info",  message: "Expense created: ₹450 – Food",                                   user_id: "usr_456" },
  { id: "4",  timestamp: new Date(Date.now() - 240_000).toISOString(), service: "habit-service",          level: "info",  message: "Habit logged, streak extended to 7 days",                        user_id: "usr_123" },
  { id: "5",  timestamp: new Date(Date.now() - 300_000).toISOString(), service: "rag-service",            level: "warn",  message: "Pinecone index not configured — search skipped" },
  { id: "6",  timestamp: new Date(Date.now() - 360_000).toISOString(), service: "auth-service",           level: "warn",  message: "Refresh token near expiry for user_id=usr_789" },
  { id: "7",  timestamp: new Date(Date.now() - 420_000).toISOString(), service: "ai-agent-service",       level: "info",  message: "Multi-agent run completed: tools=[create_task, list_habits] steps=4" },
  { id: "8",  timestamp: new Date(Date.now() - 480_000).toISOString(), service: "integrations-service",   level: "info",  message: "Google Calendar synced: 8 events fetched" },
  { id: "9",  timestamp: new Date(Date.now() - 540_000).toISOString(), service: "recommendation-service", level: "info",  message: "Generated 5 AI recommendations (wellness_score=72)" },
  { id: "10", timestamp: new Date(Date.now() - 600_000).toISOString(), service: "automation-service",     level: "info",  message: "Workflow 'Budget Alert' triggered: send_notification executed" },
  { id: "11", timestamp: new Date(Date.now() - 700_000).toISOString(), service: "career-service",         level: "info",  message: "Resume analysis completed (score=7.5/10)",                       user_id: "usr_456" },
  { id: "12", timestamp: new Date(Date.now() - 800_000).toISOString(), service: "notification-service",   level: "error", message: "Email delivery failed: SMTP connection timeout" },
];

const LEVEL_CONFIG: Record<string, { badge: string; row: string; dot: string }> = {
  info:  { badge: "bg-blue-500/15 text-blue-400",   row: "",                    dot: "bg-blue-400" },
  warn:  { badge: "bg-amber-500/15 text-amber-400", row: "bg-amber-500/[0.04]", dot: "bg-amber-400" },
  error: { badge: "bg-red-500/15 text-red-400",     row: "bg-red-500/[0.04]",   dot: "bg-red-400 animate-pulse" },
};

// Short prefix shown in log rows for quick visual scanning
const SERVICE_PREFIX: Record<string, string> = {
  "auth-service":           "AUTH",
  "ai-agent-service":       "AI",
  "productivity-service":   "PROD",
  "finance-service":        "FIN",
  "habit-service":          "HABIT",
  "analytics-service":      "ANLYT",
  "recommendation-service": "REC",
  "notification-service":   "NOTIF",
  "rag-service":            "RAG",
  "career-service":         "CAREER",
  "integrations-service":   "INTG",
  "automation-service":     "AUTO",
};

const SERVICE_COLOR: Record<string, string> = {
  "auth-service":           "bg-violet-500/15 text-violet-400",
  "ai-agent-service":       "bg-purple-500/15 text-purple-400",
  "finance-service":        "bg-blue-500/15 text-blue-400",
  "habit-service":          "bg-emerald-500/15 text-emerald-400",
  "productivity-service":   "bg-orange-500/15 text-orange-400",
  "rag-service":            "bg-teal-500/15 text-teal-400",
  "career-service":         "bg-amber-500/15 text-amber-400",
  "integrations-service":   "bg-sky-500/15 text-sky-400",
  "automation-service":     "bg-pink-500/15 text-pink-400",
  "recommendation-service": "bg-cyan-500/15 text-cyan-400",
  "notification-service":   "bg-rose-500/15 text-rose-400",
  "analytics-service":      "bg-indigo-500/15 text-indigo-400",
};

function timeAgo(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)   return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function StatCard({ label, value, sub, icon }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_LOGS);
  const [levelFilter, setLevelFilter] = useState<"all" | "info" | "warn" | "error">("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const services = ["all", ...Array.from(new Set(MOCK_LOGS.map((l) => l.service)))];

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => setLogs([...MOCK_LOGS]), 10_000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const filtered = logs.filter((l) => {
    if (levelFilter !== "all" && l.level !== levelFilter) return false;
    if (serviceFilter !== "all" && l.service !== serviceFilter) return false;
    if (search && !l.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount  = logs.filter((l) => l.level === "warn").length;
  const infoCount  = logs.filter((l) => l.level === "info").length;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Activity Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} entries visible</p>
        </div>
        <button
          onClick={() => setAutoRefresh((v) => !v)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
            autoRefresh
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
              : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
          {autoRefresh ? "Live" : "Paused"}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Info" value={infoCount} sub="informational" icon={
          <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        } />
        <StatCard label="Warnings" value={warnCount} sub="attention needed" icon={
          <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        } />
        <StatCard label="Errors" value={errorCount} sub="requires action" icon={
          <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        } />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search messages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1 shrink-0">
          {(["all", "info", "warn", "error"] as const).map((l) => (
            <button key={l} onClick={() => setLevelFilter(l)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                levelFilter === l ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {l}
            </button>
          ))}
        </div>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shrink-0"
        >
          {services.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All services" : s}</option>
          ))}
        </select>
      </div>

      {/* Log terminal */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500/60" />
              <span className="h-3 w-3 rounded-full bg-amber-500/60" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/60" />
            </div>
            <span className="font-mono text-xs text-muted-foreground">system.log</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{filtered.length} / {logs.length} entries</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center font-mono text-sm text-muted-foreground">
            No log entries match the current filters
          </div>
        ) : (
          <div className="divide-y divide-border/60 font-mono text-xs">
            {filtered.map((log) => {
              const cfg = LEVEL_CONFIG[log.level];
              const svcColor = SERVICE_COLOR[log.service] ?? "bg-muted/40 text-muted-foreground";
              return (
                <div key={log.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/10 transition-colors ${cfg.row}`}>
                  {/* Timestamp */}
                  <span className="text-muted-foreground/70 shrink-0 w-14 tabular-nums">{timeAgo(log.timestamp)}</span>

                  {/* Level badge */}
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase flex items-center gap-1 ${cfg.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {log.level}
                  </span>

                  {/* Service badge */}
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${svcColor}`}>
                    {SERVICE_PREFIX[log.service] ?? log.service}
                  </span>

                  {/* Message */}
                  <span className="text-foreground flex-1 leading-relaxed">{log.message}</span>

                  {/* User ID */}
                  {log.user_id && (
                    <span className="shrink-0 text-muted-foreground/50 text-[10px] tabular-nums">{log.user_id}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Showing mock logs — connect to Loki, CloudWatch, or Datadog for production log aggregation.
      </p>
    </div>
  );
}
