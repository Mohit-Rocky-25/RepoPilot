"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bug,
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
import type { BugHypothesis, PatchProposal } from "@repopilot/core";
import type { ParsedTrace, StackFrame } from "@repopilot/debugging";
import { clientFetch } from "@/lib/api";

export default function DebuggingPage() {
  const router = useRouter();
  const { currentRepo, setIsImportModalOpen, setActiveInvestigation } = useRepository();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stackTrace, setStackTrace] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const copyReport = () => {
    if (analysisResult?.reproducibleReport) {
      navigator.clipboard.writeText(analysisResult.reproducibleReport);
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
      <Card className="p-8 text-center max-w-xl mx-auto my-12 space-y-4 bg-linear-surface-1 border border-linear-border-1">
        <div className="w-12 h-12 rounded-full bg-linear-accent/15 border border-linear-accent/30 flex items-center justify-center text-linear-accent mx-auto">
          <Bug className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-linear-text-main">
            No Active Repository
          </h2>
          <p className="text-xs text-linear-text-muted mt-1 leading-relaxed">
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
      <div className="pb-3 border-b border-linear-border-1">
        <h1 className="text-lg font-semibold text-linear-text-main font-mono flex items-center gap-2">
          <Bug className="w-5 h-5 text-linear-danger" />
          <span>Bug Investigation & Stack Trace Analyzer</span>
        </h1>
        <p className="text-xs text-linear-text-muted mt-0.5">
          Correlate runtime exceptions with repository source lines, formulate root causes, and propose testable patches.
        </p>
      </div>

      {/* Input Form */}
      <Card className="p-5 space-y-4 bg-linear-surface-1 border-linear-border-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono text-linear-text-muted mb-1 font-medium">
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
            <label className="block text-xs font-mono text-linear-text-muted mb-1 font-medium">
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-mono text-linear-text-secondary font-medium">
              Stack Trace / Error Log
            </label>
            <span className="text-[11px] font-mono text-linear-text-subtle">
              Format: Node/V8, Python tracebacks, Go panics, Rust backtraces
            </span>
          </div>
          <textarea
            rows={5}
            value={stackTrace}
            onChange={(e) => setStackTrace(e.target.value)}
            className="w-full bg-linear-surface-1 border border-linear-border-2 text-linear-text-main font-mono text-xs p-3 rounded-lg focus:outline-none focus:border-linear-accent focus:ring-1 focus:ring-linear-accent placeholder:text-linear-text-subtle transition-colors"
            placeholder="Paste your actual runtime error log or stack trace here (e.g. TypeError: Cannot read properties of undefined...)"
          />
        </div>

        {error && (
          <p className="text-xs text-linear-danger font-mono">{error}</p>
        )}

        <div className="flex justify-end">
          <Button
            variant="primary"
            size="md"
            isLoading={loading}
            icon={<AlertOctagon className="w-4 h-4" />}
            onClick={handleAnalyze}
          >
            Investigate Root Cause
          </Button>
        </div>
      </Card>

      {/* Analysis Results Display */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Parsed Frames */}
          <Card className="p-5 space-y-3 bg-linear-surface-1 border-linear-border-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-linear-danger" />
                <h2 className="text-sm font-semibold text-linear-text-main font-mono uppercase">
                  Parsed Stack Frames ({analysisResult.parsedTrace.frames.length})
                </h2>
              </div>
              {analysisResult.parsedTrace.errorType && (
                <Badge variant="danger" size="sm">
                  {analysisResult.parsedTrace.errorType}
                </Badge>
              )}
            </div>

            <div className="divide-y divide-linear-border-1 border border-linear-border-1 rounded-lg overflow-hidden font-mono text-xs">
              {analysisResult.parsedTrace.frames.map((frame: StackFrame, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-linear-surface-2 hover:bg-linear-surface-3 transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-linear-text-subtle w-6 text-right">
                      #{idx + 1}
                    </span>
                    <FileCode className="w-3.5 h-3.5 text-linear-accent shrink-0" />
                    <span className="text-linear-text-main font-medium truncate">
                      {frame.filePath}
                    </span>
                    <span className="text-linear-text-subtle">
                      :line {frame.lineNumber}
                    </span>
                    {frame.functionName && (
                      <span className="text-[11px] text-linear-text-muted">
                        in {frame.functionName}()
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/explore?file=${encodeURIComponent(frame.filePath)}&line=${frame.lineNumber}`}
                    className="text-[11px] text-linear-accent hover:text-linear-accent-hover hover:underline flex items-center gap-1 shrink-0 ml-2"
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
            <h2 className="text-xs font-mono uppercase tracking-wider text-linear-text-subtle font-semibold">
              Ranked Root-Cause Hypotheses
            </h2>

            <div className="grid grid-cols-1 gap-3">
              {analysisResult.hypotheses.map((hypo) => (
                <Card key={hypo.id} className="p-4 space-y-2 bg-linear-surface-1 border-linear-border-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="primary" size="sm">
                        Rank #{hypo.rank}
                      </Badge>
                      <span className="text-xs font-mono font-semibold text-linear-text-main">
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

                  <p className="text-xs font-mono text-linear-text-muted leading-relaxed">
                    {hypo.explanation}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* Candidate Patch Proposal */}
          {analysisResult.candidatePatch && (
            <Card className="p-5 space-y-3 bg-linear-surface-1 border-linear-border-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-linear-success" />
                  <h2 className="text-sm font-semibold text-linear-text-main font-mono uppercase">
                    Proposed Minimal Candidate Patch
                  </h2>
                </div>
                <Badge variant="neutral" size="sm">
                  Human Review Required
                </Badge>
              </div>

              <p className="text-xs text-linear-text-muted">
                {analysisResult.candidatePatch.rationale}
              </p>

              {/* Unified Diff View */}
              <div className="bg-linear-canvas border border-linear-border-1 rounded-lg p-3 overflow-x-auto font-mono text-xs">
                <pre className="text-linear-text-main leading-relaxed">
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
                            : "text-linear-text-muted px-1.5 py-0.5"
                        }
                      >
                        {line || " "}
                      </div>
                    );
                  })}
                </pre>
              </div>
            </Card>
          )}

          {/* Regression Test Suggestions */}
          {analysisResult.suggestedTests.length > 0 && (
            <Card className="p-5 space-y-3 bg-linear-surface-1 border-linear-border-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-linear-accent" />
                <h2 className="text-sm font-semibold text-linear-text-main font-mono uppercase">
                  Suggested Regression Tests
                </h2>
              </div>
              <ul className="space-y-1.5 font-mono text-xs text-linear-text-muted">
                {analysisResult.suggestedTests.map((test, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-linear-accent">✓</span>
                    <span>{test}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Actions: Copy Report & PR draft */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              icon={copied ? <Check className="w-3.5 h-3.5 text-linear-success" /> : <Copy className="w-3.5 h-3.5" />}
              onClick={copyReport}
            >
              {copied ? "Copied Report!" : "Copy Markdown Report"}
            </Button>

            {analysisResult.candidatePatch && (
              <Button
                variant="primary"
                size="sm"
                icon={<GitPullRequest className="w-3.5 h-3.5" />}
                onClick={handleSendToPatchReview}
              >
                Send Candidate Patch to Patch Review →
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
