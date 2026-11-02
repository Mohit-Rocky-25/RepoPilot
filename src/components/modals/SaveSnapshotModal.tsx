"use client";

import React, { useState, useEffect } from "react";
import {
  Bookmark,
  X,
  Check,
  Tag,
  FileText,
  GitCommit,
  GitBranch,
  Bot,
  Bug,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Button } from "@/components/ui/Button";

interface SaveSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile?: string;
  activeLine?: number;
}

export const SaveSnapshotModal: React.FC<SaveSnapshotModalProps> = ({
  isOpen,
  onClose,
  activeFile,
  activeLine
}) => {
  const { currentRepo, activeInvestigation } = useRepository();
  const { saveCurrentSession } = useWorkspace();

  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && currentRepo) {
      setTitle(
        activeFile
          ? `Analysis of ${activeFile.split("/").pop()} in ${currentRepo.repo}`
          : `${currentRepo.fullName} Investigation`
      );
      setTagsInput("");
      setNotes("");
      setSavedSuccess(false);
    }
  }, [isOpen, currentRepo, activeFile]);

  // Escape key listener & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !currentRepo) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await saveCurrentSession({
        title: title.trim(),
        tags,
        notes: notes.trim(),
        activeFile,
        activeLine
      });

      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
        setSavedSuccess(false);
      }, 1200);
    } catch (err) {
      console.error("Failed to save workspace snapshot:", err);
    } finally {
      setSaving(false);
    }
  };

  const commitSha = currentRepo.selectedRevision || (currentRepo as any).commitSha || "HEAD";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="snapshot-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full sm:max-w-lg bg-theme-surface border border-theme-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90dvh] pb-safe sm:pb-0">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex items-center justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-12 h-1.5 rounded-full bg-theme-border-subtle" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-theme-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-theme-blue-surface border border-theme-blue/30 flex items-center justify-center text-theme-blue shrink-0">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h2 id="snapshot-modal-title" className="text-sm font-semibold text-theme-text font-mono">
                Save Workspace Snapshot
              </h2>
              <p className="text-[11px] text-theme-text-muted">
                Persist your investigation notes and context locally.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-theme-surface-alt text-theme-text-muted hover:text-theme-text flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Repository Coordinates Pill */}
          <div className="p-2.5 rounded-lg bg-theme-surface-alt border border-theme-border text-xs font-mono flex items-center justify-between gap-2">
            <div className="truncate flex items-center gap-2">
              <span className="font-semibold text-theme-text truncate">{currentRepo.fullName}</span>
              <span className="text-theme-text-subtle">·</span>
              <span className="text-theme-blue flex items-center gap-1 shrink-0">
                <GitBranch className="w-3 h-3" />
                {currentRepo.defaultBranch || "main"}
              </span>
            </div>
            <span className="text-theme-text-muted flex items-center gap-1 shrink-0 text-[11px]">
              <GitCommit className="w-3 h-3 text-theme-text-subtle" />
              {commitSha.slice(0, 7)}
            </span>
          </div>

          {/* Title Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-theme-text block">
              Workspace Title <span className="text-theme-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g. Auth Token Expiry Investigation"
              className="w-full px-3 py-2 text-base sm:text-xs font-mono rounded-lg bg-theme-surface border border-theme-border text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-theme-blue min-h-[44px] sm:min-h-0"
            />
          </div>

          {/* Tags Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-theme-text flex items-center gap-1">
              <Tag className="w-3 h-3 text-theme-text-muted" />
              <span>Tags (comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="auth, bug-fix, critical, memory"
              className="w-full px-3 py-2 text-base sm:text-xs font-mono rounded-lg bg-theme-surface border border-theme-border text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-theme-blue min-h-[44px] sm:min-h-0"
            />
          </div>

          {/* Developer Notes Scratchpad */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-theme-text flex items-center gap-1">
              <FileText className="w-3 h-3 text-theme-text-muted" />
              <span>Investigation Notes & Hypotheses</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record findings, suspected root cause, or reproduction steps to review when you return..."
              className="w-full px-3 py-2 text-base sm:text-xs font-sans rounded-lg bg-theme-surface border border-theme-border text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-theme-blue resize-none"
            />
          </div>

          {/* What Context Will Be Saved */}
          <div className="p-3 rounded-xl bg-theme-surface border border-theme-border space-y-1.5 text-[11px] font-mono text-theme-text-muted">
            <span className="font-semibold text-theme-text block uppercase tracking-wider text-[10px]">
              Snapshot Inclusions:
            </span>
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-theme-green shrink-0" />
                <span>Pinned Commit SHA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-theme-green shrink-0" />
                <span>{activeFile ? "Active Code File" : "Repository Root"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-theme-blue shrink-0" />
                <span>Assistant Q&amp;A History</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bug className="w-3.5 h-3.5 text-theme-warning-text shrink-0" />
                <span>{activeInvestigation?.candidatePatch ? "Candidate Diff" : "Investigation State"}</span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-theme-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={saving}
              disabled={!title.trim() || savedSuccess}
              icon={savedSuccess ? <Check className="w-4 h-4 text-white" /> : <Bookmark className="w-4 h-4" />}
            >
              {savedSuccess ? "Saved to Workspaces!" : "Save Snapshot"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
