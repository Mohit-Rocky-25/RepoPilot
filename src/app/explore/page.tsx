"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FolderTree,
  Folder,
  FileCode,
  ExternalLink,
  Code2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Layers,
  Search,
  FileText,
  Sparkles,
  ArrowUpRight,
  File,
  Download,
  ShieldCheck,
  Zap,
  Share2,
  Check
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { FileTree } from "@/components/explorer/FileTree";
import { CodeViewer } from "@/components/ui/CodeViewer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { RepositoryFile, IndexedSymbol } from "@repopilot/core";
import { extractSymbols, preloadGrammarForLanguage, onWasmStatusChange, type WasmState } from "@repopilot/indexer";
import { ArchitectureAnalyzer } from "@repopilot/analysis";
import { clientFetch } from "@/lib/api";
import { generateMarkdownReport, downloadMarkdownReport } from "@/lib/reportGenerator";
import { getIndexFromIndexedDB, saveIndexToIndexedDB } from "@/lib/browserIndexCache";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getParentDirectory(filePath: string): string | null {
  const parts = filePath.split("/");
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join("/");
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const fileParam = searchParams.get("file");
  const dirParam = searchParams.get("dir");
  const shaParam = searchParams.get("sha");
  const [cacheHit, setCacheHit] = useState<"indexeddb" | "server" | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [wasmState, setWasmState] = useState<WasmState>({ status: "idle", language: null });
  const initialLine = searchParams.get("line") ? parseInt(searchParams.get("line")!, 10) : undefined;
  const ownerParam = searchParams.get("owner");
  const repoParam = searchParams.get("repo");

  const { currentRepo, setCurrentRepo, files, setFiles, setIsImportModalOpen, saveRecentRepo } = useRepository();

  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(dirParam || null);
  const [viewMode, setViewMode] = useState<"code" | "directory">(dirParam && !fileParam ? "directory" : "code");
  const [fileContent, setFileContent] = useState<string>("");
  const [symbols, setSymbols] = useState<IndexedSymbol[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [loadingTree, setLoadingTree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirSearchQuery, setDirSearchQuery] = useState("");
  const [highlightRange, setHighlightRange] = useState<[number, number] | undefined>(
    initialLine ? [initialLine, initialLine] : undefined
  );
  const [activeMobileTab, setActiveMobileTab] = useState<"tree" | "code">(
    fileParam || dirParam ? "code" : "tree"
  );
  const [skippedReport, setSkippedReport] = useState<{
    totalSkipped: number;
    tooLarge: number;
    binary: number;
    ignoredDirectory: number;
    overFileCap: number;
  } | null>(null);
  const [subfolderInput, setSubfolderInput] = useState("");
  const [filteringSubfolder, setFilteringSubfolder] = useState(false);

  // If query params specify owner & repo, auto-connect if different from currentRepo
  useEffect(() => {
    if (ownerParam && repoParam) {
      if (
        !currentRepo ||
        currentRepo.owner !== ownerParam ||
        currentRepo.repo !== repoParam ||
        (shaParam && currentRepo.selectedRevision !== shaParam)
      ) {
        saveRecentRepo({
          owner: ownerParam,
          repo: repoParam,
          fullName: `${ownerParam}/${repoParam}`,
          url: `https://github.com/${ownerParam}/${repoParam}`,
          defaultBranch: "main",
          selectedRevision: shaParam || undefined,
          stars: 0,
          forks: 0,
          openIssuesCount: 0
        });
      }
    }
  }, [ownerParam, repoParam, shaParam, currentRepo, saveRecentRepo]);

  // Load tree if repo is active but files are not in memory yet
  useEffect(() => {
    if (currentRepo && !currentRepo.isLocal && files.length === 0) {
      setLoadingTree(true);
      const effectiveSha = shaParam || currentRepo.selectedRevision;

      const fetchFromApi = (shaToFetch?: string) => {
        clientFetch("/api/github/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: currentRepo.url,
            sha: shaToFetch
          })
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.tree) {
              setFiles(data.tree);
              const commitSha = data.revision?.commitSha || data.repository?.selectedRevision;
              if (commitSha) {
                saveIndexToIndexedDB(currentRepo.owner, currentRepo.repo, commitSha, {
                  repository: data.repository || currentRepo,
                  tree: data.tree,
                  skippedReport: data.skippedReport
                });
              }
            }
            if (data.repository) {
              setCurrentRepo(data.repository);
            }
            if (data.skippedReport) {
              setSkippedReport(data.skippedReport);
            }
            if (data.cached) {
              setCacheHit("server");
            }
          })
          .catch(() => setError("Failed to load file tree."))
          .finally(() => setLoadingTree(false));
      };

      if (effectiveSha) {
        getIndexFromIndexedDB(currentRepo.owner, currentRepo.repo, effectiveSha).then((cached) => {
          if (cached && cached.tree && cached.tree.length > 0) {
            setFiles(cached.tree);
            if (cached.repository) setCurrentRepo(cached.repository);
            if (cached.skippedReport) setSkippedReport(cached.skippedReport);
            setCacheHit("indexeddb");
            setLoadingTree(false);
          } else {
            fetchFromApi(effectiveSha);
          }
        });
      } else {
        fetchFromApi();
      }
    }
  }, [currentRepo, files.length, shaParam, setCurrentRepo, setFiles]);

  // Track WASM parser preloading status
  useEffect(() => {
    return onWasmStatusChange((state) => {
      setWasmState(state);
    });
  }, []);

  // Preload grammar when files arrive
  useEffect(() => {
    if (files.length > 0) {
      const languageCounts: Record<string, number> = {};
      for (const file of files) {
        if (file.language) {
          languageCounts[file.language] = (languageCounts[file.language] || 0) + 1;
        }
      }
      let topLang: string | null = null;
      let maxCount = 0;
      for (const [lang, count] of Object.entries(languageCounts)) {
        if (count > maxCount) {
          maxCount = count;
          topLang = lang;
        }
      }
      if (topLang) {
        preloadGrammarForLanguage(topLang).catch(() => {});
      }
    }
  }, [files]);

  // Handle file selection from URL query param
  useEffect(() => {
    if (fileParam && files.length > 0) {
      const targetFile = files.find((f) => f.path === fileParam);
      if (targetFile) {
        handleFileSelect(targetFile);
        if (initialLine) {
          setHighlightRange([initialLine, initialLine]);
        }
      }
    } else if (dirParam && files.length > 0 && !selectedFile) {
      setSelectedDirectory(dirParam);
      setViewMode("directory");
    } else if (files.length > 0 && !selectedFile && !selectedDirectory) {
      const readme = files.find((f) => f.path.toLowerCase().startsWith("readme"));
      if (readme) {
        handleFileSelect(readme);
      } else {
        const firstCode = files.find((f) => !f.isBinary && f.type === "blob");
        if (firstCode) handleFileSelect(firstCode);
      }
    }
  }, [fileParam, dirParam, files]);

  const handleFileSelect = async (file: RepositoryFile) => {
    setSelectedFile(file);
    const parentDir = getParentDirectory(file.path);
    if (parentDir) {
      setSelectedDirectory(parentDir);
    }
    setViewMode("code");
    setActiveMobileTab("code");
    setHighlightRange(undefined);
    setError(null);

    if (file.content) {
      setFileContent(file.content);
      extractSymbolsForFile(file.path, file.content, file.language);
      return;
    }

    if (currentRepo?.isLocal) {
      setFileContent("// Local file content is stored directly in memory.");
      return;
    }

    if (!currentRepo) return;

    setLoadingContent(true);
    try {
      const res = await clientFetch(
        `/api/github/file?owner=${encodeURIComponent(currentRepo.owner)}&repo=${encodeURIComponent(
          currentRepo.repo
        )}&path=${encodeURIComponent(file.path)}&sha=${encodeURIComponent(file.sha || "")}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load file content");

      setFileContent(data.content);
      file.content = data.content;
      extractSymbolsForFile(file.path, data.content, file.language);
    } catch (err: any) {
      setError(err.message || "Failed to fetch file content");
    } finally {
      setLoadingContent(false);
    }
  };

  const handleDirectorySelect = (dirPath: string) => {
    setSelectedDirectory(dirPath);
    setViewMode("directory");
    setDirSearchQuery("");
  };

  const extractSymbolsForFile = (filePath: string, content: string, language?: string) => {
    try {
      Promise.resolve(extractSymbols(filePath, content, language))
        .then((syms) => setSymbols(syms))
        .catch(() => setSymbols([]));
    } catch {
      setSymbols([]);
    }
  };

  const handleSymbolClick = (sym: IndexedSymbol) => {
    setHighlightRange([sym.startLine, sym.endLine]);
  };

  const handleShareAnalysis = () => {
    if (!currentRepo) return;
    const url = new URL(window.location.href);
    url.searchParams.set("owner", currentRepo.owner);
    url.searchParams.set("repo", currentRepo.repo);
    if (currentRepo.selectedRevision) {
      url.searchParams.set("sha", currentRepo.selectedRevision);
    }
    if (selectedFile) {
      url.searchParams.set("file", selectedFile.path);
    }
    navigator.clipboard.writeText(url.toString()).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const currentDirFiles = useMemo(() => {
    if (!selectedDirectory) return [];
    return files.filter(
      (f) => f.path === selectedDirectory || f.path.startsWith(selectedDirectory + "/")
    );
  }, [files, selectedDirectory]);

  const filteredDirFiles = useMemo(() => {
    if (!dirSearchQuery.trim()) return currentDirFiles;
    const q = dirSearchQuery.toLowerCase();
    return currentDirFiles.filter((f) => f.path.toLowerCase().includes(q));
  }, [currentDirFiles, dirSearchQuery]);

  const dirLanguages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of currentDirFiles) {
      if (f.language) {
        counts.set(f.language, (counts.get(f.language) || 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [currentDirFiles]);

  const breadcrumbSegments = useMemo(() => {
    const segments: { label: string; fullPath: string; isFolder: boolean }[] = [];
    const activePath = selectedFile?.path || selectedDirectory;
    if (!activePath) return segments;

    const parts = activePath.split("/");
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const isFolder = selectedFile ? !isLast : true;
      segments.push({
        label: parts[i],
        fullPath: parts.slice(0, i + 1).join("/"),
        isFolder
      });
    }
    return segments;
  }, [selectedFile, selectedDirectory]);

  if (!currentRepo) {
    return (
      <Card className="p-8 text-center max-w-xl mx-auto my-12 space-y-4 bg-theme-surface border-theme-border">
        <div className="w-12 h-12 rounded-xl bg-theme-blue/10 border border-theme-blue/30 flex items-center justify-center text-theme-blue mx-auto shadow-xs">
          <FolderTree className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-theme-text">No Repository Active</h2>
          <p className="text-xs text-theme-text-muted mt-1.5 leading-relaxed max-w-md mx-auto">
            Import a public GitHub repository to browse its file structure, inspect code line-by-line, and extract AST symbols with heuristic fallback.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/">
            <Button variant="secondary" size="md">
              Go Home
            </Button>
          </Link>
          <Button variant="primary" size="md" onClick={() => setIsImportModalOpen(true)}>
            Connect Repository
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-theme-border gap-2">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-theme-blue" />
          <h1 className="text-sm font-semibold text-theme-text font-mono">
            {currentRepo.owner}/{currentRepo.repo}
          </h1>
          {currentRepo.isLocal && (
            <Badge variant="success" size="sm">
              Local
            </Badge>
          )}
          <span className="text-xs text-theme-text-muted">·</span>
          <span className="text-xs font-mono text-theme-text-muted">
            {files.length} indexed files
          </span>
          <span className="text-xs text-theme-text-muted">·</span>
          <Link
            href="/architecture"
            className="text-xs font-mono text-theme-blue hover:underline flex items-center gap-1"
          >
            <span>3D Architecture Map</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<Download className="w-3.5 h-3.5 text-theme-blue" />}
            onClick={() => {
              const manifestFile = files.find(
                (f) =>
                  f.path === "package.json" ||
                  f.path === "requirements.txt" ||
                  f.path === "go.mod" ||
                  f.path === "Cargo.toml" ||
                  f.path === "pyproject.toml"
              );
              const summary = ArchitectureAnalyzer.analyze(files, manifestFile?.content);
              const markdown = generateMarkdownReport(currentRepo, summary, files);
              const dateStr = new Date().toISOString().slice(0, 10);
              downloadMarkdownReport(`repopilot-audit-${currentRepo.repo}-${dateStr}.md`, markdown);
            }}
            title="Download complete Markdown audit report"
          >
            Export Audit (.md)
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={shareCopied ? <Check className="w-3.5 h-3.5 text-theme-green" /> : <Share2 className="w-3.5 h-3.5 text-theme-blue" />}
            onClick={handleShareAnalysis}
            title="Share pinned link to this analysis"
          >
            {shareCopied ? "Copied Link!" : "Share Analysis"}
          </Button>

          {selectedFile && !currentRepo.isLocal && (
            <a
              href={`${currentRepo.url}/blob/${currentRepo.selectedRevision || currentRepo.defaultBranch}/${selectedFile.path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-theme-text-muted hover:text-theme-blue flex items-center gap-1 transition-colors"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {currentRepo.isLocal && (
            <span className="text-xs font-mono text-theme-green flex items-center gap-1 px-2 py-0.5 rounded bg-theme-green/10 border border-theme-green/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Local Memory</span>
            </span>
          )}
        </div>
      </div>

      {/* Skipped-Files Ingestion Report & Subfolder Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 bg-theme-surface border border-theme-border rounded-lg text-xs shadow-xs">
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="font-semibold text-theme-text">Ingestion Report:</span>
          <span className="text-theme-green font-medium">{files.length} indexed</span>
          <span className="text-theme-text-muted">·</span>
          <span className="text-theme-warning-text font-medium">
            {skippedReport ? skippedReport.totalSkipped : 0} skipped
          </span>
          <span className="text-theme-text-muted">
            ({skippedReport ? skippedReport.ignoredDirectory : 0} ignored dirs,{" "}
            {skippedReport ? skippedReport.binary : 0} binary,{" "}
            {skippedReport ? skippedReport.tooLarge : 0} &gt;100KB,{" "}
            {skippedReport ? skippedReport.overFileCap : 0} over cap)
          </span>
        </div>
        {!currentRepo.isLocal && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Pick sub-folder (e.g. packages/core)..."
              value={subfolderInput}
              onChange={(e) => setSubfolderInput(e.target.value)}
              className="bg-theme-surface-alt border border-theme-border rounded px-2.5 py-1 text-xs text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-theme-blue font-mono min-w-[200px]"
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={filteringSubfolder}
              onClick={() => {
                if (!currentRepo) return;
                setFilteringSubfolder(true);
                clientFetch("/api/github/import", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url: currentRepo.url, subfolder: subfolderInput })
                })
                  .then((r) => r.json())
                  .then((d) => {
                    if (d.tree) setFiles(d.tree);
                    if (d.skippedReport) setSkippedReport(d.skippedReport);
                  })
                  .finally(() => setFilteringSubfolder(false));
              }}
            >
              {filteringSubfolder ? <Loader2 className="w-3 h-3 animate-spin" /> : "Ingest Sub-folder"}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden items-center p-1 rounded-lg bg-theme-surface-alt border border-theme-border gap-1 mb-2">
        <button
          onClick={() => setActiveMobileTab("tree")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono rounded-md transition-all ${
            activeMobileTab === "tree"
              ? "bg-theme-blue text-white font-semibold shadow-xs"
              : "text-theme-text-muted hover:text-theme-text"
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Files ({files.length})</span>
        </button>
        <button
          onClick={() => setActiveMobileTab("code")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono rounded-md transition-all ${
            activeMobileTab === "code"
              ? "bg-theme-blue text-white font-semibold shadow-xs"
              : "text-theme-text-muted hover:text-theme-text"
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Viewer ({selectedFile?.path ? selectedFile.path.split("/").pop() : selectedDirectory || "Overview"})</span>
        </button>
      </div>

      {/* Explorer Dual-Pane Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-175px)]">
        {/* Left Pane: File Tree */}
        <div className={`md:col-span-4 lg:col-span-3 h-full ${activeMobileTab === "tree" ? "block" : "hidden md:block"}`}>
          {loadingTree ? (
            <div className="h-full flex items-center justify-center border border-theme-border rounded-xl bg-theme-surface text-xs font-mono text-theme-text-muted gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-theme-blue" />
              <span>Fetching repository tree...</span>
            </div>
          ) : (
            <FileTree
              files={files}
              selectedPath={selectedFile?.path || null}
              selectedDirectory={selectedDirectory}
              onSelectFile={handleFileSelect}
              onSelectDirectory={handleDirectorySelect}
            />
          )}
        </div>

        {/* Right Pane: Breadcrumbs + Mode Switcher + Content */}
        <div className={`md:col-span-8 lg:col-span-9 h-full flex flex-col space-y-2 overflow-hidden ${activeMobileTab === "code" ? "flex" : "hidden md:flex"}`}>
          {/* Breadcrumb Navigation Bar & Mode Switcher */}
          <div className="flex items-center justify-between px-3 py-2 bg-theme-surface border border-theme-border rounded-lg text-xs font-mono shrink-0 shadow-xs">
            {/* Clickable Breadcrumbs */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-theme-text-muted truncate">
              <button
                onClick={() => {
                  setSelectedDirectory(null);
                  if (files.length > 0) {
                    const readme = files.find((f) => f.path.toLowerCase().startsWith("readme"));
                    if (readme) setSelectedFile(readme);
                  }
                  setViewMode("code");
                }}
                className="hover:text-theme-text transition-colors shrink-0"
              >
                {currentRepo.repo}
              </button>

              {breadcrumbSegments.map((seg, idx) => {
                const isLast = idx === breadcrumbSegments.length - 1;
                return (
                  <React.Fragment key={seg.fullPath}>
                    <ChevronRight className="w-3 h-3 text-theme-border shrink-0" />
                    <button
                      onClick={() => {
                        if (seg.isFolder) {
                          handleDirectorySelect(seg.fullPath);
                        } else {
                          const target = files.find((f) => f.path === seg.fullPath);
                          if (target) handleFileSelect(target);
                        }
                      }}
                      className={`truncate transition-colors ${
                        isLast
                          ? "text-theme-text font-semibold"
                          : "text-theme-text-muted hover:text-theme-blue"
                      }`}
                      title={seg.fullPath}
                    >
                      {seg.label}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* View Mode Toggle (Code vs Directory) */}
            {selectedDirectory && (
              <div className="flex items-center gap-1 shrink-0 ml-3">
                <button
                  onClick={() => setViewMode("directory")}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                    viewMode === "directory"
                      ? "bg-theme-blue text-white"
                      : "bg-theme-surface-alt text-theme-text-muted hover:text-theme-text border border-theme-border"
                  }`}
                  title="View all files in this directory"
                >
                  <Folder className="w-3 h-3" />
                  <span>Folder ({currentDirFiles.length})</span>
                </button>
                {selectedFile && (
                  <button
                    onClick={() => setViewMode("code")}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                      viewMode === "code"
                        ? "bg-theme-blue text-white"
                        : "bg-theme-surface-alt text-theme-text-muted hover:text-theme-text border border-theme-border"
                    }`}
                    title="View file source code"
                  >
                    <Code2 className="w-3 h-3" />
                    <span>Code</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mode 1: Directory Overview View */}
          {viewMode === "directory" && selectedDirectory ? (
            <div className="flex-1 flex flex-col space-y-3 overflow-hidden bg-theme-surface border border-theme-border rounded-xl p-4 shadow-xs">
              {/* Directory Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-theme-border gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-theme-blue/10 border border-theme-blue/30 flex items-center justify-center text-theme-blue shadow-xs">
                    <Folder className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-theme-text font-mono">
                      {selectedDirectory}
                    </h2>
                    <div className="flex items-center gap-2 text-xs font-mono text-theme-text-muted mt-0.5">
                      <span>{currentDirFiles.length} files in this module</span>
                      <span>·</span>
                      <span>
                        {formatFileSize(
                          currentDirFiles.reduce((acc, f) => acc + (f.size || 0), 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedFile && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Code2 className="w-3.5 h-3.5" />}
                    onClick={() => setViewMode("code")}
                  >
                    Open {selectedFile.path.split("/").pop()} →
                  </Button>
                )}
              </div>

              {/* Language Tags in this directory */}
              {dirLanguages.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono pb-1">
                  <span className="text-[11px] text-theme-text-muted uppercase font-semibold shrink-0">
                    Languages:
                  </span>
                  {dirLanguages.map(([lang, count]) => (
                    <Badge key={lang} variant="neutral" size="sm">
                      {lang} ({count})
                    </Badge>
                  ))}
                </div>
              )}

              {/* In-folder Search Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-theme-text-muted" />
                <input
                  type="text"
                  placeholder={`Search files in ${selectedDirectory}...`}
                  value={dirSearchQuery}
                  onChange={(e) => setDirSearchQuery(e.target.value)}
                  className="w-full bg-theme-surface-alt border border-theme-border rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-theme-blue"
                />
              </div>

              {/* Directory Files Table */}
              <div className="flex-1 overflow-y-auto border border-theme-border rounded-lg bg-theme-surface">
                {filteredDirFiles.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-theme-text-muted">
                    No files found matching &quot;{dirSearchQuery}&quot; in this directory.
                  </div>
                ) : (
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-theme-surface-alt text-theme-text-muted text-[11px] border-b border-theme-border sticky top-0">
                      <tr>
                        <th className="py-2 px-3 font-medium">File Name</th>
                        <th className="py-2 px-3 font-medium hidden sm:table-cell">Language</th>
                        <th className="py-2 px-3 font-medium hidden sm:table-cell text-right">Size</th>
                        <th className="py-2 px-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-border">
                      {filteredDirFiles.map((file) => {
                        const fileName = file.path.split("/").pop() || file.path;
                        const isCurrent = selectedFile?.path === file.path;
                        return (
                          <tr
                            key={file.path}
                            onClick={() => handleFileSelect(file)}
                            className={`hover:bg-theme-surface-alt cursor-pointer transition-colors ${
                              isCurrent ? "bg-theme-blue/10" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <FileCode className="w-3.5 h-3.5 text-theme-blue shrink-0" />
                                <span
                                  className={`font-medium ${
                                    isCurrent ? "text-theme-blue" : "text-theme-text"
                                  }`}
                                >
                                  {fileName}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-theme-text-muted hidden sm:table-cell">
                              {file.language || "Plain Text"}
                            </td>
                            <td className="py-2.5 px-3 text-theme-text-muted text-right hidden sm:table-cell">
                              {formatFileSize(file.size || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFileSelect(file);
                                }}
                                className="text-[11px] text-theme-blue hover:underline font-medium cursor-pointer"
                              >
                                Inspect →
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            /* Mode 2: Code Viewer View */
            <div className="flex-1 flex flex-col space-y-2 overflow-hidden">
              {/* Symbols Definitions Quick Bar */}
              {symbols.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-3 bg-theme-surface border border-theme-border rounded-lg text-xs shrink-0 select-none shadow-xs">
                  <span className="text-[10px] font-mono text-theme-text-muted uppercase shrink-0 flex items-center gap-1 font-semibold">
                    <Code2 className="w-3 h-3 text-theme-blue" />
                    Symbols:
                  </span>
                  {symbols.slice(0, 15).map((sym) => (
                    <button
                      key={sym.id}
                      onClick={() => handleSymbolClick(sym)}
                      className="px-2 py-0.5 rounded-[4px] bg-theme-surface-alt hover:bg-theme-surface border border-theme-border hover:border-theme-blue/40 text-[11px] font-mono text-theme-text-muted hover:text-theme-blue shrink-0 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      title={`${sym.signature || sym.name} (lines ${sym.startLine}-${sym.endLine}) [${sym.confidence || "heuristic"}]`}
                    >
                      <span className="text-theme-text-muted">{sym.kind[0]}</span>
                      <span>{sym.name}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-sans uppercase font-medium ${
                          sym.confidence === "ast"
                            ? "bg-theme-blue/10 text-theme-blue border border-theme-blue/20"
                            : "bg-theme-surface border border-theme-border text-theme-text-muted"
                        }`}
                      >
                        {sym.confidence === "ast" ? "AST" : "heuristic"}
                      </span>
                    </button>
                  ))}
                  {symbols.length > 15 && (
                    <span className="text-[10px] text-theme-text-muted shrink-0">
                      +{symbols.length - 15} more
                    </span>
                  )}
                </div>
              )}

              {/* Main Code View Box */}
              <div className="flex-1 overflow-hidden">
                {loadingContent ? (
                  <div className="h-full flex items-center justify-center border border-theme-border rounded-xl bg-theme-surface text-xs font-mono text-theme-text-muted gap-2 shadow-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-theme-blue" />
                    <span>Loading file content...</span>
                  </div>
                ) : error ? (
                  <div className="h-full flex items-center justify-center border border-theme-danger/20 rounded-xl bg-theme-danger/10 p-6 text-center text-xs font-mono text-theme-danger shadow-xs">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    <span>{error}</span>
                  </div>
                ) : selectedFile ? (
                  <CodeViewer
                    code={fileContent}
                    filePath={selectedFile.path}
                    language={selectedFile.language}
                    highlightLines={highlightRange}
                    maxHeight="100%"
                  />
                ) : (
                  /* Welcoming Empty State */
                  <div className="h-full flex flex-col items-center justify-center border border-theme-border rounded-xl bg-theme-surface p-8 text-center space-y-4 shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-theme-blue/10 border border-theme-blue/30 flex items-center justify-center text-theme-blue shadow-xs">
                      <FileCode className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-theme-text font-mono">
                        Select a file or module
                      </h3>
                      <p className="text-xs text-theme-text-muted max-w-sm mt-1 leading-relaxed font-mono">
                        Browse the folder tree on the left, inspect code with AST symbol navigation, or open modules from the 3D architecture graph.
                      </p>
                    </div>
                    {files.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        {files.find((f) => f.path.toLowerCase().startsWith("readme")) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const r = files.find((f) => f.path.toLowerCase().startsWith("readme"));
                              if (r) handleFileSelect(r);
                            }}
                          >
                            Open README
                          </Button>
                        )}
                        <Link href="/architecture">
                          <Button variant="primary" size="sm">
                            Explore 3D Architecture
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-mono text-theme-text-muted">
          Loading Code Explorer...
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
