"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Database,
  Cloud,
  Check,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@supabase/supabase-js";

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  returnUrl?: string;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  returnUrl = "/"
}) => {
  const [activeTab, setActiveTab] = useState<"supabase" | "google" | "quick">("supabase");
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Status from server
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  // Form states
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickName, setQuickName] = useState("");

  const checkConfigStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch("/api/auth/configure");
      if (res.ok) {
        const data = await res.json();
        setGoogleConfigured(Boolean(data.google?.isConfigured));
        setSupabaseConfigured(Boolean(data.supabase?.isConfigured));
      }
    } catch {
      // Ignore
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      checkConfigStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Direct login via official Google Cloud OAuth
  const handleLaunchGoogleCloudLogin = () => {
    window.location.href = `/api/auth/google/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  };

  // 2. Direct login via Supabase OAuth
  const handleLaunchSupabaseOAuth = async (url: string, key: string) => {
    try {
      const client = createClient(url, key);
      const redirectUri = `${window.location.origin}/api/auth/supabase/callback?returnUrl=${encodeURIComponent(returnUrl)}`;
      const { data, error: sbError } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: "offline",
            prompt: "consent"
          }
        }
      });

      if (sbError) {
        throw new Error(sbError.message);
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No authorization URL returned by Supabase.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to initiate Supabase Google OAuth.");
      setLoading(false);
    }
  };

  // 3. Save Supabase credentials and launch
  const handleSaveAndLaunchSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setError("Please provide both your Supabase Project URL and Anon Key.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "supabase",
          supabaseUrl: supabaseUrl.trim(),
          supabaseAnonKey: supabaseKey.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save Supabase keys.");

      setSuccessMsg("Supabase connected! Launching Google login...");
      await handleLaunchSupabaseOAuth(supabaseUrl.trim(), supabaseKey.trim());
    } catch (err: any) {
      setError(err.message || "Could not connect to Supabase.");
      setLoading(false);
    }
  };

  // 4. Save Google Cloud credentials and launch
  const handleSaveAndLaunchGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleClientId.trim() || !googleClientSecret.trim()) {
      setError("Please provide both Google Client ID and Google Client Secret.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          clientId: googleClientId.trim(),
          clientSecret: googleClientSecret.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save Google credentials.");

      setSuccessMsg("Google Cloud keys saved! Redirecting to Google...");
      setTimeout(() => {
        handleLaunchGoogleCloudLogin();
      }, 500);
    } catch (err: any) {
      setError(err.message || "Could not save credentials.");
      setLoading(false);
    }
  };

  // 5. Quick Instant Login
  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToUse = quickEmail.trim() || "developer@google.com";
    const nameToUse = quickName.trim() || emailToUse.split("@")[0];

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "demo",
          email: emailToUse,
          name: nameToUse
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");

      try {
        sessionStorage.setItem("REPOPILOT_GOOGLE_USER", JSON.stringify(data.user));
      } catch {}

      setSuccessMsg(`Signed in as ${emailToUse}!`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
        window.location.reload();
      }, 700);
    } catch (err: any) {
      setError(err.message || "Could not sign in.");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-bg/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-theme-surface border border-theme-border rounded-2xl shadow-xl overflow-hidden">
        {/* Top Decorative Color Bar */}
        <div className="h-1.5 w-full flex">
          <div className="flex-1 bg-theme-blue" />
          <div className="flex-1 bg-theme-red" />
          <div className="flex-1 bg-theme-yellow" />
          <div className="flex-1 bg-theme-green" />
        </div>

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-theme-border">
          <div className="flex items-center gap-3">
            {/* Google 4-Color Mark */}
            <div className="w-9 h-9 rounded-xl bg-theme-surface-alt border border-theme-border flex items-center justify-center shrink-0 shadow-xs">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  className="fill-theme-blue"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  className="fill-theme-green"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  className="fill-theme-yellow"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  className="fill-theme-red"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-theme-text flex items-center gap-2">
                Sign in with Google
                <Badge variant="primary" size="sm">OAuth 2.0</Badge>
              </h2>
              <p className="text-xs text-theme-text-muted mt-0.5">
                Connect your account to save drafts, architecture snapshots, and investigation history.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-alt transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status Banners */}
          {error && (
            <div className="p-3 rounded-lg bg-theme-red-surface border border-theme-red/30 flex items-start gap-2.5 text-xs text-theme-red animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-theme-green-surface border border-theme-green/30 flex items-start gap-2.5 text-xs text-theme-green animate-in fade-in duration-150">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* If already configured on server, offer 1-click launch */}
          {(googleConfigured || supabaseConfigured) && !loading && (
            <div className="p-4 rounded-xl bg-theme-surface-alt border border-theme-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-theme-text flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-theme-green" />
                  Credentials Active in Environment
                </span>
                <Badge variant="success" size="sm">Ready</Badge>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {googleConfigured && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 flex items-center justify-center gap-2"
                    onClick={handleLaunchGoogleCloudLogin}
                  >
                    <span>Continue with Google Cloud</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
                {supabaseConfigured && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 flex items-center justify-center gap-2"
                    onClick={() => {
                      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
                      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
                      handleLaunchSupabaseOAuth(url, key);
                    }}
                  >
                    <span>Continue with Supabase</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-theme-surface-alt border border-theme-border">
            <button
              onClick={() => setActiveTab("supabase")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "supabase"
                  ? "bg-theme-surface text-theme-text shadow-xs border border-theme-border"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              <Database className="w-3.5 h-3.5 text-theme-green" />
              <span>Supabase Auth</span>
            </button>

            <button
              onClick={() => setActiveTab("google")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "google"
                  ? "bg-theme-surface text-theme-text shadow-xs border border-theme-border"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-theme-blue" />
              <span>Google Cloud</span>
            </button>

            <button
              onClick={() => setActiveTab("quick")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "quick"
                  ? "bg-theme-surface text-theme-text shadow-xs border border-theme-border"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-theme-yellow" />
              <span>Instant Test</span>
            </button>
          </div>

          {/* TAB 1: SUPABASE GOOGLE AUTH */}
          {activeTab === "supabase" && (
            <form onSubmit={handleSaveAndLaunchSupabase} className="space-y-3.5">
              <div className="text-xs text-theme-text-muted leading-relaxed">
                Connect your Supabase project with Google Provider enabled. Paste your credentials from your Supabase Dashboard:
              </div>

              <div>
                <label className="text-[11px] font-mono text-theme-text font-medium block mb-1">
                  Supabase Project URL
                </label>
                <Input
                  type="url"
                  placeholder="https://xyzproject.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-theme-text font-medium block mb-1">
                  Supabase Anon Public API Key
                </label>
                <Input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-mono text-theme-blue hover:underline inline-flex items-center gap-1"
                >
                  Supabase Dashboard
                  <ExternalLink className="w-3 h-3" />
                </a>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span>Save & Sign In With Google</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: GOOGLE CLOUD OAUTH */}
          {activeTab === "google" && (
            <form onSubmit={handleSaveAndLaunchGoogle} className="space-y-3.5">
              <div className="text-xs text-theme-text-muted leading-relaxed">
                Connect direct Google Cloud Console OAuth 2.0 Web Application credentials:
              </div>

              <div>
                <label className="text-[11px] font-mono text-theme-text font-medium block mb-1">
                  Google Client ID
                </label>
                <Input
                  type="text"
                  placeholder="xxxx.apps.googleusercontent.com"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-theme-text font-medium block mb-1">
                  Google Client Secret
                </label>
                <Input
                  type="password"
                  placeholder="GOCSPX-xxxx"
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-mono text-theme-blue hover:underline inline-flex items-center gap-1"
                >
                  Google Cloud Credentials
                  <ExternalLink className="w-3 h-3" />
                </a>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving & Launching...</span>
                    </>
                  ) : (
                    <>
                      <span>Save & Launch Google</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* TAB 3: INSTANT TEST LOGIN */}
          {activeTab === "quick" && (
            <form onSubmit={handleQuickLogin} className="space-y-3.5">
              <div className="text-xs text-theme-text-muted leading-relaxed">
                Want to test drafts and workplace snapshots right away without entering API keys? Enter any email below to sign in instantly:
              </div>

              <div>
                <label className="text-[11px] font-mono text-theme-text font-medium block mb-1">
                  Your Google Email Address
                </label>
                <Input
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={quickEmail}
                  onChange={(e) => setQuickEmail(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-theme-text font-medium block mb-1">
                  Your Display Name (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="Mohit"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Sign In Instantly</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
