"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Github, ArrowRight, AlertCircle, Clock } from "lucide-react";
import { GitHubUrlSchema } from "@repopilot/core";
import { useRepository } from "@/context/RepositoryContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { clientFetch } from "@/lib/api";

export const ImportModal: React.FC = () => {
  const router = useRouter();
  const { isImportModalOpen, setIsImportModalOpen, saveRecentRepo, setRateLimit, recentRepos } = useRepository();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isImportModalOpen) return null;

  const handleImport = async (repoUrl: string) => {
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
      setIsImportModalOpen(false);
      setUrl("");
      router.push("/explore");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-[#0F1011] border border-[#23252A] rounded-xl shadow-[0_16px_70px_rgba(0,0,0,0.85)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#23252A] bg-[#141516]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center text-[#828FFF]">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F7F8F8] tracking-tight">
                Import Public GitHub Repository
              </h3>
              <p className="text-xs text-[#8A8F98]">
                Deterministic AST symbols, 3D architecture, and evidence analysis.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsImportModalOpen(false)}
            className="text-[#8A8F98] hover:text-[#F7F8F8] p-1.5 rounded-md hover:bg-[#18191A] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (url.trim()) handleImport(url.trim());
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

          {/* Real User Recents or Honest Requirements */}
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
                      setUrl(item.url);
                      handleImport(item.url);
                    }}
                    disabled={loading}
                    className="flex flex-col text-left p-3 rounded-lg bg-[#141516] hover:bg-[#18191A] border border-[#23252A] hover:border-[#34343A] transition-all group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-mono font-medium text-[#F7F8F8] group-hover:text-[#828FFF] truncate">
                        {item.fullName}
                      </span>
                      {item.primaryLanguage && (
                        <Badge variant="primary" size="sm">
                          {item.primaryLanguage}
                        </Badge>
                      )}
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
                <li>Repository must be publicly accessible on GitHub.com.</li>
                <li>Tree is pinned to the default branch commit SHA for reproducibility.</li>
                <li>Zero API charges: operates under public GitHub REST API quota.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-[#141516] border-t border-[#23252A] text-[11px] text-[#62666D] font-mono flex items-center justify-between">
          <span>Unauthenticated REST API · Rate Limit Aware</span>
          <span className="text-[#828FFF] font-medium">₹0 Zero Budget</span>
        </div>
      </div>
    </div>
  );
};
