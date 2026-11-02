"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  LogOut,
  Copy,
  Check,
  RefreshCw,
  Info
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { GoogleUser } from "@/lib/googleAuth";

export const GoogleAuthCard: React.FC = () => {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const redirectUri = typeof window !== "undefined"
    ? `${window.location.origin}/api/auth/google/callback`
    : "http://localhost:3000/api/auth/google/callback";

  const jsOrigin = typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000";

  const fetchSession = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google/session");
      const data = await res.json();
      setConfigured(Boolean(data.configured));
      setUser(data.user || null);
    } catch {
      setErrorNotice("Could not connect to authentication service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();

    // Check for URL error params
    const authError = searchParams?.get("auth_error");
    if (authError === "google_credentials_missing") {
      setErrorNotice(
        "Google OAuth credentials are not configured. Follow the setup guide below to add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
      );
    }
  }, [searchParams]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/google/logout", { method: "POST" });
      try {
        sessionStorage.removeItem("REPOPILOT_GOOGLE_USER");
      } catch {}
      setUser(null);
      await fetchSession();
    } catch {
      setErrorNotice("Failed to log out. Please try again.");
    }
  };

  return (
    <Card className="p-5 space-y-5 bg-theme-surface border border-theme-border rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-theme-border">
        <div className="flex items-center gap-2.5">
          {/* Official Google G Logo using theme colors */}
          <div className="w-8 h-8 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
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
            <h2 className="font-semibold text-sm text-theme-text tracking-tight">
              Google Account &amp; Single Sign-On
            </h2>
            <p className="text-xs text-theme-text-muted">
              Official Google OAuth 2.0 / OpenID Connect authentication.
            </p>
          </div>
        </div>

        <div>
          {loading ? (
            <Badge variant="neutral" size="sm">
              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
              Checking...
            </Badge>
          ) : user ? (
            <Badge variant="success" size="sm">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          ) : configured ? (
            <Badge variant="neutral" size="sm">
              Ready to Sign In
            </Badge>
          ) : (
            <Badge variant="warning" size="sm">
              Needs Setup
            </Badge>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {errorNotice && (
        <div className="p-3 rounded-lg bg-theme-red-surface border border-theme-red/30 text-xs text-theme-red flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{errorNotice}</span>
            <button
              onClick={() => setErrorNotice(null)}
              className="ml-2 underline font-medium hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Authenticated State */}
      {user ? (
        <div className="p-4 rounded-xl bg-theme-surface-alt border border-theme-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-10 h-10 rounded-full border border-theme-border object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-theme-blue-surface border border-theme-blue/30 flex items-center justify-center font-bold text-sm text-theme-blue">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-theme-text">{user.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-theme-green-surface text-theme-green border border-theme-green/30">
                  Google Verified
                </span>
              </div>
              <span className="text-xs text-theme-text-muted">{user.email}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-theme-text-muted hover:text-theme-red"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        </div>
      ) : configured ? (
        /* Configured & Ready to Sign In */
        <div className="space-y-4">
          <p className="text-xs text-theme-text-muted leading-relaxed">
            Sign in with your Google account to maintain user-specific repository history, custom bookmarks, and preferences across devices.
          </p>
          <a
            href="/api/auth/google/login?returnUrl=/settings"
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-lg bg-theme-surface-alt hover:bg-theme-surface border border-theme-border hover:border-theme-blue/40 text-theme-text font-medium text-xs shadow-xs transition-all cursor-pointer group"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
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
            <span className="group-hover:text-theme-blue transition-colors">
              Sign in with Google
            </span>
          </a>
        </div>
      ) : (
        /* Setup Guide for Unconfigured Google OAuth */
        <div className="space-y-4 p-4 rounded-xl bg-theme-surface-alt border border-theme-border">
          <div className="flex items-center gap-2 text-xs font-semibold text-theme-text">
            <Info className="w-4 h-4 text-theme-blue shrink-0" />
            <span>Connect Official Google OAuth Credentials</span>
          </div>

          <p className="text-xs text-theme-text-muted leading-relaxed">
            Google OAuth requires a free OAuth 2.0 Client ID created in your Google Cloud Console. Follow these 3 quick steps:
          </p>

          <ol className="space-y-3 text-xs text-theme-text-muted list-decimal list-inside">
            <li className="leading-relaxed">
              <strong className="text-theme-text">Open Google Cloud Console:</strong> Click the direct link below to go straight to Google Cloud Credentials:
              <div className="mt-1.5 pl-4">
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-blue-surface border border-theme-blue/30 text-theme-blue font-mono font-medium hover:bg-theme-blue/20 transition-colors"
                >
                  console.cloud.google.com/apis/credentials
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </li>

            <li className="leading-relaxed">
              <strong className="text-theme-text">Create OAuth Client ID:</strong> Click <strong className="text-theme-text">Create Credentials</strong> &rarr; <strong className="text-theme-text">OAuth client ID</strong>. Select <strong className="text-theme-text">Web application</strong>. Enter the following exact values:
              
              <div className="mt-2 space-y-2 pl-4">
                <div>
                  <span className="text-[11px] font-mono text-theme-text block mb-1">
                    Authorized JavaScript origins:
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 rounded bg-theme-surface border border-theme-border text-theme-text font-mono text-[11px] select-all">
                      {jsOrigin}
                    </code>
                    <button
                      onClick={() => handleCopy(jsOrigin, "origin")}
                      className="p-1 rounded hover:bg-theme-surface text-theme-text-muted hover:text-theme-text transition-colors"
                      title="Copy Origin"
                    >
                      {copiedField === "origin" ? (
                        <Check className="w-3.5 h-3.5 text-theme-green" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-mono text-theme-text block mb-1">
                    Authorized redirect URIs:
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 rounded bg-theme-surface border border-theme-border text-theme-text font-mono text-[11px] select-all">
                      {redirectUri}
                    </code>
                    <button
                      onClick={() => handleCopy(redirectUri, "uri")}
                      className="p-1 rounded hover:bg-theme-surface text-theme-text-muted hover:text-theme-text transition-colors"
                      title="Copy Redirect URI"
                    >
                      {copiedField === "uri" ? (
                        <Check className="w-3.5 h-3.5 text-theme-green" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </li>

            <li className="leading-relaxed">
              <strong className="text-theme-text">Add to .env.local:</strong> Copy your Client ID and Client Secret, and paste them into your <code className="text-theme-text font-mono">.env.local</code> file:
              <div className="mt-2 pl-4">
                <pre className="p-3 rounded-lg bg-theme-surface border border-theme-border font-mono text-[11px] text-theme-text overflow-x-auto">
{`GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret_here`}
                </pre>
              </div>
            </li>
          </ol>

          <div className="pt-2 flex items-center justify-between border-t border-theme-border">
            <span className="text-[11px] text-theme-text-subtle">
              After editing .env.local, restart your development server with <code className="font-mono">npm run dev</code>.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSession}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              Re-check Status
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
