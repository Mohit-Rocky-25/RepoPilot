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
  File
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { FileTree } from "@/components/explorer/FileTree";
import { CodeViewer } from "@/components/ui/CodeViewer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { RepositoryFile, IndexedSymbol } from "@repopilot/core";
import { extractSymbols } from "@repopilot/indexer";
import { ArchitectureAnalyzer } from "@repopilot/analysis";
import { clientFetch } from "@/lib/api";
import { generateMarkdownReport, downloadMarkdownReport } from "@/lib/reportGenerator";
import { Download, ShieldCheck } from "lucide-react";

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

  // If query params specify owner & repo, auto-connect if different from currentRepo
  useEffect(() => {
    if (ownerParam && repoParam) {
      if (!currentRepo || currentRepo.owner !== ownerParam || currentRepo.repo !== repoParam) {
        saveRecentRepo({
          owner: ownerParam,
          repo: repoParam,
          fullName: `${ownerParam}/${repoParam}`,
          url: `https://github.com/${ownerParam}/${repoParam}`,
          defaultBranch: "main",
          stars: 0,
          forks: 0,
          openIssuesCount: 0
        });
      }
    }
  }, [ownerParam, repoParam, currentRepo, saveRecentRepo]);

  // Load tree if repo is active but files are not in memory yet
  useEffect(() => {
    if (currentRepo && !currentRepo.isLocal && files.length === 0) {
      setLoadingTree(true);
      clientFetch("/api/github/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: currentRepo.url })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.tree) {
            setFiles(data.tree);
          }
        })
        .catch(() => setError("Failed to load file tree."))
        .finally(() => setLoadingTree(false));
    }
  }, [currentRepo, files.length, setFiles]);

  // Resolve target file or directory whenever files or search params change
  useEffect(() => {
    if (files.length === 0) return;

    const target = fileParam || dirParam;

    if (target) {
      // 1. Direct file match
      const exactFile = files.find((f) => f.path === target && f.type === "blob");
      if (exactFile) {
        setSelectedFile(exactFile);
        setSelectedDirectory(getParentDirectory(exactFile.path));
        setViewMode("code");
        return;
      }

      // 2. Directory match (either explicit dirParam or fileParam was actually a folder path)
      const childFiles = files.filter((f) => f.path.startsWith(`${target}/`));
      if (childFiles.length > 0) {
        setSelectedDirectory(target);
        // Find best primary file in directory
        const entryFile =
          childFiles.find(
            (f) =>
              f.path === `${target}/index.ts` ||
              f.path === `${target}/index.tsx` ||
              f.path === `${target}/index.js` ||
              f.path === `${target}/page.tsx` ||
              f.path === `${target}/main.py` ||
              f.path.endsWith("/index.ts") ||
              f.path.endsWith("/index.tsx") ||
              f.path.endsWith("/index.js") ||
              f.path.endsWith("/page.tsx")
          ) || childFiles[0];

        if (entryFile) {
          setSelectedFile(entryFile);
        }

        // If dir was explicitly requested, show directory overview, otherwise code
        if (dirParam && !fileParam) {
          setViewMode("directory");
        } else {
          setViewMode("code");
        }
        return;
      }

      // 3. Fallback: target not found exactly, check case-insensitive match
      const looseMatch = files.find((f) => f.path.toLowerCase() === target.toLowerCase());
      if (looseMatch) {
        setSelectedFile(looseMatch);
        setSelectedDirectory(getParentDirectory(looseMatch.path));
        setViewMode("code");
        return;
      }
    }

    // 4. Default landing when no target is specified
    if (!selectedFile && !selectedDirectory) {
      const readme = files.find((f) => f.path.toLowerCase().startsWith("readme"));
      const fallbackFile = readme || files.find((f) => f.type === "blob") || null;
      if (fallbackFile) {
        setSelectedFile(fallbackFile);
        setSelectedDirectory(getParentDirectory(fallbackFile.path));
        setViewMode("code");
      }
    }
  }, [files, fileParam, dirParam]);

  // Fetch file content whenever selectedFile changes
  useEffect(() => {
    if (!currentRepo || !selectedFile || selectedFile.type !== "blob") {
      setFileContent("");
      setSymbols([]);
      return;
    }

    if (selectedFile.isBinary) {
      setFileContent("(Binary file content cannot be displayed)");
      setSymbols([]);
      return;
    }

    // Direct in-memory content from local folder ingestion or cached file
    if (selectedFile.content !== undefined || currentRepo.isLocal) {
      const content = selectedFile.content ?? "";
      setFileContent(content);
      setLoadingContent(false);
      extractSymbols(selectedFile.path, content, selectedFile.language)
        .then((extracted) => {
          setSymbols(extracted);
        })
        .catch(() => {
          setSymbols([]);
        });
      return;
    }

    setLoadingContent(true);
    setError(null);

    const sha = currentRepo.selectedRevision || "HEAD";
    const url = `/api/github/file?owner=${encodeURIComponent(
      currentRepo.owner
    )}&repo=${encodeURIComponent(currentRepo.repo)}&sha=${encodeURIComponent(
      sha
    )}&path=${encodeURIComponent(selectedFile.path)}`;

    clientFetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.content !== undefined) {
          setFileContent(data.content);
          extractSymbols(selectedFile.path, data.content, selectedFile.language)
            .then((extracted) => {
              setSymbols(extracted);
            })
            .catch(() => {
              setSymbols([]);
            });
        } else {
          setError(data.error || "Failed to load content.");
        }
      })
      .catch(() => setError("Error loading file content."))
      .finally(() => setLoadingContent(false));
  }, [currentRepo, selectedFile]);

  const handleSymbolClick = (sym: IndexedSymbol) => {
    setHighlightRange([sym.startLine, sym.endLine]);
    setViewMode("code");
    const el = document.getElementById(`L${sym.startLine}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleFileSelect = (file: RepositoryFile) => {
    setSelectedFile(file);
    setSelectedDirectory(getParentDirectory(file.path));
    setViewMode("code");
    setHighlightRange(undefined);
    setActiveMobileTab("code");
  };

  const handleDirectorySelect = (dirPath: string) => {
    setSelectedDirectory(dirPath);
    setViewMode("directory");
    setActiveMobileTab("code");
    const children = files.filter((f) => f.path.startsWith(`${dirPath}/`));
    if (children.length > 0 && (!selectedFile || !selectedFile.path.startsWith(`${dirPath}/`))) {
      const entry =
        children.find(
          (f) =>
            f.path.endsWith("/index.ts") ||
            f.path.endsWith("/index.tsx") ||
            f.path.endsWith("/page.tsx")
        ) || children[0];
      if (entry) setSelectedFile(entry);
    }
  };

  // Files in current directory
  const currentDirFiles = useMemo(() => {
    if (!selectedDirectory) return [];
    return files.filter((f) => f.path.startsWith(`${selectedDirectory}/`));
  }, [files, selectedDirectory]);

  // Filtered files in current directory
  const filteredDirFiles = useMemo(() => {
    if (!dirSearchQuery) return currentDirFiles;
    const q = dirSearchQuery.toLowerCase();
    return currentDirFiles.filter((f) => f.path.toLowerCase().includes(q));
  }, [currentDirFiles, dirSearchQuery]);

  // Languages present in current directory
  const dirLanguages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of currentDirFiles) {
      if (f.language) {
        counts.set(f.language, (counts.get(f.language) || 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [currentDirFiles]);

  // Breadcrumbs builder
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
      <Card className="p-8 text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center text-[#828FFF] mx-auto shadow-[0_0_16px_rgba(94,106,210,0.25)]">
          <FolderTree className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#F7F8F8]">No Repository Active</h2>
          <p className="text-xs text-[#8A8F98] mt-1.5 leading-relaxed max-w-md mx-auto">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-[#23252A] gap-2">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-[#5E6AD2]" />
          <h1 className="text-sm font-semibold text-[#F7F8F8] font-mono">
            {currentRepo.owner}/{currentRepo.repo}
          </h1>
          {currentRepo.isLocal && (
            <Badge variant="success" size="sm">
              Local
            </Badge>
          )}
          <span className="text-xs text-[#62666D]">·</span>
          <span className="text-xs font-mono text-[#8A8F98]">
            {files.length} indexed files
          </span>
          <span className="text-xs text-[#62666D]">·</span>
          <Link
            href="/architecture"
            className="text-xs font-mono text-[#828FFF] hover:underline flex items-center gap-1"
          >
            <span>3D Architecture Map</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<Download className="w-3.5 h-3.5 text-[#5E6AD2]" />}
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

          {selectedFile && !currentRepo.isLocal && (
            <a
              href={`${currentRepo.url}/blob/${currentRepo.selectedRevision || currentRepo.defaultBranch}/${selectedFile.path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-[#8A8F98] hover:text-[#828FFF] flex items-center gap-1 transition-colors"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {currentRepo.isLocal && (
            <span className="text-xs font-mono text-[#27A644] flex items-center gap-1 px-2 py-0.5 rounded bg-[#27A644]/10 border border-[#27A644]/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Local Memory</span>
            </span>
          )}
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden items-center p-1 rounded-lg bg-[#0F1011] border border-[#23252A] gap-1 mb-2">
        <button
          onClick={() => setActiveMobileTab("tree")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono rounded-md transition-all ${
            activeMobileTab === "tree"
              ? "bg-[#5E6AD2] text-white font-semibold shadow-xs"
              : "text-[#8A8F98] hover:text-white"
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Files ({files.length})</span>
        </button>
        <button
          onClick={() => setActiveMobileTab("code")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono rounded-md transition-all ${
            activeMobileTab === "code"
              ? "bg-[#5E6AD2] text-white font-semibold shadow-xs"
              : "text-[#8A8F98] hover:text-white"
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
            <div className="h-full flex items-center justify-center border border-[#23252A] rounded-xl bg-[#0F1011] text-xs font-mono text-[#8A8F98] gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#5E6AD2]" />
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
          <div className="flex items-center justify-between px-3 py-2 bg-[#0F1011] border border-[#23252A] rounded-lg text-xs font-mono shrink-0 shadow-xs">
            {/* Clickable Breadcrumbs */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[#8A8F98] truncate">
              <button
                onClick={() => {
                  setSelectedDirectory(null);
                  if (files.length > 0) {
                    const readme = files.find((f) => f.path.toLowerCase().startsWith("readme"));
                    if (readme) setSelectedFile(readme);
                  }
                  setViewMode("code");
                }}
                className="hover:text-[#F7F8F8] transition-colors shrink-0"
              >
                {currentRepo.repo}
              </button>

              {breadcrumbSegments.map((seg, idx) => {
                const isLast = idx === breadcrumbSegments.length - 1;
                return (
                  <React.Fragment key={seg.fullPath}>
                    <ChevronRight className="w-3 h-3 text-[#52525A] shrink-0" />
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
                          ? "text-[#F7F8F8] font-semibold"
                          : "text-[#8A8F98] hover:text-[#828FFF]"
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
                      ? "bg-[#5E6AD2] text-white"
                      : "bg-[#141516] text-[#8A8F98] hover:text-[#F7F8F8] border border-[#23252A]"
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
                        ? "bg-[#5E6AD2] text-white"
                        : "bg-[#141516] text-[#8A8F98] hover:text-[#F7F8F8] border border-[#23252A]"
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
            <div className="flex-1 flex flex-col space-y-3 overflow-hidden bg-[#0F1011] border border-[#23252A] rounded-xl p-4">
              {/* Directory Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#23252A] gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center text-[#828FFF] shadow-[0_0_12px_rgba(94,106,210,0.25)]">
                    <Folder className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[#F7F8F8] font-mono">
                      {selectedDirectory}
                    </h2>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#8A8F98] mt-0.5">
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
                  <span className="text-[11px] text-[#62666D] uppercase font-semibold shrink-0">
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
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#62666D]" />
                <input
                  type="text"
                  placeholder={`Search files in ${selectedDirectory}...`}
                  value={dirSearchQuery}
                  onChange={(e) => setDirSearchQuery(e.target.value)}
                  className="w-full bg-[#141516] border border-[#23252A] rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-[#D0D6E0] placeholder:text-[#62666D] focus:outline-none focus:border-[#5E6AD2]"
                />
              </div>

              {/* Directory Files Table */}
              <div className="flex-1 overflow-y-auto border border-[#23252A] rounded-lg bg-[#010102]">
                {filteredDirFiles.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-[#8A8F98]">
                    No files found matching &quot;{dirSearchQuery}&quot; in this directory.
                  </div>
                ) : (
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-[#141516] text-[#8A8F98] text-[11px] border-b border-[#23252A] sticky top-0">
                      <tr>
                        <th className="py-2 px-3 font-medium">File Name</th>
                        <th className="py-2 px-3 font-medium hidden sm:table-cell">Language</th>
                        <th className="py-2 px-3 font-medium hidden sm:table-cell text-right">Size</th>
                        <th className="py-2 px-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#23252A]">
                      {filteredDirFiles.map((file) => {
                        const fileName = file.path.split("/").pop() || file.path;
                        const isCurrent = selectedFile?.path === file.path;
                        return (
                          <tr
                            key={file.path}
                            onClick={() => handleFileSelect(file)}
                            className={`hover:bg-[#141516] cursor-pointer transition-colors ${
                              isCurrent ? "bg-[#5E6AD2]/10" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <FileCode className="w-3.5 h-3.5 text-[#5E6AD2] shrink-0" />
                                <span
                                  className={`font-medium ${
                                    isCurrent ? "text-[#828FFF]" : "text-[#F7F8F8]"
                                  }`}
                                >
                                  {fileName}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-[#8A8F98] hidden sm:table-cell">
                              {file.language || "Plain Text"}
                            </td>
                            <td className="py-2.5 px-3 text-[#8A8F98] text-right hidden sm:table-cell">
                              {formatFileSize(file.size || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="text-[11px] text-[#828FFF] hover:underline font-medium">
                                Inspect →
                              </span>
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
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-3 bg-[#0F1011] border border-[#23252A] rounded-lg text-xs shrink-0 select-none shadow-xs">
                  <span className="text-[10px] font-mono text-[#62666D] uppercase shrink-0 flex items-center gap-1 font-semibold">
                    <Code2 className="w-3 h-3 text-[#5E6AD2]" />
                    Symbols:
                  </span>
                  {symbols.slice(0, 15).map((sym) => (
                    <button
                      key={sym.id}
                      onClick={() => handleSymbolClick(sym)}
                      className="px-2 py-0.5 rounded-[4px] bg-[#141516] hover:bg-[#18191A] border border-[#23252A] hover:border-[#34343A] text-[11px] font-mono text-[#8A8F98] hover:text-[#828FFF] shrink-0 transition-colors inline-flex items-center gap-1.5"
                      title={`${sym.signature || sym.name} (lines ${sym.startLine}-${sym.endLine}) [${sym.confidence || "heuristic"}]`}
                    >
                      <span className="text-[#62666D]">{sym.kind[0]}</span>
                      <span>{sym.name}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-sans uppercase font-medium ${
                          sym.confidence === "ast"
                            ? "bg-[#5E6AD2]/20 text-[#828FFF] border border-[#5E6AD2]/30"
                            : "bg-[#23252A] text-[#8A8F98]"
                        }`}
                      >
                        {sym.confidence === "ast" ? "AST" : "heuristic"}
                      </span>
                    </button>
                  ))}
                  {symbols.length > 15 && (
                    <span className="text-[10px] text-[#62666D] shrink-0">
                      +{symbols.length - 15} more
                    </span>
                  )}
                </div>
              )}

              {/* Main Code View Box */}
              <div className="flex-1 overflow-hidden">
                {loadingContent ? (
                  <div className="h-full flex items-center justify-center border border-[#23252A] rounded-xl bg-[#0F1011] text-xs font-mono text-[#8A8F98] gap-2 shadow-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-[#5E6AD2]" />
                    <span>Loading file content...</span>
                  </div>
                ) : error ? (
                  <div className="h-full flex items-center justify-center border border-red-900/40 rounded-xl bg-red-950/20 p-6 text-center text-xs font-mono text-[#EF4444] shadow-xs">
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
                  <div className="h-full flex flex-col items-center justify-center border border-[#23252A] rounded-xl bg-[#0F1011] p-8 text-center space-y-4 shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center text-[#828FFF] shadow-[0_0_16px_rgba(94,106,210,0.25)]">
                      <FileCode className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#F7F8F8] font-mono">
                        Select a file or module
                      </h3>
                      <p className="text-xs text-[#8A8F98] max-w-sm mt-1 leading-relaxed font-mono">
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
        <div className="p-8 text-center text-xs font-mono text-[#8A8F98]">
          Loading Code Explorer...
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
