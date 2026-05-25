"use client";

import { Suspense } from "react";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";
import { saveTokens } from "@/hooks/useAuth";

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = params.get("code");
    if (!code) {
      router.replace("/login");
      return;
    }
    authApi
      .googleCallback(code)
      .then((data) => {
        saveTokens(data.access_token, data.refresh_token);
        router.replace("/dashboard");
      })
      .catch(() => router.replace("/login"));
  }, [params, router]);

  return null;
}

export default function GoogleCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Completing sign in…</p>
      </div>
      <Suspense>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
