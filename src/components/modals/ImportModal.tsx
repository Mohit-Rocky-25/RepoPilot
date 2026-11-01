"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Github,
  ArrowRight,
  AlertCircle,
  Clock,
  FolderOpen,
  ShieldCheck,
  UploadCloud,
  Loader2,
  Smartphone
} from "lucide-react";
import { GitHubUrlSchema } from "@repopilot/core";
import { useRepository } from "@/context/RepositoryContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { clientFetch } from "@/lib/api";
import { parseLocalFolder, LocalIngestionProgress } from "@/lib/localRepository";

export const ImportModal: React.FC = () => {
  const router = useRouter();
  const {
    isImportModalOpen,
    setIsImportModalOpen,
    saveRecentRepo,
    setRateLimit,
    recentRepos,
    setFiles
  } = useRepository();

  const [activeTab, setActiveTab] = useState<"github" | "local">("github");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [ingestionProgress, setIngestionProgress] = useState<LocalIngestionProgress | null>(null);
  const [supportsFolderPicker, setSupportsFolderPicker] = useState<boolean>(true);

  const folderInputRef = useRef<HTMLInputElement>(null);

  // Feature detection for mobile folder picker & Escape key handler
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const hasWebkit = "webkitdirectory" in document.createElement("input");
      setSupportsFolderPicker(!isMobile && hasWebkit);
    }
  }, []);

  useEffect(() => {
    if (!isImportModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsImportModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isImportModalOpen, setIsImportModalOpen]);

  if (!isImportModalOpen) return null;

  const handleImportGitHub = async (repoUrl: string) => {
    setError(null);
    try {
      const parsedUrl = GitHubUrlSchema.parse(repoUrl);
      setLoading(true);

      const res = await clientFetch("/api/github/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: parsedUrl })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to import repository from GitHub");
      }

      if (data.rateLimit) {
        setRateLimit(data.rateLimit);
      }

      saveRecentRepo(data.repository);
      if (data.tree) {
        setFiles(data.tree);
      }
      setIsImportModalOpen(false);
      setUrl("");
      router.push("/explore");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during import");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessFolderFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setError(null);
    setLoading(true);
    setIngestionProgress(null);

    try {
      const result = await parseLocalFolder(files, (progress) => {
        setIngestionProgress(progress);
      });

      saveRecentRepo(result.repository);
      setFiles(result.files);

      setIsImportModalOpen(false);
      router.push("/explore");
    } catch (err: any) {
      setError(err.message || "Failed to parse local directory files.");
    } finally {
      setLoading(false);
    }
  };

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleProcessFolderFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleProcessFolderFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Connect repository modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-theme-surface border-t sm:border border-theme-border rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 max-h-[92dvh] overflow-y-auto pb-safe sm:pb-0">
        {/* Mobile drag indicator handle */}
        <div className="w-12 h-1.5 bg-theme-border rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-theme-border bg-theme-surface-alt/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-theme-blue-surface border border-theme-blue/30 flex items-center justify-center text-theme-blue">
              {activeTab === "github" ? <Github className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-theme-text tracking-tight">
                {activeTab === "github" ? "Import Public GitHub Repository" : "Open Local Project Folder"}
              </h3>
              <p className="text-xs text-theme-text-muted">
                {activeTab === "github"
                  ? "Deterministic AST symbols, 3D architecture, and evidence analysis."
                  : "100% In-Browser. No code leaves your machine. Completely private."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsImportModalOpen(false)}
            aria-label="Close modal"
            className="flex items-center justify-center min-h-[44px] min-w-[44px] text-theme-text-muted hover:text-theme-text rounded-md hover:bg-theme-surface-alt transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-theme-border bg-theme-surface-alt/30 px-4 sm:px-6 pt-1">
          <button
            onClick={() => {
              setActiveTab("github");
              setError(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "github"
                ? "border-theme-blue text-theme-text bg-theme-surface"
                : "border-transparent text-theme-text-muted hover:text-theme-text"
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Repository</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("local");
              setError(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "local"
                ? "border-theme-blue text-theme-text bg-theme-surface"
                : "border-transparent text-theme-text-muted hover:text-theme-text"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Local Directory</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {activeTab === "github" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (url.trim()) handleImportGitHub(url.trim());
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-mono font-medium text-theme-text mb-1.5">
                  GitHub Repository URL
                </label>
                <Input
                  type="text"
                  placeholder="https://github.com/owner/repository"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError(null);
                  }}
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-theme-danger-surface border border-theme-red/20 text-theme-danger-text text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{error}</div>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={loading}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="w-full sm:w-auto"
                >
                  {loading ? "Resolving & Indexing..." : "Import Repository"}
                </Button>
              </div>
            </form>
          ) : !supportsFolderPicker ? (
            /* Graceful Fallback for Mobile Devices lacking Directory Picker */
            <div className="p-5 rounded-xl bg-theme-surface-alt border border-theme-border text-center space-y-3 font-mono text-xs">
              <div className="w-10 h-10 rounded-full bg-theme-warning-surface border border-theme-yellow/30 flex items-center justify-center text-theme-warning-text mx-auto">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-theme-text text-sm">
                  Local Folder Picker Unavailable on Mobile
                </h4>
                <p className="text-theme-text-muted text-[11px] leading-relaxed max-w-sm mx-auto">
                  Mobile browsers (including iOS Safari and Android Chrome) restrict web applications from picking entire directory trees from local storage.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto"
                  onClick={() => setActiveTab("github")}
                >
                  Inspect via GitHub URL Instead
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="file"
                ref={folderInputRef}
                onChange={handleFolderInput}
                className="hidden"
                // @ts-ignore
                webkitdirectory=""
                directory=""
                multiple
              />

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => folderInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  isDragging
                    ? "border-theme-blue bg-theme-blue/5 scale-[1.01]"
                    : "border-theme-border hover:border-theme-blue bg-theme-surface-alt/40 hover:bg-theme-surface-alt"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-theme-blue-surface border border-theme-blue/30 flex items-center justify-center text-theme-blue mb-3 shadow-xs">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-theme-blue" />
                  ) : (
                    <UploadCloud className="w-6 h-6" />
                  )}
                </div>

                <div className="text-center space-y-1">
                  <span className="text-xs font-semibold text-theme-text block font-mono">
                    {loading
                      ? "Reading & Parsing Files Locally..."
                      : "Drag & drop a local project directory here"}
                  </span>
                  <span className="text-[11px] text-theme-text-muted block">
                    or click to choose folder via browser file selector
                  </span>
                </div>

                {ingestionProgress && (
                  <div className="mt-4 w-full max-w-xs space-y-1.5 text-center">
                    <div className="flex justify-between text-[11px] font-mono text-theme-text-muted">
                      <span className="truncate max-w-[200px] text-left">{ingestionProgress.currentFile}</span>
                      <span>{ingestionProgress.processed} / {ingestionProgress.totalDiscovered}</span>
                    </div>
                    <div className="w-full bg-theme-surface-alt rounded-full h-1.5 overflow-hidden border border-theme-border">
                      <div
                        className="bg-theme-blue h-full transition-all duration-150"
                        style={{
                          width: `${(ingestionProgress.processed / ingestionProgress.totalDiscovered) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Privacy Guarantee Pill */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-theme-surface-alt border border-theme-border text-xs font-mono text-theme-text-muted">
                <ShieldCheck className="w-4 h-4 text-theme-green shrink-0" />
                <span className="text-[11px] leading-relaxed">
                  <strong className="text-theme-text">100% Client-Side Privacy:</strong> Code is indexed in browser memory. Automatically ignores <code className="text-theme-blue">node_modules</code>, <code className="text-theme-blue">.git</code>, build artifacts, and binary assets.
                </span>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-theme-danger-surface border border-theme-red/20 text-theme-danger-text text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{error}</div>
                </div>
              )}
            </div>
          )}

          {/* Recently Loaded Repositories */}
          {recentRepos && recentRepos.length > 0 ? (
            <div className="pt-3 border-t border-theme-border">
              <span className="text-[11px] font-mono text-theme-text-muted uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-theme-blue" />
                <span>Recently Loaded Repositories ({recentRepos.length})</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recentRepos.slice(0, 4).map((item) => (
                  <button
                    key={item.fullName}
                    onClick={() => {
                      if (item.isLocal) {
                        saveRecentRepo(item);
                        setIsImportModalOpen(false);
                        router.push("/explore");
                      } else {
                        handleImportGitHub(item.url);
                      }
                    }}
                    className="flex items-center justify-between p-2.5 min-h-[44px] rounded-lg bg-theme-surface-alt hover:bg-theme-surface border border-theme-border hover:border-theme-blue/40 text-left transition-colors cursor-pointer group shadow-xs"
                  >
                    <div className="truncate">
                      <span className="text-xs font-mono font-medium text-theme-text group-hover:text-theme-blue truncate block">
                        {item.fullName}
                      </span>
                      <span className="text-[10px] text-theme-text-muted font-mono block">
                        {item.isLocal ? "Local Folder" : `@${item.defaultBranch || "main"}`}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-theme-text-subtle group-hover:text-theme-blue shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
