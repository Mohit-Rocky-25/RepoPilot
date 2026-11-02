"use client";

import React from "react";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomTabBar } from "./BottomTabBar";
import { ImportModal } from "@/components/modals/ImportModal";
import { TopColorBar } from "@/components/ui/signature/TopColorBar";
import { FourDots } from "@/components/ui/signature/FourDots";
import { RepoPilotLogo } from "@/components/ui/RepoPilotLogo";
import { GoogleUserNav } from "@/components/auth/GoogleUserNav";
import { Button } from "@/components/ui/Button";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { useRepository } from "@/context/RepositoryContext";
import { usePathname } from "next/navigation";

export const ShellLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";
  const {
    currentRepo,
    setIsImportModalOpen,
    rateLimit,
    aiConfig,
    authStatus
  } = useRepository();

  if (isLandingPage) {
    return (
      <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-theme-bg text-theme-text font-sans antialiased selection:bg-theme-blue/20 selection:text-theme-blue flex flex-col pt-safe pb-safe">
        <TopColorBar />
        {/* Landing Top Navigation Bar */}
        <header className="h-14 bg-theme-surface border-b border-theme-border px-4 sm:px-6 flex items-center justify-between shrink-0 select-none shadow-xs">
          <div className="flex items-center gap-3">
            <Link href="/" className="min-h-[44px] flex items-center gap-2.5 py-2 group cursor-pointer">
              <RepoPilotLogo size={22} variant="mark" withGlow />
              <span className="font-bold text-sm tracking-tight text-theme-text font-mono group-hover:text-theme-blue transition-colors">
                RepoPilot
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1 ml-4 text-xs font-mono text-theme-text-muted">
              <Link href="/workplace" className="px-2.5 py-1 rounded hover:text-theme-text hover:bg-theme-surface-alt transition-colors">
                My Workplace
              </Link>
              <Link href="/explore" className="px-2.5 py-1 rounded hover:text-theme-text hover:bg-theme-surface-alt transition-colors">
                Explorer
              </Link>
              <Link href="/architecture" className="px-2.5 py-1 rounded hover:text-theme-text hover:bg-theme-surface-alt transition-colors">
                Architecture
              </Link>
              <Link href="/docs" className="px-2.5 py-1 rounded hover:text-theme-text hover:bg-theme-surface-alt transition-colors">
                Docs
              </Link>
              <Link href="/settings" className="px-2.5 py-1 rounded hover:text-theme-text hover:bg-theme-surface-alt transition-colors">
                Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <GoogleUserNav size="sm" />
            <ThemeSwitcher size="sm" />
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
            >
              Connect Repo
            </Button>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
        <ImportModal />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] min-h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-theme-bg text-theme-text font-sans antialiased selection:bg-theme-blue/20 selection:text-theme-blue pt-safe">
      {/* Signature Top 4-Color Bar */}
      <TopColorBar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Pinned Left Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-theme-bg">
          {/* Top Header */}
          <Header
            currentRepo={currentRepo}
            onOpenImport={() => setIsImportModalOpen(true)}
            rateLimit={rateLimit}
            aiStatus={aiConfig.isAvailable ? "ready" : "offline"}
            authStatus={authStatus}
          />

          {/* Dynamic Page Content */}
          <main className="flex-1 overflow-y-auto bg-theme-bg p-3 sm:p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
            <div className="max-w-[1340px] mx-auto">{children}</div>
          </main>
        </div>
      </div>

      {/* Persistent Mobile Bottom Navigation Bar */}
      <BottomTabBar />

      {/* Modals */}
      <ImportModal />
    </div>
  );
};
