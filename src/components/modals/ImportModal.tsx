"use client";

import React, { useState, useRef } from "react";
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
  FileCode,
  Loader2
} from "lucide-react";
import { GitHubUrlSchema } from "@repopilot/core";
import { useRepository } from "@/context/RepositoryContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
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

  const folderInputRef = useRef<HTMLInputElement>(null);

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

      // Save repository metadata and in-memory files
      saveRecentRepo(result.repository);
      setFiles(result.files);

      setIsImportModalOpen(false);
      router.push("/explore");
    } catch (err: any) {
      setError(err.message || "Failed to parse local directory files.");
    } finally {
      setLoading(false);
      setIngestionProgress(null);
    }
  };

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFolderFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-[#0F1011] border border-[#23252A] rounded-xl shadow-[0_16px_70px_rgba(0,0,0,0.85)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#23252A] bg-[#141516]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center text-[#828FFF]">
              {activeTab === "github" ? <Github className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F7F8F8] tracking-tight">
                {activeTab === "github" ? "Import Public GitHub Repository" : "Open Local Project Folder"}
              </h3>
              <p className="text-xs text-[#8A8F98]">
                {activeTab === "github"
                  ? "Deterministic AST symbols, 3D architecture, and evidence analysis."
                  : "100% In-Browser. No code leaves your machine. Completely private."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsImportModalOpen(false)}
            className="text-[#8A8F98] hover:text-[#F7F8F8] p-1.5 rounded-md hover:bg-[#18191A] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#23252A] bg-[#121314]/50 px-6 pt-2">
          <button
            onClick={() => {
              setActiveTab("github");
              setError(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "github"
                ? "border-[#5E6AD2] text-[#F7F8F8] bg-[#18191B]/40"
                : "border-transparent text-[#8A8F98] hover:text-[#D0D6E0]"
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
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "local"
                ? "border-[#5E6AD2] text-[#F7F8F8] bg-[#18191B]/40"
                : "border-transparent text-[#8A8F98] hover:text-[#D0D6E0]"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#5E6AD2]" />
            <span>Local Folder (Private)</span>
            <Badge variant="success" size="sm" className="text-[9px] py-0">Client-Only</Badge>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {activeTab === "github" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (url.trim()) handleImportGitHub(url.trim());
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-mono font-medium text-[#D0D6E0] mb-1.5">
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
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/20 border border-red-900/40 text-[#EF4444] text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{error}</div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={loading}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  {loading ? "Resolving & Indexing..." : "Import Repository"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Local Folder Upload Area */}
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
                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  isDragging
                    ? "border-[#5E6AD2] bg-[#5E6AD2]/10 scale-[1.01]"
                    : "border-[#2A2C32] hover:border-[#424650] bg-[#141516]/60 hover:bg-[#18191B]"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center text-[#828FFF] mb-3 shadow-[0_0_20px_rgba(94,106,210,0.2)]">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-[#828FFF]" />
                  ) : (
                    <UploadCloud className="w-6 h-6" />
                  )}
                </div>

                <div className="text-center space-y-1">
                  <span className="text-xs font-semibold text-[#F7F8F8] block font-mono">
                    {loading
                      ? "Reading & Parsing Files Locally..."
                      : "Drag & drop a local project directory here"}
                  </span>
                  <span className="text-[11px] text-[#8A8F98] block">
                    or click to choose folder via browser file selector
                  </span>
                </div>

                {ingestionProgress && (
                  <div className="mt-4 w-full max-w-xs space-y-1.5 text-center">
                    <div className="flex justify-between text-[11px] font-mono text-[#8A8F98]">
                      <span className="truncate max-w-[200px] text-left">{ingestionProgress.currentFile}</span>
                      <span>{ingestionProgress.processed} / {ingestionProgress.totalDiscovered}</span>
                    </div>
                    <div className="w-full bg-[#23252A] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#5E6AD2] h-full transition-all duration-150"
                        style={{
                          width: `${(ingestionProgress.processed / ingestionProgress.totalDiscovered) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Privacy Guarantee Pill */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#141516] border border-[#23252A] text-xs font-mono text-[#8A8F98]">
                <ShieldCheck className="w-4 h-4 text-[#27A644] shrink-0" />
                <span className="text-[11px] leading-relaxed">
                  <strong className="text-[#F7F8F8]">100% Client-Side Privacy:</strong> Code is indexed in browser memory. Automatically ignores <code className="text-[#828FFF]">node_modules</code>, <code className="text-[#828FFF]">.git</code>, build artifacts, and binary assets.
                </span>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/20 border border-red-900/40 text-[#EF4444] text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{error}</div>
                </div>
              )}
            </div>
          )}

          {/* Recently Loaded Repositories */}
          {recentRepos && recentRepos.length > 0 ? (
            <div className="pt-4 border-t border-[#23252A]">
              <span className="text-[11px] font-mono text-[#8A8F98] uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-[#5E6AD2]" />
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
                        setUrl(item.url);
                        setActiveTab("github");
                        handleImportGitHub(item.url);
                      }
                    }}
                    disabled={loading}
                    className="flex flex-col text-left p-3 rounded-lg bg-[#141516] hover:bg-[#18191A] border border-[#23252A] hover:border-[#34343A] transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-mono font-medium text-[#F7F8F8] group-hover:text-[#828FFF] truncate flex items-center gap-1.5">
                        {item.isLocal ? <FolderOpen className="w-3 h-3 text-[#5E6AD2]" /> : <Github className="w-3 h-3 text-[#8A8F98]" />}
                        {item.fullName}
                      </span>
                      {item.isLocal ? (
                        <Badge variant="success" size="sm">Local</Badge>
                      ) : item.primaryLanguage ? (
                        <Badge variant="primary" size="sm">
                          {item.primaryLanguage}
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-[#8A8F98] truncate mt-1">
                      {item.description || "No description provided"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-[#23252A] text-xs font-mono text-[#8A8F98] space-y-1.5">
              <span className="font-semibold text-[#D0D6E0] block">Requirements:</span>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-[#8A8F98]">
                <li>GitHub repositories must be publicly accessible or use PAT in Settings.</li>
                <li>Local folder parsing requires modern browser folder drag-and-drop or picker support.</li>
                <li>Zero server upload on local workspaces: 100% ephemeral in-memory execution.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-[#141516] border-t border-[#23252A] text-[11px] text-[#62666D] font-mono flex items-center justify-between">
          <span>{activeTab === "github" ? "GitHub REST API · Rate Limit Aware" : "Native Browser FileSystem API"}</span>
          <span className="text-[#828FFF] font-medium">100% Client-Side Ready</span>
        </div>
      </div>
    </div>
  );
};
