"use client";

import { useEffect, useState } from "react";
import { authApi, integrationsApi, paymentsApi, type IntegrationStatus, type PlanInfo } from "@/lib/api";
import { useToast } from "@/components/Toast";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  is_active: boolean;
  plan: string;
  created_at: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <h2 className="font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const INPUT = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition";

export default function SettingsPage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [integration, setIntegration] = useState<IntegrationStatus | null>(null);
  const [integrationLoading, setIntegrationLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    authApi.me()
      .then((p) => {
        setProfile(p);
        setName(p.name);
        setAvatarUrl(p.avatar_url ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    integrationsApi.status()
      .then(setIntegration)
      .catch(() => setIntegration(null))
      .finally(() => setIntegrationLoading(false));

    paymentsApi.plan()
      .then(setPlanInfo)
      .catch(() => setPlanInfo({ plan: "free", plan_expires_at: null, is_pro: false }));
  }, []);

  async function handleConnect() {
    try {
      const { auth_url } = await integrationsApi.connectGoogle();
      window.location.href = auth_url;
    } catch {
      toast("Could not start Google connection", "error");
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await integrationsApi.disconnectGoogle();
      setIntegration({ connected: false, scopes: [] });
      toast("Google account disconnected", "info");
    } catch {
      toast("Failed to disconnect", "error");
    } finally {
      setDisconnecting(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await authApi.updateMe({
        name: name.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
      });
      setProfile(updated);
      toast("Profile updated", "success");
    } catch {
      toast("Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  }

  function getInitials(n: string) {
    return n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  }

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const order = await paymentsApi.createOrder();

      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Razorpay"));
        document.body.appendChild(script);
      });

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "YourBestPeer",
        description: "Pro Plan — 1 Month",
        order_id: order.order_id,
        prefill: { name: profile?.name, email: profile?.email },
        theme: { color: "#7c3aed" },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await paymentsApi.verify(response);
            setPlanInfo({ plan: "pro", plan_expires_at: null, is_pro: true });
            toast("Welcome to Pro! All features unlocked.", "success");
          } catch {
            toast("Payment verification failed. Contact support.", "error");
          }
        },
      });
      rzp.open();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not initiate payment";
      toast(msg, "error");
    } finally {
      setUpgrading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        {[0, 1].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16 text-muted-foreground">Failed to load profile.</div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account and preferences.</p>
      </div>

      {/* Profile */}
      <Section title="Profile">
        <div className="flex items-center gap-4 pb-2">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={profile.name}
              className="h-16 w-16 rounded-2xl object-cover border border-border"
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl border border-border">
              {getInitials(profile.name)}
            </div>
          )}
          <div>
            <p className="font-semibold text-foreground">{profile.name}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Member since {new Date(profile.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <Field label="Display Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={INPUT}
            />
          </Field>
          <Field label="Avatar URL">
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className={INPUT}
            />
          </Field>
          <Field label="Email">
            <input
              value={profile.email}
              disabled
              className={`${INPUT} opacity-60 cursor-not-allowed`}
            />
          </Field>
          <div className="pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Section>

      {/* Integrations */}
      <Section title="Integrations">
        {integrationLoading ? (
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-border shadow-sm">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Google Account</p>
                {integration?.connected ? (
                  <p className="text-xs text-muted-foreground">
                    {integration.email ?? "Connected"} · Calendar &amp; Gmail access
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Connect to sync Calendar and Gmail</p>
                )}
              </div>
            </div>
            {integration?.connected ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Connected
                </span>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="rounded-xl border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-60 transition"
                >
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="flex items-center gap-1.5 rounded-xl bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition"
              >
                Connect
              </button>
            )}
          </div>
        )}
      </Section>

      {/* Billing */}
      <Section title="Billing & Plan">
        <div className="space-y-4">
          {/* Current plan badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${planInfo?.is_pro ? "bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-500/30" : "bg-muted"}`}>
                {planInfo?.is_pro ? "⭐" : "🆓"}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {planInfo?.is_pro ? "Pro Plan" : "Free Plan"}
                  <span className={`rounded-full px-2 py-px text-[10px] font-bold ${planInfo?.is_pro ? "bg-amber-500/15 text-amber-400" : "bg-muted text-muted-foreground"}`}>
                    {planInfo?.is_pro ? "ACTIVE" : "FREE"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {planInfo?.is_pro
                    ? planInfo.plan_expires_at
                      ? `Renews ${new Date(planInfo.plan_expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                      : "Pro access active"
                    : "Upgrade for unlimited AI + all features"}
                </p>
              </div>
            </div>
            {!planInfo?.is_pro && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition shadow-md shadow-violet-500/20"
              >
                {upgrading ? "Loading…" : "Upgrade ₹499/mo"}
              </button>
            )}
          </div>

          {/* Feature comparison */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-3 bg-muted/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
              <span>Feature</span>
              <span className="text-center">Free</span>
              <span className="text-center text-violet-400">Pro ₹499/mo</span>
            </div>
            {[
              ["AI Chat messages", "50 / month", "Unlimited"],
              ["Expense receipt scanning", "–", "✓"],
              ["Budget alerts", "✓", "✓"],
              ["Habit streaks & XP", "✓", "✓"],
              ["Gmail AI summaries", "–", "✓"],
              ["Career AI analysis", "–", "✓"],
              ["RAG knowledge base", "–", "✓"],
              ["Priority support", "–", "✓"],
            ].map(([feature, free, pro], i) => (
              <div key={i} className={`grid grid-cols-3 px-4 py-2.5 text-xs ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                <span className="text-foreground">{feature}</span>
                <span className="text-center text-muted-foreground">{free}</span>
                <span className={`text-center font-medium ${pro === "✓" || pro === "Unlimited" ? "text-violet-400" : "text-muted-foreground"}`}>{pro}</span>
              </div>
            ))}
          </div>

          {!planInfo?.is_pro && (
            <p className="text-xs text-muted-foreground text-center">
              Secure payment via Razorpay · Cancel anytime · Auto-renews monthly
            </p>
          )}
        </div>
      </Section>

      {/* Account info */}
      <Section title="Account">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Account status</p>
              <p className="text-xs text-muted-foreground">Your account is in good standing</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">User ID</p>
              <p className="text-xs text-muted-foreground font-mono">{profile.id}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Sign out</p>
              <p className="text-xs text-muted-foreground">Sign out of all sessions</p>
            </div>
            <button
              onClick={() => {
                const rt = localStorage.getItem("refresh_token");
                if (rt) authApi.logout(rt).catch(() => {});
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                window.location.href = "/";
              }}
              className="rounded-xl border border-red-500/30 px-4 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}
