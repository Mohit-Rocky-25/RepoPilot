"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Sparkles,
  Database,
  Cloud,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  UserCheck,
  ArrowLeft,
  Copy
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { RepoPilotLogo } from "@/components/ui/RepoPilotLogo";
import { useAuth } from "@/context/AuthContext";
import { setDynamicSupabaseConfig } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";
  const authErrorParam = searchParams.get("auth_error");

  const {
    user,
    signInWithGoogle,
    signInWithSupabase,
    signInWithEmail,
    googleConfigured,
    supabaseConfigured
  } = useAuth();

  const [activeTab, setActiveTab] = useState<"supabase" | "keys" | "email">("supabase");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickName, setQuickName] = useState("");
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  useEffect(() => {
    if (authErrorParam === "google_credentials_missing") {
      setError("Please connect your Supabase project or Google Cloud credentials below to enable One-Click Google Sign-In.");
      setActiveTab("supabase");
    }
  }, [authErrorParam]);

  // Launch Direct Official Google Login
  const handleLaunchGoogle = () => {
    signInWithGoogle(returnUrl);
  };

  // Save Supabase & Launch
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

      setDynamicSupabaseConfig(supabaseUrl.trim(), supabaseKey.trim());
      setSuccessMsg("Supabase connected! Launching Google login...");
      await signInWithSupabase(returnUrl);
    } catch (err: any) {
      setError(err.message || "Could not connect to Supabase.");
      setLoading(false);
    }
  };

  // Save Google Cloud & Launch
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
        signInWithGoogle(returnUrl);
      }, 500);
    } catch (err: any) {
      setError(err.message || "Could not save credentials.");
      setLoading(false);
    }
  };

  // Email Sign In
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToUse = quickEmail.trim() || "developer@google.com";
    const nameToUse = quickName.trim() || emailToUse.split("@")[0];

    setLoading(true);
    setError(null);

    try {
      await signInWithEmail(emailToUse, nameToUse);
      setSuccessMsg(`Signed in as ${emailToUse}!`);
      setTimeout(() => {
        router.push(returnUrl);
      }, 500);
    } catch (err: any) {
      setError(err.message || "Could not sign in.");
      setLoading(false);
    }
  };

  // If already signed in
  if (user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-5 bg-theme-surface border-theme-border shadow-card rounded-2xl">
          <div className="w-16 h-16 rounded-full mx-auto overflow-hidden border-2 border-theme-blue shadow-xs">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-theme-blue text-white flex items-center justify-center font-bold text-xl">
                {user.name?.charAt(0) || "U"}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-theme-text">Signed In as {user.name}</h2>
            <p className="text-xs text-theme-text-muted mt-1">{user.email}</p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link href={returnUrl}>
              <Button variant="primary" size="md" className="w-full">
                Continue to RepoPilot
              </Button>
            </Link>
            <Link href="/workplace">
              <Button variant="secondary" size="md" className="w-full">
                Go to My Workplace
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Top Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-theme-text-muted hover:text-theme-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        {/* Main Login Card */}
        <Card className="p-8 bg-theme-surface border-theme-border shadow-card rounded-2xl space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-3">
              <RepoPilotLogo size={28} variant="mark" withGlow />
              <span className="font-bold text-lg tracking-tight font-mono text-theme-text">RepoPilot</span>
            </div>
            <h1 className="text-xl font-bold text-theme-text tracking-tight">Sign in with Google</h1>
            <p className="text-xs text-theme-text-muted leading-relaxed max-w-sm mx-auto">
              Sync your code exploration drafts, architecture maps, and bug investigation workspaces.
            </p>
          </div>

          {/* Status Notifications */}
          {error && (
            <div className="p-3.5 rounded-xl bg-theme-red-surface border border-theme-red/30 flex items-start gap-2.5 text-xs text-theme-red animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-theme-green-surface border border-theme-green/30 flex items-start gap-2.5 text-xs text-theme-green animate-in fade-in duration-150">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* PRIMARY: One-Click Google Sign-In Button */}
          <div>
            <button
              onClick={handleLaunchGoogle}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-medium text-xs sm:text-sm select-none transition-all duration-200 cursor-pointer shadow-xs border bg-theme-surface hover:bg-theme-surface-alt border-theme-border hover:border-theme-blue/50 hover:shadow-md flex items-center justify-center gap-3 group active:scale-[0.99]"
            >
              {/* Google 4-Color "G" */}
              <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                <svg className="w-4 h-4 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none">
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
              <span className="text-theme-text font-semibold group-hover:text-theme-blue transition-colors">
                Continue with Google
              </span>
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-theme-border"></div>
            <span className="flex-shrink mx-3 text-[11px] font-mono text-theme-text-subtle uppercase tracking-wider">
              Or connect credentials
            </span>
            <div className="flex-grow border-t border-theme-border"></div>
          </div>

          {/* Connection Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-theme-surface-alt border border-theme-border">
            <button
              onClick={() => setActiveTab("supabase")}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "supabase"
                  ? "bg-theme-surface text-theme-text shadow-xs border border-theme-border"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              <Database className="w-3.5 h-3.5 text-theme-green" />
              <span>Supabase</span>
            </button>

            <button
              onClick={() => setActiveTab("keys")}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "keys"
                  ? "bg-theme-surface text-theme-text shadow-xs border border-theme-border"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-theme-blue" />
              <span>Google Cloud</span>
            </button>

            <button
              onClick={() => setActiveTab("email")}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "email"
                  ? "bg-theme-surface text-theme-text shadow-xs border border-theme-border"
                  : "text-theme-text-muted hover:text-theme-text"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-theme-yellow" />
              <span>Email Sign-In</span>
            </button>
          </div>

          {/* TAB 1: SUPABASE */}
          {activeTab === "supabase" && (
            <form onSubmit={handleSaveAndLaunchSupabase} className="space-y-3.5">
              <p className="text-xs text-theme-text-muted leading-relaxed">
                Connect your Supabase project (with Google Provider enabled):
              </p>

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

              <div className="p-3 rounded-lg bg-theme-surface-alt border border-theme-border space-y-1.5 text-[11px] font-mono text-theme-text-muted">
                <div className="flex items-center justify-between text-theme-text font-semibold">
                  <span>Authorized Redirect URL:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        navigator.clipboard.writeText(`${window.location.origin}/api/auth/supabase/callback`);
                        setCopiedRedirect(true);
                        setTimeout(() => setCopiedRedirect(false), 2000);
                      }
                    }}
                    className="text-[10px] text-theme-blue hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedRedirect ? "Copied!" : "Copy URL"}</span>
                  </button>
                </div>
                <div className="p-1.5 rounded bg-theme-surface border border-theme-border text-theme-blue break-all select-all">
                  {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/auth/supabase/callback
                </div>
                <p className="text-[10px] text-theme-text-subtle">
                  Add to Supabase Dashboard &rarr; Authentication &rarr; URL Configuration &rarr; Redirect URLs.
                </p>
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
                      <span>Save & Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: GOOGLE CLOUD KEYS */}
          {activeTab === "keys" && (
            <form onSubmit={handleSaveAndLaunchGoogle} className="space-y-3.5">
              <p className="text-xs text-theme-text-muted leading-relaxed">
                Enter your Google Cloud Console OAuth 2.0 Web Client credentials:
              </p>

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

              <div className="p-3 rounded-lg bg-theme-surface-alt border border-theme-border space-y-1.5 text-[11px] font-mono text-theme-text-muted">
                <div className="flex items-center justify-between text-theme-text font-semibold">
                  <span>Authorized Redirect URI:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        navigator.clipboard.writeText(`${window.location.origin}/api/auth/google/callback`);
                        setCopiedRedirect(true);
                        setTimeout(() => setCopiedRedirect(false), 2000);
                      }
                    }}
                    className="text-[10px] text-theme-blue hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedRedirect ? "Copied!" : "Copy URI"}</span>
                  </button>
                </div>
                <div className="p-1.5 rounded bg-theme-surface border border-theme-border text-theme-blue break-all select-all">
                  {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/auth/google/callback
                </div>
                <p className="text-[10px] text-theme-text-subtle">
                  Add to Google Cloud Console &rarr; APIs &amp; Services &rarr; Credentials &rarr; Authorized redirect URIs.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-mono text-theme-blue hover:underline inline-flex items-center gap-1"
                >
                  Google Credentials
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

          {/* TAB 3: EMAIL SIGN IN */}
          {activeTab === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              <p className="text-xs text-theme-text-muted leading-relaxed">
                Sign in with your Google email address:
              </p>

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
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-theme-text font-medium block mb-1">
                  Display Name (Optional)
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
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Sign In with Email</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <div className="text-xs font-mono text-theme-text-muted animate-pulse">
            Loading Login...
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
