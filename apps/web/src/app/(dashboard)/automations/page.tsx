"use client";

import { useEffect, useState } from "react";
import { automationApi, type WorkflowRule } from "@/lib/api";
import { useToast } from "@/components/Toast";

const TRIGGER_TYPES = [
  { value: "manual", label: "Manual (run on demand)" },
  { value: "schedule", label: "Scheduled (daily/weekly)" },
  { value: "habit_streak", label: "Habit streak milestone" },
  { value: "task_complete", label: "Task completed" },
  { value: "budget_exceeded", label: "Budget exceeded" },
];

const ACTION_TYPES = [
  { value: "send_notification", label: "Send notification" },
  { value: "create_task", label: "Create a task" },
  { value: "log_habit", label: "Log a habit" },
  { value: "webhook", label: "Call a webhook" },
];

function triggerLabel(type: string) {
  return TRIGGER_TYPES.find((t) => t.value === type)?.label ?? type;
}

function actionLabel(type: string) {
  return ACTION_TYPES.find((t) => t.value === type)?.label ?? type;
}

function TriggerIcon({ type }: { type: string }) {
  const cls = "h-4 w-4";
  if (type === "schedule") return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  if (type === "habit_streak") return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
    </svg>
  );
  if (type === "task_complete") return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  if (type === "budget_exceeded") return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
    </svg>
  );
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
    </svg>
  );
}

interface NewRule {
  name: string;
  trigger_type: string;
  action_type: string;
  action_title: string;
  action_body: string;
  action_url: string;
}

const DEFAULT_NEW: NewRule = {
  name: "",
  trigger_type: "manual",
  action_type: "send_notification",
  action_title: "",
  action_body: "",
  action_url: "",
};

function buildActionConfig(form: NewRule): Record<string, string> {
  if (form.action_type === "send_notification") {
    return { title: form.action_title, body: form.action_body, channel: "in_app" };
  }
  if (form.action_type === "create_task") {
    return { title: form.action_title, description: form.action_body };
  }
  if (form.action_type === "webhook") {
    return { url: form.action_url };
  }
  return {};
}

export default function AutomationsPage() {
  const { toast } = useToast();
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewRule>(DEFAULT_NEW);
  const [creating, setCreating] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  useEffect(() => {
    automationApi.list()
      .then(setRules)
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.trigger_type || !form.action_type) return;
    setCreating(true);
    try {
      const rule = await automationApi.create({
        name: form.name,
        is_active: true,
        trigger_type: form.trigger_type,
        trigger_config: {},
        action_type: form.action_type,
        action_config: buildActionConfig(form),
      });
      setRules((prev) => [rule, ...prev]);
      setShowForm(false);
      setForm(DEFAULT_NEW);
      toast("Automation created", "success");
    } catch {
      toast("Failed to create automation", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(rule: WorkflowRule) {
    const updated = await automationApi.toggle(rule.id, !rule.is_active).catch(() => null);
    if (updated) setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
  }

  async function handleDelete(id: string) {
    await automationApi.delete(id).catch(() => {});
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast("Automation deleted", "info");
  }

  async function handleRun(id: string) {
    setRunningId(id);
    try {
      const res = await automationApi.run(id);
      toast(res.message, res.triggered ? "success" : "error");
      setRules((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, run_count: r.run_count + 1, last_run_at: new Date().toISOString() }
            : r
        )
      );
    } catch {
      toast("Failed to run automation", "error");
    } finally {
      setRunningId(null);
    }
  }

  const f = (key: keyof NewRule, val: string) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Rules that trigger actions automatically.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New rule
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">No automations yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create rules to trigger actions automatically.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
          >
            Create your first rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="group rounded-2xl border border-border bg-card px-5 py-4 hover:bg-muted/10 transition"
            >
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
                  rule.is_active
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "bg-muted border-border text-muted-foreground"
                }`}>
                  <TriggerIcon type={rule.trigger_type} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{rule.name}</p>
                    {!rule.is_active && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Paused</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When: <span className="text-foreground">{triggerLabel(rule.trigger_type)}</span>
                    {" → "}
                    Then: <span className="text-foreground">{actionLabel(rule.action_type)}</span>
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>Ran {rule.run_count} time{rule.run_count !== 1 ? "s" : ""}</span>
                    {rule.last_run_at && (
                      <span>· Last: {new Date(rule.last_run_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                  {rule.trigger_type === "manual" && (
                    <button
                      onClick={() => handleRun(rule.id)}
                      disabled={runningId === rule.id || !rule.is_active}
                      title="Run now"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-40 transition"
                    >
                      {runningId === rule.id ? (
                        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleToggle(rule)}
                    title={rule.is_active ? "Pause" : "Enable"}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition"
                  >
                    {rule.is_active ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                      </svg>
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    title="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowForm(false)}
        >
          <form
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
          >
            <h2 className="font-semibold text-foreground">New Automation Rule</h2>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rule name</label>
              <input
                required
                placeholder="e.g. Notify me on budget overrun"
                value={form.name}
                onChange={(e) => f("name", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Trigger</label>
              <select
                value={form.trigger_type}
                onChange={(e) => f("trigger_type", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              >
                {TRIGGER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Action</label>
              <select
                value={form.action_type}
                onChange={(e) => f("action_type", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              >
                {ACTION_TYPES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            {/* Action-specific config fields */}
            {(form.action_type === "send_notification" || form.action_type === "create_task") && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {form.action_type === "send_notification" ? "Notification title" : "Task title"}
                  </label>
                  <input
                    placeholder="Title"
                    value={form.action_title}
                    onChange={(e) => f("action_title", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {form.action_type === "send_notification" ? "Message body" : "Description (optional)"}
                  </label>
                  <input
                    placeholder={form.action_type === "send_notification" ? "Notification body" : "Description"}
                    value={form.action_body}
                    onChange={(e) => f("action_body", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  />
                </div>
              </>
            )}

            {form.action_type === "webhook" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Webhook URL</label>
                <input
                  placeholder="https://your-service.com/hook"
                  value={form.action_url}
                  onChange={(e) => f("action_url", e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
              >
                {creating ? "Creating…" : "Create rule"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
