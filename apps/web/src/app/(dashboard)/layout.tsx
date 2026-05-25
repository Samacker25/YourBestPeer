"use client";

import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { VoiceAssistant } from "@/components/VoiceAssistant";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth(true);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 pt-16 lg:p-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        <VoiceAssistant />
      </div>
    </ToastProvider>
  );
}
