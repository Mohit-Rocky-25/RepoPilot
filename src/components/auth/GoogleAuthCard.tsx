"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import {
  CheckCircle,
  LogOut,
  User,
  ShieldCheck
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";

const GoogleAuthCardInner: React.FC = () => {
  const { user, signOut, loading } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Card className="p-5 space-y-4 bg-theme-surface border border-theme-border rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-theme-border">
        <div className="flex items-center gap-2.5">
          {/* Official Google G Logo */}
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
              Sync your drafts, architecture bookmarks, and workspace investigations.
            </p>
          </div>
        </div>

        <div>
          {loading ? (
            <Badge variant="neutral" size="sm">
              Checking...
            </Badge>
          ) : user ? (
            <Badge variant="success" size="sm">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              Sign-in Available
            </Badge>
          )}
        </div>
      </div>

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
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-theme-green-surface text-theme-green border border-theme-green/30">
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
            disabled={loggingOut}
            className="flex items-center gap-1.5 text-xs text-theme-text-muted hover:text-theme-red"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{loggingOut ? "Signing Out..." : "Sign Out"}</span>
          </Button>
        </div>
      ) : (
        /* Unauthenticated State */
        <div className="space-y-4">
          <p className="text-xs text-theme-text-muted leading-relaxed">
            Sign in with your Google account to maintain user-specific repository history, custom bookmarks, and workplace drafts across devices.
          </p>
          <div>
            <Link
              href="/login?returnUrl=/settings"
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-theme-surface hover:bg-theme-surface-alt border border-theme-border hover:border-theme-blue/50 text-theme-text font-medium text-xs shadow-xs transition-all cursor-pointer group"
            >
              <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none">
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
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
};

export const GoogleAuthCard: React.FC = () => {
  return (
    <Suspense
      fallback={
        <Card className="p-6 bg-theme-surface border-theme-border shadow-xs animate-pulse">
          <div className="h-24 bg-theme-surface-alt rounded-lg" />
        </Card>
      }
    >
      <GoogleAuthCardInner />
    </Suspense>
  );
};
