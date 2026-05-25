"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Web Speech API types (not in lib.dom.d.ts by default in all TS versions)
declare global {
  interface SpeechRecognitionResult {
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }
  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }
  const SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

type VoiceState = "idle" | "listening" | "processing" | "speaking";

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8002";

function useSpeechSynthesis() {
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.05;
    utt.pitch = 1.0;
    // Prefer a natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) =>
      v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha")
    );
    if (preferred) utt.voice = preferred;
    if (onEnd) utt.onend = onEnd;
    window.speechSynthesis.speak(utt);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, stop };
}

export function VoiceAssistant() {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { speak, stop } = useSpeechSynthesis();

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const sendToAI = useCallback(async (text: string) => {
    setState("processing");
    setReply("");
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

    try {
      const res = await fetch(`${AGENT_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text, conversation_id: conversationId }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullReply = "";

      setState("processing");

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
              fullReply += payload.token;
              setReply(fullReply);
            }
            if (payload.done && payload.conversation_id) {
              setConversationId(payload.conversation_id);
            }
          } catch {
            // skip malformed
          }
        }
      }

      setState("speaking");
      // Speak only first 400 chars to keep it snappy
      speak(fullReply.slice(0, 400), () => setState("idle"));
    } catch {
      setError("Couldn't reach AI. Check your connection.");
      setState("idle");
    }
  }, [conversationId, speak]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("Speech recognition not supported in this browser.");
      return;
    }

    setError(null);
    setTranscript("");
    setReply("");

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setState("listening");

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const current = Array.from(e.results)
        .map((r) => (r as SpeechRecognitionResult)[0].transcript)
        .join("");
      setTranscript(current);
    };

    recognition.onend = () => {
      const final = recognitionRef.current
        ? Array.from((recognitionRef.current as unknown as { results: SpeechRecognitionResultList }).results ?? [])
            .map((r) => r[0].transcript)
            .join("")
        : "";
      if (transcript || final) {
        sendToAI(transcript || final);
      } else {
        setState("idle");
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== "no-speech") setError(`Speech error: ${e.error}`);
      setState("idle");
    };

    recognition.start();
    setState("listening");
  }, [isSupported, transcript, sendToAI]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    stop();
    setState("idle");
  }, [stop]);

  const handleMainButton = () => {
    if (state === "idle") {
      setExpanded(true);
      startListening();
    } else if (state === "listening") {
      recognitionRef.current?.stop();
    } else if (state === "speaking") {
      stop();
      setState("idle");
    }
  };

  // Pulse ring animation states
  const isActive = state === "listening" || state === "speaking";

  if (!isSupported) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Transcript / reply panel */}
      {expanded && (transcript || reply || state !== "idle") && (
        <div className="w-80 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                state === "listening" ? "bg-red-400 animate-pulse" :
                state === "processing" ? "bg-amber-400 animate-pulse" :
                state === "speaking" ? "bg-emerald-400 animate-pulse" :
                "bg-muted"
              }`} />
              <span className="text-xs font-medium text-muted-foreground capitalize">
                {state === "processing" ? "Thinking…" : state === "speaking" ? "Speaking…" : state}
              </span>
            </div>
            <button
              onClick={() => { stopListening(); setExpanded(false); setTranscript(""); setReply(""); }}
              className="text-muted-foreground hover:text-foreground transition text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {transcript && (
              <div className="rounded-xl bg-primary/10 border border-primary/20 px-3 py-2">
                <p className="text-xs font-medium text-primary mb-0.5">You</p>
                <p className="text-sm text-foreground">{transcript}</p>
              </div>
            )}
            {reply && (
              <div className="rounded-xl bg-muted border border-border px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">YourBestPeer</p>
                <p className="text-sm text-foreground leading-relaxed">{reply}</p>
              </div>
            )}
            {state === "processing" && !reply && (
              <div className="flex gap-1.5 px-1">
                {[0,1,2].map((i) => (
                  <div key={i} className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="border-t border-border px-4 py-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {state === "idle" && reply && (
            <div className="border-t border-border px-4 py-2.5">
              <button
                onClick={() => { setTranscript(""); setReply(""); startListening(); }}
                className="w-full rounded-xl bg-primary/10 text-primary text-xs font-medium py-2 hover:bg-primary/20 transition"
              >
                Ask another question
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main voice button */}
      <div className="relative">
        {isActive && (
          <>
            <div className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ backgroundColor: state === "listening" ? "#ef4444" : "#10b981" }} />
            <div className="absolute -inset-2 rounded-full animate-pulse opacity-20"
              style={{ backgroundColor: state === "listening" ? "#ef4444" : "#10b981" }} />
          </>
        )}
        <button
          onClick={handleMainButton}
          title={state === "idle" ? "Start voice assistant" : "Stop"}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 ${
            state === "listening"
              ? "bg-red-500 text-white"
              : state === "speaking"
              ? "bg-emerald-500 text-white"
              : state === "processing"
              ? "bg-amber-500 text-white"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {state === "listening" ? (
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4zm-6 9a6 6 0 1012 0H6zm6 8a7 7 0 007-7h-2a5 5 0 01-10 0H5a7 7 0 007 7zm-1 2h2v3h-2v-3z"/>
            </svg>
          ) : state === "speaking" ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          ) : state === "processing" ? (
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
