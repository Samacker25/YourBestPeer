"use client";

import { useEffect, useState } from "react";
import {
  analyticsApi,
  type DailyExpense,
  type CategorySpend,
  type HabitStreak,
  type TaskTrend,
} from "@/lib/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CATEGORY_COLORS = [
  "#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4",
  "#10b981", "#f59e0b", "#ef4444", "#ec4899",
];

function fmt(d: string) {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

export default function AnalyticsPage() {
  const [expenseTrend, setExpenseTrend] = useState<DailyExpense[]>([]);
  const [expenseCats, setExpenseCats] = useState<CategorySpend[]>([]);
  const [habitStats, setHabitStats] = useState<HabitStreak[]>([]);
  const [taskTrend, setTaskTrend] = useState<TaskTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.allSettled([
      analyticsApi.expenseTrend(30),
      analyticsApi.expenseByCategory(30),
      analyticsApi.habitStats(),
      analyticsApi.taskTrend(14),
    ]).then(([e, ec, h, t]) => {
      if (e.status === "fulfilled") setExpenseTrend(e.value);
      if (ec.status === "fulfilled") setExpenseCats(ec.value);
      if (h.status === "fulfilled") setHabitStats(h.value);
      if (t.status === "fulfilled") setTaskTrend(t.value);
      if ([e, ec, h, t].every((r) => r.status === "rejected")) {
        setError("Analytics service unavailable — start the analytics service on port 8006.");
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between border-b border-border px-8 py-5 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Trends across your tasks, habits, and spending</p>
        </div>
      </div>

      <div className="flex-1 px-8 py-6 space-y-6">
        {error && (
          <div className="flex items-center gap-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-sm text-yellow-300">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Expense Trend */}
            <ChartCard
              title="Daily Spending"
              subtitle="Last 30 days"
              empty={expenseTrend.length === 0}
            >
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={expenseTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
                    labelFormatter={(l) => fmt(l as string)}
                    formatter={(v: number) => [`₹${v.toFixed(0)}`, "Spent"]}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} fill="url(#expGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Category Breakdown */}
            <ChartCard
              title="Spending by Category"
              subtitle="Last 30 days"
              empty={expenseCats.length === 0}
            >
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expenseCats}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={3}
                  >
                    {expenseCats.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number) => [`₹${v.toFixed(0)}`, "Spent"]}
                  />
                  <Legend
                    iconSize={8}
                    iconType="circle"
                    formatter={(v) => <span style={{ color: "#9ca3af", fontSize: 11 }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Habit Consistency */}
            <ChartCard
              title="Habit Completion Rate"
              subtitle="Last 30 days"
              empty={habitStats.length === 0}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={habitStats} margin={{ top: 5, right: 10, left: -20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} angle={-25} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                  <Tooltip
                    contentStyle={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number) => [`${Math.round(v * 100)}%`, "Completion"]}
                  />
                  <Bar dataKey="completion_rate" radius={[4, 4, 0, 0]}>
                    {habitStats.map((h, i) => (
                      <Cell key={i} fill={h.completion_rate >= 0.7 ? "#10b981" : h.completion_rate >= 0.4 ? "#f59e0b" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Task Completion Trend */}
            <ChartCard
              title="Tasks Completed"
              subtitle="Last 14 days"
              empty={taskTrend.length === 0}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={taskTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
                    labelFormatter={(l) => fmt(l as string)}
                    formatter={(v: number) => [v, "Completed"]}
                  />
                  <Bar dataKey="completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Habit Streaks */}
            {habitStats.length > 0 && (
              <div className="lg:col-span-2">
                <ChartCard title="Habit Streaks" subtitle="Current streak days" empty={false}>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 pt-2">
                    {habitStats.map((h, i) => (
                      <div key={i} className="rounded-xl border border-border bg-muted/20 p-4 text-center">
                        <p className="truncate text-xs text-muted-foreground mb-2">{h.name}</p>
                        <p className="text-2xl font-bold" style={{ color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}>
                          {h.streak}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">day streak</p>
                        <div className="mt-2 h-1 w-full rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, h.completion_rate * 100)}%`,
                              backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      {empty ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
          No data yet
        </div>
      ) : children}
    </div>
  );
}
