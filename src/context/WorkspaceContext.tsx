"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  WorkspaceSnapshot,
  getAllSnapshots,
  saveSnapshot as persistSnapshot,
  deleteSnapshot as removeSnapshot,
  exportSnapshotAsMarkdown,
  syncWithCloud
} from "@/lib/workspaceStore";
import type { AuthUser } from "@/lib/auth";
import { useRepository } from "./RepositoryContext";

interface WorkspaceContextType {
  snapshots: WorkspaceSnapshot[];
  loading: boolean;
  user: AuthUser | null;
  authLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  isGoogleConfigured: boolean;
  refreshSnapshots: () => Promise<void>;
  syncNow: () => Promise<void>;
  loginWithGoogle: (returnTo?: string) => void;
  loginDemo: (email?: string, name?: string) => void;
  logout: () => Promise<void>;
  saveCurrentSession: (params: {
    title: string;
    tags?: string[];
    notes?: string;
    activeFile?: string;
    activeLine?: number;
    pinnedFiles?: string[];
  }) => Promise<WorkspaceSnapshot | null>;
  resumeSnapshot: (id: string) => Promise<string>;
  deleteSnapshot: (id: string) => Promise<void>;
  downloadSnapshotMarkdown: (id: string) => void;
  downloadSnapshotJson: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { currentRepo, setCurrentRepo, saveRecentRepo, activeInvestigation, setActiveInvestigation } = useRepository();
  const [snapshots, setSnapshots] = useState<WorkspaceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // Authentication & Cloud Sync State
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isGoogleConfigured, setIsGoogleConfigured] = useState(false);

  const refreshSnapshots = useCallback(async () => {
    try {
      const items = await getAllSnapshots();
      setSnapshots(items);
    } catch (err) {
      console.warn("Could not load snapshots:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch authenticated session
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
        setIsGoogleConfigured(Boolean(data.isGoogleConfigured));
      }
    } catch (err) {
      console.warn("Failed to check auth session:", err);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Synchronize snapshots with cloud
  const syncNow = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncWithCloud();
      if (result.success) {
        setLastSyncedAt(result.lastSyncTime);
        await refreshSnapshots();
      }
    } catch (err) {
      console.warn("Cloud sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshSnapshots]);

  useEffect(() => {
    refreshSnapshots();
    checkSession();
  }, [refreshSnapshots, checkSession]);

  // When user signs in, trigger automatic cloud sync
  useEffect(() => {
    if (user) {
      syncNow();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loginWithGoogle = (returnTo = "/history") => {
    window.location.href = `/api/auth/google/login?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const loginDemo = (email = "developer@repopilot.local", name = "RepoPilot Developer") => {
    window.location.href = `/api/auth/google/demo?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&returnTo=${encodeURIComponent(window.location.pathname)}`;
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.refresh();
    } catch (err) {
      console.warn("Logout failed:", err);
    }
  };

  const saveCurrentSession = async ({
    title,
    tags = [],
    notes = "",
    activeFile,
    activeLine,
    pinnedFiles = []
  }: {
    title: string;
    tags?: string[];
    notes?: string;
    activeFile?: string;
    activeLine?: number;
    pinnedFiles?: string[];
  }): Promise<WorkspaceSnapshot | null> => {
    if (!currentRepo) return null;

    // Retrieve assistant history if stored in session / local storage
    let assistantMessages: any[] = [];
    try {
      const storedChat = localStorage.getItem(`REPOPILOT_CHAT_${currentRepo.fullName}`);
      if (storedChat) {
        assistantMessages = JSON.parse(storedChat);
      }
    } catch {}

    const newSnapshot: WorkspaceSnapshot = {
      id: "ws_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7),
      title: title.trim() || `${currentRepo.fullName} Investigation`,
      repoFullName: currentRepo.fullName,
      owner: currentRepo.owner,
      repo: currentRepo.repo,
      commitSha: currentRepo.selectedRevision || (currentRepo as any).commitSha || "HEAD",
      defaultBranch: currentRepo.defaultBranch || "main",
      isLocal: currentRepo.isLocal || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: tags.map((t) => t.trim().replace(/^#/, "")).filter(Boolean),
      notes: notes.trim(),
      pinnedFiles: activeFile && !pinnedFiles.includes(activeFile) ? [activeFile, ...pinnedFiles] : pinnedFiles,
      activeFile,
      activeLine,
      assistantMessages,
      debuggingState: activeInvestigation
        ? {
            stackTrace: activeInvestigation.stackTrace || "",
            parsedFrames: activeInvestigation.parsedTrace || [],
            selectedHypothesisId: activeInvestigation.hypotheses?.[0]?.id,
            candidateDiff: activeInvestigation.candidatePatch?.diff || (typeof (activeInvestigation.candidatePatch as any) === "string" ? (activeInvestigation.candidatePatch as any) : undefined)
          }
        : undefined
    };

    await persistSnapshot(newSnapshot);
    await refreshSnapshots();

    // If signed in, sync immediately to cloud in background
    if (user) {
      syncWithCloud().then((res) => {
        if (res.success) setLastSyncedAt(res.lastSyncTime);
      }).catch(() => {});
    }

    return newSnapshot;
  };

  const resumeSnapshot = async (id: string): Promise<string> => {
    const target = snapshots.find((s) => s.id === id);
    if (!target) throw new Error("Workspace snapshot not found");

    const repoRef = {
      owner: target.owner,
      repo: target.repo,
      fullName: target.repoFullName,
      url: target.isLocal ? `local://${target.repoFullName}` : `https://github.com/${target.repoFullName}`,
      defaultBranch: target.defaultBranch,
      selectedRevision: target.commitSha,
      isLocal: target.isLocal || false,
    };

    saveRecentRepo(repoRef);
    setCurrentRepo(repoRef);

    // Restore assistant history if present
    if (target.assistantMessages && target.assistantMessages.length > 0) {
      try {
        localStorage.setItem(
          `REPOPILOT_CHAT_${target.repoFullName}`,
          JSON.stringify(target.assistantMessages)
        );
      } catch {}
    }

    // Restore debugging investigation if present
    if (target.debuggingState) {
      setActiveInvestigation({
        id: target.id,
        repoKey: target.repoFullName,
        commitSha: target.commitSha,
        title: target.title,
        description: target.notes || "",
        stackTrace: target.debuggingState.stackTrace,
        parsedTrace: target.debuggingState.parsedFrames,
        hypotheses: [],
        candidatePatch: target.debuggingState.candidateDiff
          ? {
              filePath: target.activeFile || "src/index.ts",
              diff: target.debuggingState.candidateDiff,
              rationale: "Restored from workspace snapshot"
            }
          : undefined,
        suggestedTests: [],
        reproducibleReport: "",
        createdAt: target.createdAt
      });
    }

    // Determine target route: If active file exists, go to explore; else assistant or explore
    if (target.activeFile) {
      const url = `/explore?owner=${target.owner}&repo=${target.repo}&file=${encodeURIComponent(target.activeFile)}${target.activeLine ? `&line=${target.activeLine}` : ""}`;
      router.push(url);
      return url;
    }

    const defaultUrl = `/explore?owner=${target.owner}&repo=${target.repo}`;
    router.push(defaultUrl);
    return defaultUrl;
  };

  const deleteSnapshot = async (id: string): Promise<void> => {
    await removeSnapshot(id);
    await refreshSnapshots();

    // If user is authenticated, remove from cloud in background
    if (user) {
      fetch(`/api/workspaces?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    }
  };

  const downloadSnapshotMarkdown = (id: string): void => {
    const target = snapshots.find((s) => s.id === id);
    if (!target) return;
    const md = exportSnapshotAsMarkdown(target);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${target.repo}_investigation_${target.commitSha.slice(0, 7)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSnapshotJson = (id: string): void => {
    const target = snapshots.find((s) => s.id === id);
    if (!target) return;
    const jsonStr = JSON.stringify(target, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${target.repo}_snapshot_${target.commitSha.slice(0, 7)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        snapshots,
        loading,
        user,
        authLoading,
        isSyncing,
        lastSyncedAt,
        isGoogleConfigured,
        refreshSnapshots,
        syncNow,
        loginWithGoogle,
        loginDemo,
        logout,
        saveCurrentSession,
        resumeSnapshot,
        deleteSnapshot,
        downloadSnapshotMarkdown,
        downloadSnapshotJson
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};
