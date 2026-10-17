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
      <Card className="p-8 text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center text-[#828FFF] mx-auto shadow-[0_0_16px_rgba(94,106,210,0.25)]">
          <SearchIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#F7F8F8]">
            No Repository Loaded
          </h2>
          <p className="text-xs text-[#8A8F98] mt-1.5 leading-relaxed max-w-md mx-auto">
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
        <h1 className="text-lg font-semibold text-[#F7F8F8] font-sans flex items-center gap-2">
          <SearchIcon className="w-5 h-5 text-[#5E6AD2]" />
          <span>Code & Symbol Search</span>
        </h1>
        <p className="text-xs text-[#8A8F98] mt-0.5 font-mono">
          Deterministic indexed search across {files.length} repository files in {currentRepo.owner}/{currentRepo.repo}.
        </p>
      </div>

      {/* Query Form Box */}
      <Card className="p-4 space-y-3">
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
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[#23252A] text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-[#62666D] mr-1">Type:</span>
            {(["all", "symbol", "path", "text"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSearchType(t)}
                className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                  searchType === t
                    ? "bg-[#5E6AD2] text-white font-medium"
                    : "bg-[#141516] text-[#8A8F98] hover:text-[#F7F8F8] border border-[#23252A] hover:border-[#34343A]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {languages.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[#62666D]">Language:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-[#141516] border border-[#23252A] text-[#F7F8F8] text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#5E6AD2]"
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
        <div className="flex items-center justify-between text-xs font-mono text-[#8A8F98]">
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
                className="p-3.5 hover:border-[#34343A] hover:bg-[#141516] transition-all cursor-pointer group font-mono text-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className="w-4 h-4 text-[#5E6AD2] shrink-0" />
                    <span className="text-[#F7F8F8] font-semibold group-hover:text-[#828FFF] truncate transition-colors">
                      {res.filePath}
                    </span>
                    <span className="text-[#62666D]">
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
                    <ArrowRight className="w-3.5 h-3.5 text-[#62666D] group-hover:text-[#828FFF] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                <div className="pl-6 text-[#8A8F98] text-[11px] truncate bg-[#141516] py-1 px-2 rounded-md border border-[#23252A]">
                  {res.previewText}
                </div>
              </Card>
            ))}
          </div>
        ) : !currentRepo ? (
          <Card className="p-12 text-center space-y-3 bg-[#0F1011] border-[#23252A]">
            <SearchIcon className="w-8 h-8 text-[#5E6AD2] mx-auto opacity-60" />
            <h3 className="text-sm font-mono font-semibold text-white">No Active Repository Loaded</h3>
            <p className="text-xs text-[#8A8F98] max-w-sm mx-auto">
              Import a public GitHub repository or load an example to search files and extracted symbols deterministically.
            </p>
            <div className="pt-2">
              <Link
                href="/examples"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5E6AD2] text-white text-xs font-mono font-semibold hover:bg-[#6875E5] transition-all"
              >
                <span>Browse Examples →</span>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="p-12 text-center space-y-3 bg-[#0F1011] border-[#23252A]">
            <SearchIcon className="w-8 h-8 text-[#5E6AD2] mx-auto opacity-60" />
            <h3 className="text-sm font-mono font-semibold text-white">Deterministic Search Console</h3>
            <p className="text-xs text-[#8A8F98] max-w-sm mx-auto">
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
        <div className="p-8 text-center text-xs font-mono text-[#8A8F98]">
          Loading Search Console...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
