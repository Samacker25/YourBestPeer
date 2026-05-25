"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { LogoIcon } from "@/components/Logo";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

function ScrollReveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Navbar ──────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/90 backdrop-blur-xl border-b border-border/60 shadow-md shadow-black/20" : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <LogoIcon className="h-8 w-8" />
          <span className="font-bold text-foreground">YourBestPeer</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: "Demo", href: "#demo" },
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how-it-works" },
            { label: "Pricing", href: "#pricing" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 transition"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-lg shadow-primary/25"
          >
            Get started free
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <svg className="h-4 w-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-xl px-6 py-4 space-y-1">
          {["Features", "How it works", "Life pillars", "Pricing"].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(" ", "-")}`}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition"
            >
              {label}
            </a>
          ))}
          <div className="flex gap-3 pt-3">
            <Link href="/login" className="flex-1 text-center rounded-xl border border-border py-2.5 text-sm font-medium text-foreground transition hover:bg-muted">Sign in</Link>
            <Link href="/register" className="flex-1 text-center rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">Get started</Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Video section ────────────────────────────────────────────────────────────
function VideoSection() {
  const [playing, setPlaying] = useState(false);

  // Replace this with your actual YouTube video ID (the part after ?v= in the URL)
  const YOUTUBE_ID = "YOUR_YOUTUBE_VIDEO_ID";

  const highlights = [
    {
      icon: "⚡",
      title: "All-in-one AI dashboard",
      desc: "Tasks, habits, finance, career, and your personal AI coach in one unified view.",
    },
    {
      icon: "🧠",
      title: "AI that actually knows you",
      desc: "Context-aware advice powered by your own data — not generic chatbot responses.",
    },
    {
      icon: "📈",
      title: "Track every dimension of life",
      desc: "XP gamification, budget alerts, streak coaching, and calendar scheduling — all connected.",
    },
    {
      icon: "🔗",
      title: "Syncs with your world",
      desc: "Google Calendar, Gmail, documents — your AI reads them so you don't have to re-explain.",
    },
  ];

  return (
    <section id="demo" className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute right-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-indigo-600/6 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Section label */}
        <div className="text-center mb-14 space-y-3">
          <span className="inline-block rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary">
            See it in action
          </span>
          <h2 className="text-4xl font-bold text-foreground">
            Watch YourBestPeer transform your daily life
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            From morning planning to evening reflection — see how the AI adapts to you and keeps every part of your life moving forward.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left: Feature highlights */}
          <div className="space-y-6">
            {highlights.map((h) => (
              <div key={h.title} className="flex gap-4 group">
                <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-xl group-hover:border-primary/30 group-hover:bg-primary/5 transition-colors">
                  {h.icon}
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-0.5">{h.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{h.desc}</p>
                </div>
              </div>
            ))}

            <div className="pt-2 flex items-center gap-4">
              <a
                href={`https://www.youtube.com/watch?v=${YOUTUBE_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-lg shadow-primary/25"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch full demo
              </a>
              <Link
                href="/register"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition"
              >
                Try it free →
              </Link>
            </div>
          </div>

          {/* Right: Video player */}
          <div className="relative">
            {/* Glow behind video */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 blur-2xl" />

            <div className="relative rounded-2xl overflow-hidden border border-violet-500/20 shadow-2xl shadow-violet-500/10">
              {!playing ? (
                /* Thumbnail + play button overlay */
                <button
                  onClick={() => setPlaying(true)}
                  className="group relative block w-full aspect-video bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] overflow-hidden"
                >
                  {/* Fake UI preview inside the thumbnail */}
                  <div className="absolute inset-0 p-4 flex flex-col gap-3 opacity-60">
                    <div className="flex gap-2">
                      <div className="h-2 w-16 rounded-full bg-violet-500/60" />
                      <div className="h-2 w-10 rounded-full bg-muted/40" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      {[
                        "from-violet-500/20 to-indigo-500/10",
                        "from-orange-500/20 to-red-500/10",
                        "from-emerald-500/20 to-teal-500/10",
                        "from-blue-500/20 to-cyan-500/10",
                        "from-amber-500/20 to-yellow-500/10",
                        "from-pink-500/20 to-rose-500/10",
                      ].map((g, i) => (
                        <div key={i} className={`rounded-xl bg-gradient-to-br ${g} border border-white/5`} />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {[40, 28, 52, 36, 44].map((w, i) => (
                        <div key={i} className={`h-1.5 w-${w} rounded-full bg-muted/30`} />
                      ))}
                    </div>
                  </div>

                  {/* Logo watermark */}
                  <div className="absolute top-4 left-4 opacity-80">
                    <LogoIcon className="h-7 w-7" />
                  </div>

                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300">
                      <svg className="h-8 w-8 text-white translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Bottom label */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <span className="rounded-full bg-black/60 backdrop-blur-sm border border-white/10 px-4 py-1.5 text-xs text-white/80 font-medium">
                      Product demo · 3 min
                    </span>
                  </div>
                </button>
              ) : (
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1&rel=0`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              )}
            </div>

            {/* Social proof under video */}
            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                No signup needed to watch
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                3-minute overview
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1500;
          const steps = 60;
          const step = to / steps;
          let current = 0;
          const timer = setInterval(() => {
            current = Math.min(current + step, to);
            setCount(Math.floor(current));
            if (current >= to) clearInterval(timer);
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon, title, description, color, delay = 0,
}: {
  icon: React.ReactNode; title: string; description: string; color: string; delay?: number;
}) {
  return (
    <motion.div
      className="group relative rounded-2xl border border-border bg-card p-6"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: delay / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -6, borderColor: "hsl(var(--primary) / 0.35)" }}
    >
      <motion.div
        className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border ${color}`}
        whileHover={{ scale: 1.12, rotate: 8 }}
        transition={{ type: "spring", stiffness: 350, damping: 18 }}
      >
        {icon}
      </motion.div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────
function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="relative mb-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-xl shadow-primary/30">
          {number}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{description}</p>
    </div>
  );
}

// ─── Pillar card ─────────────────────────────────────────────────────────────
function PillarCard({
  emoji, title, points, gradient,
}: {
  emoji: string; title: string; points: string[]; gradient: string;
}) {
  return (
    <div className={`rounded-2xl border border-border p-6 space-y-4 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.04] pointer-events-none`} />
      <div className="text-3xl">{emoji}</div>
      <h3 className="font-semibold text-foreground text-lg">{title}</h3>
      <ul className="space-y-2">
        {points.map((pt) => (
          <li key={pt} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
              <svg className="h-2.5 w-2.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
            {pt}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Testimonial card ────────────────────────────────────────────────────────
function TestimonialCard({ quote, name, role, avatar }: { quote: string; name: string; role: string; avatar: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex gap-1">
        {[0,1,2,3,4].map((i) => (
          <svg key={i} className="h-4 w-4 text-amber-400 fill-amber-400" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed italic">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-bold">
          {avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/12 blur-[130px]" />
          <div className="absolute bottom-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/8 blur-[120px]" />
          <div className="absolute top-1/3 right-0 h-[400px] w-[400px] rounded-full bg-purple-500/6 blur-[100px]" />
        </div>

        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <motion.div
          className="relative z-10 mx-auto max-w-5xl px-6 text-center"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            AI-Powered Personal Life OS — Built for 2025
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6">
            The AI that becomes{" "}
            <br className="hidden sm:block" />
            <span className="gradient-text">your best self</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            YourBestPeer is a unified AI life operating system that manages your tasks, habits, finances,
            knowledge, career, and daily schedule — with an intelligent coach that knows you deeply and
            helps you grow every single day.
          </motion.p>

          {/* CTA group */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-2xl shadow-primary/30 hover:shadow-primary/50"
              >
                Start for free
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 py-3.5 text-sm font-semibold text-foreground hover:bg-muted hover:border-border/80 transition-all"
              >
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                See how it works
              </a>
            </motion.div>
          </motion.div>

          {/* Social proof strip */}
          <motion.p variants={fadeUp} className="text-xs text-muted-foreground mb-6">
            No credit card required · Free to start · Cancel anytime
          </motion.p>

          {/* Module preview chips */}
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-2">
            {[
              { label: "AI Chat Coach", color: "bg-violet-500/10 border-violet-500/25 text-violet-300" },
              { label: "Task & Projects", color: "bg-orange-500/10 border-orange-500/25 text-orange-300" },
              { label: "Habit Tracker", color: "bg-emerald-500/10 border-emerald-500/25 text-emerald-300" },
              { label: "Finance", color: "bg-blue-500/10 border-blue-500/25 text-blue-300" },
              { label: "Career AI", color: "bg-amber-500/10 border-amber-500/25 text-amber-300" },
              { label: "Knowledge Base", color: "bg-teal-500/10 border-teal-500/25 text-teal-300" },
              { label: "Google Calendar", color: "bg-sky-500/10 border-sky-500/25 text-sky-300" },
              { label: "Automations", color: "bg-yellow-500/10 border-yellow-500/25 text-yellow-300" },
            ].map(({ label, color }, i) => (
              <motion.span
                key={label}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${color}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.06, duration: 0.3 }}
                whileHover={{ scale: 1.08 }}
              >
                {label}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <a
          href="#stats"
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition animate-bounce"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </a>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────────── */}
      <section id="stats" className="border-y border-border bg-card/60 py-12">
        <div className="mx-auto max-w-5xl px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 12, suffix: "+", label: "Life modules" },
            { value: 100, suffix: "%", label: "AI-powered" },
            { value: 14, suffix: " days", label: "Free trial" },
            { value: 24, suffix: "/7", label: "AI coach access" },
          ].map(({ value, suffix, label }, i) => (
            <motion.div
              key={label}
              className="space-y-1"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
            >
              <p className="text-3xl font-bold text-foreground">
                <Counter to={value} suffix={suffix} />
              </p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── VIDEO DEMO ───────────────────────────────────────────────────── */}
      <VideoSection />

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <ScrollReveal className="text-center mb-14 space-y-3">
            <span className="inline-block rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary">
              Everything in one place
            </span>
            <h2 className="text-4xl font-bold text-foreground">
              One platform for your entire life
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Stop juggling 10 different apps. YourBestPeer unifies everything that matters.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              delay={0}
              color="bg-violet-500/10 border-violet-500/20 text-violet-400"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              }
              title="AI Life Coach"
              description="Chat with an AI that knows your habits, goals, tasks, and finances. Get personalized advice, motivation, and daily plans — available 24/7 via text and voice."
            />
            <FeatureCard
              delay={60}
              color="bg-orange-500/10 border-orange-500/20 text-orange-400"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Smart Task Management"
              description="Kanban boards, project tracking, and AI-suggested priorities. Never miss a deadline again with intelligent scheduling and reminders."
            />
            <FeatureCard
              delay={120}
              color="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                </svg>
              }
              title="Habit Tracking & Streaks"
              description="Build life-changing habits with XP gamification, streak tracking, and AI coaching. Your coach celebrates wins and helps you bounce back from setbacks."
            />
            <FeatureCard
              delay={180}
              color="bg-blue-500/10 border-blue-500/20 text-blue-400"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              }
              title="Finance & Budget Control"
              description="Track expenses, set budgets, and get AI anomaly alerts. Know exactly where your money goes and where you can save — with smart spending insights."
            />
            <FeatureCard
              delay={240}
              color="bg-teal-500/10 border-teal-500/20 text-teal-400"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              }
              title="RAG Knowledge Base"
              description="Upload documents, PDFs, and notes. Ask your AI questions across your entire knowledge base with Pinecone-powered semantic search."
            />
            <FeatureCard
              delay={300}
              color="bg-amber-500/10 border-amber-500/20 text-amber-400"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                </svg>
              }
              title="Career Intelligence"
              description="AI-powered resume analysis, skill gap detection, and personalised interview prep. Know exactly what to improve to land your dream role."
            />
            <FeatureCard
              delay={360}
              color="bg-sky-500/10 border-sky-500/20 text-sky-400"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              }
              title="Google Calendar Sync"
              description="See your entire schedule alongside tasks and habits. YourBestPeer suggests the best times to work, rest, and focus based on your patterns."
            />
            <FeatureCard
              delay={420}
              color="bg-red-500/10 border-red-500/20 text-red-400"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Pomodoro Focus Timer"
              description="Built-in Pomodoro timer with automatic session tracking, break reminders, and focus statistics. Stay in flow and build deep work discipline."
            />
            <FeatureCard
              delay={480}
              color="bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              }
              title="Workflow Automations"
              description="Create rules that automatically trigger actions — send a notification when a budget is exceeded, create tasks from habit milestones, and more."
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-card/30 border-y border-border">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-16 space-y-3">
            <span className="inline-block rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary">
              Simple to start
            </span>
            <h2 className="text-4xl font-bold text-foreground">How YourBestPeer works</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              From signup to your first AI insight in under 5 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-7 left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] h-px bg-gradient-to-r from-border via-primary/40 to-border" />

            <StepCard
              number="1"
              title="Create your account"
              description="Sign up free with email or Google in seconds. No setup complexity — your AI is ready immediately."
            />
            <StepCard
              number="2"
              title="Connect your life"
              description="Add your tasks, habits, expenses, and documents. Link Google Calendar and Gmail for full context awareness."
            />
            <StepCard
              number="3"
              title="Let AI guide you"
              description="Your AI coach analyses patterns, spots opportunities, and gives you daily personalised recommendations to grow."
            />
          </div>
        </div>
      </section>

      {/* ── LIFE PILLARS ─────────────────────────────────────────────────── */}
      <section id="pillars" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <ScrollReveal className="text-center mb-14 space-y-3">
            <span className="inline-block rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary">
              Holistic growth
            </span>
            <h2 className="text-4xl font-bold text-foreground">
              Every pillar of a better life
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Real improvement happens across all dimensions simultaneously. YourBestPeer covers every one.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <PillarCard
              emoji="🧠"
              title="Productivity"
              gradient="from-orange-500 to-rose-500"
              points={[
                "Kanban task boards with AI prioritisation",
                "Project milestones and progress tracking",
                "Pomodoro focus sessions",
                "Smart reminders based on your calendar",
              ]}
            />
            <PillarCard
              emoji="💸"
              title="Financial Health"
              gradient="from-blue-500 to-cyan-500"
              points={[
                "Automatic expense categorisation",
                "Budget alerts before you overspend",
                "AI spending anomaly detection",
                "Monthly trend analysis and insights",
              ]}
            />
            <PillarCard
              emoji="🔥"
              title="Habits & Wellness"
              gradient="from-emerald-500 to-green-500"
              points={[
                "Daily habit check-ins with streaks",
                "XP and gamification to stay motivated",
                "Mood and wellness logging",
                "AI pattern recognition across your behaviour",
              ]}
            />
            <PillarCard
              emoji="📚"
              title="Knowledge & Learning"
              gradient="from-teal-500 to-cyan-500"
              points={[
                "Upload PDFs, notes, and documents",
                "Ask your AI questions across your library",
                "Smart note-taking with markdown",
                "Semantic search across everything you've saved",
              ]}
            />
            <PillarCard
              emoji="💼"
              title="Career Growth"
              gradient="from-amber-500 to-yellow-500"
              points={[
                "AI resume analysis and ATS scoring",
                "Skill gap identification",
                "Personalised interview question prep",
                "Role-fit suggestions based on your profile",
              ]}
            />
            <PillarCard
              emoji="🤖"
              title="AI & Automation"
              gradient="from-violet-500 to-indigo-500"
              points={[
                "Streaming AI chat with full life context",
                "Voice assistant for hands-free control",
                "Workflow automation rules",
                "Google Calendar and Gmail integration",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── WHY SECTION ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-card/30 border-y border-border overflow-hidden">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <span className="inline-block rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary">
                Our mission
              </span>
              <h2 className="text-4xl font-bold text-foreground leading-tight">
                Your data working<br />for <span className="gradient-text">your growth</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Most people have the potential for greatness but lack the system to unlock it.
                YourBestPeer gives you a tireless AI companion that watches across every dimension
                of your life and tells you exactly where to focus next.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                It sees connections you miss — like how your sleep habits affect your task completion rate,
                or how your weekend spending correlates with Monday stress. Then it acts on that intelligence
                to make your life measurably better.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  "Replaces 10+ productivity and wellness apps",
                  "AI that learns your patterns over time",
                  "Privacy-first — your data is never sold",
                  "Works on web and mobile",
                ].map((pt) => (
                  <div key={pt} className="flex items-center gap-3">
                    <div className="h-5 w-5 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                      <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <span className="text-sm text-foreground">{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fake dashboard preview */}
            <div className="relative">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-2xl shadow-black/40">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                  <div className="h-3 w-3 rounded-full bg-red-500/70" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                  <div className="h-3 w-3 rounded-full bg-green-500/70" />
                  <div className="flex-1 mx-4 h-5 rounded-full bg-muted/60 text-[10px] text-muted-foreground flex items-center px-3">
                    yourbestpeer.app/dashboard
                  </div>
                </div>
                {/* Mock dashboard */}
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Tasks done", value: "7/9", color: "text-orange-400" },
                      { label: "Habits today", value: "4/6", color: "text-emerald-400" },
                      { label: "Budget left", value: "₹4,200", color: "text-blue-400" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-muted/40 p-3">
                        <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Today's priorities</p>
                    {["Finish project proposal", "Call mentor", "Evening run (habit)"].map((t, i) => (
                      <div key={t} className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${i === 0 ? "bg-emerald-400" : "border border-border"}`} />
                        <span className={`text-xs ${i === 0 ? "text-muted-foreground line-through" : "text-foreground"}`}>{t}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-3">
                    <p className="text-xs font-medium text-violet-300 mb-1">AI Insight</p>
                    <p className="text-xs text-muted-foreground">
                      You complete 40% more tasks on days you log a morning habit. Try setting one for tomorrow!
                    </p>
                  </div>
                </div>
              </div>
              {/* Decorative glow */}
              <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <ScrollReveal className="text-center mb-14 space-y-3">
            <span className="inline-block rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary">
              Early users
            </span>
            <h2 className="text-4xl font-bold text-foreground">Loved by people who take growth seriously</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TestimonialCard
              quote="I used to switch between Notion, Splitwise, Habitica, and Todoist. YourBestPeer replaced all of them. The AI actually understands what I'm trying to do."
              name="Aryan M."
              role="Software Engineer"
              avatar="A"
            />
            <TestimonialCard
              quote="The career resume analyser was a game changer for my job search. It pinpointed exactly what I was missing and the interview prep was spot-on."
              name="Priya S."
              role="Product Manager"
              avatar="P"
            />
            <TestimonialCard
              quote="I've tried 20 productivity apps. This one actually improved my life because the AI coach connects all the dots between my habits, tasks, and finances."
              name="Rahul K."
              role="Founder & MBA Student"
              avatar="R"
            />
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-card/30 border-y border-border">
        <div className="mx-auto max-w-5xl px-6">
          <ScrollReveal className="text-center mb-14 space-y-3">
            <span className="inline-block rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary">
              Simple pricing
            </span>
            <h2 className="text-4xl font-bold text-foreground">Start free, upgrade when ready</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">No hidden fees. Cancel anytime.</p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Free</p>
                <p className="text-4xl font-bold text-foreground mt-2">₹0 <span className="text-base font-normal text-muted-foreground">/ forever</span></p>
              </div>
              <ul className="space-y-3">
                {[
                  "All core modules (tasks, habits, notes)",
                  "AI coach — 50 messages/month",
                  "Finance tracking",
                  "Basic analytics",
                  "Mobile app access",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <svg className="h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block text-center rounded-xl border border-border py-3 text-sm font-semibold text-foreground hover:bg-muted transition"
              >
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl border border-primary/40 bg-card p-8 space-y-6 shadow-xl shadow-primary/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
                  Most popular
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Pro</p>
                <p className="text-4xl font-bold text-foreground mt-2">₹499 <span className="text-base font-normal text-muted-foreground">/ month</span></p>
              </div>
              <ul className="space-y-3">
                {[
                  "Everything in Free",
                  "Unlimited AI coach messages",
                  "Voice assistant",
                  "Google Calendar & Gmail sync",
                  "Career intelligence (resume AI)",
                  "RAG knowledge base (unlimited docs)",
                  "Workflow automations",
                  "Advanced analytics & ML insights",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <svg className="h-4 w-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block text-center rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-lg shadow-primary/25"
              >
                Start 14-day free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 text-center space-y-8">
          <h2 className="text-5xl font-bold text-foreground leading-tight">
            Ready to become your<br />
            <span className="gradient-text">best self?</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Join thousands building better lives with AI. It takes 60 seconds to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-10 py-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-2xl shadow-primary/30 hover:-translate-y-0.5"
            >
              Create your free account
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-10 py-4 text-sm font-semibold text-foreground hover:bg-muted transition-all"
            >
              Sign in
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Free forever plan available · No credit card required
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <LogoIcon className="h-7 w-7 shrink-0" />
                <span className="font-bold text-foreground">YourBestPeer</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The AI operating system for your life. Manage everything, grow every day.
              </p>
            </div>

            {/* Product */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Product</p>
              <ul className="space-y-2.5">
                {["Features", "How it works", "Pricing", "Mobile app"].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Modules */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Modules</p>
              <ul className="space-y-2.5">
                {["AI Coach", "Tasks & Projects", "Habits", "Finance", "Knowledge Base", "Career"].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Company</p>
              <ul className="space-y-2.5">
                {["About", "Privacy policy", "Terms of service", "Contact"].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground">
              © 2025 YourBestPeer. Built with ❤️ using AI.
            </p>
            <p className="text-xs text-muted-foreground">
              Powered by Google Gemini · LangChain · Next.js 15
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
