"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  FolderArchive,
  Search,
  Tag,
  GitBranch,
  GitCommit,
  Clock,
  ArrowRight,
  Download,
  Trash2,
  Bot,
  Bug,
  FileCode,
  FileText,
  Plus,
  ExternalLink,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FourDots } from "@/components/ui/signature/FourDots";

export default function HistoryPage() {
  const {
    snapshots,
    loading,
    resumeSnapshot,
    deleteSnapshot,
    downloadSnapshotMarkdown,
    downloadSnapshotJson
  } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    snapshots.forEach((s) => s.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [snapshots]);

  // Filter snapshots
  const filteredSnapshots = useMemo(() => {
    return snapshots.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.repoFullName.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q) ||
        item.tags?.some((t) => t.toLowerCase().includes(q));

      const matchesTag = !selectedTag || item.tags?.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [snapshots, searchQuery, selectedTag]);

  // Metrics
  const uniqueReposCount = useMemo(() => {
    return new Set(snapshots.map((s) => s.repoFullName)).size;
  }, [snapshots]);

  const totalAssistantExchanges = useMemo(() => {
    return snapshots.reduce((acc, s) => acc + (s.assistantMessages?.length || 0), 0);
  }, [snapshots]);

  const handleResume = async (id: string) => {
    setResumingId(id);
    try {
      await resumeSnapshot(id);
    } catch (err) {
      console.error("Failed to resume workspace:", err);
      setResumingId(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete workspace "${title}"?`)) {
      setDeletingId(id);
      try {
        await deleteSnapshot(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-theme-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-theme-blue-surface border border-theme-blue/30 flex items-center justify-center text-theme-blue shrink-0">
              <FolderArchive className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-theme-text">
              Saved Workspaces &amp; History
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-theme-text-muted">
            Local-first investigation history. Resume where you left off, review verified citations, and export markdown reports.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/explore">
            <Button
              variant="primary"
              size="md"
              icon={<Plus className="w-4 h-4" />}
            >
              New Exploration
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3.5 bg-theme-surface border-theme-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-blue shrink-0">
            <FolderArchive className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-theme-text leading-tight">
              {snapshots.length}
            </div>
            <div className="text-[11px] font-mono text-theme-text-muted">
              Saved Workspaces
            </div>
          </div>
        </Card>

        <Card className="p-3.5 bg-theme-surface border-theme-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-green shrink-0">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-theme-text leading-tight">
              {uniqueReposCount}
            </div>
            <div className="text-[11px] font-mono text-theme-text-muted">
              Repositories Tracked
            </div>
          </div>
        </Card>

        <Card className="p-3.5 bg-theme-surface border-theme-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-warning-text shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold font-mono text-theme-text leading-tight">
              {totalAssistantExchanges}
            </div>
            <div className="text-[11px] font-mono text-theme-text-muted">
              Preserved Assistant Q&amp;As
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Tag Filter Bar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-theme-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved workspaces by repo name, title, tag, or notes..."
            className="w-full pl-9 pr-4 py-2.5 text-base sm:text-xs font-mono rounded-xl bg-theme-surface border border-theme-border text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-theme-blue min-h-[44px] shadow-xs"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-mono text-theme-text-muted flex items-center gap-1">
              <Tag className="w-3 h-3 text-theme-text-subtle" />
              <span>Tags:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono transition-all cursor-pointer ${
                selectedTag === null
                  ? "bg-theme-blue text-white font-medium"
                  : "bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono transition-all cursor-pointer ${
                  selectedTag === tag
                    ? "bg-theme-blue text-white font-medium"
                    : "bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Workspace Snapshots Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-theme-text-muted">
          Loading saved workspaces...
        </div>
      ) : filteredSnapshots.length === 0 ? (
        <Card className="p-8 text-center space-y-4 bg-theme-surface border-theme-border">
          <div className="w-12 h-12 rounded-full bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-text-muted mx-auto">
            <FolderArchive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-theme-text font-mono">
              {snapshots.length === 0 ? "No Saved Workspaces Yet" : "No Matching Workspaces"}
            </h2>
            <p className="text-xs text-theme-text-muted mt-1 max-w-md mx-auto leading-relaxed">
              {snapshots.length === 0
                ? "When exploring a codebase, investigating stack traces, or querying the assistant, click 'Save Snapshot' to persist your context permanently."
                : "No saved investigations match your current search and tag filters."}
            </p>
          </div>
          {snapshots.length === 0 && (
            <div className="pt-2">
              <Link href="/explore">
                <Button variant="primary" size="md" icon={<ArrowRight className="w-4 h-4" />}>
                  Start an Exploration
                </Button>
              </Link>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSnapshots.map((snap) => {
            const formattedDate = new Date(snap.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            });

            const isResuming = resumingId === snap.id;
            const isDeleting = deletingId === snap.id;

            return (
              <Card
                key={snap.id}
                className="p-4 sm:p-5 bg-theme-surface border-theme-border rounded-xl shadow-xs flex flex-col justify-between space-y-4 hover:border-theme-border-hover transition-all"
              >
                {/* Card Top: Repo & Date */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-theme-surface-alt border border-theme-border text-xs font-mono text-theme-text">
                      <span className="font-semibold truncate max-w-[200px]">{snap.repoFullName}</span>
                      <span className="text-theme-border">|</span>
                      <span className="text-theme-blue flex items-center gap-0.5">
                        <GitCommit className="w-3 h-3 text-theme-blue" />
                        {snap.commitSha.slice(0, 7)}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-theme-text-muted flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-theme-text-subtle" />
                      {formattedDate}
                    </span>
                  </div>

                  {/* Title & Notes */}
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-theme-text font-mono leading-snug">
                      {snap.title}
                    </h2>
                    {snap.notes && (
                      <p className="text-xs text-theme-text-muted mt-1 line-clamp-2 leading-relaxed">
                        {snap.notes}
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  {snap.tags && snap.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      {snap.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded bg-theme-surface-alt border border-theme-border text-[10px] font-mono text-theme-text-muted"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Context Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-mono text-theme-text-muted border-t border-theme-border">
                    {snap.activeFile && (
                      <span className="flex items-center gap-1 text-theme-text" title={`Active file: ${snap.activeFile}`}>
                        <FileCode className="w-3.5 h-3.5 text-theme-blue" />
                        <span className="truncate max-w-[150px]">{snap.activeFile.split("/").pop()}</span>
                      </span>
                    )}

                    {snap.assistantMessages && snap.assistantMessages.length > 0 && (
                      <span className="flex items-center gap-1" title={`${snap.assistantMessages.length} assistant Q&As preserved`}>
                        <Bot className="w-3.5 h-3.5 text-theme-blue" />
                        <span>{snap.assistantMessages.length} Q&amp;As</span>
                      </span>
                    )}

                    {snap.debuggingState?.candidateDiff && (
                      <span className="flex items-center gap-1 text-theme-green-text" title="Candidate patch diff saved">
                        <Bug className="w-3.5 h-3.5 text-theme-green" />
                        <span>Diff Saved</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-theme-border">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => downloadSnapshotMarkdown(snap.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-theme-text-muted hover:text-theme-text text-xs font-mono flex items-center gap-1 transition-colors min-h-[44px] sm:min-h-0"
                      title="Export Snapshot as Markdown"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">.md</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadSnapshotJson(snap.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-theme-text-muted hover:text-theme-text text-xs font-mono flex items-center gap-1 transition-colors min-h-[44px] sm:min-h-0"
                      title="Export Snapshot as JSON"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">.json</span>
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(snap.id, snap.title)}
                      className="p-1.5 rounded-lg hover:bg-theme-danger-surface text-theme-text-muted hover:text-theme-danger transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                      title="Delete Workspace"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={isResuming}
                    onClick={() => handleResume(snap.id)}
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Resume
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
