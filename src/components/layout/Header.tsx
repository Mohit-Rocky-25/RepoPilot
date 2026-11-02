"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  GitBranch,
  FolderArchive,
  GitCommit,
  Plus,
  ArrowLeft,
  Home,
  ChevronRight,
  ShieldCheck,
  Menu,
  X,
  Compass,
  FolderTree,
  Search,
  Cpu,
  Bot,
  Bug,
  GitPullRequest,
  Activity,
  Settings as SettingsIcon,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { FourDots } from "@/components/ui/signature/FourDots";

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
    case "history":
      return { name: "Saved Workspaces", href: "/history" };
    case "docs":
      return { name: "Documentation", href: "/docs" };
    default:
      return { name: segment.charAt(0).toUpperCase() + segment.slice(1), href: path };
  }
};

const DRAWER_NAV_SECTIONS = [
  {
    title: "Workspace",
    items: [
      { name: "Home / Overview", href: "/", icon: Home },
      { name: "Code Explorer", href: "/explore", icon: FolderTree },
      { name: "Search & Symbols", href: "/search", icon: Search },
      { name: "Architecture & 3D Map", href: "/architecture", icon: Cpu },
      { name: "Saved Workspaces", href: "/history", icon: FolderArchive }
    ]
  },
  {
    title: "Intelligence",
    items: [
      { name: "Code Assistant", href: "/assistant", icon: Bot, badge: "Ollama" },
      { name: "Bug Investigation", href: "/debugging", icon: Bug },
      { name: "Patch Review", href: "/patches", icon: GitPullRequest }
    ]
  },
  {
    title: "Configuration",
    items: [
      { name: "Local AI (Ollama)", href: "/settings/ai", icon: Activity },
      { name: "Settings & Token", href: "/settings", icon: SettingsIcon },
      { name: "Documentation", href: "/docs", icon: BookOpen }
    ]
  }
];

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Handle body scroll lock & Escape key listener
  useEffect(() => {
    if (!drawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
      } else if (e.key === "Tab" && drawerRef.current) {
        // Focus trap
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen]);

  return (
    <>
      <header className="h-14 bg-theme-surface border-b border-theme-border px-3 sm:px-4 flex items-center justify-between shrink-0 select-none shadow-xs">
        {/* MOBILE VIEW: Hamburger button + Section name */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 rounded-lg text-theme-text hover:bg-theme-surface-alt transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5 text-theme-text" />
          </button>

          <Link href="/" className="flex items-center gap-1.5 font-mono text-xs font-semibold text-theme-text">
            <FourDots size="xs" />
            <span className="truncate max-w-[120px]">{section.name}</span>
          </Link>
        </div>

        {/* DESKTOP VIEW: Navigation Directions, Back/Home buttons & Repository Context */}
        <div className="hidden md:flex items-center gap-3">
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

        {/* Global Actions: Theme Switcher & Status Badges */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Theme Switcher Segmented Control (Always reachable on mobile & desktop) */}
          <ThemeSwitcher size="sm" />

          {/* Local AI Status Pill (Desktop/Tablet) */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-theme-surface-alt border border-theme-border text-[11px] font-mono">
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

          {/* Saved Workspaces Link (Desktop/Tablet) */}
          <Link
            href="/history"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-theme-surface-alt hover:bg-theme-surface border border-theme-border text-xs font-mono transition-colors text-theme-text-muted hover:text-theme-text"
            title="View saved workspaces & investigation history"
          >
            <FolderArchive className="w-3.5 h-3.5 text-theme-blue" />
            <span>Workspaces</span>
          </Link>

          {/* GitHub API Rate Limit & Auth status (Desktop/Tablet) */}
          <Link
            href="/settings"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-theme-surface-alt hover:bg-theme-surface border border-theme-border text-[11px] font-mono transition-colors text-theme-text-muted hover:text-theme-text"
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
              className="hidden sm:inline-flex"
            >
              Switch
            </Button>
          )}
        </div>
      </header>

      {/* ACCESSIBLE MOBILE DRAWER (Slide-out navigation menu for mobile) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true" aria-label="Mobile navigation menu">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            ref={drawerRef}
            className="relative w-[300px] max-w-[85vw] h-full bg-theme-surface border-r border-theme-border flex flex-col shadow-2xl z-10 pt-safe pb-safe"
          >
            {/* Drawer Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-theme-border shrink-0">
              <Link
                href="/"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2"
              >
                <div className="w-7 h-7 rounded-lg bg-theme-blue-surface border border-theme-blue/30 flex items-center justify-center text-theme-blue">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm tracking-tight text-theme-text font-sans">
                    RepoPilot
                  </span>
                  <span className="text-[10px] text-theme-text-muted font-mono">
                    Mobile Navigation
                  </span>
                </div>
              </Link>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-alt transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Repo Context in Drawer */}
            {currentRepo ? (
              <div className="p-3 mx-3 mt-3 rounded-lg bg-theme-surface-alt border border-theme-border text-xs font-mono space-y-1.5 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-theme-text-subtle text-[11px]">Active Repository</span>
                  <button
                    onClick={() => {
                      setDrawerOpen(false);
                      onOpenImport?.();
                    }}
                    className="text-theme-blue hover:text-theme-blue-hover text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Switch</span>
                  </button>
                </div>
                <div className="font-semibold text-theme-text truncate">
                  {currentRepo.owner}/{currentRepo.repo}
                </div>
                <div className="flex items-center gap-2 text-theme-text-muted text-[11px]">
                  <GitBranch className="w-3 h-3 text-theme-blue" />
                  <span>{currentRepo.defaultBranch || "main"}</span>
                  {currentRepo.commitSha && (
                    <span className="text-theme-text-subtle">
                      ({currentRepo.commitSha.slice(0, 7)})
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 mx-3 mt-3 rounded-lg bg-theme-surface-alt border border-theme-border text-xs font-mono space-y-2 shrink-0">
                <span className="text-theme-text-muted text-[11px]">No repository connected</span>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenImport?.();
                  }}
                >
                  Connect Repository
                </Button>
              </div>
            )}

            {/* Navigation Sections */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
              {DRAWER_NAV_SECTIONS.map((sec, secIdx) => (
                <div key={secIdx}>
                  <div className="px-2 pb-1.5 text-[10.5px] font-mono tracking-wider text-theme-text-subtle uppercase font-semibold">
                    {sec.title}
                  </div>
                  <div className="space-y-1">
                    {sec.items.map((item) => {
                      const isActive =
                        item.href === "/"
                          ? pathname === "/"
                          : pathname.startsWith(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setDrawerOpen(false)}
                          className={`flex items-center justify-between px-3 min-h-[44px] text-xs font-mono rounded-lg transition-colors ${
                            isActive
                              ? "bg-theme-blue-surface text-theme-blue font-semibold border-l-3 border-theme-blue"
                              : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-alt"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isActive ? "text-theme-blue" : "text-theme-text-subtle"}`} />
                            <span>{item.name}</span>
                          </div>
                          {"badge" in item && item.badge && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-theme-surface-alt text-theme-text-muted border border-theme-border">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-theme-border bg-theme-surface shrink-0 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-theme-text-muted">Theme</span>
                <ThemeSwitcher size="sm" showLabels />
              </div>
              <div className="flex items-center justify-between text-[11px] text-theme-text-muted font-mono pt-1 border-t border-theme-border">
                <div className="flex items-center gap-1.5">
                  <FourDots size="xs" />
                  <span>RepoPilot v1.0</span>
                </div>
                <span className="text-theme-green-text font-medium">FOSS Local Engine</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
