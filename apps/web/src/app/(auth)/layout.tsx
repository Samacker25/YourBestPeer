"use client";

import { motion } from "framer-motion";
import { LogoIcon } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden">
      {/* Animated background glows */}
      <motion.div
        className="pointer-events-none absolute top-0 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-violet-600/12 blur-[100px]"
        animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-600/8 blur-[80px]"
        animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />
      <motion.div
        className="pointer-events-none absolute top-1/2 left-0 h-[250px] w-[250px] -translate-y-1/2 rounded-full bg-cyan-600/6 blur-[90px]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      <div className="relative w-full max-w-md space-y-5">
        {/* Brand mark */}
        <motion.div
          className="flex items-center justify-center gap-2.5"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <LogoIcon className="h-9 w-9 shrink-0" />
          </motion.div>
          <span className="text-lg font-semibold text-foreground">YourBestPeer</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
