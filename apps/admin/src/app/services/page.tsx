"use client";

import { useEffect, useState } from "react";

const SERVICES = [
  { name: "auth-service",           port: 8001, category: "Core",      desc: "JWT auth, Google OAuth, user management, payments" },
  { name: "ai-agent-service",       port: 8002, category: "AI",        desc: "Multi-agent orchestration, LangGraph ReAct, streaming chat" },
  { name: "productivity-service",   port: 8003, category: "Domain",    desc: "Tasks, projects, Kanban, notes, Pomodoro" },
  { name: "finance-service",        port: 8004, category: "Domain",    desc: "Expenses, budgets, receipt scanner, AI categorisation" },
  { name: "habit-service",          port: 8005, category: "Domain",    desc: "Daily habits, streaks, XP gamification, mood logging" },
  { name: "analytics-service",      port: 8006, category: "Analytics", desc: "Life metrics aggregation, trends, visualisations" },
  { name: "recommendation-service", port: 8007, category: "AI",        desc: "ML wellness score, anomaly detection, personalised suggestions" },
  { name: "notification-service",   port: 8008, category: "Core",      desc: "In-app, email, push, Telegram notifications" },
  { name: "rag-service",            port: 8009, category: "AI",        desc: "Document upload, Pinecone vector search, Q&A synthesis" },
  { name: "career-service",         port: 8010, category: "Domain",    desc: "Resume analyser, interview prep, skill gap detection" },
  { name: "integrations-service",   port: 8011, category: "Core",      desc: "Google Calendar, Gmail integration, OAuth token management" },
  { name: "automation-service",     port: 8012, category: "Core",      desc: "Workflow rules engine — triggers, conditions, actions" },
];

const CATEGORY_STYLE: Record<string, { dot: string; badge: string; iconCls: string }> = {
  Core:      { dot: "bg-blue-400",    badge: "bg-blue-500/15 text-blue-400",     iconCls: "bg-blue-500/10 text-blue-400" },
  AI:        { dot: "bg-violet-400",  badge: "bg-violet-500/15 text-violet-400", iconCls: "bg-violet-500/10 text-violet-400" },
  Domain:    { dot: "bg-emerald-400", badge: "bg-emerald-500/15 text-emerald-400", iconCls: "bg-emerald-500/10 text-emerald-400" },
  Analytics: { dot: "bg-amber-400",   badge: "bg-amber-500/15 text-amber-400",   iconCls: "bg-amber-500/10 text-amber-400" },
};

function CategoryIcon({ category, className = "" }: { category: string; className?: string }) {
  if (category === "AI") return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
  if (category === "Analytics") return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
  if (category === "Domain") return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z" />
    </svg>
  );
}

type Status = "healthy" | "unhealthy" | "loading";

interface ServiceDetail {
  name: string; port: number; category: string; desc: string;
  status: Status; latency?: number; docsAvailable?: boolean;
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

async function checkService(port: number): Promise<{ ok: boolean; latency: number; hasSwagger: boolean }> {
  const start = Date.now();
  try {
    const [healthRes, docsRes] = await Promise.allSettled([
      fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(3000) }),
      fetch(`http://localhost:${port}/docs`,   { signal: AbortSignal.timeout(2000) }),
    ]);
    const ok = healthRes.status === "fulfilled" && healthRes.value.ok;
    const hasSwagger = docsRes.status === "fulfilled" && docsRes.value.ok;
    return { ok, latency: Date.now() - start, hasSwagger };
  } catch {
    return { ok: false, latency: Date.now() - start, hasSwagger: false };
  }
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceDetail[]>(
    SERVICES.map((s) => ({ ...s, status: "loading" }))
  );
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [filter, setFilter] = useState("All");

  async function checkAll() {
    setChecking(true);
    setServices((prev) => prev.map((s) => ({ ...s, status: "loading" })));
    const results = await Promise.all(
      SERVICES.map(async (s) => {
        const { ok, latency, hasSwagger } = await checkService(s.port);
        return { ...s, status: (ok ? "healthy" : "unhealthy") as Status, latency, docsAvailable: hasSwagger };
      })
    );
    setServices(results);
    setLastChecked(new Date());
    setChecking(false);
  }

  useEffect(() => {
    checkAll();
    const id = setInterval(checkAll, 30_000);
    return () => clearInterval(id);
  }, []);

  const categories = ["All", ...Array.from(new Set(SERVICES.map((s) => s.category)))];
  const filtered = filter === "All" ? services : services.filter((s) => s.category === filter);
  const isLoading = services.some((s) => s.status === "loading");
  const healthy = services.filter((s) => s.status === "healthy").length;
  const unhealthy = services.filter((s) => s.status === "unhealthy").length;
  const avgLatency = services
    .filter((s) => s.status === "healthy" && s.latency)
    .reduce((sum, s, _, arr) => sum + (s.latency ?? 0) / arr.length, 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Service Health</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Checking services…" : lastChecked ? `Updated ${lastChecked.toLocaleTimeString()}` : "—"}
          </p>
        </div>
        <button
          onClick={checkAll} disabled={checking}
          className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition disabled:opacity-50"
        >
          <svg className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {checking ? "Checking…" : "Refresh all"}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={SERVICES.length} icon={
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z" />
          </svg>
        } />
        <StatCard label="Healthy" value={isLoading ? "…" : healthy} icon={
          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        } />
        <StatCard label="Down" value={isLoading ? "…" : unhealthy} icon={
          <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        } />
        <StatCard label="Avg Latency" value={isLoading ? "…" : `${Math.round(avgLatency)}ms`} sub="healthy services" icon={
          <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        } />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => {
          const style = CATEGORY_STYLE[cat];
          return (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}>
              {style && filter !== cat && <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />}
              {cat}
            </button>
          );
        })}
      </div>

      {/* Service grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((svc) => {
          const catStyle = CATEGORY_STYLE[svc.category] ?? { dot: "bg-gray-400", badge: "bg-gray-500/15 text-gray-400", iconCls: "bg-gray-500/10 text-gray-400" };
          return (
            <div key={svc.name} className={`group rounded-2xl border bg-card p-4 transition-all hover:shadow-lg hover:shadow-black/20 ${
              svc.status === "unhealthy" ? "border-red-500/40 bg-red-500/5" : "border-border hover:border-border/80"
            }`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${catStyle.iconCls}`}>
                    <CategoryIcon category={svc.category} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{svc.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{svc.desc}</p>
                  </div>
                </div>
                <div className="shrink-0">
                  {svc.status === "loading" ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
                      checking
                    </span>
                  ) : svc.status === "healthy" ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {svc.latency}ms
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                      down
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${catStyle.badge}`}>
                    {svc.category}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">:{svc.port}</span>
                </div>
                <a href={`http://localhost:${svc.port}/docs`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition">
                  API Docs
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
