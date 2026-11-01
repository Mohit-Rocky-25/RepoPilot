"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  GitBranch,
  GitCommit,
  Plus,
  ArrowLeft,
  Home,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

interface HeaderProps {
  currentRepo?: {
    owner: string;
    repo: string;
    defaultBranch?: string;
    commitSha?: string;
    isLocal?: boolean;
  } | null;
  onOpenImport?: () => void;
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

const getSectionDetails = (path: string) => {
  if (!path || path === "/") return { name: "Home", href: "/" };
  const segment = path.replace(/^\//, "").split("/")[0];
  switch (segment) {
    case "explore":
      return { name: "Code Explorer", href: "/explore" };
    case "architecture":
      return { name: "3D Architecture", href: "/architecture" };
    case "debugging":
      return { name: "Bug Investigation", href: "/debugging" };
    case "assistant":
      return { name: "AI Assistant", href: "/assistant" };
    case "patches":
      return { name: "Patch Review", href: "/patches" };
    case "search":
      return { name: "Search & Symbols", href: "/search" };
    case "settings":
      return path.includes("/ai")
        ? { name: "Local AI (Ollama)", href: "/settings/ai" }
        : { name: "Settings", href: "/settings" };
    case "docs":
      return { name: "Documentation", href: "/docs" };
    default:
      return { name: segment.charAt(0).toUpperCase() + segment.slice(1), href: path };
  }
};

export const Header: React.FC<HeaderProps> = ({
  currentRepo,
  onOpenImport,
  rateLimit = { remaining: 5000, limit: 5000 },
  aiStatus = "offline",
  authStatus
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const section = getSectionDetails(pathname);

  return (
    <header className="h-14 bg-theme-surface border-b border-theme-border px-4 flex items-center justify-between shrink-0 select-none shadow-xs">
      {/* Navigation Directions, Back/Home buttons & Repository Context */}
      <div className="flex items-center gap-3">
        {/* Navigation Direction Controls: Back & Home */}
        <div className="flex items-center gap-1.5 pr-2.5 border-r border-theme-border">
          <button
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/");
              }
            }}
            title="Go back to previous page"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-theme-surface-alt hover:bg-theme-surface border border-theme-border text-xs font-mono text-theme-text-muted hover:text-theme-text transition-all shadow-xs group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-theme-text-muted group-hover:text-theme-text transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline font-medium">Back</span>
          </button>

          <Link
            href="/"
            title="Go to RepoPilot Home"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all shadow-xs ${
              pathname === "/"
                ? "bg-theme-blue-surface border-theme-blue/40 text-theme-blue font-semibold"
                : "bg-theme-surface-alt hover:bg-theme-surface border-theme-border text-theme-text-muted hover:text-theme-text"
            }`}
          >
            <Home className="w-3.5 h-3.5 text-theme-blue" />
            <span className="hidden sm:inline font-medium">Home</span>
          </Link>
        </div>

        {/* Direction Route Breadcrumbs */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono text-theme-text-subtle">
          <Link href="/" className="hover:text-theme-text transition-colors">
            RepoPilot
          </Link>
          <ChevronRight className="w-3 h-3 text-theme-border" />
          <span className="text-theme-text-muted font-medium">
            {section.name}
          </span>
        </div>

        {/* Current Repository Context */}
        {currentRepo ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-theme-text-subtle font-mono hidden md:inline">Repo:</span>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-theme-surface-alt border border-theme-border text-xs font-mono shadow-xs">
              <span className="text-theme-text font-semibold">
                {currentRepo.owner}/{currentRepo.repo}
              </span>
              {currentRepo.isLocal ? (
                <span className="text-theme-green-text flex items-center gap-1 font-medium bg-theme-green-surface px-1.5 py-0.5 rounded text-[10px]">
                  <ShieldCheck className="w-3 h-3 text-theme-green" />
                  <span>Local</span>
                </span>
              ) : (
                <>
                  <span className="text-theme-text-subtle">@</span>
                  <span className="text-theme-blue flex items-center gap-1 font-medium">
                    <GitBranch className="w-3 h-3 text-theme-blue" />
                    {currentRepo.defaultBranch || "main"}
                  </span>
                  {currentRepo.commitSha && (
                    <span className="text-theme-text-muted hidden sm:flex items-center gap-0.5 ml-1 pl-1.5 border-l border-theme-border">
                      <GitCommit className="w-3 h-3 text-theme-text-subtle" />
                      {currentRepo.commitSha.slice(0, 7)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-theme-text-muted">No repository active</span>
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

      {/* Global Actions, Theme Switcher, Rate Limits & AI Telemetry */}
      <div className="flex items-center gap-2.5">
        {/* Theme Switcher Segmented Control */}
        <ThemeSwitcher size="sm" />

        {/* Local AI Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-theme-surface-alt border border-theme-border text-[11px] font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              aiStatus === "ready"
                ? "bg-theme-green"
                : aiStatus === "connecting"
                ? "bg-theme-yellow animate-pulse"
                : "bg-theme-text-subtle"
            }`}
          />
          <span className="text-theme-text-subtle">Local AI:</span>
          <span
            className={
              aiStatus === "ready"
                ? "text-theme-green-text font-medium"
                : "text-theme-text-muted font-medium"
            }
          >
            {aiStatus === "ready" ? "Ollama Online" : "Deterministic"}
          </span>
        </div>

        {/* GitHub API Rate Limit & Auth status */}
        <Link
          href="/settings"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-theme-surface-alt hover:bg-theme-surface border border-theme-border text-[11px] font-mono transition-colors text-theme-text-muted hover:text-theme-text"
          title={
            authStatus?.authenticated
              ? `Authenticated via GitHub Token as @${authStatus.user || "user"} (5,000 req/hr quota). Click to manage settings.`
              : "Public Unauthenticated Rate Limit. Click to add GitHub Token in Settings."
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              authStatus?.authenticated
                ? "bg-theme-green"
                : rateLimit.remaining < 20
                ? "bg-theme-red"
                : "bg-theme-yellow"
            }`}
          />
          <span className="text-theme-text-subtle">API:</span>
          {authStatus?.authenticated && authStatus.user ? (
            <span className="text-theme-blue font-medium">@{authStatus.user}</span>
          ) : null}
          <span
            className={
              rateLimit.remaining < 20
                ? "text-theme-danger-text font-semibold"
                : "text-theme-text font-medium"
            }
          >
            {rateLimit.remaining}/{rateLimit.limit}
          </span>
        </Link>

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
