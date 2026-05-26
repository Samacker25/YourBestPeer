"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, ApiError } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

export function useAuth(requireAuth = true) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      if (requireAuth) router.replace("/login");
      return;
    }
    authApi
      .me()
      .then((u) => setUser(u as AuthUser))
      .catch((err) => {
        if (err instanceof ApiError) {
          // Real auth failure (401) — token is invalid or expired
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          if (requireAuth) router.replace("/login");
        }
        // Network error (service unreachable) — keep tokens, user is still logged in
      })
      .finally(() => setLoading(false));
  }, [requireAuth, router]);

  function logout() {
    const refresh = localStorage.getItem("refresh_token") || "";
    authApi.logout(refresh).catch(() => {});
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/");
  }

  return { user, loading, logout };
}

export function saveTokens(access_token: string, refresh_token: string) {
  localStorage.setItem("access_token", access_token);
  localStorage.setItem("refresh_token", refresh_token);
}
