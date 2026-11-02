"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  AlertCircle,
  CheckCircle2,
  User,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Eye,
  X
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useRepository } from "@/context/RepositoryContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GoogleUserNav } from "@/components/auth/GoogleUserNav";
import type { GoogleUser } from "@/lib/googleAuth";
import type { WorkspaceSnapshot } from "@/lib/workspaceStore";

export default function WorkplacePage() {
  const router = useRouter();
  const { currentRepo } = useRepository();
  const {
    snapshots,
    loading,
    resumeSnapshot,
    deleteSnapshot,
    saveCurrentSession,
    downloadSnapshotMarkdown,
    downloadSnapshotJson,
    refreshSnapshots
  } = useWorkspace();

  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "drafts" | "saved">("all");
  const [previewSnapshot, setPreviewSnapshot] = useState<WorkspaceSnapshot | null>(null);

  // New draft modal state
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftTags, setDraftTags] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch Google User
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/google/session");
        const data = await res.json();
        setGoogleUser(data.user || null);
      } catch {
        setGoogleUser(null);
      } finally {
        setUserLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    return snapshots.filter((item) => {
      // Tab filter
      if (activeTab === "drafts" && !item.isDraft) return false;
      if (activeTab === "saved" && item.isDraft) return false;

      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.repoFullName.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q) ||
        item.tags?.some((t) => t.toLowerCase().includes(q));

      // Tag filter
      const matchesTag = !selectedTag || item.tags?.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [snapshots, activeTab, searchQuery, selectedTag]);

  // Counts
  const draftCount = useMemo(() => snapshots.filter((s) => s.isDraft).length, [snapshots]);
  const savedCount = useMemo(() => snapshots.filter((s) => !s.isDraft).length, [snapshots]);

  // Unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    snapshots.forEach((s) => s.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [snapshots]);

  // Handle Quick Save Draft
  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim() && !currentRepo) return;

    setSavingDraft(true);
    try {
      const title = draftTitle.trim() || `${currentRepo?.fullName || "General"} Draft`;
      const tags = draftTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await saveCurrentSession({
        title,
        tags: ["draft", ...tags],
        notes: draftNotes.trim()
      });

      if (created) {
        // Mark explicitly as draft
        created.isDraft = true;
        created.userEmail = googleUser?.email;
        setIsDraftModalOpen(false);
        setDraftTitle("");
        setDraftNotes("");
        setDraftTags("");
        await refreshSnapshots();
      }
    } catch (err) {
      console.error("Failed to save draft:", err);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await resumeSnapshot(id);
    } catch (err) {
      console.error("Failed to resume draft:", err);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      await deleteSnapshot(id);
      if (previewSnapshot?.id === id) setPreviewSnapshot(null);
    }
  };

  const handleCopyMarkdown = (snapshot: WorkspaceSnapshot) => {
    const md = `# ${snapshot.title}\n\nRepository: ${snapshot.repoFullName}\nCommit: ${snapshot.commitSha}\nUpdated: ${snapshot.updatedAt}\n\n${snapshot.notes || ""}`;
    navigator.clipboard.writeText(md);
    setCopiedId(snapshot.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner: User Identity & Workplace Greeting */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-theme-surface to-theme-surface-alt border border-theme-border shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold text-theme-blue">
                My Workplace
              </span>
              <span className="text-theme-border">&bull;</span>
              {googleUser ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-theme-green bg-theme-green-surface px-2 py-0.5 rounded border border-theme-green/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Synced as {googleUser.email}
                </span>
              ) : (
                <span className="text-xs font-mono text-theme-text-muted">
                  Local Guest Storage
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-theme-text">
              {googleUser ? `${googleUser.name}'s Workspace & Drafts` : "Saved Workspaces & Drafts"}
            </h1>
            <p className="text-xs text-theme-text-muted max-w-2xl leading-relaxed">
              Resume your earlier explorations, bug fixes, candidate patches, and grounded AI assistant sessions anytime.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Quick Create Draft Button */}
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                if (currentRepo) {
                  setDraftTitle(`${currentRepo.fullName} Draft`);
                }
                setIsDraftModalOpen(true);
              }}
            >
              Save New Draft
            </Button>

            {/* Google Profile or Login Button */}
            <GoogleUserNav size="sm" />
          </div>
        </div>

        {/* Guest Banner if not signed in */}
        {!googleUser && !userLoading && (
          <div className="mt-4 pt-4 border-t border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-theme-text-muted">
              <Sparkles className="w-4 h-4 text-theme-blue shrink-0" />
              <span>
                Sign in with Google to maintain your drafts and repository history across all devices.
              </span>
            </div>
            <a
              href="/api/auth/google/login?returnUrl=/workplace"
              className="inline-flex items-center gap-1.5 font-medium text-theme-blue hover:underline whitespace-nowrap"
            >
              Connect Google Auth &rarr;
            </a>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center p-1 rounded-lg bg-theme-surface-alt border border-theme-border shrink-0">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all ${
              activeTab === "all"
                ? "bg-theme-surface text-theme-text font-semibold shadow-xs"
                : "text-theme-text-muted hover:text-theme-text"
            }`}
          >
            All Items ({snapshots.length})
          </button>
          <button
            onClick={() => setActiveTab("drafts")}
            className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all ${
              activeTab === "drafts"
                ? "bg-theme-surface text-theme-text font-semibold shadow-xs"
                : "text-theme-text-muted hover:text-theme-text"
            }`}
          >
            Drafts ({draftCount})
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all ${
              activeTab === "saved"
                ? "bg-theme-surface text-theme-text font-semibold shadow-xs"
                : "text-theme-text-muted hover:text-theme-text"
            }`}
          >
            Saved Snapshots ({savedCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-theme-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search drafts & workspaces..."
            className="w-full pl-8 pr-3 py-1.5 bg-theme-surface border border-theme-border rounded-lg text-xs font-mono text-theme-text placeholder:text-theme-text-subtle focus:outline-none focus:border-theme-blue focus:ring-1 focus:ring-theme-blue"
          />
        </div>
      </div>

      {/* Tag Pills */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-theme-text-muted text-[11px] font-mono mr-1">Tags:</span>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(selectedTag === t ? null : t)}
              className={`px-2 py-0.5 rounded-full font-mono text-[11px] transition-colors ${
                selectedTag === t
                  ? "bg-theme-blue text-white"
                  : "bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text"
              }`}
            >
              #{t}
            </button>
          ))}
          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              className="text-[11px] text-theme-text-muted hover:underline font-mono ml-1"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Items Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-theme-text-muted font-mono">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-theme-blue" />
          Loading workplace drafts...
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="p-8 text-center space-y-3 bg-theme-surface border border-theme-border rounded-xl">
          <div className="w-12 h-12 rounded-2xl bg-theme-surface-alt border border-theme-border flex items-center justify-center mx-auto text-theme-text-muted">
            <FolderArchive className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm text-theme-text">No Drafts or Workspaces Found</h3>
          <p className="text-xs text-theme-text-muted max-w-md mx-auto">
            {searchQuery
              ? "No drafts matched your search query. Try clearing filters."
              : "Save your active repository, prompt notes, or investigation as a draft to resume it later."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDraftModalOpen(true)}
            className="mt-2 text-xs"
          >
            Create Your First Draft
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="p-4 bg-theme-surface border border-theme-border rounded-xl flex flex-col justify-between hover:border-theme-blue/40 transition-all shadow-xs group"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-theme-text-muted font-mono mb-1">
                      <span className="truncate max-w-[200px]">{item.repoFullName}</span>
                      <span className="text-theme-border">&bull;</span>
                      <span className="text-[10px] bg-theme-surface-alt px-1.5 py-0.2 rounded border border-theme-border">
                        {item.commitSha.slice(0, 7)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm text-theme-text group-hover:text-theme-blue transition-colors truncate">
                      {item.title}
                    </h3>
                  </div>

                  {item.isDraft ? (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-theme-yellow-surface text-theme-yellow border border-theme-yellow/30 font-semibold shrink-0">
                      Draft
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-theme-green-surface text-theme-green border border-theme-green/30 font-semibold shrink-0">
                      Saved
                    </span>
                  )}
                </div>

                {/* Notes preview */}
                {item.notes && (
                  <p className="text-xs text-theme-text-muted line-clamp-2 leading-relaxed">
                    {item.notes}
                  </p>
                )}

                {/* Badges / Stats */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-theme-text-muted">
                  {item.assistantMessages?.length > 0 && (
                    <span className="inline-flex items-center gap-1 bg-theme-surface-alt px-2 py-0.5 rounded border border-theme-border">
                      <Bot className="w-3 h-3 text-theme-blue" />
                      {item.assistantMessages.length} Q&amp;As
                    </span>
                  )}
                  {item.debuggingState && (
                    <span className="inline-flex items-center gap-1 bg-theme-surface-alt px-2 py-0.5 rounded border border-theme-border">
                      <Bug className="w-3 h-3 text-theme-red" />
                      Bug Trace
                    </span>
                  )}
                  {item.pinnedFiles?.length > 0 && (
                    <span className="inline-flex items-center gap-1 bg-theme-surface-alt px-2 py-0.5 rounded border border-theme-border">
                      <FileCode className="w-3 h-3 text-theme-text-subtle" />
                      {item.pinnedFiles.length} Files
                    </span>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 mt-3 border-t border-theme-border flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-theme-text-subtle">
                  {new Date(item.updatedAt || item.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPreviewSnapshot(item)}
                    className="p-1.5 rounded hover:bg-theme-surface-alt text-theme-text-muted hover:text-theme-text transition-colors"
                    title="Quick Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleCopyMarkdown(item)}
                    className="p-1.5 rounded hover:bg-theme-surface-alt text-theme-text-muted hover:text-theme-text transition-colors"
                    title="Copy Markdown"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-theme-green" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(item.id, item.title)}
                    className="p-1.5 rounded hover:bg-theme-red-surface text-theme-text-muted hover:text-theme-red transition-colors"
                    title="Delete Draft"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleResume(item.id)}
                    className="text-xs ml-1"
                  >
                    Resume &rarr;
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* PREVIEW MODAL / DRAWER */}
      {previewSnapshot && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-theme-surface border border-theme-border rounded-2xl shadow-card overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 border-b border-theme-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-theme-text">{previewSnapshot.title}</h3>
                  {previewSnapshot.isDraft ? (
                    <Badge variant="warning" size="sm">Draft</Badge>
                  ) : (
                    <Badge variant="success" size="sm">Saved</Badge>
                  )}
                </div>
                <span className="text-xs font-mono text-theme-text-muted">{previewSnapshot.repoFullName}</span>
              </div>
              <button
                onClick={() => setPreviewSnapshot(null)}
                className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-alt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs font-mono">
              {previewSnapshot.notes && (
                <div className="space-y-1">
                  <span className="text-theme-text-muted uppercase text-[10px] font-semibold">Notes &amp; Hypotheses</span>
                  <pre className="p-3 rounded-lg bg-theme-surface-alt border border-theme-border font-sans text-xs text-theme-text whitespace-pre-wrap">
                    {previewSnapshot.notes}
                  </pre>
                </div>
              )}

              {previewSnapshot.assistantMessages?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-theme-text-muted uppercase text-[10px] font-semibold">
                    Saved Assistant Q&amp;As ({previewSnapshot.assistantMessages.length})
                  </span>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {previewSnapshot.assistantMessages.map((msg, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-theme-surface-alt border border-theme-border">
                        <span className="font-semibold text-theme-blue block mb-1">
                          {msg.role === "user" ? "Q:" : "A:"}
                        </span>
                        <p className="font-sans text-theme-text leading-relaxed">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewSnapshot.debuggingState?.candidateDiff && (
                <div className="space-y-1">
                  <span className="text-theme-text-muted uppercase text-[10px] font-semibold">Candidate Diff</span>
                  <pre className="p-3 rounded-lg bg-theme-surface-alt border border-theme-border text-[11px] text-theme-text overflow-x-auto">
                    {previewSnapshot.debuggingState.candidateDiff}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-theme-border flex items-center justify-between">
              <span className="text-xs text-theme-text-muted">
                Revision: {previewSnapshot.commitSha.slice(0, 7)}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleCopyMarkdown(previewSnapshot)}>
                  Copy Markdown
                </Button>
                <Button variant="primary" size="sm" onClick={() => handleResume(previewSnapshot.id)}>
                  Resume Draft &rarr;
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW DRAFT MODAL */}
      {isDraftModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-theme-surface border border-theme-border rounded-2xl shadow-card overflow-hidden">
            <form onSubmit={handleCreateDraft}>
              <div className="p-4 border-b border-theme-border flex items-center justify-between">
                <h3 className="font-bold text-sm text-theme-text">Save Workplace Draft</h3>
                <button
                  type="button"
                  onClick={() => setIsDraftModalOpen(false)}
                  className="p-1 rounded text-theme-text-muted hover:text-theme-text"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-theme-text mb-1">Draft Title</label>
                  <input
                    type="text"
                    required
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="e.g. Auth Token Leak Investigation"
                    className="w-full px-3 py-1.5 rounded-lg bg-theme-surface-alt border border-theme-border text-theme-text font-mono text-xs focus:outline-none focus:border-theme-blue"
                  />
                </div>

                <div>
                  <label className="block font-medium text-theme-text mb-1">Notes &amp; Observations</label>
                  <textarea
                    rows={4}
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    placeholder="Document your current bug findings, ideas, or to-dos..."
                    className="w-full px-3 py-1.5 rounded-lg bg-theme-surface-alt border border-theme-border text-theme-text font-mono text-xs focus:outline-none focus:border-theme-blue"
                  />
                </div>

                <div>
                  <label className="block font-medium text-theme-text mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={draftTags}
                    onChange={(e) => setDraftTags(e.target.value)}
                    placeholder="auth, bugfix, security"
                    className="w-full px-3 py-1.5 rounded-lg bg-theme-surface-alt border border-theme-border text-theme-text font-mono text-xs focus:outline-none focus:border-theme-blue"
                  />
                </div>

                {currentRepo && (
                  <p className="text-[11px] text-theme-text-muted">
                    Linking with active repository: <strong>{currentRepo.fullName}</strong>
                  </p>
                )}
              </div>

              <div className="p-4 border-t border-theme-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDraftModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={savingDraft}>
                  {savingDraft ? "Saving..." : "Save Draft"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
