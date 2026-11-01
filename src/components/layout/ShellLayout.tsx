"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ImportModal } from "@/components/modals/ImportModal";
import { TopColorBar } from "@/components/ui/signature/TopColorBar";
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
      <div className="min-h-screen w-full bg-theme-bg text-theme-text font-sans antialiased selection:bg-theme-blue/20 selection:text-theme-blue">
        <TopColorBar />
        {children}
        <ImportModal />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-theme-bg text-theme-text font-sans antialiased selection:bg-theme-blue/20 selection:text-theme-blue">
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
          <main className="flex-1 overflow-y-auto bg-theme-bg p-6 lg:p-8">
            <div className="max-w-[1340px] mx-auto">{children}</div>
          </main>
        </div>
      </div>

      {/* Modals */}
      <ImportModal />
    </div>
  );
};
