"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ImportModal } from "@/components/modals/ImportModal";
import { SearchModal } from "@/components/modals/SearchModal";
import { useRepository } from "@/context/RepositoryContext";
import { usePathname } from "next/navigation";

export const ShellLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";
  const {
    currentRepo,
    setIsImportModalOpen,
    setIsSearchModalOpen,
    rateLimit,
    aiConfig
  } = useRepository();

  if (isLandingPage) {
    return (
      <div className="min-h-screen w-full bg-[#010102] text-[#F7F8F8] font-sans antialiased selection:bg-[#5E6AD2]/30 selection:text-[#F7F8F8]">
        {children}
        <ImportModal />
        <SearchModal />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#010102] text-[#F7F8F8] font-sans antialiased selection:bg-[#5E6AD2]/30 selection:text-[#F7F8F8]">
      {/* Pinned Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-[#010102]">
        {/* Top Header */}
        <Header
          currentRepo={currentRepo}
          onOpenImport={() => setIsImportModalOpen(true)}
          onOpenSearch={() => setIsSearchModalOpen(true)}
          rateLimit={rateLimit}
          aiStatus={aiConfig.isAvailable ? "ready" : "offline"}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#010102] p-6 lg:p-8">
          <div className="max-w-[1340px] mx-auto">{children}</div>
        </main>
      </div>

      {/* Modals */}
      <ImportModal />
      <SearchModal />
    </div>
  );
};
