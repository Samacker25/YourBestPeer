"use client";

import { useEffect, useState } from "react";
import { notificationsApi, type Notification } from "@/lib/api";
import { useToast } from "@/components/Toast";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  in_app: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  email: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  push: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  ),
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { toast } = useToast();

  async function load() {
    try {
      const data = await notificationsApi.list(unreadOnly);
      setItems(data);
    } catch {
      toast("Failed to load notifications", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, [unreadOnly]);

  async function handleMarkRead(id: string) {
    try {
      const updated = await notificationsApi.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch {
      toast("Failed to mark as read", "error");
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast("All notifications marked as read");
    } catch {
      toast("Failed to mark all as read", "error");
    }
  }

  async function handleDelete(id: string) {
    try {
      await notificationsApi.delete(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast("Failed to delete notification", "error");
    }
  }

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-8 py-5 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setUnreadOnly((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              unreadOnly
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            {unreadOnly ? "Showing unread" : "Show unread only"}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <svg className="h-5 w-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">No notifications</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {unreadOnly ? "No unread notifications — you're all caught up!" : "You have no notifications yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl">
            {items.map((notif) => (
              <div
                key={notif.id}
                className={`group relative flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                  notif.is_read
                    ? "border-border bg-card/40"
                    : "border-primary/20 bg-primary/5"
                }`}
              >
                {/* Unread dot */}
                {!notif.is_read && (
                  <span className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
                )}

                {/* Type icon */}
                <div className={`mt-0.5 shrink-0 ${notif.is_read ? "text-muted-foreground" : "text-primary"}`}>
                  {TYPE_ICON[notif.type] ?? TYPE_ICON.in_app}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${notif.is_read ? "text-foreground/80" : "text-foreground"}`}>
                    {notif.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{notif.body}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground/60">{timeAgo(notif.created_at)}</p>
                </div>

                {/* Actions (appear on hover) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkRead(notif.id)}
                      title="Mark as read"
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    title="Delete"
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
