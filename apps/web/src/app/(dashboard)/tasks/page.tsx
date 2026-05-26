"use client";

import { useEffect, useState } from "react";
import { tasksApi, integrationsApi, type Task, type ScheduleSuggestion } from "@/lib/api";
import { useToast } from "@/components/Toast";

const COLS = [
  { key: "todo" as const, label: "To Do", dot: "bg-orange-400", accent: "border-orange-500/30 bg-orange-500/5" },
  { key: "in_progress" as const, label: "In Progress", dot: "bg-blue-400", accent: "border-blue-500/30 bg-blue-500/5" },
  { key: "done" as const, label: "Done", dot: "bg-emerald-400", accent: "border-emerald-500/30 bg-emerald-500/5" },
];

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceDown, setServiceDown] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showSchedule, setShowSchedule] = useState(false);
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setServiceDown(false);
    try {
      setTasks(await tasksApi.list());
    } catch {
      setServiceDown(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const t = await tasksApi.create({ title: newTitle.trim() });
      setTasks((prev) => [t, ...prev]);
      setNewTitle("");
      toast("Task created");
    } catch {
      toast("Could not create task — service unavailable", "error");
    } finally {
      setCreating(false);
    }
  }

  async function moveTask(id: string, newStatus: Task["status"]) {
    try {
      const updated = await tasksApi.update(id, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      toast(`Moved to ${newStatus.replace("_", " ")}`, "info");
    } catch {
      toast("Could not update task", "error");
    }
  }

  async function deleteTask(id: string) {
    try {
      await tasksApi.delete(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast("Task deleted", "error");
    } catch {
      toast("Could not delete task", "error");
    }
  }

  async function fetchSchedule() {
    setLoadingSuggestions(true);
    setShowSchedule(true);
    setSuggestions([]);
    try {
      const result = await tasksApi.schedule();
      setSuggestions(result);
    } catch {
      toast("Could not generate schedule suggestions", "error");
      setShowSchedule(false);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function addSuggestionToCalendar(s: ScheduleSuggestion) {
    setAddingToCalendar(s.task_id);
    try {
      await integrationsApi.createCalendarEvent({
        title: s.task_title,
        start: s.suggested_start,
        end: s.suggested_end,
        description: s.reason,
      });
      toast(`"${s.task_title}" added to Calendar`, "success");
      setSuggestions((prev) => prev.filter((x) => x.task_id !== s.task_id));
    } catch {
      toast("Could not add to Calendar — is Google connected?", "error");
    } finally {
      setAddingToCalendar(null);
    }
  }

  const filtered = tasks.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q);
    const matchesPriority = filterPriority === "all" || t.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });
  const byStatus = (s: string) => filtered.filter((t) => t.status === s);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tasks.length} total · {byStatus("done").length} completed</p>
        </div>
        <button
          onClick={fetchSchedule}
          disabled={loadingSuggestions}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition shadow-md shadow-violet-500/20"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          {loadingSuggestions ? "Scheduling…" : "Smart Schedule"}
        </button>
      </div>

      {serviceDown && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Productivity service is offline — start it on port 8003 to manage tasks.
        </div>
      )}

      {/* Search + Priority filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition"
          />
        </div>
        <div className="flex items-center gap-1">
          {(["all", "low", "medium", "high", "urgent"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterPriority === p
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={createTask} className="flex gap-3">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a new task and press Enter…"
          className="flex-1 rounded-xl border border-input bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition"
        />
        <button
          type="submit"
          disabled={creating || !newTitle.trim()}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition shadow-md shadow-primary/20"
        >
          {creating ? "Adding…" : "Add"}
        </button>
      </form>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {COLS.map(({ key, label, dot, accent }) => (
            <div key={key} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className={`flex items-center justify-between border-b px-4 py-3 ${accent}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  <h2 className="text-sm font-semibold text-foreground">{label}</h2>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-medium">
                  {byStatus(key).length}
                </span>
              </div>
              <div className="p-3 space-y-2 min-h-[120px]">
                {byStatus(key).map((task) => (
                  <TaskCard key={task.id} task={task} onMove={moveTask} onDelete={deleteTask} />
                ))}
                {byStatus(key).length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-6 opacity-60">Empty</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Smart Schedule panel */}
      {showSchedule && (
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400 text-sm">✨</span>
              <div>
                <h2 className="text-sm font-semibold text-foreground">AI Scheduling Suggestions</h2>
                <p className="text-xs text-muted-foreground">Based on your tasks and calendar availability</p>
              </div>
            </div>
            <button
              onClick={() => setShowSchedule(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/60 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loadingSuggestions ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/60" />)}
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No pending tasks to schedule.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((s) => {
                const start = new Date(s.suggested_start);
                const end = new Date(s.suggested_end);
                const dateLabel = start.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
                const timeLabel = `${start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })} – ${end.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
                return (
                  <div key={s.task_id} className="rounded-xl border border-violet-500/20 bg-card p-4 flex flex-col gap-2">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">{s.task_title}</p>
                    <div className="flex items-center gap-1.5 text-xs text-violet-400 font-medium">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      {dateLabel} · {timeLabel}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1">{s.reason}</p>
                    <button
                      onClick={() => addSuggestionToCalendar(s)}
                      disabled={addingToCalendar === s.task_id}
                      className="mt-1 w-full rounded-lg bg-violet-500/15 border border-violet-500/25 py-1.5 text-xs font-semibold text-violet-400 hover:bg-violet-500/25 disabled:opacity-60 transition"
                    >
                      {addingToCalendar === s.task_id ? "Adding…" : "Add to Calendar"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const NEXT_STATUS: Record<string, Task["status"]> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

function TaskCard({
  task,
  onMove,
  onDelete,
}: {
  task: Task;
  onMove: (id: string, s: Task["status"]) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group rounded-xl border border-border bg-background/60 p-3 hover:border-primary/30 hover:bg-background transition-all">
      <p className="text-sm font-medium text-foreground leading-snug">{task.title}</p>
      {task.description && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{task.description}</p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[task.priority]}`}>
          {task.priority}
        </span>
        <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onMove(task.id, NEXT_STATUS[task.status])}
            title="Move to next stage"
            className="rounded-lg px-2 py-1 text-xs text-primary hover:bg-primary/15 transition font-medium"
          >
            →
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/15 transition"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
