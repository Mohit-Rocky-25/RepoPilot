"use client";

import React, { useState } from "react";
import { Search, FileCode, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRepository } from "@/context/RepositoryContext";
import { Badge } from "@/components/ui/Badge";

export const SearchModal: React.FC = () => {
  const { isSearchModalOpen, setIsSearchModalOpen, currentRepo, files } = useRepository();
  const [query, setQuery] = useState("");
  const router = useRouter();

  if (!isSearchModalOpen) return null;

  const filteredFiles = files
    .filter((f) => f.path.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);

  const handleSelectFile = (filePath: string) => {
    setIsSearchModalOpen(false);
    router.push(`/explore?file=${encodeURIComponent(filePath)}`);
  };

  const handleFullSearch = () => {
    setIsSearchModalOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-[#0F1011] border border-[#23252A] rounded-xl shadow-[0_16px_70px_rgba(0,0,0,0.85)] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#23252A] gap-3 bg-[#141516]/40">
          <Search className="w-4 h-4 text-[#8A8F98] shrink-0" />
          <input
            type="text"
            className="flex-1 bg-transparent text-sm text-[#F7F8F8] placeholder:text-[#62666D] focus:outline-none font-mono"
            placeholder={
              currentRepo
                ? `Search files & symbols in ${currentRepo.owner}/${currentRepo.repo}...`
                : "Search repository files..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                handleFullSearch();
              }
              if (e.key === "Escape") {
                setIsSearchModalOpen(false);
              }
            }}
            autoFocus
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[#18191A] text-[#8A8F98] border border-[#34343A]">
            ESC
          </kbd>
        </div>

        {/* Results / Navigation */}
        <div className="max-h-80 overflow-y-auto p-2">
          {query.trim() && (
            <button
              onClick={handleFullSearch}
              className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[#141516] text-xs font-mono text-[#828FFF] group transition-colors border-b border-[#23252A]/60"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                <span>Full-text code search for "{query}"</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {filteredFiles.length > 0 ? (
            <div className="space-y-0.5 mt-1">
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-[#62666D]">
                Matching Repository Files
              </div>
              {filteredFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => handleSelectFile(file.path)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#141516] text-left text-xs font-mono text-[#F7F8F8] group transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 text-[#62666D] shrink-0" />
                    <span className="truncate group-hover:text-[#828FFF]">
                      {file.path}
                    </span>
                  </div>
                  {file.language && (
                    <Badge variant="neutral" size="sm">
                      {file.language}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          ) : query.trim() && !filteredFiles.length ? (
            <div className="p-6 text-center text-xs text-[#62666D] font-mono">
              No matching files found. Press Enter to perform full code search.
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[#62666D] font-mono">
              Type a file path or symbol keyword to search the active codebase.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#141516] border-t border-[#23252A] text-[11px] text-[#62666D] font-mono flex items-center justify-between">
          <span>Navigate with arrows · Enter to select</span>
          <span>{files.length} indexed files</span>
        </div>
      </div>
    </div>
  );
};
