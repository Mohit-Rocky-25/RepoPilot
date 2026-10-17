"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  Key,
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
  BookOpen
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { clientFetch } from "@/lib/api";

export default function GeneralSettingsPage() {
  const router = useRouter();
  const { currentRepo, recentRepos, rateLimit, setRateLimit, authStatus, refreshRateLimit } = useRepository();

  const [token, setToken] = useState("");
  const [savedTokenNotice, setSavedTokenNotice] = useState(false);
  const [clearedHistoryNotice, setClearedHistoryNotice] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    user?: string;
  } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("REPOPILOT_GH_TOKEN");
    if (saved) setToken(saved);
  }, []);

  const handleSaveToken = async () => {
    const trimmed = token.trim();
    if (trimmed) {
      localStorage.setItem("REPOPILOT_GH_TOKEN", trimmed);
    } else {
      localStorage.removeItem("REPOPILOT_GH_TOKEN");
    }
    setSavedTokenNotice(true);
    setTimeout(() => setSavedTokenNotice(false), 2500);

    // Automatically verify newly saved token
    await handleVerifyToken(trimmed);
  };

  const handleVerifyToken = async (overrideToken?: string) => {
    setIsVerifying(true);
    setVerifyResult(null);

    const tokenToTest = overrideToken !== undefined ? overrideToken : token.trim();
    const headers: Record<string, string> = {};
    if (tokenToTest) {
      headers["x-github-token"] = tokenToTest;
    }

    try {
      const res = await fetch("/api/github/rate-limit", {
        headers
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.rateLimit) {
          setRateLimit({
            remaining: data.rateLimit.remaining,
            limit: data.rateLimit.limit
          });
        }
        setVerifyResult({
          tested: true,
          success: true,
          message: data.authenticated
            ? `Authenticated as @${data.user || "user"}. Rate limit quota: ${data.rateLimit?.remaining}/${data.rateLimit?.limit} req/hr.`
            : `Unauthenticated public access. Rate limit quota: ${data.rateLimit?.remaining}/${data.rateLimit?.limit} req/hr.`,
          user: data.user
        });
        await refreshRateLimit();
      } else {
        setVerifyResult({
          tested: true,
          success: false,
          message: data.error || "Failed to authenticate with GitHub API."
        });
      }
    } catch {
      setVerifyResult({
        tested: true,
        success: false,
        message: "Network error attempting to verify GitHub rate limits."
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem("REPOPILOT_RECENT_REPOS");
    localStorage.removeItem("REPOPILOT_ACTIVE_INVESTIGATION");
    setClearedHistoryNotice(true);
    setTimeout(() => {
      setClearedHistoryNotice(false);
      window.location.reload();
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Navigation Directions: Back, Home & Workspace */}
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
          <span>General & Rate Limit</span>
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
          <span>Console Configuration & Environment</span>
        </h1>
        <p className="text-xs text-[#8A8F98] mt-0.5">
          Manage local secrets, GitHub rate limit quotas, token authentication speed, and sandboxing safety policies.
        </p>
      </div>

      {/* GitHub Token / Rate Limit Card */}
      <Card className="p-5 space-y-4 bg-[#0F1011] border-[#23252A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-[#5E6AD2]" />
            <h2 className="text-sm font-semibold text-[#F7F8F8] font-mono uppercase">
              GitHub Rate Limit & Optional Token
            </h2>
          </div>
          <Badge
            variant={rateLimit.remaining < 20 ? "danger" : authStatus.authenticated ? "success" : "primary"}
            size="sm"
          >
            Quota: {rateLimit.remaining}/{rateLimit.limit} req/hr
          </Badge>
        </div>

        <p className="text-xs text-[#8A8F98] leading-relaxed font-mono">
          Public GitHub unauthenticated requests are limited to 60 req/hour. Supplying an optional Personal Access Token (classic with public repo read access) increases your quota to 5,000 req/hour. The token is stored strictly in your browser's LocalStorage and is never transmitted to any third party.
        </p>

        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <label className="text-[#D0D6E0] font-medium">
              Personal Access Token (Optional)
            </label>
            <a
              href="https://github.com/settings/tokens/new?description=RepoPilot&scopes=public_repo"
              target="_blank"
              rel="noreferrer"
              className="text-[#828FFF] hover:text-[#5E6AD2] text-[11px] flex items-center gap-1 transition-colors"
            >
              Generate token on GitHub <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin text-[#828FFF]" : ""}`} />}
              onClick={() => handleVerifyToken()}
              disabled={isVerifying}
              className="shrink-0"
            >
              {isVerifying ? "Verifying..." : "Test Token"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={handleSaveToken}
              disabled={isVerifying}
              className="shrink-0"
            >
              Save Token
            </Button>
          </div>

          {savedTokenNotice && (
            <p className="text-xs text-[#27A644] flex items-center gap-1 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Token preferences saved locally.
            </p>
          )}

          {/* Test & Verification Feedback Box */}
          {verifyResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
                verifyResult.success
                  ? "bg-[#27A644]/10 border-[#27A644]/30 text-[#27A644]"
                  : "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]"
              }`}
            >
              {verifyResult.success ? (
                <UserCheck className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-0.5">
                <span className="font-semibold block">
                  {verifyResult.success ? "Authentication Verified" : "Authentication Failed"}
                </span>
                <span className="text-linear-text-muted text-[11px] leading-relaxed block text-opacity-90">
                  {verifyResult.message}
                </span>
              </div>
            </div>
          )}

          {/* Current Auth Status Banner */}
          {!verifyResult && authStatus.authenticated && authStatus.user && (
            <div className="p-2.5 rounded-lg border bg-[#141516] border-[#23252A] text-xs flex items-center gap-2 text-[#828FFF]">
              <UserCheck className="w-4 h-4 text-[#27A644]" />
              <span>
                Authenticated as <strong className="text-[#F7F8F8]">@{authStatus.user}</strong> with active 5,000 req/hr rate limit.
              </span>
            </div>
          )}
        </div>
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
            In alignment with open-source developer safety best practices, RepoPilot treats all third-party code as untrusted. No repository build scripts, package post-installs, or arbitrary test suites are executed on your server automatically. Instead, reproducible manual commands and unified diffs are provided for human verification.
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
