"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "focus" | "short_break" | "long_break";

const PHASES: Record<Phase, { label: string; minutes: number; color: string; bg: string; desc: string }> = {
  focus:       { label: "Focus",       minutes: 25, color: "#6366f1", bg: "bg-violet-500/10 border-violet-500/20", desc: "Time to concentrate" },
  short_break: { label: "Short Break", minutes: 5,  color: "#10b981", bg: "bg-emerald-500/10 border-emerald-500/20", desc: "Rest your eyes" },
  long_break:  { label: "Long Break",  minutes: 15, color: "#3b82f6", bg: "bg-blue-500/10 border-blue-500/20",    desc: "Recharge fully" },
};

const CYCLE_SEQUENCE: Phase[] = [
  "focus", "short_break",
  "focus", "short_break",
  "focus", "short_break",
  "focus", "long_break",
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function CircularProgress({
  pct, color, seconds, phase,
}: { pct: number; color: string; seconds: number; phase: Phase }) {
  const r = 80;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      <svg className="absolute h-56 w-56 -rotate-90" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/25" />
        <circle
          cx="100" cy="100" r={r} fill="none" strokeWidth="10"
          stroke={color}
          strokeDasharray={circ}
          strokeDashoffset={circ - dash}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="flex flex-col items-center gap-1 z-10">
        <span className="text-5xl font-black text-foreground tabular-nums tracking-tight">
          {formatTime(seconds)}
        </span>
        <span className="text-sm font-medium text-muted-foreground">{PHASES[phase].label}</span>
      </div>
    </div>
  );
}

interface Session {
  phase: Phase;
  completedAt: string;
  duration: number;
}

export default function PomodoroPage() {
  const [phase, setPhase] = useState<Phase>("focus");
  const [cycleIdx, setCycleIdx] = useState(0);
  const [seconds, setSeconds] = useState(PHASES.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [customMinutes, setCustomMinutes] = useState<Partial<Record<Phase, number>>>({});
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const totalSeconds = (customMinutes[phase] ?? PHASES[phase].minutes) * 60;
  const pct = ((totalSeconds - seconds) / totalSeconds) * 100;
  const info = PHASES[phase];

  const advance = useCallback(() => {
    const nextIdx = (cycleIdx + 1) % CYCLE_SEQUENCE.length;
    const nextPhase = CYCLE_SEQUENCE[nextIdx];
    const nextMins = customMinutes[nextPhase] ?? PHASES[nextPhase].minutes;
    setCycleIdx(nextIdx);
    setPhase(nextPhase);
    setSeconds(nextMins * 60);
    setRunning(false);
  }, [cycleIdx, customMinutes]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          // Record session
          setSessions((prev) => [
            { phase, completedAt: new Date().toLocaleTimeString(), duration: totalSeconds },
            ...prev.slice(0, 19),
          ]);
          // Browser notification
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification(`${PHASES[phase].label} complete!`, {
              body: phase === "focus" ? "Time for a break." : "Back to focus!",
            });
          }
          // Advance
          const nextIdx = (cycleIdx + 1) % CYCLE_SEQUENCE.length;
          const nextPhase = CYCLE_SEQUENCE[nextIdx];
          const nextMins = customMinutes[nextPhase] ?? PHASES[nextPhase].minutes;
          setCycleIdx(nextIdx);
          setPhase(nextPhase);
          setRunning(false);
          return nextMins * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [running, phase, cycleIdx, totalSeconds, customMinutes]);

  // Update page title
  useEffect(() => {
    if (running) {
      document.title = `${formatTime(seconds)} — ${PHASES[phase].label} | YourBestPeer`;
    } else {
      document.title = "Pomodoro | YourBestPeer";
    }
    return () => { document.title = "YourBestPeer"; };
  }, [running, seconds, phase]);

  function requestNotificationPermission() {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  function toggleTimer() {
    if (!running) requestNotificationPermission();
    setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setSeconds((customMinutes[phase] ?? PHASES[phase].minutes) * 60);
  }

  function selectPhase(p: Phase) {
    setRunning(false);
    setPhase(p);
    setSeconds((customMinutes[p] ?? PHASES[p].minutes) * 60);
  }

  const focusCount = sessions.filter((s) => s.phase === "focus").length;
  const totalFocusMin = sessions.filter((s) => s.phase === "focus").reduce((a, s) => a + s.duration / 60, 0);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pomodoro Timer</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Focus in structured intervals to maximise deep work.
        </p>
      </div>

      {/* Phase selector */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(PHASES) as Phase[]).map((p) => (
          <button
            key={p}
            onClick={() => selectPhase(p)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              phase === p
                ? `${PHASES[p].bg} border-current/30`
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            style={phase === p ? { color: PHASES[p].color } : {}}
          >
            {PHASES[p].label}
          </button>
        ))}
      </div>

      {/* Timer */}
      <div className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center gap-6">
        <p className="text-sm text-muted-foreground">{info.desc}</p>

        <CircularProgress pct={pct} color={info.color} seconds={seconds} phase={phase} />

        {/* Cycle dots */}
        <div className="flex gap-1.5">
          {CYCLE_SEQUENCE.map((p, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i === cycleIdx ? "h-2.5 w-2.5" : "h-2 w-2"
              }`}
              style={{
                backgroundColor: i <= cycleIdx ? PHASES[p].color : undefined,
              }}
              title={PHASES[p].label}
            >
              {i > cycleIdx && <div className="h-full w-full rounded-full bg-muted" />}
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted transition"
            title="Reset"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>

          <button
            onClick={toggleTimer}
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg transition hover:scale-105 active:scale-95"
            style={{ backgroundColor: info.color }}
          >
            {running ? (
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7 0A.75.75 0 0114.5 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H14.5a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-7 w-7 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <button
            onClick={advance}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted transition"
            title="Skip to next"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.81V8.688zM12.75 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats + History in a grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/8 p-4 text-center">
          <p className="text-3xl font-black text-violet-400">{focusCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Focus sessions</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-center">
          <p className="text-3xl font-black text-emerald-400">{Math.round(totalFocusMin)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Minutes focused</p>
        </div>
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/8 p-4 text-center">
          <p className="text-3xl font-black text-blue-400">{Math.floor(cycleIdx / CYCLE_SEQUENCE.length) + (cycleIdx > 0 ? 1 : 0)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Cycles completed</p>
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-medium text-foreground hover:bg-muted/20 transition"
        >
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            Custom durations
          </span>
          <svg className={`h-4 w-4 text-muted-foreground transition-transform ${showSettings ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {showSettings && (
          <div className="border-t border-border p-5 grid grid-cols-3 gap-4">
            {(Object.keys(PHASES) as Phase[]).map((p) => (
              <div key={p} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{PHASES[p].label} (min)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customMinutes[p] ?? PHASES[p].minutes}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    if (!isNaN(v) && v > 0) {
                      setCustomMinutes((prev) => ({ ...prev, [p]: v }));
                      if (p === phase && !running) setSeconds(v * 60);
                    }
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session history */}
      {sessions.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">Session History</h3>
            <button onClick={() => setSessions([])} className="text-xs text-muted-foreground hover:text-red-400 transition">Clear</button>
          </div>
          <div className="divide-y divide-border">
            {sessions.slice(0, 8).map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: PHASES[s.phase].color }}
                />
                <span className="flex-1 text-sm text-foreground">{PHASES[s.phase].label}</span>
                <span className="text-xs text-muted-foreground">{Math.round(s.duration / 60)} min</span>
                <span className="text-xs text-muted-foreground">{s.completedAt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
