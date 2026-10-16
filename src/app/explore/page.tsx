"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  FolderTree,
  FileCode,
  GitCommit,
  ExternalLink,
  Code2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { FileTree } from "@/components/explorer/FileTree";
import { CodeViewer } from "@/components/ui/CodeViewer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { RepositoryFile, IndexedSymbol } from "@repopilot/core";
import { extractSymbols } from "@repopilot/indexer";
import { clientFetch } from "@/lib/api";

function ExploreContent() {
  const searchParams = useSearchParams();
  const initialFilePath = searchParams.get("file");
  const initialLine = searchParams.get("line") ? parseInt(searchParams.get("line")!, 10) : undefined;

  const { currentRepo, files, setFiles, setIsImportModalOpen } = useRepository();

  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [symbols, setSymbols] = useState<IndexedSymbol[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [loadingTree, setLoadingTree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightRange, setHighlightRange] = useState<[number, number] | undefined>(
    initialLine ? [initialLine, initialLine] : undefined
  );

  useEffect(() => {
    if (currentRepo && files.length === 0) {
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
        .catch((e) => setError("Failed to load file tree."))
        .finally(() => setLoadingTree(false));
    }
  }, [currentRepo, files.length, setFiles]);

  useEffect(() => {
    if (files.length > 0) {
      if (initialFilePath) {
        const found = files.find((f) => f.path === initialFilePath);
        if (found) setSelectedFile(found);
      } else if (!selectedFile) {
        const readme = files.find((f) => f.path.toLowerCase().startsWith("readme"));
        setSelectedFile(readme || files.find((f) => f.type === "blob") || null);
      }
    }
  }, [files, initialFilePath]);

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
          const extracted = extractSymbols(
            selectedFile.path,
            data.content,
            selectedFile.language
          );
          setSymbols(extracted);
        } else {
          setError(data.error || "Failed to load content.");
        }
      })
      .catch((err) => setError("Error loading file content."))
      .finally(() => setLoadingContent(false));
  }, [currentRepo, selectedFile]);

  const handleSymbolClick = (sym: IndexedSymbol) => {
    setHighlightRange([sym.startLine, sym.endLine]);
    const el = document.getElementById(`L${sym.startLine}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  if (!currentRepo) {
    return (
      <Card className="p-8 text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center text-[#828FFF] mx-auto shadow-[0_0_16px_rgba(94,106,210,0.25)]">
          <FolderTree className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#F7F8F8]">
            No Repository Active
          </h2>
          <p className="text-xs text-[#8A8F98] mt-1.5 leading-relaxed max-w-md mx-auto">
            Import a public GitHub repository to browse its file structure, inspect code line-by-line, and extract AST symbols.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsImportModalOpen(true)}
          className="mx-auto"
        >
          Connect Repository
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#23252A] gap-2">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-[#5E6AD2]" />
          <h1 className="text-sm font-semibold text-[#F7F8F8] font-mono">
            {currentRepo.owner}/{currentRepo.repo}
          </h1>
          <span className="text-xs text-[#62666D]">·</span>
          <span className="text-xs font-mono text-[#8A8F98]">
            {files.length} indexed files
          </span>
        </div>

        {selectedFile && (
          <div className="flex items-center gap-2">
            <a
              href={`${currentRepo.url}/blob/${currentRepo.selectedRevision || currentRepo.defaultBranch}/${selectedFile.path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-[#8A8F98] hover:text-[#828FFF] flex items-center gap-1 transition-colors"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Explorer Dual-Pane Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-180px)]">
        {/* Left Pane: File Tree */}
        <div className="md:col-span-4 lg:col-span-3 h-full">
          {loadingTree ? (
            <div className="h-full flex items-center justify-center border border-[#23252A] rounded-xl bg-[#0F1011] text-xs font-mono text-[#8A8F98] gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#5E6AD2]" />
              <span>Fetching repository tree...</span>
            </div>
          ) : (
            <FileTree
              files={files}
              selectedPath={selectedFile?.path || null}
              onSelectFile={(f) => {
                setSelectedFile(f);
                setHighlightRange(undefined);
              }}
            />
          )}
        </div>

        {/* Right Pane: Code Viewer & Symbols */}
        <div className="md:col-span-8 lg:col-span-9 h-full flex flex-col space-y-3 overflow-hidden">
          {/* Symbols definitions quick bar */}
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
                  className="px-2 py-0.5 rounded-[4px] bg-[#141516] hover:bg-[#18191A] border border-[#23252A] hover:border-[#34343A] text-[11px] font-mono text-[#8A8F98] hover:text-[#828FFF] shrink-0 transition-colors"
                  title={`${sym.signature || sym.name} (line ${sym.startLine})`}
                >
                  <span className="text-[#62666D] mr-1">{sym.kind[0]}</span>
                  <span>{sym.name}</span>
                </button>
              ))}
              {symbols.length > 15 && (
                <span className="text-[10px] text-[#62666D] shrink-0">
                  +{symbols.length - 15} more
                </span>
              )}
            </div>
          )}

          {/* Main Code Viewer Box */}
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
              <div className="h-full flex items-center justify-center border border-[#23252A] rounded-xl bg-[#0F1011] text-xs font-mono text-[#62666D] shadow-xs">
                Select a file from the tree to view its contents.
              </div>
            )}
          </div>
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
