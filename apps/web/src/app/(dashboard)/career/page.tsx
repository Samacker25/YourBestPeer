"use client";

import { useRef, useState } from "react";
import { careerApi, type ResumeAnalysis, type InterviewQuestion } from "@/lib/api";
import { useToast } from "@/components/Toast";

type Tab = "resume" | "interview";

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  hard: "text-red-400 bg-red-500/10 border-red-500/20",
};

const CATEGORY_STYLE: Record<string, string> = {
  technical: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  behavioral: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  situational: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  culture: "text-pink-400 bg-pink-500/10 border-pink-500/20",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-400", medium: "bg-amber-400", low: "bg-emerald-400",
};

function ScoreRing({ score, max = 100, label, color }: { score: number; max?: number; label: string; color: string }) {
  const pct = (score / max) * 100;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/40" />
          <circle
            cx="48" cy="48" r={r} fill="none" strokeWidth="8"
            stroke={color} strokeDasharray={circ}
            strokeDashoffset={circ - dash} strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-foreground">{score}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
    </div>
  );
}

function ResumeResult({ analysis }: { analysis: ResumeAnalysis }) {
  const [openQ, setOpenQ] = useState<number | null>(null);
  const expColor = analysis.overall_rating >= 8 ? "#10b981" : analysis.overall_rating >= 6 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-6">
      {/* Score cards */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-8 justify-around">
          <ScoreRing score={analysis.overall_rating} max={10} label="Overall Rating" color={expColor} />
          <ScoreRing score={analysis.ats_score} label="ATS Score" color="#6366f1" />
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-amber-400/30 bg-amber-400/10">
              <span className="text-xl font-bold text-amber-400 capitalize">{analysis.experience_level}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">{analysis.years_experience}y exp.</p>
          </div>
        </div>
        <p className="mt-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">{analysis.summary}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Skills */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />Top Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {analysis.top_skills.map((s) => (
              <span key={s} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">{s}</span>
            ))}
          </div>
          {analysis.skill_gaps.length > 0 && (
            <>
              <h4 className="text-xs font-medium text-muted-foreground pt-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-400" />Skill gaps to fill
              </h4>
              <div className="flex flex-wrap gap-2">
                {analysis.skill_gaps.map((s) => (
                  <span key={s} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">{s}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Suggested roles */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-400" />Suggested Roles
          </h3>
          <ul className="space-y-1.5">
            {analysis.suggested_roles.map((r) => (
              <li key={r} className="flex items-center gap-2 text-sm text-foreground">
                <svg className="h-3.5 w-3.5 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Strengths */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />Strengths
        </h3>
        <div className="space-y-2">
          {analysis.strengths.map((s, i) => (
            <div key={i} className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-3">
              <p className="text-sm font-medium text-foreground">{s.point}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Improvements */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400" />Areas to Improve
        </h3>
        <div className="space-y-2">
          {analysis.improvements.map((imp, i) => (
            <div key={i} className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-3">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[imp.priority]}`} />
                <p className="text-sm font-medium text-foreground">{imp.point}</p>
                <span className="ml-auto text-xs text-muted-foreground capitalize">{imp.priority}</span>
              </div>
              <p className="text-xs text-muted-foreground">{imp.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ATS tips */}
      {analysis.ats_tips.length > 0 && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-3">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />ATS Optimisation Tips
          </h3>
          <ul className="space-y-1.5">
            {analysis.ats_tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-indigo-400 mt-0.5 shrink-0">→</span>{tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function InterviewResult({ questions }: { questions: InterviewQuestion[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
          <button
            className="flex w-full items-start gap-3 p-4 text-left"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${CATEGORY_STYLE[q.category] ?? CATEGORY_STYLE.technical}`}>
                  {q.category}
                </span>
                <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${DIFFICULTY_STYLE[q.difficulty] ?? DIFFICULTY_STYLE.medium}`}>
                  {q.difficulty}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground leading-snug">{q.question}</p>
            </div>
            <svg className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform mt-1 ${open === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {open === i && (
            <div className="border-t border-border p-4 space-y-4 bg-muted/10">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">What we assess</p>
                <p className="text-sm text-foreground">{q.what_we_assess}</p>
              </div>

              {revealed.has(i) ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Key answer points</p>
                    <ul className="space-y-1">
                      {q.ideal_answer_points.map((pt, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="text-emerald-400 shrink-0">✓</span>{pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                    <p className="text-xs font-medium text-violet-400 mb-1">Follow-up question</p>
                    <p className="text-sm text-foreground">{q.follow_up}</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setRevealed((r) => new Set([...r, i]))}
                  className="w-full rounded-xl border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition"
                >
                  Reveal model answer
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function CareerPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("resume");

  // Resume state
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [resumeResult, setResumeResult] = useState<ResumeAnalysis | null>(null);
  const [resumeText, setResumeText] = useState("");

  // Interview state
  const [role, setRole] = useState("");
  const [useResume, setUseResume] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [interviewResult, setInterviewResult] = useState<InterviewQuestion[] | null>(null);

  async function handleResumeFile(file: File) {
    setAnalyzing(true);
    setResumeResult(null);
    try {
      const result = await careerApi.analyzeResume(file);
      setResumeResult(result);
      // Extract text for interview prep
      if (file.type === "text/plain") {
        setResumeText(await file.text());
      }
      toast("Resume analysed successfully", "success");
    } catch {
      toast("Failed to analyse resume", "error");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleInterviewPrep(e: React.FormEvent) {
    e.preventDefault();
    if (!role.trim()) return;
    setPreparing(true);
    setInterviewResult(null);
    try {
      const questions = await careerApi.interviewPrep(role.trim(), useResume ? resumeText : undefined);
      setInterviewResult(questions);
      toast(`Generated ${questions.length} interview questions`, "success");
    } catch {
      toast("Failed to generate questions", "error");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Career Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          AI-powered resume analysis and personalised interview preparation.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
        {(["resume", "interview"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium capitalize transition ${
              tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "resume" ? (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            )}
            {t === "resume" ? "Resume Analyser" : "Interview Prep"}
          </button>
        ))}
      </div>

      {tab === "resume" ? (
        <div className="space-y-5">
          {/* Upload zone */}
          {!resumeResult && !analyzing && (
            <div
              className={`rounded-2xl border-2 border-dashed p-12 text-center transition cursor-pointer ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/20"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleResumeFile(file);
              }}
              onClick={() => resumeInputRef.current?.click()}
            >
              <input
                ref={resumeInputRef}
                type="file"
                accept=".pdf,.txt,.docx"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeFile(f); }}
              />
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                  <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Drop your resume here</p>
                  <p className="text-sm text-muted-foreground mt-0.5">PDF, DOCX, or plain text · max 5 MB</p>
                </div>
                <span className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-2 text-sm font-medium text-primary">
                  Browse file
                </span>
              </div>
            </div>
          )}

          {analyzing && (
            <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <svg className="h-6 w-6 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="font-semibold text-foreground">Analysing your resume…</p>
                <p className="text-sm text-muted-foreground mt-1">This takes 10–20 seconds</p>
              </div>
            </div>
          )}

          {resumeResult && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Analysis complete</p>
                <button
                  onClick={() => { setResumeResult(null); setResumeText(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition"
                >
                  ← Analyse another
                </button>
              </div>
              <ResumeResult analysis={resumeResult} />
            </>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Interview prep form */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Configure Interview</h2>
            <form onSubmit={handleInterviewPrep} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Target Role</label>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Software Engineer, Product Manager, Data Scientist"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
              </div>
              {resumeText && (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useResume}
                    onChange={(e) => setUseResume(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <span className="text-sm text-foreground">
                    Tailor questions to my resume{" "}
                    <span className="text-muted-foreground">(analysed resume loaded)</span>
                  </span>
                </label>
              )}
              <button
                type="submit"
                disabled={preparing || !role.trim()}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
              >
                {preparing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    Generate questions
                  </>
                )}
              </button>
            </form>
          </div>

          {interviewResult && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{interviewResult.length} questions for <span className="text-primary">{role}</span></p>
                <button
                  onClick={() => handleInterviewPrep({ preventDefault: () => {} } as React.FormEvent)}
                  disabled={preparing}
                  className="text-xs text-muted-foreground hover:text-primary transition"
                >
                  Regenerate ↺
                </button>
              </div>
              <InterviewResult questions={interviewResult} />
            </>
          )}

          {!interviewResult && !preparing && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <div className="text-3xl mb-3">🎯</div>
              <p className="font-medium text-foreground">Enter a role to get started</p>
              <p className="text-sm text-muted-foreground mt-1">
                We'll generate 8 tailored interview questions with model answers.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
