"use client";

import { useEffect, useRef, useState } from "react";
import { chatApi, type ChatMessage, type ConversationSummary } from "@/lib/api";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8002";

const SUGGESTIONS = [
  "Help me plan my week",
  "Review my habits and suggest improvements",
  "Analyze my spending patterns",
  "Give me a productivity tip",
];

export default function ChatPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatApi.conversations().then(setConversations).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function selectConversation(id: string) {
    setActiveId(id);
    const data = await chatApi.getConversation(id);
    setMessages(data.messages);
  }

  function newConversation() {
    setActiveId(null);
    setMessages([]);
    inputRef.current?.focus();
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    const streamingMsg: ChatMessage = { role: "assistant", content: "", timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, streamingMsg]);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch(`${AGENT_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text, conversation_id: activeId ?? null }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.token) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, content: last.content + payload.token };
                return updated;
              });
            }
            if (payload.done && payload.conversation_id && !activeId) {
              setActiveId(payload.conversation_id);
              chatApi.conversations().then(setConversations).catch(() => {});
            }
          } catch {
            // malformed SSE line — skip
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Sorry, something went wrong: ${msg}`,
          timestamp: new Date().toISOString(),
        };
        return updated;
      });
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e as any);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Conversation sidebar */}
      <div className="w-56 shrink-0 rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border">
          <button
            onClick={newConversation}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">No conversations yet</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  activeId === c.id
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="block truncate">{c.title}</span>
                <span className="block text-xs opacity-50 mt-0.5">
                  {new Date(c.updated_at).toLocaleDateString()}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col rounded-2xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold shadow-sm">
            ✦
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm">YourBestPeer AI</h2>
            <p className="text-xs text-muted-foreground">Personal life coach · Always available</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 text-3xl">
                ✦
              </div>
              <div>
                <p className="font-semibold text-foreground">Hi, I&apos;m YourBestPeer</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Your personal AI coach for tasks, habits, finances, and goals.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-500/30 border border-violet-500/20 text-primary text-xs mb-0.5">
                  ✦
                </div>
              )}
              <div
                className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "rounded-bl-sm bg-muted text-foreground border border-border"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {sending && messages[messages.length - 1]?.content === "" && (
            <div className="flex items-end gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-500/30 border border-violet-500/20 text-primary text-xs">
                ✦
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-muted border border-border px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="border-t border-border p-4 flex gap-3 items-center">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message YourBestPeer…"
            className="flex-1 rounded-xl border border-input bg-background/60 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition shadow-md shadow-primary/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
