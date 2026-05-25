"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { analyticsApi, type LifeSummary } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { user } = useAuth(false);
  const [summary, setSummary] = useState<LifeSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    analyticsApi
      .summary()
      .then(setSummary)
      .catch(() => setError("Could not load analytics — is the analytics service running?"));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here&apos;s your life overview for today.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-sm text-yellow-300">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          {error}
        </div>
      )}

      {summary ? (
        <>
          {/* Life Score */}
          <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-card to-card p-6">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="relative">
              <p className="text-sm font-medium text-muted-foreground">Life Score</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-6xl font-bold gradient-text">{summary.life_score}</span>
                <span className="text-muted-foreground mb-2 text-lg">/100</span>
              </div>
              <div className="mt-4 h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-700 shadow-sm shadow-primary/50"
                  style={{ width: `${summary.life_score}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {summary.life_score >= 80
                  ? "Excellent — you're crushing it!"
                  : summary.life_score >= 60
                  ? "Great momentum, keep going!"
                  : summary.life_score >= 40
                  ? "Good start, a few more wins today!"
                  : "Let's get some habits checked off!"}
              </p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Tasks To Do"
              value={summary.tasks_todo}
              href="/tasks"
              color="text-orange-400"
              bg="bg-orange-500/8 border-orange-500/20 hover:border-orange-500/40"
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Done This Week"
              value={summary.tasks_done_this_week}
              href="/tasks"
              color="text-emerald-400"
              bg="bg-emerald-500/8 border-emerald-500/20 hover:border-emerald-500/40"
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              }
            />
            <StatCard
              label="Habits Today"
              value={`${summary.habits_completed_today}/${summary.habits_active}`}
              href="/habits"
              color="text-blue-400"
              bg="bg-blue-500/8 border-blue-500/20 hover:border-blue-500/40"
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172" />
                </svg>
              }
            />
            <StatCard
              label="Spent This Month"
              value={`₹${summary.expenses_this_month.toFixed(0)}`}
              href="/finance"
              color="text-purple-400"
              bg="bg-purple-500/8 border-purple-500/20 hover:border-purple-500/40"
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </div>
        </>
      ) : !error ? (
        <div className="space-y-4">
          <div className="h-36 animate-pulse rounded-2xl bg-muted" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      ) : null}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickLink
            href="/chat"
            icon={<span className="text-xl">✦</span>}
            title="Ask AI Coach"
            desc="Get personalized advice"
            gradient="from-violet-500/20 to-indigo-500/10 hover:from-violet-500/30"
            border="border-violet-500/20 hover:border-violet-500/40"
          />
          <QuickLink
            href="/tasks"
            icon={
              <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            }
            title="Add Task"
            desc="Stay on top of your day"
            gradient="from-orange-500/15 to-amber-500/5 hover:from-orange-500/25"
            border="border-orange-500/20 hover:border-orange-500/40"
          />
          <QuickLink
            href="/habits"
            icon={<span className="text-xl">🔥</span>}
            title="Log Habit"
            desc="Keep your streaks alive"
            gradient="from-emerald-500/15 to-teal-500/5 hover:from-emerald-500/25"
            border="border-emerald-500/20 hover:border-emerald-500/40"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  color,
  bg,
  icon,
}: {
  label: string;
  value: string | number;
  href: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <div className={`rounded-xl border p-5 transition-all cursor-pointer hover:-translate-y-0.5 ${bg}`}>
        <div className={`mb-3 ${color}`}>{icon}</div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1.5 text-2xl font-bold ${color}`}>{value}</p>
      </div>
    </Link>
  );
}

function QuickLink({
  href,
  icon,
  title,
  desc,
  gradient,
  border,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  gradient: string;
  border: string;
}) {
  return (
    <Link href={href}>
      <div className={`flex items-center gap-4 rounded-xl border bg-gradient-to-br p-5 transition-all cursor-pointer hover:-translate-y-0.5 ${gradient} ${border}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/40">
          {icon}
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
    </Link>
  );
}
