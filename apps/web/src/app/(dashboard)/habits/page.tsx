"use client";

import { useEffect, useState } from "react";
import { habitsApi, moodApi, type Habit, type XPStats, type MoodLog } from "@/lib/api";
import { useToast } from "@/components/Toast";

const MOOD_OPTIONS = [
  { value: 1, emoji: "😔", label: "Rough" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "🙂", label: "Okay" },
  { value: 4, emoji: "😊", label: "Good" },
  { value: 5, emoji: "🤩", label: "Amazing" },
];

const ENERGY_OPTIONS = [
  { value: 1, label: "Drained" },
  { value: 2, label: "Tired" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Energised" },
  { value: 5, label: "Charged" },
];

function MoodPanel({ todayLog, onSaved }: { todayLog: MoodLog | null; onSaved: (log: MoodLog) => void }) {
  const { toast } = useToast();
  const [mood, setMood] = useState(todayLog?.mood ?? 0);
  const [energy, setEnergy] = useState(todayLog?.energy ?? 0);
  const [sleep, setSleep] = useState(todayLog?.sleep_hours?.toString() ?? "");
  const [note, setNote] = useState(todayLog?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(!!todayLog);

  async function handleSave() {
    if (!mood || !energy) return;
    setSaving(true);
    try {
      const log = await moodApi.log({
        mood,
        energy,
        sleep_hours: sleep ? parseInt(sleep) : undefined,
        note: note.trim() || undefined,
      });
      onSaved(log);
      setCollapsed(true);
      toast("Wellness logged ✓", "success");
    } catch {
      toast("Failed to save wellness log", "error");
    } finally {
      setSaving(false);
    }
  }

  if (collapsed && todayLog) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{todayLog.emoji}</span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Today's wellness logged
            </p>
            <p className="text-xs text-muted-foreground">
              Mood {todayLog.mood}/5 · Energy {todayLog.energy}/5
              {todayLog.sleep_hours != null && ` · ${todayLog.sleep_hours}h sleep`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20">
          <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-blue-300">Daily Wellness Check-in</p>
      </div>

      {/* Mood */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">How are you feeling?</p>
        <div className="flex gap-2">
          {MOOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMood(opt.value)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 border transition ${
                mood === opt.value
                  ? "border-blue-500/50 bg-blue-500/15 text-foreground"
                  : "border-border bg-card/60 text-muted-foreground hover:bg-muted/30"
              }`}
            >
              <span className="text-lg">{opt.emoji}</span>
              <span className="text-[10px] font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Energy */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Energy level</p>
        <div className="flex gap-2">
          {ENERGY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setEnergy(opt.value)}
              className={`flex-1 rounded-xl py-1.5 text-xs font-medium border transition ${
                energy === opt.value
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                  : "border-border bg-card/60 text-muted-foreground hover:bg-muted/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sleep + Note */}
      <div className="flex gap-3">
        <div className="space-y-1 w-28">
          <p className="text-xs font-medium text-muted-foreground">Sleep (hrs)</p>
          <input
            type="number"
            min={0}
            max={24}
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
            placeholder="8"
            className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
        </div>
        <div className="space-y-1 flex-1">
          <p className="text-xs font-medium text-muted-foreground">Note (optional)</p>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How's your day going…"
            className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!mood || !energy || saving}
        className="w-full rounded-xl bg-blue-500 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 transition"
      >
        {saving ? "Saving…" : "Log wellness"}
      </button>
    </div>
  );
}

function XPPanel({ xp }: { xp: XPStats }) {
  const pct = xp.xp_in_current_level;
  const levelColors = [
    "from-slate-400 to-slate-500",
    "from-emerald-400 to-teal-500",
    "from-blue-400 to-indigo-500",
    "from-violet-400 to-purple-500",
    "from-amber-400 to-orange-500",
    "from-rose-400 to-pink-500",
  ];
  const gradient = levelColors[Math.min(xp.level - 1, levelColors.length - 1)];
  const tierNames = ["Beginner", "Consistent", "Dedicated", "Champion", "Master", "Legend"];
  const tier = tierNames[Math.min(xp.level - 1, tierNames.length - 1)];

  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-card p-5">
      <div className="flex items-start gap-4">
        {/* Level badge */}
        <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
          <span className="text-xs font-semibold opacity-80">LVL</span>
          <span className="text-xl font-bold leading-none">{xp.level}</span>
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">{tier}</p>
            <span className="rounded-full bg-yellow-500/15 border border-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400 font-medium">
              {xp.total_xp.toLocaleString()} XP total
            </span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{xp.xp_in_current_level} / 100 XP</span>
              <span>{xp.xp_to_next_level} XP to level {xp.level + 1}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700 shadow-sm`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Total check-ins", value: xp.total_logs.toString() },
          { label: "Best streak", value: `${xp.best_streak} days` },
          { label: "Current level", value: tier },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-muted/30 px-3 py-2 text-center">
            <p className="text-sm font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HabitsPage() {
  const { toast } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [xpStats, setXpStats] = useState<XPStats | null>(null);
  const [todayMood, setTodayMood] = useState<MoodLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  async function load() {
    setLoading(true);
    try {
      const [h, xp, mood] = await Promise.all([
        habitsApi.list().catch(() => [] as typeof habits),
        habitsApi.xpStats().catch(() => null),
        moodApi.today().catch(() => null),
      ]);
      setHabits(h);
      setXpStats(xp);
      setTodayMood(mood);
    } catch {
      // habit-service offline — leave empty state
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const h = await habitsApi.create({ name: newName.trim() });
      setHabits((prev) => [h, ...prev]);
      setNewName("");
      toast("Habit added");
    } finally {
      setCreating(false);
    }
  }

  async function toggleLog(habit: Habit) {
    if (habit.completed_today) {
      await habitsApi.unlog(habit.id);
      setHabits((prev) =>
        prev.map((h) => h.id === habit.id ? { ...h, completed_today: false, streak: Math.max(0, h.streak - 1) } : h)
      );
    } else {
      const { streak, xp_earned } = await habitsApi.log(habit.id);
      setHabits((prev) =>
        prev.map((h) => h.id === habit.id ? { ...h, completed_today: true, streak } : h)
      );
      toast(`🔥 ${streak} day streak! +${xp_earned} XP`);
      habitsApi.xpStats().then(setXpStats).catch(() => {});
    }
  }

  async function deleteHabit(id: string) {
    await habitsApi.delete(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  const completed = habits.filter((h) => h.completed_today).length;
  const pct = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;

  const filteredHabits = habits.filter((h) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || h.name.toLowerCase().includes(q) || (h.description ?? "").toLowerCase().includes(q);
    const matchesFilter = filter === "all" || (filter === "done" ? h.completed_today : !h.completed_today);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Habits</h1>
        {habits.length > 0 && (
          <p className="text-sm text-muted-foreground mt-0.5">{completed} of {habits.length} completed today</p>
        )}
      </div>

      {/* XP Panel */}
      {xpStats && <XPPanel xp={xpStats} />}

      {/* Mood / Wellness check-in */}
      <MoodPanel todayLog={todayMood} onSaved={setTodayMood} />

      {/* Progress bar */}
      {habits.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm font-medium text-foreground">Today&apos;s progress</span>
            <span className="text-sm font-bold text-emerald-400">{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Search + Status filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search habits…"
            className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition"
          />
        </div>
        <div className="flex items-center gap-1">
          {(["all", "pending", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={createHabit} className="flex gap-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New habit to build…"
          className="flex-1 rounded-xl border border-input bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition shadow-md shadow-primary/20"
        >
          {creating ? "Adding…" : "Add"}
        </button>
      </form>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : habits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <div className="text-4xl mb-3">◎</div>
          <p className="font-medium text-foreground">No habits yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first habit to start building streaks.</p>
        </div>
      ) : filteredHabits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center">
          <p className="font-medium text-foreground">No habits match your search</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different search term or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHabits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} onToggle={toggleLog} onDelete={deleteHabit} />
          ))}
        </div>
      )}
    </div>
  );
}

function HabitCard({
  habit,
  onToggle,
  onDelete,
}: {
  habit: Habit;
  onToggle: (h: Habit) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`group relative rounded-2xl border p-5 transition-all hover:-translate-y-0.5 ${
        habit.completed_today
          ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-card shadow-sm shadow-emerald-500/10"
          : "border-border bg-card hover:border-primary/30"
      }`}
    >
      <button
        onClick={() => onDelete(habit.id)}
        className="absolute right-3 top-3 hidden rounded-lg p-1 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10 group-hover:flex transition"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(habit)}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
            habit.completed_today
              ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
              : "border-border hover:border-primary hover:bg-primary/10"
          }`}
        >
          {habit.completed_today && (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className={`font-semibold text-sm truncate transition-colors ${habit.completed_today ? "text-emerald-400" : "text-foreground"}`}>
            {habit.name}
          </p>
          {habit.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{habit.description}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {habit.streak > 0 ? (
          <div className="flex items-center gap-1.5 rounded-full bg-orange-500/15 border border-orange-500/20 px-2.5 py-1">
            <span className="text-sm">🔥</span>
            <span className="text-xs font-bold text-orange-400">{habit.streak}</span>
            <span className="text-xs text-muted-foreground">day streak</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
            <span className="text-xs text-muted-foreground">No streak yet</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1">
          <span className="text-xs font-bold text-yellow-400">+{habit.xp_reward}</span>
          <span className="text-xs text-muted-foreground">XP</span>
        </div>
      </div>
    </div>
  );
}
