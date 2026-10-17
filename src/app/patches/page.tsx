"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  GitPullRequest,
  CheckCircle2,
  FileCode,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Terminal,
  ExternalLink,
  Trash2,
  GitCommit,
  Clock
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function PatchesPage() {
  const { currentRepo, activeInvestigation, setActiveInvestigation, setIsImportModalOpen } = useRepository();
  const [copiedDiff, setCopiedDiff] = useState(false);
  const [copiedPR, setCopiedPR] = useState(false);

  const copyDiff = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  const copyPRMarkdown = (markdown: string) => {
    navigator.clipboard.writeText(markdown);
    setCopiedPR(true);
    setTimeout(() => setCopiedPR(false), 2000);
  };

  if (!currentRepo) {
    return (
      <Card className="p-8 text-center max-w-xl mx-auto my-12 space-y-4 bg-linear-surface-1 border border-linear-border-1">
        <div className="w-12 h-12 rounded-full bg-linear-accent/15 border border-linear-accent/30 flex items-center justify-center text-linear-accent mx-auto">
          <GitPullRequest className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-linear-text-main">
            No Active Repository
          </h2>
          <p className="text-xs text-linear-text-muted mt-1 leading-relaxed">
            Import a public GitHub repository to review proposed candidate diffs, regression test recommendations, and export reproducible PR drafts.
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
            Import Repository
          </Button>
        </div>
      </Card>
    );
  }

  // Generate reproducible PR markdown draft if candidate patch exists
  const candidate = activeInvestigation?.candidatePatch;
  const prDraft = activeInvestigation && candidate
    ? `### Summary of Changes
This pull request addresses the runtime exception discovered during investigation:
**${activeInvestigation.title}**

### Root Cause Analysis
${activeInvestigation.hypotheses?.[0]?.explanation || "Unchecked property access or boundary error identified during stack trace parsing."}

### Target File
\`${candidate.filePath}\`

### Proposed Unified Diff
\`\`\`diff
${candidate.diff}
\`\`\`

### Verification & Regression Tests
${activeInvestigation.suggestedTests?.map(t => `- [ ] ${t}`).join("\n") || "- [ ] Verify fix locally"}

---
*Generated autonomously by [RepoPilot](https://github.com/Mohit-Rocky-25/RepoPilot) Codebase Intelligence.*`
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-linear-border-1 gap-2">
        <div>
          <h1 className="text-lg font-semibold text-linear-text-main font-mono flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-linear-accent" />
            <span>Patch Review & Pull Request Export</span>
          </h1>
          <p className="text-xs text-linear-text-muted mt-0.5">
            Review candidate minimal unified diffs and prepare reproducible PR drafts for {currentRepo.owner}/{currentRepo.repo}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeInvestigation && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5 text-linear-text-muted" />}
              onClick={() => setActiveInvestigation(null)}
            >
              Clear Candidate
            </Button>
          )}
          <Badge variant="neutral" size="sm">
            Human Review Required
          </Badge>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="p-4 rounded-lg bg-linear-surface-1 border border-linear-border-1 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-linear-warning shrink-0 mt-0.5" />
        <div className="text-xs font-mono space-y-1">
          <span className="text-linear-text-main font-semibold block">
            Zero-Budget Security Policy: No Arbitrary Auto-Patch Execution
          </span>
          <p className="text-linear-text-muted leading-relaxed">
            In adherence to strict open-source developer safety standards, RepoPilot does not execute or apply patches directly to arbitrary repositories without explicit human approval. Review the proposed diff, run the suggested regression tests locally, and submit via GitHub PR.
          </p>
        </div>
      </div>

      {/* Active Investigation Handoff Card */}
      {activeInvestigation && candidate ? (
        <div className="space-y-6">
          {/* Metadata Card */}
          <Card className="p-5 space-y-3 bg-linear-surface-1 border-linear-border-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-linear-border-1 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="primary" size="sm">
                    Active Candidate Patch
                  </Badge>
                  <span className="text-xs font-mono text-linear-text-subtle flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(activeInvestigation.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <h2 className="text-sm font-semibold text-linear-text-main font-mono mt-1">
                  {activeInvestigation.title}
                </h2>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs text-linear-text-subtle">
                <GitCommit className="w-3.5 h-3.5 text-linear-text-subtle" />
                <span>Commit: {activeInvestigation.commitSha.slice(0, 7)}</span>
              </div>
            </div>

            {activeInvestigation.hypotheses?.[0] && (
              <div className="p-3 bg-linear-surface-2 border border-linear-border-1 rounded-lg space-y-1 font-mono text-xs">
                <span className="text-linear-text-main font-semibold block">
                  Root Cause Rationale:
                </span>
                <p className="text-linear-text-muted leading-relaxed">
                  {activeInvestigation.hypotheses[0].explanation}
                </p>
              </div>
            )}
          </Card>

          {/* Unified Diff View */}
          <Card className="p-5 space-y-4 bg-linear-surface-1 border-linear-border-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-linear-accent" />
                <span className="text-sm font-semibold text-linear-text-main font-mono">
                  {candidate.filePath}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/explore?file=${encodeURIComponent(candidate.filePath)}`}
                  className="text-xs font-mono text-linear-accent hover:text-linear-accent-hover hover:underline flex items-center gap-1"
                >
                  <span>Open Source File</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <Badge variant="warning" size="sm">
                  Candidate Diff
                </Badge>
              </div>
            </div>

            <p className="text-xs text-linear-text-muted">
              {candidate.rationale}
            </p>

            <div className="bg-linear-canvas border border-linear-border-1 rounded-lg p-3 overflow-x-auto font-mono text-xs">
              <pre className="text-linear-text-main leading-relaxed">
                {candidate.diff.split("\n").map((line, idx) => {
                  const isAdd = line.startsWith("+");
                  const isDel = line.startsWith("-");
                  return (
                    <div
                      key={idx}
                      className={
                        isAdd
                          ? "bg-emerald-950/40 text-emerald-300 font-medium px-1.5 py-0.5 rounded-xs"
                          : isDel
                          ? "bg-rose-950/40 text-rose-300 font-medium px-1.5 py-0.5 rounded-xs"
                          : "text-linear-text-muted px-1.5 py-0.5"
                      }
                    >
                      {line || " "}
                    </div>
                  );
                })}
              </pre>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                icon={copiedDiff ? <Check className="w-3.5 h-3.5 text-linear-success" /> : <Copy className="w-3.5 h-3.5" />}
                onClick={() => copyDiff(candidate.diff)}
              >
                {copiedDiff ? "Copied Diff!" : "Copy Unified Diff"}
              </Button>
            </div>
          </Card>

          {/* Suggested Regression Tests */}
          {activeInvestigation.suggestedTests && activeInvestigation.suggestedTests.length > 0 && (
            <Card className="p-5 space-y-3 bg-linear-surface-1 border-linear-border-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-linear-accent" />
                <h2 className="text-sm font-semibold text-linear-text-main font-mono uppercase">
                  Required Regression Verification
                </h2>
              </div>
              <ul className="space-y-1.5 font-mono text-xs text-linear-text-muted">
                {activeInvestigation.suggestedTests.map((test, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-linear-accent font-bold">✓</span>
                    <span>{test}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Pull Request Draft Markdown Export */}
          <Card className="p-5 space-y-3 bg-linear-surface-1 border-linear-border-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-linear-accent" />
                <h2 className="text-sm font-semibold text-linear-text-main font-mono uppercase">
                  Reproducible Pull Request Draft
                </h2>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={copiedPR ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                onClick={() => copyPRMarkdown(prDraft)}
              >
                {copiedPR ? "Copied PR Draft!" : "Copy PR Markdown Draft"}
              </Button>
            </div>

            <div className="bg-linear-canvas border border-linear-border-1 rounded-lg p-3 font-mono text-xs text-linear-text-secondary whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {prDraft}
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="p-8 text-center max-w-2xl mx-auto space-y-4 bg-linear-surface-1 border-linear-border-1">
            <div className="w-12 h-12 rounded-full bg-linear-surface-2 border border-linear-border-1 flex items-center justify-center text-linear-text-muted mx-auto">
              <GitPullRequest className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold text-linear-text-main font-mono">
                No Candidate Patches Formulated Yet
              </h2>
              <p className="text-xs text-linear-text-muted leading-relaxed max-w-lg mx-auto">
                Candidate patches are generated dynamically during bug investigation. Paste an exception log or stack trace from {currentRepo.owner}/{currentRepo.repo} into the Bug Investigation workspace to correlate source lines, formulate root causes, and propose a minimal unified diff.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/debugging">
                <Button variant="primary" size="md" icon={<ArrowRight className="w-4 h-4" />}>
                  Launch Bug Investigation
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
