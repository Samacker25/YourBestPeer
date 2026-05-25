"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { authApi } from "@/lib/api";
import { saveTokens } from "@/hooks/useAuth";

const field = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.register(email, password, name);
      saveTokens(data.access_token, data.refresh_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const strength =
    password.length === 0 ? 0
    : password.length >= 12 ? 4
    : password.length >= 8 ? 3
    : password.length >= 5 ? 2
    : 1;

  const strengthColor =
    strength >= 4 ? "bg-emerald-500"
    : strength >= 3 ? "bg-yellow-500"
    : "bg-red-500";

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-black/40">
      <motion.div
        className="mb-7 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Start your AI-powered life journey</p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        className="space-y-4"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.09, delayChildren: 0.2 } } }}
      >
        <motion.div variants={field}>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Full name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="w-full rounded-xl border border-input bg-background/60 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition"
            placeholder="Your name"
          />
        </motion.div>

        <motion.div variants={field}>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl border border-input bg-background/60 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition"
            placeholder="you@example.com"
          />
        </motion.div>

        <motion.div variants={field}>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-xl border border-input bg-background/60 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition"
            placeholder="At least 8 characters"
          />
          <AnimatePresence>
            {password.length > 0 && (
              <motion.div
                className="mt-2 flex gap-1"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {[1, 2, 3, 4].map((level) => (
                  <motion.div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      strength >= level ? strengthColor : "bg-muted"
                    }`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: level * 0.04 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400"
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          disabled={loading}
          variants={field}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
          whileHover={{ scale: 1.015, y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Creating account…
            </span>
          ) : "Create account"}
        </motion.button>
      </motion.form>

      <motion.p
        className="mt-6 text-center text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.65 }}
      >
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline underline-offset-4">
          Sign in
        </Link>
      </motion.p>
    </div>
  );
}
