"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  Save,
  CheckCircle,
  AlertTriangle,
  Github,
  RefreshCw,
  ExternalLink,
  UserCheck,
  ArrowLeft,
  Home,
  ArrowRight,
  Activity,
  BookOpen,
  Lock,
  Info,
  ShieldAlert,
  SunMoon
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

interface TokenValidationInfo {
  tested: boolean;
  valid: boolean;
  user?: string;
  name?: string;
  tokenType?: string;
  scopes?: string[];
  elevatedScopes?: string[];
  hasBroadScopes?: boolean;
  warning?: string;
  recommendation?: string;
  rateLimit?: {
    limit: number;
    remaining: number;
  };
  error?: string;
}

export default function GeneralSettingsPage() {
  const router = useRouter();
  const { rateLimit, setRateLimit, authStatus, refreshRateLimit } = useRepository();

  const [token, setToken] = useState("");
  const [savedTokenNotice, setSavedTokenNotice] = useState(false);
  const [clearedHistoryNotice, setClearedHistoryNotice] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [validationInfo, setValidationInfo] = useState<TokenValidationInfo | null>(null);
  const [oauthEnabled] = useState(
    typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_ENABLE_GITHUB_APP_OAUTH === "true"
  );

  useEffect(() => {
    try {
      const legacyLocalToken = localStorage.getItem("REPOPILOT_GH_TOKEN");
      if (legacyLocalToken) {
        if (!sessionStorage.getItem("REPOPILOT_GH_TOKEN")) {
          sessionStorage.setItem("REPOPILOT_GH_TOKEN", legacyLocalToken);
        }
        localStorage.removeItem("REPOPILOT_GH_TOKEN");
      }

      const sessionToken = sessionStorage.getItem("REPOPILOT_GH_TOKEN");
      if (sessionToken) {
        setToken(sessionToken);
      }
    } catch {}
  }, []);

  const handleSaveToken = async () => {
    const trimmed = token.trim();
    if (trimmed) {
      sessionStorage.setItem("REPOPILOT_GH_TOKEN", trimmed);
      try {
        localStorage.removeItem("REPOPILOT_GH_TOKEN");
      } catch {}
    } else {
      handleClearToken();
      return;
    }
    setSavedTokenNotice(true);
    setTimeout(() => setSavedTokenNotice(false), 2500);

    await handleVerifyToken(trimmed);
  };

  const handleClearToken = async () => {
    setToken("");
    try {
      sessionStorage.removeItem("REPOPILOT_GH_TOKEN");
      localStorage.removeItem("REPOPILOT_GH_TOKEN");
    } catch {}
    setValidationInfo(null);
    setSavedTokenNotice(true);
    setTimeout(() => setSavedTokenNotice(false), 2000);
    await refreshRateLimit();
  };

  const handleVerifyToken = async (overrideToken?: string) => {
    setIsVerifying(true);
    setValidationInfo(null);

    const tokenToTest = overrideToken !== undefined ? overrideToken : token.trim();
    if (!tokenToTest) {
      setIsVerifying(false);
      return;
    }

    try {
      const res = await fetch("/api/github/validate-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-github-token": tokenToTest
        },
        body: JSON.stringify({ token: tokenToTest })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.rateLimit) {
          setRateLimit({
            remaining: data.rateLimit.remaining,
            limit: data.rateLimit.limit
          });
        }
        setValidationInfo({
          tested: true,
          valid: true,
          user: data.user,
          name: data.name,
          tokenType: data.tokenType,
          scopes: data.scopes || [],
          elevatedScopes: data.elevatedScopes || [],
          hasBroadScopes: Boolean(data.hasBroadScopes),
          warning: data.warning,
          recommendation: data.recommendation,
          rateLimit: data.rateLimit
        });
        await refreshRateLimit();
      } else {
        setValidationInfo({
          tested: true,
          valid: false,
          error: data.error || "Token verification failed. Check permissions or network."
        });
      }
    } catch {
      setValidationInfo({
        tested: true,
        valid: false,
        error: "Network error occurred while communicating with GitHub API."
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClearHistory = () => {
    try {
      localStorage.removeItem("REPOPILOT_RECENT_REPOS");
      localStorage.removeItem("REPOPILOT_ACTIVE_INVESTIGATION");
    } catch {}
    setClearedHistoryNotice(true);
    setTimeout(() => {
      setClearedHistoryNotice(false);
      window.location.reload();
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Navigation Directions */}
      <div className="flex items-center justify-between pb-1">
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/");
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-surface hover:bg-theme-surface-alt border border-theme-border text-xs font-mono text-theme-text-muted hover:text-theme-text transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go Back</span>
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-surface hover:bg-theme-surface-alt border border-theme-border text-xs font-mono text-theme-text-muted hover:text-theme-text transition-all shadow-xs"
          >
            <Home className="w-3.5 h-3.5 text-theme-blue" />
            <span>Home</span>
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-blue/10 hover:bg-theme-blue/20 border border-theme-blue/30 text-xs font-mono text-theme-blue hover:text-theme-blue-hover transition-all shadow-xs"
          >
            <span>Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 p-1 bg-theme-surface border border-theme-border rounded-lg shadow-xs">
        <Link
          href="/settings"
          className="flex-1 text-center py-1.5 px-3 rounded-md text-xs font-mono font-medium bg-theme-surface-alt text-theme-text border border-theme-border shadow-xs flex items-center justify-center gap-2"
        >
          <SettingsIcon className="w-3.5 h-3.5 text-theme-blue" />
          <span>General & Appearance</span>
        </Link>
        <Link
          href="/settings/ai"
          className="flex-1 text-center py-1.5 px-3 rounded-md text-xs font-mono font-medium text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-alt transition-all flex items-center justify-center gap-2"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Local AI (Ollama)</span>
        </Link>
        <Link
          href="/docs"
          className="flex-1 text-center py-1.5 px-3 rounded-md text-xs font-mono font-medium text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-alt transition-all flex items-center justify-center gap-2"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Docs & Guides</span>
        </Link>
      </div>

      {/* Header */}
      <div className="pb-3 border-b border-theme-border">
        <h1 className="text-lg font-semibold text-theme-text font-mono flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-theme-blue" />
          <span>General Settings & Appearance</span>
        </h1>
        <p className="text-xs text-theme-text-muted mt-0.5">
          Configure design system theme preference and GitHub access tokens for private repository analysis.
        </p>
      </div>

      {/* Theme Appearance Section */}
      <Card className="p-5 space-y-4 bg-theme-surface border-theme-border shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SunMoon className="w-4 h-4 text-theme-blue" />
            <h2 className="text-sm font-semibold text-theme-text font-mono uppercase tracking-wide">
              Interface Theme & Appearance
            </h2>
          </div>
          <span className="text-[11px] font-mono text-theme-blue bg-theme-blue/10 px-2 py-0.5 rounded border border-theme-blue/20">
            Google / GDG System
          </span>
        </div>

        <p className="text-xs text-theme-text-muted leading-relaxed font-mono">
          RepoPilot defaults to a Google/GDG-style Light theme for optimal readability, contrast, and calm presentation. You can also select Dark mode or have it track your operating system.
        </p>

        <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-lg bg-theme-surface-alt border border-theme-border">
          <div>
            <span className="text-xs font-semibold text-theme-text block font-mono">Theme Mode</span>
            <span className="text-[11px] text-theme-text-muted block font-mono mt-0.5">
              Zero flash-of-wrong-theme on page load · Stored in local browser
            </span>
          </div>
          <ThemeSwitcher />
        </div>
      </Card>

      {/* Step-by-Step Token Creation Guide */}
      <Card className="p-5 space-y-4 bg-theme-surface border-theme-border shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-theme-blue" />
            <h2 className="text-sm font-semibold text-theme-text font-mono uppercase tracking-wide">
              Step-by-Step: Creating a Read-Only Token
            </h2>
          </div>
          <span className="text-[11px] font-mono text-theme-blue bg-theme-blue/10 px-2 py-0.5 rounded border border-theme-blue/20">
            Least Privilege
          </span>
        </div>

        <p className="text-xs text-theme-text-muted leading-relaxed font-mono">
          To inspect private repositories without compromising your account, generate a fine-grained token with read-only permissions:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-theme-surface-alt border border-theme-border space-y-1">
            <div className="flex items-center gap-1.5 text-theme-text font-medium">
              <span className="w-4 h-4 rounded-full bg-theme-blue text-white inline-flex items-center justify-center text-[10px]">1</span>
              <span>Open Token Settings</span>
            </div>
            <p className="text-[11px] text-theme-text-muted">
              Visit GitHub &rarr; Settings &rarr; Developer settings &rarr; Personal access tokens &rarr; Fine-grained tokens.
            </p>
            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noreferrer"
              className="text-theme-blue hover:text-theme-blue-hover inline-flex items-center gap-1 text-[11px] pt-1"
            >
              Open Fine-grained Tokens page <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-3 rounded-lg bg-theme-surface-alt border border-theme-border space-y-1">
            <div className="flex items-center gap-1.5 text-theme-text font-medium">
              <span className="w-4 h-4 rounded-full bg-theme-blue text-white inline-flex items-center justify-center text-[10px]">2</span>
              <span>Select Repository</span>
            </div>
            <p className="text-[11px] text-theme-text-muted">
              Under <strong>Repository access</strong>, select <strong>&quot;Only select repositories&quot;</strong> and choose your target repository.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-theme-surface-alt border border-theme-border space-y-1">
            <div className="flex items-center gap-1.5 text-theme-text font-medium">
              <span className="w-4 h-4 rounded-full bg-theme-blue text-white inline-flex items-center justify-center text-[10px]">3</span>
              <span>Set Read-Only Scope</span>
            </div>
            <p className="text-[11px] text-theme-text-muted">
              Under <strong>Repository permissions</strong>, find <strong>Contents</strong> and set it to <strong>Read-only</strong>. Leave all other permissions blank.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-theme-surface-alt border border-theme-border space-y-1">
            <div className="flex items-center gap-1.5 text-theme-text font-medium">
              <span className="w-4 h-4 rounded-full bg-theme-blue text-white inline-flex items-center justify-center text-[10px]">4</span>
              <span>Paste & Validate Below</span>
            </div>
            <p className="text-[11px] text-theme-text-muted">
              Generate the token and paste it below. It is stored exclusively in your browser&apos;s ephemeral <code>sessionStorage</code>.
            </p>
          </div>
        </div>
      </Card>

      {/* GitHub Personal Access Token Configuration */}
      <Card className="p-5 space-y-4 bg-theme-surface border-theme-border shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-theme-blue" />
            <h2 className="text-sm font-semibold text-theme-text font-mono uppercase tracking-wide">
              GitHub Personal Access Token (PAT)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-theme-green bg-theme-green/10 px-2 py-0.5 rounded border border-theme-green/20">
            Session-Only Storage
          </span>
        </div>

        <p className="text-xs text-theme-text-muted leading-relaxed font-mono">
          Private repositories require a personal access token. RepoPilot stores this token in browser <strong>sessionStorage</strong> only. It is wiped when you close the tab.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-mono font-medium text-theme-text mb-1.5">
              Personal Access Token
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="password"
                placeholder="github_pat_... or ghp_..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveToken}
                  isLoading={isVerifying}
                  icon={<Save className="w-4 h-4" />}
                >
                  Save & Validate
                </Button>
                {token && (
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={handleClearToken}
                    icon={<Trash2 className="w-4 h-4" />}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          {savedTokenNotice && (
            <div className="flex items-center gap-2 text-xs font-mono text-theme-green">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Token saved to ephemeral sessionStorage!</span>
            </div>
          )}

          {/* Token Validation Feedback Panel */}
          {validationInfo && (
            <div className="p-3.5 rounded-lg border bg-theme-surface-alt border-theme-border space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {validationInfo.valid ? (
                    <CheckCircle className="w-4 h-4 text-theme-green" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-theme-danger" />
                  )}
                  <span className="font-semibold text-theme-text">
                    {validationInfo.valid ? "Token Validated Successfully" : "Invalid Token"}
                  </span>
                </div>
                {validationInfo.tokenType && (
                  <Badge variant="neutral" size="sm">
                    {validationInfo.tokenType}
                  </Badge>
                )}
              </div>

              {validationInfo.valid && (
                <>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-theme-text-muted">
                    {validationInfo.user && (
                      <span>Authenticated as: <strong className="text-theme-text">@{validationInfo.user}</strong></span>
                    )}
                    {validationInfo.rateLimit && (
                      <span>Rate limit: <strong className="text-theme-text">{validationInfo.rateLimit.remaining} / {validationInfo.rateLimit.limit}</strong> req/hr</span>
                    )}
                  </div>

                  {/* Scopes Inspection */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] text-theme-text-muted block">Granted Scopes:</span>
                    <div className="flex flex-wrap gap-1">
                      {validationInfo.scopes && validationInfo.scopes.length > 0 ? (
                        validationInfo.scopes.map((s) => (
                          <span
                            key={s}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              validationInfo.elevatedScopes?.includes(s)
                                ? "bg-theme-danger/10 border border-theme-danger/30 text-theme-danger"
                                : "bg-theme-green/10 border border-theme-green/30 text-theme-green"
                            }`}
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-theme-blue/10 border border-theme-blue/30 text-theme-blue">
                          {validationInfo.tokenType === "fine-grained"
                            ? "Fine-Grained Granular Permissions"
                            : "No OAuth Scopes (Public Only)"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Broad Scopes Warning Banner */}
                  {validationInfo.hasBroadScopes && (
                    <div className="p-2.5 rounded bg-theme-warning-surface border border-theme-warning/30 text-theme-warning-text flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 text-[11px]">
                        <span className="font-semibold block">Elevated Permissions Detected</span>
                        <p className="leading-relaxed">
                          {validationInfo.warning}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  {validationInfo.recommendation && (
                    <p className="text-[11px] text-theme-text-muted italic">
                      Tip: {validationInfo.recommendation}
                    </p>
                  )}
                </>
              )}

              {!validationInfo.valid && (
                <p className="text-[11px] text-theme-danger">{validationInfo.error}</p>
              )}
            </div>
          )}

          {/* Current Auth Status Banner */}
          {!validationInfo && authStatus.authenticated && authStatus.user && (
            <div className="p-2.5 rounded-lg border bg-theme-surface-alt border-theme-border text-xs flex items-center gap-2 text-theme-blue">
              <UserCheck className="w-4 h-4 text-theme-green" />
              <span>
                Authenticated as <strong className="text-theme-text">@{authStatus.user}</strong> with active 5,000 req/hr rate limit.
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* GitHub App OAuth Card (Behind Feature Flag) */}
      <Card className="p-5 space-y-3 font-mono text-xs bg-theme-surface border-theme-border shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-theme-blue" />
            <h2 className="text-sm font-semibold text-theme-text uppercase">
              GitHub App OAuth Flow
            </h2>
          </div>
          <Badge variant={oauthEnabled ? "success" : "neutral"} size="sm">
            {oauthEnabled ? "Feature Flag Active" : "Flag Disabled (Default)"}
          </Badge>
        </div>

        <p className="text-theme-text-muted leading-relaxed">
          RepoPilot includes an enterprise-grade GitHub App OAuth flow featuring RFC 7636 PKCE, high-entropy random CSRF state, and zero server-side persistence.
        </p>

        {oauthEnabled ? (
          <div className="pt-2">
            <a
              href="/api/auth/github/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-blue hover:bg-theme-blue-hover text-white text-xs font-mono font-medium transition-colors shadow-xs"
            >
              <Github className="w-4 h-4" />
              <span>Connect with GitHub App</span>
            </a>
          </div>
        ) : (
          <div className="p-2.5 rounded bg-theme-surface-alt border border-theme-border text-[11px] text-theme-text-muted space-y-1">
            <p>
              To enable GitHub App OAuth authentication in self-hosted or production deployments, set:
            </p>
            <code className="block p-1.5 rounded bg-theme-surface text-theme-blue border border-theme-border">
              ENABLE_GITHUB_APP_OAUTH=true
            </code>
            <p>
              Full architecture specification: see <Link href="/docs" className="text-theme-blue underline">docs/OAUTH_DESIGN.md</Link>.
            </p>
          </div>
        )}
      </Card>

      {/* Security & Execution Policy Card */}
      <Card className="p-5 space-y-3 font-mono text-xs bg-theme-surface border-theme-border shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-theme-green" />
          <h2 className="text-sm font-semibold text-theme-text uppercase">
            Security & Execution Sandbox Policy
          </h2>
        </div>

        <div className="space-y-2 text-theme-text-muted leading-relaxed">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-theme-surface-alt border border-theme-border">
            <span className="font-medium text-theme-text">Automated Arbitrary Code Execution</span>
            <Badge variant="danger" size="sm">
              STRICTLY DISABLED
            </Badge>
          </div>

          <p>
            RepoPilot treats all third-party repository code as untrusted. No repository build scripts, package post-installs, or arbitrary test suites are executed on your server automatically. Instead, reproducible manual commands and unified diffs are provided for human verification.
          </p>
        </div>
      </Card>

      {/* Local Storage & History Management */}
      <Card className="p-5 space-y-3 font-mono text-xs bg-theme-surface border-theme-border shadow-xs">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-theme-danger" />
          <h2 className="text-sm font-semibold text-theme-text uppercase">
            Local Data & Workspace History
          </h2>
        </div>

        <p className="text-theme-text-muted">
          Clear cached repository history and saved configurations stored in your browser.
        </p>

        <div className="pt-2 flex items-center gap-3">
          <Button
            variant="danger"
            size="sm"
            onClick={handleClearHistory}
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Clear Local Cache & Recent History
          </Button>
          {clearedHistoryNotice && (
            <span className="text-xs text-theme-danger font-medium">
              History cleared. Reloading...
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
