"use client";

import { useEffect, useState } from "react";
import { recommendationsApi, mlApi, type Recommendation, type LifeInsights } from "@/lib/api";
import { useToast } from "@/components/Toast";

type Tab = "recommendations" | "insights";

const CATEGORY_STYLE: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  habit:    { label: "Habit",    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25", dot: "bg-emerald-400" },
  task:     { label: "Task",     color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/25",   dot: "bg-orange-400" },
  finance:  { label: "Finance",  color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/25",       dot: "bg-blue-400" },
  learning: { label: "Learning", color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/25",   dot: "bg-violet-400" },
  wellness: { label: "Wellness", color: "text-pink-400",    bg: "bg-pink-500/10 border-pink-500/25",       dot: "bg-pink-400" },
};

const CATEGORY_ICON: Record<string, string> = {
  habit: "◎", task: "✓", finance: "₹", learning: "📚", wellness: "💪",
};

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="capitalize text-muted-foreground font-medium">{label}</span>
        <span className="font-bold" style={{ color }}>{score.toFixed(0)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

const INSIGHT_COLOR: Record<string, string> = {
  habit: "#10b981", task: "#f59e0b", finance: "#6366f1",
};
const TREND_ICON = { up: "↑", down: "↓", stable: "→" };
const TREND_COLOR = { up: "text-emerald-400", down: "text-red-400", stable: "text-muted-foreground" };

function InsightsPanel() {
  const [insights, setInsights] = useState<LifeInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mlApi.insights().then(setInsights).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />)}
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
        Could not load insights. Make sure services are running.
      </div>
    );
  }

  const wColor = insights.wellness_score >= 75 ? "#10b981" : insights.wellness_score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-5">
      {/* Wellness score hero */}
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-6">
        <div className="relative h-28 w-28 shrink-0">
          <svg className="h-28 w-28 -rotate-90" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="44" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
            <circle
              cx="56" cy="56" r="44" fill="none" strokeWidth="10"
              stroke={wColor}
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={2 * Math.PI * 44 * (1 - insights.wellness_score / 100)}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-foreground">{insights.wellness_score.toFixed(0)}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-bold text-foreground text-lg">Life Wellness Score</h3>
            <p className="text-sm text-muted-foreground">{insights.top_recommendation}</p>
          </div>
          <div className="space-y-2">
            {Object.entries(insights.component_scores).map(([k, v]) => (
              <ScoreBar key={k} label={k} score={v} color={INSIGHT_COLOR[k] ?? "#6366f1"} />
            ))}
          </div>
        </div>
      </div>

      {/* Anomalies */}
      {insights.anomalies.length > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Anomalies detected
          </h3>
          <ul className="space-y-1">
            {insights.anomalies.map((a, i) => (
              <li key={i} className="text-sm text-amber-300/90 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠</span>{a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Per-category insight cards */}
      <div className="space-y-3">
        {insights.insights.map((ins, i) => {
          const color = INSIGHT_COLOR[ins.category] ?? "#6366f1";
          const trend = ins.trend as "up" | "down" | "stable";
          return (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">{ins.category}</span>
                    <span className={`text-sm font-bold ${TREND_COLOR[trend]}`}>
                      {TREND_ICON[trend]} {trend}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground">{ins.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{ins.description}</p>
                </div>
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-2xl font-black" style={{ color }}>{ins.score.toFixed(0)}</span>
                  <span className="text-xs text-muted-foreground">score</span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                <p className="text-xs text-muted-foreground">{ins.action}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("recommendations");
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    recommendationsApi.list().then(setRecs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function dismiss(id: string) {
    await recommendationsApi.dismiss(id);
    setRecs((prev) => prev.filter((r) => r.id !== id));
    toast("Recommendation dismissed", "info");
  }

  async function generate() {
    setGenerating(true);
    try {
      const fresh = await recommendationsApi.generate();
      setRecs(fresh);
      setFilter("all");
      toast(`Generated ${fresh.length} new recommendations`, "success");
    } catch {
      toast("Failed to generate recommendations", "error");
    } finally {
      setGenerating(false);
    }
  }

  const categories = ["all", ...Array.from(new Set(recs.map((r) => r.category)))];
  const filtered = filter === "all" ? recs : recs.filter((r) => r.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">For You</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI recommendations and ML-powered life insights.
          </p>
        </div>
        {tab === "recommendations" && (
          <button
            onClick={generate}
            disabled={generating}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {generating ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Generate
              </>
            )}
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
        {(["recommendations", "insights"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "insights" ? "ML Insights" : "Recommendations"}
          </button>
        ))}
      </div>

      {tab === "insights" ? (
        <InsightsPanel />
      ) : (
        <>
      {/* Category filter */}
      {recs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => {
            const style = c !== "all" ? CATEGORY_STYLE[c] : null;
            return (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`rounded-xl px-4 py-1.5 text-sm font-medium capitalize transition border ${
                  filter === c
                    ? style
                      ? `${style.bg} ${style.color} border-current/30`
                      : "bg-primary/15 text-primary border-primary/30"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {c === "all" ? `All (${recs.length})` : `${c} (${recs.filter((r) => r.category === c).length})`}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <div className="text-4xl mb-3">✦</div>
          <p className="font-semibold text-foreground">
            {recs.length === 0 ? "No recommendations yet" : "Nothing in this category"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {recs.length === 0
              ? "Hit \"Generate\" to get personalised AI suggestions based on your tasks, habits, and spending."
              : "Switch to a different filter to see more."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((rec) => {
            const style = CATEGORY_STYLE[rec.category] ?? CATEGORY_STYLE.habit;
            return (
              <div key={rec.id} className={`group rounded-2xl border p-5 transition hover:-translate-y-0.5 ${style.bg}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-background/50 text-lg`}>
                      {CATEGORY_ICON[rec.category]}
                    </div>
                    <div>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${style.color}`}>
                        {style.label}
                      </span>
                      <p className="font-semibold text-foreground text-sm leading-tight">{rec.title}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => dismiss(rec.id)}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-background/40 transition opacity-0 group-hover:opacity-100"
                    title="Dismiss"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{rec.description}</p>
                {rec.reason && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-background/30 px-3 py-2">
                    <svg className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${style.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p className="text-xs text-muted-foreground italic">{rec.reason}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
}
