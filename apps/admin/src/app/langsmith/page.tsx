"use client";

import React, { useEffect, useState } from "react";

interface Run {
  id: string;
  name: string;
  run_type: string;
  status: string;
  start_time: string;
  end_time: string | null;
  total_tokens: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown> | null;
  error: string | null;
}

const TYPE_STYLE: Record<string, string> = {
  llm:       "bg-violet-500/15 text-violet-400",
  chain:     "bg-blue-500/15 text-blue-400",
  tool:      "bg-amber-500/15 text-amber-400",
  retriever: "bg-teal-500/15 text-teal-400",
};

function duration(run: Run): string {
  if (!run.end_time) return "—";
  const ms = new Date(run.end_time).getTime() - new Date(run.start_time).getTime();
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function truncate(obj: unknown, max = 200): string {
  const s = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function StatCard({ label, value, sub, color = "text-foreground" }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function LangSmithPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "llm" | "chain" | "tool">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load(quiet = false) {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filter !== "all") params.set("run_type", filter);
      const res = await fetch(`/api/langsmith?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setRuns(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  const displayed = statusFilter === "all"
    ? runs
    : runs.filter((r) => r.status === statusFilter);

  const successCount = runs.filter((r) => r.status === "success").length;
  const errorCount   = runs.filter((r) => r.status === "error").length;
  const totalTokens  = runs.reduce((s, r) => s + (r.total_tokens ?? 0), 0);
  const avgDuration  = runs.length
    ? runs
        .filter((r) => r.end_time)
        .reduce((s, r) => s + (new Date(r.end_time!).getTime() - new Date(r.start_time).getTime()), 0)
      / runs.filter((r) => r.end_time).length
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            LangSmith Traces
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">LLM runs from the <span className="text-primary font-medium">yourbestpeer</span> project</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition disabled:opacity-50"
        >
          <svg className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Runs" value={runs.length} />
        <StatCard label="Successful" value={successCount} color="text-emerald-400" sub={runs.length ? `${Math.round(successCount / runs.length * 100)}% success rate` : undefined} />
        <StatCard label="Errors" value={errorCount} color={errorCount > 0 ? "text-red-400" : "text-foreground"} />
        <StatCard label="Total Tokens" value={totalTokens.toLocaleString()} sub={avgDuration ? `avg ${(avgDuration / 1000).toFixed(1)}s/run` : undefined} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {(["all", "llm", "chain", "tool"] as const).map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "all" ? "All Types" : t.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {(["all", "success", "error"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{displayed.length} runs shown</span>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error.includes("LANGCHAIN_API_KEY") ? (
            <span>LANGCHAIN_API_KEY not set in <code className="font-mono">.env</code> — add it to enable LangSmith integration.</span>
          ) : error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3,4].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : displayed.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
          No runs found. Make sure <span className="text-primary">LANGCHAIN_TRACING_V2=true</span> is set and services are making LLM calls.
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Run</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tokens</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((run) => (
                <React.Fragment key={run.id}>
                  <tr
                    onClick={() => setExpanded(expanded === run.id ? null : run.id)}
                    className={`border-b border-border cursor-pointer transition-colors ${
                      run.status === "error" ? "hover:bg-red-500/5" : "hover:bg-muted/30"
                    } ${expanded === run.id ? "bg-muted/20" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <svg className={`h-3 w-3 shrink-0 transition-transform ${expanded === run.id ? "rotate-90" : ""} text-muted-foreground`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                        <span className="font-medium text-foreground truncate max-w-[180px]">{run.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TYPE_STYLE[run.run_type] ?? "bg-muted text-muted-foreground"}`}>
                        {run.run_type?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${run.status === "success" ? "text-emerald-400" : run.status === "error" ? "text-red-400" : "text-yellow-400"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${run.status === "success" ? "bg-emerald-400" : run.status === "error" ? "bg-red-400 animate-pulse" : "bg-yellow-400 animate-pulse"}`} />
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{duration(run)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {run.total_tokens != null ? (
                        <span title={`${run.prompt_tokens ?? 0} in / ${run.completion_tokens ?? 0} out`}>
                          {run.total_tokens.toLocaleString()}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(run.start_time).toLocaleTimeString()}
                    </td>
                  </tr>

                  {expanded === run.id && (
                    <tr className="border-b border-border bg-muted/10">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-2">Input</p>
                            <pre className="rounded-xl bg-background border border-border p-3 text-foreground overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap break-words">
                              {truncate(run.inputs, 800)}
                            </pre>
                          </div>
                          <div>
                            <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                              {run.status === "error" ? "Error" : "Output"}
                            </p>
                            <pre className={`rounded-xl border p-3 overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap break-words ${
                              run.status === "error"
                                ? "bg-red-500/5 border-red-500/20 text-red-300"
                                : "bg-background border-border text-foreground"
                            }`}>
                              {run.status === "error"
                                ? (run.error ?? "Unknown error")
                                : truncate(run.outputs ?? {}, 800)}
                            </pre>
                          </div>
                          {run.total_tokens != null && (
                            <div className="md:col-span-2 flex items-center gap-6 text-muted-foreground">
                              <span>Prompt tokens: <span className="text-foreground font-medium">{run.prompt_tokens ?? 0}</span></span>
                              <span>Completion tokens: <span className="text-foreground font-medium">{run.completion_tokens ?? 0}</span></span>
                              <span>Total: <span className="text-foreground font-medium">{run.total_tokens}</span></span>
                              <span className="font-mono text-[11px] text-muted-foreground/60 ml-auto">ID: {run.id.slice(0, 8)}…</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
