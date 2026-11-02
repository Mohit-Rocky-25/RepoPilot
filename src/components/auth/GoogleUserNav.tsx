"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  FolderArchive,
  Settings as SettingsIcon,
  ChevronDown,
  Sparkles,
  User,
  CheckCircle2
} from "lucide-react";
import type { GoogleUser } from "@/lib/googleAuth";
import { useWorkspace } from "@/context/WorkspaceContext";

export interface GoogleUserNavProps {
  size?: "sm" | "md";
  className?: string;
}

export const GoogleUserNav: React.FC<GoogleUserNavProps> = ({
  size = "md",
  className = ""
}) => {
  const pathname = usePathname();
  const { snapshots } = useWorkspace();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Synchronously initialize user from sessionStorage to eliminate any loading flash
  const [user, setUser] = useState<GoogleUser | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("REPOPILOT_GOOGLE_USER");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return null;
  });

  // Verify server-side session in background without hiding the button
  const verifySession = async () => {
    try {
      const res = await fetch("/api/auth/google/session");
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
        try {
          sessionStorage.setItem("REPOPILOT_GOOGLE_USER", JSON.stringify(data.user));
        } catch {}
      } else {
        setUser(null);
        try {
          sessionStorage.removeItem("REPOPILOT_GOOGLE_USER");
        } catch {}
      }
    } catch {
      // Fallback to existing client state
    }
  };

  useEffect(() => {
    verifySession();
  }, []);

  // Close dropdown on click outside or route change
  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/google/logout", { method: "POST" });
      try {
        sessionStorage.removeItem("REPOPILOT_GOOGLE_USER");
      } catch {}
      setUser(null);
      setDropdownOpen(false);
      window.location.reload();
    } catch {
      // Logout failure fallback
    }
  };

  const loginUrl = `/api/auth/google/login?returnUrl=${encodeURIComponent(pathname || "/")}`;

  // 1. SIGNED OUT: Official Google Sign-In Link (takes user directly to Google OAuth)
  if (!user) {
    return (
      <a
        href={loginUrl}
        title="Sign in with your Google Account"
        className={`inline-flex items-center gap-2 rounded-lg font-medium text-xs select-none transition-all duration-200 cursor-pointer shadow-xs border bg-theme-surface hover:bg-theme-surface-alt border-theme-border hover:border-theme-blue/50 hover:shadow-sm group shrink-0 ${
          size === "sm" ? "px-2.5 py-1.5" : "px-3 py-1.5"
        } ${className}`}
      >
        {/* Google 4-Color "G" Emblem */}
        <div className="w-4 h-4 shrink-0 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none">
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

        {/* Text */}
        <span className="text-theme-text group-hover:text-theme-blue transition-colors font-medium">
          <span className="hidden sm:inline">Sign in with </span>Google
        </span>
      </a>
    );
  }

  // 2. SIGNED IN: User Profile Avatar Pill + Interactive Dropdown Menu
  const firstName = user.givenName || user.name.split(" ")[0];

  return (
    <div className={`relative inline-block text-left shrink-0 ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-theme-surface hover:bg-theme-surface-alt border border-theme-border hover:border-theme-blue/40 transition-all cursor-pointer shadow-xs group"
      >
        {/* User Avatar with Online Dot */}
        <div className="relative w-6 h-6 shrink-0">
          {user.picture ? (
            <img
              src={user.picture}
              alt={user.name}
              className="w-6 h-6 rounded-full border border-theme-border object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-theme-blue-surface border border-theme-blue/30 text-theme-blue font-bold text-[10px] flex items-center justify-center">
              {firstName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-theme-green border border-theme-surface" />
        </div>

        {/* First Name & Down Chevron */}
        <span className="text-xs font-medium text-theme-text group-hover:text-theme-blue transition-colors max-w-[90px] truncate hidden sm:inline">
          {firstName}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-theme-text-muted transition-transform duration-200 ${
            dropdownOpen ? "rotate-180 text-theme-blue" : ""
          }`}
        />
      </button>

      {/* Floating Profile Dropdown */}
      {dropdownOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-64 rounded-xl bg-theme-surface border border-theme-border shadow-card z-50 p-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* User Profile Header */}
          <div className="p-2.5 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center gap-3">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-9 h-9 rounded-full border border-theme-border object-cover shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-theme-blue-surface border border-theme-blue/30 text-theme-blue font-bold text-xs flex items-center justify-center shrink-0">
                {firstName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-theme-text truncate">{user.name}</span>
                <span title="Google Verified">
                  <CheckCircle2 className="w-3 h-3 text-theme-blue shrink-0" />
                </span>
              </div>
              <span className="text-[11px] text-theme-text-muted truncate block">{user.email}</span>
            </div>
          </div>

          {/* Quick Menu Options */}
          <div className="py-1 space-y-0.5 text-xs font-mono">
            <Link
              href="/workplace"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-theme-surface-alt text-theme-text hover:text-theme-blue transition-colors group"
            >
              <div className="flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-theme-blue" />
                <span className="font-sans font-medium">My Workplace &amp; Drafts</span>
              </div>
              {snapshots.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-theme-blue-surface text-theme-blue border border-theme-blue/30">
                  {snapshots.length}
                </span>
              )}
            </Link>

            <Link
              href="/settings"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-theme-surface-alt text-theme-text hover:text-theme-blue transition-colors"
            >
              <SettingsIcon className="w-4 h-4 text-theme-text-muted" />
              <span className="font-sans font-medium">Settings &amp; Token</span>
            </Link>
          </div>

          <div className="border-t border-theme-border pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-theme-red-surface text-theme-text-muted hover:text-theme-red transition-colors text-xs font-medium cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
