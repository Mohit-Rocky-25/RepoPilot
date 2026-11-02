"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bug,
  Bookmark,
  AlertOctagon,
  FileCode,
  ArrowRight,
  Copy,
  Check,
  GitPullRequest,
  CheckCircle2,
  Loader2,
  FileText
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRepository } from "@/context/RepositoryContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { copyToClipboard } from "@/lib/clipboard";
import { SaveSnapshotModal } from "@/components/modals/SaveSnapshotModal";
import type { BugHypothesis, PatchProposal } from "@repopilot/core";
import type { ParsedTrace, StackFrame } from "@repopilot/debugging";
import { clientFetch } from "@/lib/api";

export default function DebuggingPage() {
  const router = useRouter();
  const { currentRepo, setIsImportModalOpen, setActiveInvestigation } = useRepository();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stackTrace, setStackTrace] = useState("");
  const [wrapLines, setWrapLines] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const [analysisResult, setAnalysisResult] = useState<{
    parsedTrace: ParsedTrace;
    hypotheses: BugHypothesis[];
    candidatePatch?: PatchProposal;
    suggestedTests: string[];
    reproducibleReport: string;
  } | null>(null);

  const handleAnalyze = async () => {
    if (!currentRepo || !stackTrace.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await clientFetch("/api/debugging/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: currentRepo.owner,
          repo: currentRepo.repo,
          sha: currentRepo.selectedRevision,
          title,
          description,
          stackTrace
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");

      setAnalysisResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze bug report.");
    } finally {
      setLoading(false);
    }
  };

  const copyReport = async () => {
    if (analysisResult?.reproducibleReport) {
      await copyToClipboard(analysisResult.reproducibleReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendToPatchReview = () => {
    if (!analysisResult || !currentRepo) return;
    setActiveInvestigation({
      id: "inv-" + Date.now(),
      repoKey: currentRepo.fullName,
      commitSha: currentRepo.selectedRevision || "HEAD",
      title: title || "Runtime Exception",
      description,
      stackTrace,
      parsedTrace: analysisResult.parsedTrace,
      hypotheses: analysisResult.hypotheses,
      candidatePatch: analysisResult.candidatePatch,
      suggestedTests: analysisResult.suggestedTests,
      reproducibleReport: analysisResult.reproducibleReport,
      createdAt: new Date().toISOString()
    });
    router.push("/patches");
  };

  if (!currentRepo) {
    return (
      <Card className="p-8 text-center max-w-xl mx-auto my-12 space-y-4 bg-theme-surface border border-theme-border">
        <div className="w-12 h-12 rounded-full bg-theme-blue/15 border border-theme-blue/30 flex items-center justify-center text-theme-blue mx-auto">
          <Bug className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-theme-text">
            No Active Repository
          </h2>
          <p className="text-xs text-theme-text-muted mt-1 leading-relaxed">
            Import a public GitHub repository to map error stack traces directly to source code lines and formulate candidate bug fixes.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-theme-border">
        <h1 className="text-lg font-semibold text-theme-text font-mono flex items-center gap-2">
          <Bug className="w-5 h-5 text-theme-danger" />
          <span>Bug Investigation & Stack Trace Analyzer</span>
        </h1>
        <p className="text-xs text-theme-text-muted mt-0.5">
          Correlate runtime exceptions with repository source lines, formulate root causes, and propose testable patches.
        </p>
      </div>

      {/* Input Form */}
      <Card className="p-5 space-y-4 bg-theme-surface border-theme-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono text-theme-text-muted mb-1 font-medium">
              Issue Title / Summary
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cannot read property of undefined"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-theme-text-muted mb-1 font-medium">
              Issue Context / Description
            </label>
            <Input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Triggered on dashboard page load"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
            <label className="text-xs font-mono text-theme-text font-medium">
              Stack Trace / Error Log
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWrapLines(!wrapLines)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-theme-surface-alt hover:bg-theme-surface border border-theme-border text-theme-text-muted hover:text-theme-text transition-colors cursor-pointer"
                title="Toggle monospace line wrapping"
              >
                Wrap: {wrapLines ? "ON" : "OFF"}
              </button>
              <span className="text-[11px] font-mono text-theme-text-muted hidden sm:inline">
                Format: Node/V8, Python tracebacks, Go panics, Rust backtraces
              </span>
            </div>
          </div>
          <textarea
            rows={5}
            value={stackTrace}
            onChange={(e) => setStackTrace(e.target.value)}
            className={`w-full bg-theme-surface border border-theme-border text-theme-text font-mono text-base sm:text-xs p-3 rounded-lg focus:outline-none focus:border-theme-blue focus:ring-1 focus:ring-linear-accent placeholder:text-theme-text-muted transition-colors ${
              wrapLines ? "whitespace-pre-wrap overflow-x-hidden" : "whitespace-pre overflow-x-auto"
            }`}
            placeholder="Paste your actual runtime error log or stack trace here (e.g. TypeError: Cannot read properties of undefined...)"
          />
        </div>

        {error && (
          <p className="text-xs text-theme-danger font-mono">{error}</p>
        )}

        <div className="flex justify-end">
          <Button
            variant="primary"
            size="md"
            isLoading={loading}
            icon={<AlertOctagon className="w-4 h-4" />}
            onClick={handleAnalyze}
            className="w-full sm:w-auto"
          >
            Investigate Root Cause
          </Button>
        </div>
      </Card>

      {/* Analysis Results Display */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Parsed Frames */}
          <Card className="p-5 space-y-3 bg-theme-surface border-theme-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-theme-danger" />
                <h2 className="text-sm font-semibold text-theme-text font-mono uppercase">
                  Parsed Stack Frames ({analysisResult.parsedTrace.frames.length})
                </h2>
              </div>
              {analysisResult.parsedTrace.errorType && (
                <Badge variant="danger" size="sm">
                  {analysisResult.parsedTrace.errorType}
                </Badge>
              )}
            </div>

            <div className="divide-y divide-linear-border-1 border border-theme-border rounded-lg overflow-hidden font-mono text-xs">
              {analysisResult.parsedTrace.frames.map((frame: StackFrame, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-theme-surface-alt hover:bg-theme-surface-alt transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-theme-text-muted w-6 text-right">
                      #{idx + 1}
                    </span>
                    <FileCode className="w-3.5 h-3.5 text-theme-blue shrink-0" />
                    <span className="text-theme-text font-medium truncate">
                      {frame.filePath}
                    </span>
                    <span className="text-theme-text-muted">
                      :line {frame.lineNumber}
                    </span>
                    {frame.functionName && (
                      <span className="text-[11px] text-theme-text-muted">
                        in {frame.functionName}()
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/explore?file=${encodeURIComponent(frame.filePath)}&line=${frame.lineNumber}`}
                    className="text-[11px] text-theme-blue hover:text-theme-blue-hover hover:underline flex items-center gap-1 shrink-0 ml-2"
                  >
                    <span>View in Code</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          </Card>

          {/* Hypotheses */}
          <div className="space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-theme-text-muted font-semibold">
              Ranked Root-Cause Hypotheses
            </h2>

            <div className="grid grid-cols-1 gap-3">
              {analysisResult.hypotheses.map((hypo) => (
                <Card key={hypo.id} className="p-4 space-y-2 bg-theme-surface border-theme-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="primary" size="sm">
                        Rank #{hypo.rank}
                      </Badge>
                      <span className="text-xs font-mono font-semibold text-theme-text">
                        {hypo.culpritFile}
                        {hypo.startLine ? `:line ${hypo.startLine}` : ""}
                      </span>
                    </div>

                    <Badge
                      variant={
                        hypo.confidence === "high"
                          ? "success"
                          : hypo.confidence === "medium"
                          ? "warning"
                          : "neutral"
                      }
                      size="sm"
                    >
                      {hypo.confidence.toUpperCase()} CONFIDENCE
                    </Badge>
                  </div>

                  <p className="text-xs font-mono text-theme-text-muted leading-relaxed">
                    {hypo.explanation}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* Candidate Patch Proposal or Suggestion Scaffold */}
          {analysisResult.candidatePatch ? (
            <Card className="p-5 space-y-3 bg-theme-surface border-theme-border">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-theme-green" />
                  <h2 className="text-sm font-semibold text-theme-text font-mono uppercase">
                    Proposed Minimal Candidate Patch
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="warning" size="sm">
                    Unverified: review before applying
                  </Badge>

                  {analysisResult.candidatePatch.confidence && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${
                        analysisResult.candidatePatch.confidence === "high"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : analysisResult.candidatePatch.confidence === "medium"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      Confidence: {analysisResult.candidatePatch.confidence}
                    </span>
                  )}

                  {analysisResult.candidatePatch.typeCheckStatus && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        analysisResult.candidatePatch.typeCheckStatus === "passed"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : analysisResult.candidatePatch.typeCheckStatus === "failed"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : "bg-theme-surface-alt text-theme-text-muted border-theme-border"
                      }`}
                    >
                      Type check {analysisResult.candidatePatch.typeCheckStatus === "not_run" ? "not run" : analysisResult.candidatePatch.typeCheckStatus}
                    </span>
                  )}
                </div>
              </div>

              {analysisResult.candidatePatch.confidenceReason && (
                <p className="text-xs font-mono text-theme-text-muted bg-theme-surface-alt/60 p-2 rounded border border-theme-border">
                  <strong>Confidence Rationale:</strong> {analysisResult.candidatePatch.confidenceReason}
                </p>
              )}

              {/* Matched Stack Frame and Changed Lines (Never present diff without these) */}
              {analysisResult.candidatePatch.matchedStackFrame && analysisResult.candidatePatch.changedLines && (
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-theme-text-muted bg-theme-surface-alt p-2.5 rounded-lg border border-theme-border">
                  <span>
                    <strong className="text-theme-text">Matched Frame:</strong>{" "}
                    {analysisResult.candidatePatch.matchedStackFrame.filePath}:{analysisResult.candidatePatch.matchedStackFrame.lineNumber}
                    {analysisResult.candidatePatch.matchedStackFrame.functionName ? ` (${analysisResult.candidatePatch.matchedStackFrame.functionName})` : ""}
                  </span>
                  <span>
                    <strong className="text-theme-text">Changed Lines:</strong>{" "}
                    Lines {analysisResult.candidatePatch.changedLines.startLine}–{analysisResult.candidatePatch.changedLines.endLine} (+{analysisResult.candidatePatch.changedLines.linesAdded}, -{analysisResult.candidatePatch.changedLines.linesRemoved})
                  </span>
                </div>
              )}

              <p className="text-xs text-theme-text-muted">
                {analysisResult.candidatePatch.rationale}
              </p>

              {/* Unified Diff View */}
              <div className="bg-theme-bg border border-theme-border rounded-lg p-3 overflow-x-auto font-mono text-xs">
                <pre className="text-theme-text leading-relaxed">
                  {analysisResult.candidatePatch.diff.split("\n").map((line, idx) => {
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
                            : "text-theme-text-muted px-1.5 py-0.5"
                        }
                      >
                        {line || " "}
                      </div>
                    );
                  })}
                </pre>
              </div>
            </Card>
          ) : (
            <Card className="p-5 space-y-3 bg-theme-surface border-theme-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-theme-text-muted" />
                  <h2 className="text-sm font-semibold text-theme-text font-mono uppercase">
                    Suggestion Scaffold (No Diff Generated)
                  </h2>
                </div>
                <Badge variant="warning" size="sm">
                  Unverified: review before applying
                </Badge>
              </div>
              <p className="text-xs text-theme-text-muted">
                No AI model was configured or automated patch validation did not produce an applicable diff. Review the ranked hypotheses above and verify the stack frames.
              </p>
            </Card>
          )}

          {/* Regression Test Suggestions */}
          {analysisResult.suggestedTests && analysisResult.suggestedTests.length > 0 && (
            <Card className="p-5 space-y-3 bg-theme-surface border-theme-border">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-theme-blue" />
                <h2 className="text-sm font-semibold text-theme-text font-mono uppercase">
                  Suggested Regression Tests
                </h2>
              </div>
              <ul className="space-y-1.5 font-mono text-xs text-theme-text-muted">
                {analysisResult.suggestedTests.map((test, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-theme-blue">✓</span>
                    <span>{test}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Actions: Copy Report & PR draft */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              icon={copied ? <Check className="w-3.5 h-3.5 text-theme-green" /> : <Copy className="w-3.5 h-3.5" />}
              onClick={copyReport}
              className="w-full sm:w-auto"
            >
              {copied ? "Copied Report!" : "Copy Markdown Report"}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Bookmark className="w-3.5 h-3.5 text-theme-blue" />}
              onClick={() => setIsSaveModalOpen(true)}
              className="w-full sm:w-auto"
              title="Save investigation snapshot with stack trace and candidate patch"
            >
              Save Snapshot
            </Button>

            {analysisResult.candidatePatch && (
              <Button
                variant="primary"
                size="sm"
                icon={<GitPullRequest className="w-3.5 h-3.5" />}
                onClick={handleSendToPatchReview}
                className="w-full sm:w-auto"
              >
                Send Candidate Patch to Patch Review →
              </Button>
            )}
          </div>
        </div>
      )}
      <SaveSnapshotModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
      />
    </div>
  );
}
