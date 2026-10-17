"use client";

import React from "react";
import { GitBranch, GitCommit, Search, Plus, ExternalLink, ShieldAlert, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  currentRepo?: {
    owner: string;
    repo: string;
    defaultBranch?: string;
    commitSha?: string;
  } | null;
  onOpenImport?: () => void;
  onOpenSearch?: () => void;
  rateLimit?: {
    remaining: number;
    limit: number;
  };
  aiStatus?: "ready" | "offline" | "connecting";
  authStatus?: {
    authenticated: boolean;
    user?: string;
    checking?: boolean;
  };
}

export const Header: React.FC<HeaderProps> = ({
  currentRepo,
  onOpenImport,
  onOpenSearch,
  rateLimit = { remaining: 5000, limit: 5000 },
  aiStatus = "offline",
  authStatus
}) => {
  return (
    <header className="h-14 bg-[#0F1011] border-b border-[#23252A] px-4 flex items-center justify-between shrink-0 select-none shadow-[0_1px_0_rgba(255,255,255,0.02)]">
      {/* Current Repository Context */}
      <div className="flex items-center gap-3">
        {currentRepo ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#62666D] font-mono">Repo:</span>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#141516] border border-[#23252A] text-xs font-mono shadow-xs">
              <span className="text-[#F7F8F8] font-semibold">
                {currentRepo.owner}/{currentRepo.repo}
              </span>
              <span className="text-[#62666D]">@</span>
              <span className="text-[#828FFF] flex items-center gap-1 font-medium">
                <GitBranch className="w-3 h-3 text-[#5E6AD2]" />
                {currentRepo.defaultBranch || "main"}
              </span>
              {currentRepo.commitSha && (
                <span className="text-[#8A8F98] flex items-center gap-0.5 ml-1 pl-1.5 border-l border-[#23252A]">
                  <GitCommit className="w-3 h-3 text-[#62666D]" />
                  {currentRepo.commitSha.slice(0, 7)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8A8F98]">No repository active</span>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={onOpenImport}
            >
              Connect Repo
            </Button>
          </div>
        )}
      </div>

      {/* Global Actions, Search, Rate Limits & AI Telemetry */}
      <div className="flex items-center gap-3">
        {/* Global Command Palette / Search Trigger */}
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141516] hover:bg-[#18191A] border border-[#23252A] hover:border-[#34343A] text-xs text-[#8A8F98] hover:text-[#F7F8F8] transition-all font-mono shadow-xs"
        >
          <Search className="w-3.5 h-3.5 text-[#62666D]" />
          <span>Quick command search...</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[#18191A] text-[#8A8F98] border border-[#34343A] ml-2">
            Ctrl+K
          </kbd>
        </button>

        {/* Local AI Status Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141516] border border-[#23252A] text-[11px] font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              aiStatus === "ready"
                ? "bg-[#27A644] shadow-[0_0_8px_rgba(39,166,68,0.6)]"
                : aiStatus === "connecting"
                ? "bg-[#F59E0B] animate-pulse"
                : "bg-[#62666D]"
            }`}
          />
          <span className="text-[#62666D]">Local AI:</span>
          <span
            className={
              aiStatus === "ready"
                ? "text-[#27A644] font-medium"
                : "text-[#8A8F98] font-medium"
            }
          >
            {aiStatus === "ready" ? "Ollama Online" : "Deterministic Mode"}
          </span>
        </div>

        {/* GitHub API Rate Limit & Auth status */}
        <a
          href="/settings"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141516] hover:bg-[#18191A] border border-[#23252A] hover:border-[#34343A] text-[11px] font-mono transition-colors text-[#8A8F98] hover:text-[#F7F8F8]"
          title={
            authStatus?.authenticated
              ? `Authenticated via GitHub Token as @${authStatus.user || "user"} (5,000 req/hr quota). Click to manage settings.`
              : "Public Unauthenticated Rate Limit (60 req/hr). Click to add GitHub Token in Settings."
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              authStatus?.authenticated
                ? "bg-[#27A644] shadow-[0_0_8px_rgba(39,166,68,0.5)]"
                : rateLimit.remaining < 20
                ? "bg-[#EF4444]"
                : "bg-[#F59E0B]"
            }`}
          />
          <span className="text-[#62666D]">API:</span>
          {authStatus?.authenticated && authStatus.user ? (
            <span className="text-[#828FFF] font-medium">@{authStatus.user}</span>
          ) : null}
          <span
            className={
              rateLimit.remaining < 20
                ? "text-[#EF4444] font-semibold"
                : "text-[#D0D6E0] font-medium"
            }
          >
            {rateLimit.remaining}/{rateLimit.limit}
          </span>
        </a>

        {currentRepo && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={onOpenImport}
          >
            Switch
          </Button>
        )}
      </div>
    </header>
  );
};
