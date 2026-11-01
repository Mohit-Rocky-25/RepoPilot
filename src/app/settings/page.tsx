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
  ShieldAlert
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

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
      // Clean up legacy localStorage if found, migrating to sessionStorage
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

    // Validate token before or upon saving
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1011] hover:bg-[#141516] border border-[#23252A] hover:border-[#34343A] text-xs font-mono text-[#8A8F98] hover:text-[#F7F8F8] transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go Back</span>
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1011] hover:bg-[#141516] border border-[#23252A] hover:border-[#34343A] text-xs font-mono text-[#8A8F98] hover:text-[#F7F8F8] transition-all shadow-xs"
          >
            <Home className="w-3.5 h-3.5 text-[#828FFF]" />
            <span>Home</span>
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5E6AD2]/15 hover:bg-[#5E6AD2]/25 border border-[#5E6AD2]/30 text-xs font-mono text-[#828FFF] hover:text-white transition-all shadow-xs"
          >
            <span>Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 p-1 bg-[#0F1011] border border-[#23252A] rounded-lg">
        <Link
          href="/settings"
          className="flex-1 text-center py-1.5 px-3 rounded-md text-xs font-mono font-medium bg-[#141516] text-[#F7F8F8] border border-[#34343A] shadow-xs flex items-center justify-center gap-2"
        >
          <SettingsIcon className="w-3.5 h-3.5 text-[#828FFF]" />
          <span>General & Credentials</span>
        </Link>
        <Link
          href="/settings/ai"
          className="flex-1 text-center py-1.5 px-3 rounded-md text-xs font-mono font-medium text-[#8A8F98] hover:text-[#F7F8F8] hover:bg-[#141516] transition-all flex items-center justify-center gap-2"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Local AI (Ollama)</span>
        </Link>
        <Link
          href="/docs"
          className="flex-1 text-center py-1.5 px-3 rounded-md text-xs font-mono font-medium text-[#8A8F98] hover:text-[#F7F8F8] hover:bg-[#141516] transition-all flex items-center justify-center gap-2"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Docs & Guides</span>
        </Link>
      </div>

      {/* Header */}
      <div className="pb-3 border-b border-[#23252A]">
        <h1 className="text-lg font-semibold text-[#F7F8F8] font-mono flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-[#5E6AD2]" />
          <span>Credentials & GitHub Access</span>
        </h1>
        <p className="text-xs text-[#8A8F98] mt-0.5">
          Configure GitHub tokens for private repository analysis with least-privilege scope inspection.
        </p>
      </div>

      {/* Step-by-Step Token Creation Guide */}
      <Card className="p-5 space-y-4 bg-[#0F1011] border-[#23252A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#828FFF]" />
            <h2 className="text-sm font-semibold text-[#F7F8F8] font-mono uppercase tracking-wide">
              Step-by-Step: Creating a Read-Only Token
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#828FFF] bg-[#828FFF]/10 px-2 py-0.5 rounded border border-[#828FFF]/20">
            Least Privilege
          </span>
        </div>

        <p className="text-xs text-[#8A8F98] leading-relaxed font-mono">
          To inspect private repositories without compromising your account, generate a fine-grained token with read-only permissions:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#141516] border border-[#23252A] space-y-1">
            <div className="flex items-center gap-1.5 text-[#F7F8F8] font-medium">
              <span className="w-4 h-4 rounded-full bg-[#5E6AD2] text-white inline-flex items-center justify-center text-[10px]">1</span>
              <span>Open Token Settings</span>
            </div>
            <p className="text-[11px] text-[#8A8F98]">
              Visit GitHub &rarr; Settings &rarr; Developer settings &rarr; Personal access tokens &rarr; Fine-grained tokens.
            </p>
            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noreferrer"
              className="text-[#828FFF] hover:text-white inline-flex items-center gap-1 text-[11px] pt-1"
            >
              Open Fine-grained Tokens page <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-3 rounded-lg bg-[#141516] border border-[#23252A] space-y-1">
            <div className="flex items-center gap-1.5 text-[#F7F8F8] font-medium">
              <span className="w-4 h-4 rounded-full bg-[#5E6AD2] text-white inline-flex items-center justify-center text-[10px]">2</span>
              <span>Select Repository</span>
            </div>
            <p className="text-[11px] text-[#8A8F98]">
              Under <strong>Repository access</strong>, select <strong>&quot;Only select repositories&quot;</strong> and choose your target repository.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#141516] border border-[#23252A] space-y-1">
            <div className="flex items-center gap-1.5 text-[#F7F8F8] font-medium">
              <span className="w-4 h-4 rounded-full bg-[#5E6AD2] text-white inline-flex items-center justify-center text-[10px]">3</span>
              <span>Grant Minimal Permissions</span>
            </div>
            <p className="text-[11px] text-[#8A8F98]">
              Under <strong>Repository permissions</strong>, enable only:
              <br />
              &bull; <code>Contents: Read-only</code>
              <br />
              &bull; <code>Metadata: Read-only</code>
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#141516] border border-[#23252A] space-y-1">
            <div className="flex items-center gap-1.5 text-[#F7F8F8] font-medium">
              <span className="w-4 h-4 rounded-full bg-[#5E6AD2] text-white inline-flex items-center justify-center text-[10px]">4</span>
              <span>Paste & Validate Below</span>
            </div>
            <p className="text-[11px] text-[#8A8F98]">
              Generate token, copy the <code>github_pat_...</code> secret, paste into the field below, and click <strong>Validate & Save</strong>.
            </p>
          </div>
        </div>
      </Card>

      {/* GitHub Token / Rate Limit Card */}
      <Card className="p-5 space-y-4 bg-[#0F1011] border-[#23252A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-[#5E6AD2]" />
            <h2 className="text-sm font-semibold text-[#F7F8F8] font-mono uppercase">
              Token Input & Scope Inspector
            </h2>
          </div>
          <Badge
            variant={rateLimit.remaining < 20 ? "danger" : authStatus.authenticated ? "success" : "primary"}
            size="sm"
          >
            Quota: {rateLimit.remaining}/{rateLimit.limit} req/hr
          </Badge>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <label className="text-[#D0D6E0] font-medium flex items-center gap-1.5">
              <span>Personal Access Token</span>
              <span className="text-[#8A8F98] font-normal text-[11px]">(Fine-grained or Classic)</span>
            </label>
            <div className="flex items-center gap-1 text-[11px] text-[#27A644]">
              <Lock className="w-3 h-3" />
              <span>Strict sessionStorage only</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="github_pat_... or ghp_..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin text-[#828FFF]" : ""}`} />}
              onClick={() => handleVerifyToken()}
              disabled={isVerifying || !token.trim()}
              className="shrink-0"
            >
              {isVerifying ? "Validating..." : "Validate"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={handleSaveToken}
              disabled={isVerifying || !token.trim()}
              className="shrink-0"
            >
              Save
            </Button>
            {token && (
              <Button
                variant="outline"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleClearToken}
                disabled={isVerifying}
                className="shrink-0 text-[#EF4444] hover:bg-[#EF4444]/10"
              >
                Clear
              </Button>
            )}
          </div>

          <p className="text-[11px] text-[#8A8F98] leading-relaxed">
            🔒 <strong>Session-Only Storage:</strong> Your token is stored strictly in <code>sessionStorage</code> in active memory for this tab. It is cleared automatically when you close the browser tab and is never written to disk or persistent <code>localStorage</code>.
          </p>

          {savedTokenNotice && (
            <p className="text-xs text-[#27A644] flex items-center gap-1 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Token preferences updated in active session.
            </p>
          )}

          {/* Validation Feedback & Scope Inspector Box */}
          {validationInfo && (
            <div
              className={`p-3.5 rounded-lg border text-xs space-y-2 transition-all ${
                validationInfo.valid
                  ? "bg-[#141516] border-[#27A644]/40"
                  : "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {validationInfo.valid ? (
                    <UserCheck className="w-4 h-4 text-[#27A644]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                  )}
                  <span className="font-semibold text-[#F7F8F8]">
                    {validationInfo.valid
                      ? `Valid Token for @${validationInfo.user || "user"}`
                      : "Token Validation Failed"}
                  </span>
                </div>
                {validationInfo.tokenType && (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#23252A] text-[#828FFF]">
                    {validationInfo.tokenType}
                  </span>
                )}
              </div>

              {validationInfo.valid && (
                <>
                  {/* Scopes Badges */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] text-[#8A8F98] block">Detected Token Scopes:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {validationInfo.scopes && validationInfo.scopes.length > 0 ? (
                        validationInfo.scopes.map((s) => (
                          <span
                            key={s}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              validationInfo.elevatedScopes?.includes(s) || s === "repo"
                                ? "bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]"
                                : "bg-[#27A644]/15 border border-[#27A644]/30 text-[#27A644]"
                            }`}
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#828FFF]/15 border border-[#828FFF]/30 text-[#828FFF]">
                          {validationInfo.tokenType === "fine-grained"
                            ? "Fine-Grained Granular Permissions"
                            : "No OAuth Scopes (Public Only)"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Broad Scopes Warning Banner */}
                  {validationInfo.hasBroadScopes && (
                    <div className="p-2.5 rounded bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 text-[11px]">
                        <span className="font-semibold block">Elevated Permissions Detected</span>
                        <p className="text-opacity-90 leading-relaxed">
                          {validationInfo.warning}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  {validationInfo.recommendation && (
                    <p className="text-[11px] text-[#8A8F98] italic">
                      Tip: {validationInfo.recommendation}
                    </p>
                  )}
                </>
              )}

              {!validationInfo.valid && (
                <p className="text-[11px] text-[#EF4444]">{validationInfo.error}</p>
              )}
            </div>
          )}

          {/* Current Auth Status Banner */}
          {!validationInfo && authStatus.authenticated && authStatus.user && (
            <div className="p-2.5 rounded-lg border bg-[#141516] border-[#23252A] text-xs flex items-center gap-2 text-[#828FFF]">
              <UserCheck className="w-4 h-4 text-[#27A644]" />
              <span>
                Authenticated as <strong className="text-[#F7F8F8]">@{authStatus.user}</strong> with active 5,000 req/hr rate limit.
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* GitHub App OAuth Card (Behind Feature Flag) */}
      <Card className="p-5 space-y-3 font-mono text-xs bg-[#0F1011] border-[#23252A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-[#828FFF]" />
            <h2 className="text-sm font-semibold text-[#F7F8F8] uppercase">
              GitHub App OAuth Flow
            </h2>
          </div>
          <Badge variant={oauthEnabled ? "success" : "neutral"} size="sm">
            {oauthEnabled ? "Feature Flag Active" : "Flag Disabled (Default)"}
          </Badge>
        </div>

        <p className="text-[#8A8F98] leading-relaxed">
          RepoPilot includes an enterprise-grade GitHub App OAuth flow featuring RFC 7636 PKCE, cryptographic CSRF mitigation, and zero server-side persistence.
        </p>

        {oauthEnabled ? (
          <div className="pt-2">
            <a
              href="/api/auth/github/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5E6AD2] hover:bg-[#4E5AC0] text-white text-xs font-mono font-medium transition-colors shadow-xs"
            >
              <Github className="w-4 h-4" />
              <span>Connect with GitHub App</span>
            </a>
          </div>
        ) : (
          <div className="p-2.5 rounded bg-[#141516] border border-[#23252A] text-[11px] text-[#8A8F98] space-y-1">
            <p>
              To enable GitHub App OAuth authentication in self-hosted or production deployments, set:
            </p>
            <code className="block p-1.5 rounded bg-[#0F1011] text-[#828FFF]">
              ENABLE_GITHUB_APP_OAUTH=true
            </code>
            <p>
              Full architecture specification: see <Link href="/docs" className="text-[#828FFF] underline">docs/OAUTH_DESIGN.md</Link>.
            </p>
          </div>
        )}
      </Card>

      {/* Security & Execution Policy Card */}
      <Card className="p-5 space-y-3 font-mono text-xs bg-[#0F1011] border-[#23252A]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#27A644]" />
          <h2 className="text-sm font-semibold text-[#F7F8F8] uppercase">
            Security & Execution Sandbox Policy
          </h2>
        </div>

        <div className="space-y-2 text-[#8A8F98] leading-relaxed">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141516] border border-[#23252A]">
            <span className="font-medium text-[#F7F8F8]">Automated Arbitrary Code Execution</span>
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
      <Card className="p-5 space-y-3 font-mono text-xs bg-[#0F1011] border-[#23252A]">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-[#EF4444]" />
          <h2 className="text-sm font-semibold text-[#F7F8F8] uppercase">
            Local Data & Workspace History
          </h2>
        </div>

        <p className="text-[#8A8F98]">
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
            <span className="text-xs text-[#EF4444] font-medium">
              History cleared. Reloading...
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
