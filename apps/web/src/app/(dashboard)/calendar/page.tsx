"use client";

import { useEffect, useState } from "react";
import { integrationsApi, type CalendarEvent, type IntegrationStatus } from "@/lib/api";
import { useToast } from "@/components/Toast";

function formatEventTime(iso: string, allDay: boolean): string {
  if (allDay) return "All day";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function groupByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const groups: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    const key = ev.start.slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
  }
  return groups;
}

function ConnectBanner({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-16 text-center space-y-4">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <svg className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z" />
          </svg>
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-foreground text-lg">Connect Google Calendar</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          See your upcoming events alongside tasks and get AI scheduling suggestions.
        </p>
      </div>
      <button
        onClick={onConnect}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600 transition"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Connect with Google
      </button>
    </div>
  );
}

export default function CalendarPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", start: "", end: "", description: "" });
  const [adding, setAdding] = useState(false);

  async function loadStatus() {
    const s = await integrationsApi.status().catch(() => null);
    setStatus(s);
    return s;
  }

  async function loadEvents(s?: IntegrationStatus | null) {
    if (!(s ?? status)?.connected) { setLoading(false); return; }
    try {
      const evs = await integrationsApi.calendarEvents(days);
      setEvents(evs);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus().then((s) => loadEvents(s));
  }, [days]);

  // Handle OAuth redirect back (URL param ?integration=connected)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("integration") === "connected") {
      toast("Google Calendar connected!", "success");
      window.history.replaceState({}, "", window.location.pathname);
      loadStatus().then((s) => loadEvents(s));
    }
  }, []);

  async function handleConnect() {
    try {
      const { auth_url } = await integrationsApi.connectGoogle();
      window.location.href = auth_url;
    } catch {
      toast("Could not connect — check GOOGLE_CLIENT_ID is configured", "error");
    }
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newEvent.title || !newEvent.start || !newEvent.end) return;
    setAdding(true);
    try {
      const created = await integrationsApi.createCalendarEvent({
        title: newEvent.title,
        start: new Date(newEvent.start).toISOString(),
        end: new Date(newEvent.end).toISOString(),
        description: newEvent.description || undefined,
      });
      setEvents((prev) => [...prev, created].sort((a, b) => a.start.localeCompare(b.start)));
      setShowAddForm(false);
      setNewEvent({ title: "", start: "", end: "", description: "" });
      toast("Event created", "success");
    } catch {
      toast("Failed to create event", "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    await integrationsApi.deleteCalendarEvent(id).catch(() => {});
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast("Event deleted", "info");
  }

  const groups = groupByDate(events);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Upcoming events from Google Calendar.</p>
        </div>
        {status?.connected && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-xl bg-muted p-1">
              {[7, 14, 30].map((d) => (
                <button key={d} onClick={() => setDays(d)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${days === d ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >{d}d</button>
              ))}
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add event
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0,1,2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : !status?.connected ? (
        <ConnectBanner onConnect={handleConnect} />
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="text-3xl mb-3">📅</div>
          <p className="font-semibold text-foreground">No upcoming events</p>
          <p className="text-sm text-muted-foreground mt-1">Your calendar is clear for the next {days} days.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groups).map(([date, dayEvents]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-2">
                <p className={`text-sm font-semibold ${date === today ? "text-primary" : "text-foreground"}`}>
                  {date === today ? "Today" : formatEventDate(date + "T00:00:00")}
                </p>
                {date === today && <span className="rounded-full bg-primary/15 text-primary text-xs px-2 py-0.5 font-medium">Today</span>}
              </div>
              <div className="space-y-2">
                {dayEvents.map((ev) => (
                  <div key={ev.id}
                    className="group flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3 hover:bg-muted/20 transition"
                  >
                    <div className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: ev.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatEventTime(ev.start, ev.all_day)}
                        {!ev.all_day && ` – ${formatEventTime(ev.end, false)}`}
                        {ev.location && ` · ${ev.location}`}
                      </p>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ev.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(ev.id)}
                      className="hidden group-hover:flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add event modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddForm(false)}>
          <form
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAddEvent}
          >
            <h2 className="font-semibold text-foreground">New Calendar Event</h2>
            {[
              { label: "Title", key: "title", type: "text", placeholder: "Event title" },
              { label: "Start", key: "start", type: "datetime-local", placeholder: "" },
              { label: "End", key: "end", type: "datetime-local", placeholder: "" },
              { label: "Description", key: "description", type: "text", placeholder: "Optional" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <input
                  type={type} placeholder={placeholder} required={key !== "description"}
                  value={newEvent[key as keyof typeof newEvent]}
                  onChange={(e) => setNewEvent((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowAddForm(false)}
                className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition">Cancel</button>
              <button type="submit" disabled={adding}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition">
                {adding ? "Creating…" : "Create event"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
