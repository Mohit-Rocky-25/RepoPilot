"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search as SearchIcon,
  FileCode,
  ArrowRight
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { SearchResult } from "@repopilot/core";
import { SearchEngine } from "@repopilot/search";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const { currentRepo, files, setIsImportModalOpen } = useRepository();

  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<"all" | "symbol" | "path" | "text">("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [pathPrefix, setPathPrefix] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const languages = Array.from(
    new Set(files.map((f) => f.language).filter(Boolean) as string[])
  ).sort();

  const handleSearch = () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    const engine = new SearchEngine({
      files,
      symbols: []
    });

    const matches = engine.search({
      query: query.trim(),
      type: searchType,
      language: selectedLanguage !== "all" ? selectedLanguage : undefined,
      pathPrefix: pathPrefix.trim() || undefined,
      limit: 50
    });

    setResults(matches);
    setIsSearching(false);
  };

  useEffect(() => {
    if (initialQuery) {
      handleSearch();
    }
  }, [files]);

  const handleNavigate = (res: SearchResult) => {
    router.push(
      `/explore?file=${encodeURIComponent(res.filePath)}&line=${res.lineNumber}`
    );
  };

  if (!currentRepo) {
    return (
      <Card className="p-8 text-center max-w-xl mx-auto my-12 space-y-4 bg-theme-surface border-theme-border">
        <div className="w-12 h-12 rounded-xl bg-theme-blue/10 border border-theme-blue/30 flex items-center justify-center text-theme-blue mx-auto shadow-xs">
          <SearchIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-theme-text">
            No Repository Loaded
          </h2>
          <p className="text-xs text-theme-text-muted mt-1.5 leading-relaxed max-w-md mx-auto">
            Import a public GitHub repository to perform deterministic code search and symbol navigation.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/">
            <Button variant="secondary" size="md">
              Go Home
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsImportModalOpen(true)}
          >
            Connect Repository
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Header Bar */}
      <div>
        <h1 className="text-lg font-semibold text-theme-text font-sans flex items-center gap-2">
          <SearchIcon className="w-5 h-5 text-theme-blue" />
          <span>Code & Symbol Search</span>
        </h1>
        <p className="text-xs text-theme-text-muted mt-0.5 font-mono">
          Deterministic indexed search across {files.length} repository files in {currentRepo.owner}/{currentRepo.repo}.
        </p>
      </div>

      {/* Query Form Box */}
      <Card className="p-4 space-y-3 bg-theme-surface border-theme-border shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search functions, classes, file names, or code patterns..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              icon={<SearchIcon className="w-4 h-4" />}
              autoFocus
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSearching}
            icon={<SearchIcon className="w-4 h-4" />}
            className="shrink-0"
          >
            Search Code
          </Button>
        </form>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-theme-border text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-theme-text-muted mr-1">Type:</span>
            {(["all", "symbol", "path", "text"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSearchType(t)}
                className={`px-2.5 py-1 rounded-full capitalize transition-colors cursor-pointer ${
                  searchType === t
                    ? "bg-theme-blue text-white font-medium"
                    : "bg-theme-surface-alt text-theme-text-muted hover:text-theme-text border border-theme-border"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {languages.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-theme-text-muted">Language:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-theme-surface-alt border border-theme-border text-theme-text text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-theme-blue cursor-pointer"
              >
                <option value="all">All Languages</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Results Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-theme-text-muted">
          <span>
            {results.length} {results.length === 1 ? "result" : "results"} found
          </span>
        </div>

        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((res, idx) => (
              <Card
                key={`${res.filePath}:${res.lineNumber}:${idx}`}
                onClick={() => handleNavigate(res)}
                className="p-3.5 hover:border-theme-blue/40 hover:bg-theme-surface-alt transition-all cursor-pointer group font-mono text-xs bg-theme-surface border-theme-border shadow-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className="w-4 h-4 text-theme-blue shrink-0" />
                    <span className="text-theme-text font-semibold group-hover:text-theme-blue truncate transition-colors">
                      {res.filePath}
                    </span>
                    <span className="text-theme-text-muted">
                      :line {res.lineNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        res.matchType === "symbol"
                          ? "primary"
                          : "neutral"
                      }
                      size="sm"
                    >
                      {res.matchType}
                    </Badge>
                    <ArrowRight className="w-3.5 h-3.5 text-theme-text-muted group-hover:text-theme-blue group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                <div className="pl-6 text-theme-text-muted text-[11px] truncate bg-theme-surface-alt py-1 px-2 rounded-md border border-theme-border">
                  {res.previewText}
                </div>
              </Card>
            ))}
          </div>
        ) : !currentRepo ? (
          <Card className="p-12 text-center space-y-3 bg-theme-surface border-theme-border shadow-xs">
            <SearchIcon className="w-8 h-8 text-theme-blue mx-auto opacity-60" />
            <h3 className="text-sm font-mono font-semibold text-theme-text">No Active Repository Loaded</h3>
            <p className="text-xs text-theme-text-muted max-w-sm mx-auto">
              Import a public GitHub repository or load an example to search files and extracted symbols deterministically.
            </p>
            <div className="pt-2">
              <Link
                href="/examples"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-theme-blue text-white text-xs font-mono font-semibold hover:bg-theme-blue-hover transition-all"
              >
                <span>Browse Examples →</span>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="p-12 text-center space-y-3 bg-theme-surface border-theme-border shadow-xs">
            <SearchIcon className="w-8 h-8 text-theme-blue mx-auto opacity-60" />
            <h3 className="text-sm font-mono font-semibold text-theme-text">Deterministic Search Console</h3>
            <p className="text-xs text-theme-text-muted max-w-sm mx-auto">
              Type a filename, directory, or symbol identifier above to search across {currentRepo.owner}/{currentRepo.repo}.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-mono text-theme-text-muted">
          Loading Search Console...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
