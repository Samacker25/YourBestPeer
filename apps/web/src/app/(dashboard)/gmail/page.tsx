"use client";

import { useEffect, useState } from "react";
import { integrationsApi, type GmailMessage, type GmailSummary } from "@/lib/api";
import { useToast } from "@/components/Toast";

function formatDate(raw: string): string {
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    const now = new Date();
    const diffH = (now.getTime() - d.getTime()) / 3600000;
    if (diffH < 24) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    if (diffH < 48) return "Yesterday";
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return raw;
  }
}

function senderName(from: string): string {
  const match = from.match(/^([^<]+)</);
  return match ? match[1].trim() : from.split("@")[0];
}

function senderInitial(from: string): string {
  return senderName(from).charAt(0).toUpperCase() || "?";
}

function ConnectBanner({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-16 text-center space-y-4">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
          <svg className="h-8 w-8 text-red-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-foreground text-lg">Connect Gmail</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          See your inbox, AI-summarised action items, and key highlights — without leaving YourBestPeer.
        </p>
      </div>
      <button
        onClick={onConnect}
        className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Connect with Google
      </button>
    </div>
  );
}

function AISummaryPanel({ data }: { data: GmailSummary }) {
  if (!data.action_items.length && !data.highlights.length) return null;
  return (
    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20">
          <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-violet-300">AI Summary</p>
        <span className="text-xs text-muted-foreground ml-auto">{data.unread_count} unread</span>
      </div>
      <p className="text-sm text-muted-foreground">{data.summary}</p>
      {data.action_items.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Action items</p>
          <ul className="space-y-1.5">
            {data.action_items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <svg className="h-2 w-2 text-amber-400" fill="currentColor" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.highlights.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Key highlights</p>
          <ul className="space-y-1.5">
            {data.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5 text-emerald-400">→</span>
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MessageRow({
  msg,
  onMarkRead,
}: {
  msg: GmailMessage;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      className={`group flex items-start gap-3 rounded-2xl border px-4 py-3.5 transition hover:bg-muted/10 ${
        msg.is_read ? "border-border bg-card/60" : "border-primary/20 bg-primary/5"
      }`}
    >
      {/* Avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-bold">
        {senderInitial(msg.from_address)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${msg.is_read ? "text-muted-foreground" : "text-foreground"}`}>
            {senderName(msg.from_address)}
          </p>
          {!msg.is_read && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
          )}
          <span className="ml-auto text-xs text-muted-foreground shrink-0">{formatDate(msg.date)}</span>
        </div>
        <p className={`text-sm truncate mt-0.5 ${msg.is_read ? "text-muted-foreground" : "text-foreground font-medium"}`}>
          {msg.subject}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{msg.snippet}</p>
      </div>

      {/* Actions */}
      {!msg.is_read && (
        <button
          onClick={() => onMarkRead(msg.id)}
          title="Mark as read"
          className="hidden group-hover:flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition shrink-0"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function GmailPage() {
  const { toast } = useToast();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [data, setData] = useState<GmailSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [maxResults, setMaxResults] = useState(10);

  async function load(max = maxResults, quiet = false) {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const status = await integrationsApi.status();
      setConnected(status.connected);
      if (!status.connected) return;
      const result = await integrationsApi.gmailMessages(max);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleConnect() {
    try {
      const { auth_url } = await integrationsApi.connectGoogle();
      window.location.href = auth_url;
    } catch {
      toast("Could not start Google connection", "error");
    }
  }

  async function handleMarkRead(id: string) {
    await integrationsApi.markRead(id).catch(() => {});
    setData((prev) =>
      prev
        ? {
            ...prev,
            unread_count: Math.max(0, prev.unread_count - 1),
            messages: prev.messages.map((m) => (m.id === id ? { ...m, is_read: true } : m)),
          }
        : prev
    );
  }

  async function handleLoadMore() {
    const next = maxResults + 10;
    setMaxResults(next);
    await load(next, true);
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-muted" />
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gmail</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.unread_count} unread · AI-summarised inbox` : "Your inbox, powered by AI"}
          </p>
        </div>
        {connected && (
          <button
            onClick={() => load(maxResults, true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/40 disabled:opacity-50 transition"
          >
            <svg className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        )}
      </div>

      {!connected ? (
        <ConnectBanner onConnect={handleConnect} />
      ) : !data || data.messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="text-3xl mb-3">📭</div>
          <p className="font-semibold text-foreground">Inbox is empty</p>
          <p className="text-sm text-muted-foreground mt-1">No messages found.</p>
        </div>
      ) : (
        <>
          {/* AI Summary */}
          <AISummaryPanel data={data} />

          {/* Messages */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Inbox — {data.messages.length} messages
              </p>
              <div className="flex gap-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Unread
                </span>
              </div>
            </div>
            {data.messages.map((msg) => (
              <MessageRow key={msg.id} msg={msg} onMarkRead={handleMarkRead} />
            ))}
          </div>

          {/* Load more */}
          <div className="text-center pt-2">
            <button
              onClick={handleLoadMore}
              disabled={refreshing}
              className="rounded-xl border border-border px-5 py-2 text-sm text-muted-foreground hover:bg-muted/40 disabled:opacity-50 transition"
            >
              {refreshing ? "Loading…" : "Load more messages"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
