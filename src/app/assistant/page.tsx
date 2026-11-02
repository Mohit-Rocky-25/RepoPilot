"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bot,
  Bookmark,
  Send,
  Sparkles,
  FileCode,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Code,
  HelpCircle,
  ArrowRight,
  Copy,
  Check,
  ClipboardPaste,
  Network,
  GitBranch,
  X,
  Layers,
  Cpu,
  Laptop,
  Globe,
  Sliders,
  Key
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { SourceReference, RepositoryReference } from "@repopilot/core";
import type { ParsedCitation, UncitedClaim } from "@repopilot/ai";
import { clientFetch } from "@/lib/api";
import { SaveSnapshotModal } from "@/components/modals/SaveSnapshotModal";

interface QAItem {
  id: string;
  question: string;
  answer: string;
  citations: SourceReference[];
  validatedCitations?: ParsedCitation[];
  weakCitations?: ParsedCitation[];
  uncitedClaims?: UncitedClaim[];
  modelUsed?: string;
  confidence?: string;
  timestamp: string;
  qualityWarning?: string;
  citationWarning?: string;
  contextSummary?: {
    includedFiles: string[];
    droppedFiles?: string[];
    omittedCount?: number;
    filesIncluded?: number;
    filesDropped?: number;
    tokenBudget?: number;
  };
  contextMeta?: {
    tokenBudget: number;
    includedFiles: string[];
    droppedFiles: string[];
    filesIncluded: number;
    filesDropped: number;
  };
  refused?: boolean;
  isSampleAnalysis?: boolean;
  sampleBadge?: string;
}

const SAMPLE_SWR_REPO: RepositoryReference = {
  owner: "vercel",
  repo: "swr",
  fullName: "vercel/swr",
  url: "https://github.com/vercel/swr",
  defaultBranch: "main",
  selectedRevision: "5d80486fa0d15e2193b2169ebbb0829cb250bf59"
};

export default function AssistantPage() {
  const { currentRepo, setCurrentRepo, saveRecentRepo, aiConfig, setIsImportModalOpen } = useRepository();

  const [providerMode, setProviderMode] = useState<"ollama" | "openai-compatible" | "offline">("offline");
  const [contextTokenBudget, setContextTokenBudget] = useState<number>(4000);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<QAItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [expandedContexts, setExpandedContexts] = useState<Record<string, boolean>>({});
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // visualViewport keyboard overlay detection for mobile browsers
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handleViewportChange = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOffset(Math.max(0, offset));
    };

    vv.addEventListener("resize", handleViewportChange);
    vv.addEventListener("scroll", handleViewportChange);

    return () => {
      vv.removeEventListener("resize", handleViewportChange);
      vv.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  React.useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("mode") === "sample" || urlParams.get("sample") === "true") {
        setIsSampleMode(true);
        if (!currentRepo) {
          setCurrentRepo(SAMPLE_SWR_REPO);
          saveRecentRepo(SAMPLE_SWR_REPO);
        }
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    try {
      const savedBudget = localStorage.getItem("REPOPILOT_CONTEXT_BUDGET");
      if (savedBudget) {
        const parsed = parseInt(savedBudget, 10);
        if (!isNaN(parsed) && parsed >= 500 && parsed <= 16000) {
          setContextTokenBudget(parsed);
        }
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    try {
      const byoKey = sessionStorage.getItem("REPOPILOT_BYO_AI_KEY");
      const provider = sessionStorage.getItem("REPOPILOT_AI_PROVIDER");
      if (byoKey && provider === "openai-compatible") {
        setProviderMode("openai-compatible");
      } else if (aiConfig.isAvailable) {
        setProviderMode("ollama");
      } else {
        setProviderMode("offline");
      }
    } catch {
      setProviderMode(aiConfig.isAvailable ? "ollama" : "offline");
    }
  }, [aiConfig.isAvailable]);

  // Copy states
  const [copiedOllamaCmd, setCopiedOllamaCmd] = useState(false);
  const [hideOllamaBanner, setHideOllamaBanner] = useState(false);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [copiedMermaidId, setCopiedMermaidId] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const sampleQuestions = [
    "Generate a GitHub Mermaid architecture diagram for this repository",
    "Where is the main application entry point and how does initialization work?",
    "Where are the automated tests and what test runner is configured?",
    "What is the tech stack, frameworks, and declared dependencies?",
    "Where are project configuration files and environment variables located?",
    "What database, schemas, models, or state management are used?",
    "How is API routing and network request handling structured?",
    "What are the contributing guidelines, conventions, and licenses?"
  ];

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleAsk = async (qText: string) => {
    if (!currentRepo || !qText.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await clientFetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          owner: currentRepo.owner,
          repo: currentRepo.repo,
          sha: currentRepo.selectedRevision,
          question: qText.trim(),
          providerType: aiConfig.provider || (aiConfig.baseUrl?.includes(":11434") ? "ollama" : "openai-compatible"),
          baseUrl: aiConfig.baseUrl || "http://localhost:11434",
          model: aiConfig.modelName || "qwen2.5-coder:7b",
          contextTokenBudget: contextTokenBudget,
          isSampleAnalysis: isSampleMode
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get an answer.");

      const newItem: QAItem = {
        id: "qa-" + Date.now(),
        question: qText.trim(),
        answer: data.answer,
        citations: data.citations || [],
        validatedCitations: data.validatedCitations || [],
        weakCitations: data.weakCitations || [],
        uncitedClaims: data.uncitedClaims || [],
        modelUsed: data.modelUsed,
        confidence: data.confidence,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        qualityWarning: data.qualityWarning,
        citationWarning: data.citationWarning,
        contextSummary: data.contextSummary,
        contextMeta: data.contextMeta,
        refused: data.refused,
        isSampleAnalysis: Boolean(data.isSampleAnalysis || isSampleMode),
        sampleBadge: data.sampleBadge || (isSampleMode ? "Pre-recorded example" : undefined)
      };

      setHistory((prev) => [newItem, ...prev]);
      setQuestion("");
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Request was cancelled.");
      } else {
        setError(err.message || "Failed to process question.");
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setQuestion(text.trim());
      }
    } catch (e) {
      // Browser permission denied or clipboard empty
    }
  };

  const handleCopyAnswer = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItemId(id);
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  const handleCopyMermaidOnly = (id: string, text: string) => {
    const match = text.match(/```mermaid([\s\S]*?)```/);
    const mermaidCode = match ? match[0] : text;
    navigator.clipboard.writeText(mermaidCode);
    setCopiedMermaidId(id);
    setTimeout(() => setCopiedMermaidId(null), 2000);
  };

  if (!currentRepo) {
    return (
      <Card className="p-8 text-center max-w-xl mx-auto my-12 space-y-4 bg-theme-surface border-theme-border">
        <div className="w-12 h-12 rounded-full bg-theme-blue/10 border border-theme-blue/30 flex items-center justify-center text-theme-blue mx-auto shadow-xs">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-theme-text">
            No Active Repository
          </h2>
          <p className="text-xs text-theme-text-muted mt-1 leading-relaxed">
            Import a public GitHub repository to ask questions grounded directly in indexed code files with exact citations.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/">
            <Button variant="secondary" size="md">
              Go Home
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setIsSampleMode(true);
              setCurrentRepo(SAMPLE_SWR_REPO);
              saveRecentRepo(SAMPLE_SWR_REPO);
            }}
            className="border-theme-warning/30 text-theme-warning-text hover:bg-theme-warning/10"
          >
            Sample Analysis (Pre-recorded)
          </Button>
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-theme-border gap-2">
        <div>
          <h1 className="text-lg font-semibold text-theme-text font-mono flex items-center gap-2">
            <Bot className="w-5 h-5 text-theme-blue" />
            <span>Grounded Code Assistant</span>
          </h1>
          <p className="text-xs text-theme-text-muted mt-0.5 font-mono">
            Evidence-grounded code intelligence for {currentRepo.owner}/{currentRepo.repo}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Active Mode Indicator */}
          {providerMode === "openai-compatible" ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-theme-green/10 border border-theme-green/30 text-xs font-mono text-theme-green"
              title="Active Mode: Bring-your-own key. Best quality, provider limits/costs apply."
            >
              <Globe className="w-3.5 h-3.5 text-theme-green" />
              <span>AI Mode: BYO Key (Best Quality)</span>
            </div>
          ) : providerMode === "ollama" ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-theme-blue/10 border border-theme-blue/30 text-xs font-mono text-theme-blue"
              title="Active Mode: Local Ollama. Private, hardware limited."
            >
              <Laptop className="w-3.5 h-3.5 text-theme-blue" />
              <span>AI Mode: Local Ollama ({aiConfig.modelName || "7B / 1.5B"})</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-theme-surface-alt border border-theme-border text-xs font-mono text-theme-text-muted"
              title="Active Mode: Offline mode. Always works, keyword & AST search."
            >
              <Sliders className="w-3.5 h-3.5 text-theme-text-muted" />
              <span>AI Mode: Offline (Deterministic AST/Keyword)</span>
            </div>
          )}

          {/* Context Token Budget Setting */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-theme-surface border border-theme-border text-xs font-mono text-theme-text-muted shadow-xs">
            <Layers className="w-3.5 h-3.5 text-theme-blue" />
            <span className="hidden sm:inline">Context Budget:</span>
            <select
              value={contextTokenBudget}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setContextTokenBudget(val);
                try {
                  localStorage.setItem("REPOPILOT_CONTEXT_BUDGET", val.toString());
                } catch {}
              }}
              className="bg-transparent text-theme-text font-mono text-xs focus:outline-none cursor-pointer"
              title="Configurable Context Token Budget (max 16,000 tokens)"
            >
              <option value={2000} className="bg-theme-surface text-theme-text">2,000 tokens</option>
              <option value={4000} className="bg-theme-surface text-theme-text">4,000 tokens (Default)</option>
              <option value={8000} className="bg-theme-surface text-theme-text">8,000 tokens</option>
              <option value={16000} className="bg-theme-surface text-theme-text">16,000 tokens (Max)</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !isSampleMode;
              setIsSampleMode(next);
              if (next && (!currentRepo || currentRepo.repo !== "swr")) {
                setCurrentRepo(SAMPLE_SWR_REPO);
                saveRecentRepo(SAMPLE_SWR_REPO);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
              isSampleMode
                ? "bg-theme-warning-surface border-theme-warning/30 text-theme-warning-text font-semibold shadow-xs"
                : "bg-theme-surface border-theme-border text-theme-text-muted hover:text-theme-text"
            }`}
            title="Toggle sample analysis on vercel/swr (Pre-recorded example, zero key required)"
          >
            <Sparkles className="w-3.5 h-3.5 text-theme-warning-text" />
            <span>{isSampleMode ? "Sample Active" : "Sample Analysis"}</span>
            <Badge variant="warning" size="sm" className="text-[9px]">
              Pre-recorded
            </Badge>
          </button>
          <Link href="/architecture">
            <Button variant="secondary" size="sm" icon={<Network className="w-3.5 h-3.5 text-theme-blue" />}>
              3D Spatial Map
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            icon={<Bookmark className="w-3.5 h-3.5 text-theme-blue" />}
            onClick={() => setIsSaveModalOpen(true)}
            title="Save conversation and citations to workspaces"
          >
            Save Snapshot
          </Button>
          <Link href="/settings/ai">
            <Button variant="secondary" size="sm" icon={<Cpu className="w-3.5 h-3.5 text-theme-blue" />}>
              Choose AI Setup
            </Button>
          </Link>
        </div>
      </div>

      {/* Sample Analysis Mode Active Banner */}
      {isSampleMode && (
        <div className="p-3.5 rounded-xl bg-theme-warning-surface border border-theme-warning/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-theme-warning-text shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-theme-warning-text shrink-0" />
            <span>
              <strong>Sample Analysis Mode Active:</strong> Viewing pre-recorded grounded Q&amp;A on <code>vercel/swr</code> (pinned SHA: <code>5d80486</code>). Full citations without an API key.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="warning" size="sm">
              Pre-recorded example
            </Badge>
            <button
              onClick={() => setIsSampleMode(false)}
              className="text-[11px] text-theme-warning-text hover:underline cursor-pointer"
            >
              Exit Sample
            </button>
          </div>
        </div>
      )}

      {/* Ollama Offline Guidance Banner with 1-Click Copy & Dismiss */}
      {!aiConfig.isAvailable && !hideOllamaBanner && (
        <div className="p-4 rounded-xl bg-theme-surface border border-theme-border flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs font-mono shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-theme-blue/10 border border-theme-blue/30 flex items-center justify-center shrink-0 mt-0.5">
              <Terminal className="w-4 h-4 text-theme-blue" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-theme-text font-semibold">
                  Zero-Budget Deterministic Engine Active
                </span>
                <Badge variant="neutral" size="sm">Native Offline</Badge>
              </div>
              <p className="text-theme-text-muted leading-relaxed">
                RepoPilot answers questions using fast deterministic AST and keyword search. To enable private local generative synthesis, run this command in your terminal or Git Bash:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <code className="px-3 py-1.5 rounded-lg bg-theme-surface-alt border border-theme-border text-theme-blue font-semibold text-[11px] font-mono select-all">
                  ollama run {aiConfig.modelName}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`ollama run ${aiConfig.modelName}`);
                    setCopiedOllamaCmd(true);
                    setTimeout(() => setCopiedOllamaCmd(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-surface-alt hover:bg-theme-surface border border-theme-blue/40 text-theme-blue hover:text-theme-blue-hover text-[11px] font-medium transition-all cursor-pointer shadow-xs"
                >
                  {copiedOllamaCmd ? <Check className="w-3.5 h-3.5 text-theme-green" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedOllamaCmd ? "Copied Command!" : "Copy Command"}</span>
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setHideOllamaBanner(true)}
            className="text-theme-text-muted hover:text-theme-text text-xs p-1.5 rounded hover:bg-theme-surface-alt transition-colors shrink-0 self-start cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Question Form & Quick Actions (Sticky above virtual keyboard on mobile) */}
      <div
        className="sticky bottom-14 md:bottom-2 z-20 pb-safe transition-transform bg-theme-bg/95 backdrop-blur-md pt-2"
        style={{
          transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : undefined
        }}
      >
        <Card className="p-3 sm:p-4 space-y-3 bg-theme-surface border-theme-border shadow-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(question);
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Ask a question about the repository's architecture, state, or functions..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handlePasteFromClipboard}
                icon={<ClipboardPaste className="w-4 h-4" />}
                title="Paste text from clipboard into query"
              >
                Paste
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={loading}
                icon={<Send className="w-4 h-4" />}
              >
                Ask Codebase
              </Button>
            </div>
          </form>

          {error && (
            <p className="text-xs text-theme-danger font-mono pt-1">{error}</p>
          )}

          {/* Quick Suggestion Chips */}
          <div className="pt-2 border-t border-theme-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-theme-text-muted uppercase tracking-wider block font-semibold">
                Quick Analysis & Visual Diagrams:
              </span>
              <Link
                href="/architecture"
                className="text-[11px] font-mono text-theme-blue hover:underline inline-flex items-center gap-1"
              >
                <span>View 3D Spatial Architecture</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {sampleQuestions.map((sq, i) => (
                <button
                  key={sq}
                  onClick={() => {
                    setQuestion(sq);
                    handleAsk(sq);
                  }}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-full bg-theme-surface-alt hover:bg-theme-surface border border-theme-border hover:border-theme-blue/40 text-[11px] font-mono text-theme-text-muted hover:text-theme-text transition-colors text-left flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[36px] sm:min-h-0"
                >
                  {i === 0 && <GitBranch className="w-3 h-3 text-theme-blue" />}
                  {i === 1 && <FileCode className="w-3 h-3 text-theme-green" />}
                  {i === 2 && <Network className="w-3 h-3 text-theme-blue" />}
                  <span>{sq}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Q&A Stream */}
      <div className="space-y-4">
        {history.length === 0 && (
          <Card className="p-8 text-center space-y-3 bg-theme-surface border-theme-border">
            <Bot className="w-8 h-8 text-theme-blue mx-auto opacity-70" />
            <h3 className="text-sm font-mono font-semibold text-theme-text">Grounded Code Intelligence Console</h3>
            <p className="text-xs text-theme-text-muted max-w-md mx-auto">
              Ask any question about {currentRepo.owner}/{currentRepo.repo}. Answers cite exact commit SHAs, files, and line numbers.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] font-mono text-theme-text-muted">Or try asking:</span>
              {sampleQuestions.slice(1, 3).map((sq, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuestion(sq);
                    handleAsk(sq);
                  }}
                  className="px-2.5 py-1 rounded-full bg-theme-surface-alt hover:bg-theme-surface border border-theme-border text-[11px] font-mono text-theme-blue transition-all cursor-pointer shadow-xs"
                >
                  &ldquo;{sq}&rdquo;
                </button>
              ))}
            </div>
          </Card>
        )}

        {history.map((item) => {
          const hasMermaid = item.answer.includes("```mermaid");

          return (
            <Card key={item.id} className="p-5 space-y-4 bg-theme-surface border-theme-border shadow-card">
              <div className="flex items-center justify-between border-b border-theme-border pb-2.5">
                <span className="text-sm font-semibold text-theme-text font-mono flex items-center gap-2">
                  <span className="text-theme-blue font-bold">Q:</span>
                  <span>{item.question}</span>
                </span>
                <div className="flex items-center gap-2">
                  {(item.isSampleAnalysis || item.sampleBadge || isSampleMode) && (
                    <Badge variant="warning" size="sm" className="font-mono">
                      Pre-recorded example
                    </Badge>
                  )}
                  {item.modelUsed && (
                    <Badge variant="primary" size="sm">
                      {item.modelUsed}
                    </Badge>
                  )}
                  <span className="text-[11px] font-mono text-theme-text-muted">
                    {item.timestamp}
                  </span>
                  <button
                    onClick={() => handleCopyAnswer(item.id, item.answer)}
                    className="p-1 rounded text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-alt transition-colors cursor-pointer"
                    title="Copy full answer"
                  >
                    {copiedItemId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-theme-green" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Context Summary Bar (Collapsible accordion row) */}
              {(item.contextMeta || item.contextSummary) && (
                (() => {
                  const meta = item.contextMeta || {
                    tokenBudget: item.contextSummary?.tokenBudget || 4000,
                    includedFiles: item.contextSummary?.includedFiles || [],
                    droppedFiles: item.contextSummary?.droppedFiles || [],
                    filesIncluded: item.contextSummary?.filesIncluded ?? item.contextSummary?.includedFiles?.length ?? 0,
                    filesDropped: item.contextSummary?.filesDropped ?? item.contextSummary?.omittedCount ?? 0
                  };
                  if (meta.filesIncluded === 0 && meta.filesDropped === 0) return null;
                  const isExpanded = !!expandedContexts[item.id];
                  return (
                    <div className="p-2.5 rounded-lg bg-theme-surface-alt border border-theme-border text-[11px] font-mono text-theme-text-muted space-y-1.5 shadow-xs">
                      <div
                        onClick={() => setExpandedContexts((prev) => ({ ...prev, [item.id]: !isExpanded }))}
                        className="flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-theme-text">
                          <FileCode className="w-3.5 h-3.5 text-theme-blue" />
                          <span>
                            Context used: {meta.filesIncluded} files, {meta.filesDropped} dropped
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-theme-text-muted">
                            Budget: {meta.tokenBudget.toLocaleString()} tokens
                          </span>
                          <span className="text-[10px] text-theme-blue font-semibold">
                            {isExpanded ? "Hide ▲" : "Details ▼"}
                          </span>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="space-y-1.5 pt-1.5 border-t border-theme-border/60">
                          {meta.includedFiles.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 text-[10px]">
                              <span className="text-theme-text-muted">Included:</span>
                              {meta.includedFiles.map((f) => (
                                <span key={f} className="px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-blue font-medium">
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}
                          {meta.droppedFiles.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 text-[10px]">
                              <span className="text-theme-warning-text font-medium">Dropped:</span>
                              {meta.droppedFiles.map((f) => (
                                <span key={f} className="px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-text-muted line-through">
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* Quality & Citation Warnings */}
              {item.qualityWarning && (
                <div className="p-2 rounded bg-theme-warning-surface border border-theme-warning/30 text-theme-warning-text text-[11px] font-mono flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.qualityWarning}</span>
                </div>
              )}

              {item.citationWarning && (
                <div className="p-2 rounded bg-theme-blue/10 border border-theme-blue/30 text-theme-blue text-[11px] font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.citationWarning}</span>
                </div>
              )}

              {/* Answer Content (Wrap words without horizontal overflow) */}
              <div className="text-xs text-theme-text font-mono whitespace-pre-wrap break-words overflow-x-hidden leading-relaxed">
                {item.answer}
              </div>

              {/* Special Action Bar for Mermaid Diagrams */}
              {hasMermaid && (
                <div className="p-3.5 rounded-lg bg-theme-surface-alt border border-theme-border flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-xs">
                  <div className="flex items-center gap-2 text-theme-blue">
                    <GitBranch className="w-4 h-4 shrink-0" />
                    <span className="font-semibold text-theme-text">GitHub Mermaid Diagram Ready</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyMermaidOnly(item.id, item.answer)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-surface hover:bg-theme-surface-alt border border-theme-blue/40 text-theme-blue hover:text-theme-blue-hover text-xs font-medium transition-all cursor-pointer shadow-xs"
                    >
                      {copiedMermaidId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-theme-green" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedMermaidId === item.id ? "Copied for GitHub!" : "Copy Mermaid for README"}</span>
                    </button>

                    <Link href="/architecture">
                      <Button variant="secondary" size="sm" icon={<Network className="w-3.5 h-3.5" />}>
                        Open in 3D Spatial Map →
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Citations Box */}
              {item.citations.length > 0 && (
                <div className="pt-3 border-t border-theme-border space-y-2">
                  <span className="text-[11px] font-mono text-theme-text-muted uppercase tracking-wider block font-semibold">
                    Grounding Source References:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {item.citations.map((cit, idx) => {
                      const val = item.validatedCitations?.find(
                        (v) => v.filePath === cit.filePath && v.startLine === cit.startLine
                      );
                      const isWeak = val?.isWeakSupport || val?.supportStatus === "weak";
                      const isUnverified = val ? !val.isValid : false;

                      return (
                        <Link
                          key={idx}
                          href={`/explore?file=${encodeURIComponent(cit.filePath)}&line=${cit.startLine}`}
                          className={`p-2.5 rounded-lg bg-theme-surface-alt hover:bg-theme-surface border ${
                            isUnverified
                              ? "border-theme-danger/40 hover:border-theme-danger/60"
                              : isWeak
                              ? "border-theme-warning/40 hover:border-theme-warning/60"
                              : "border-theme-border hover:border-theme-blue/40"
                          } transition-colors group font-mono text-xs block shadow-xs`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 truncate">
                              <FileCode className="w-3.5 h-3.5 text-theme-blue shrink-0" />
                              <span className="text-theme-text font-medium truncate group-hover:text-theme-blue">
                                {cit.filePath}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] text-theme-text-muted">
                                L{cit.startLine}-{cit.endLine}
                              </span>
                              {isUnverified ? (
                                <Badge variant="danger" size="sm">
                                  Unverified
                                </Badge>
                              ) : isWeak ? (
                                <Badge variant="warning" size="sm">
                                  Weak support
                                </Badge>
                              ) : (
                                <Badge variant="success" size="sm">
                                  Verified
                                </Badge>
                              )}
                            </div>
                          </div>
                          {cit.codeSnippet && (
                            <div className="mt-1.5 text-[10px] text-theme-text-muted truncate bg-theme-surface p-1 rounded border border-theme-border">
                              {cit.codeSnippet.split("\n")[0]}
                            </div>
                          )}
                          {isWeak && (
                            <div className="mt-1 text-[10px] text-theme-warning-text font-mono">
                              ⚠ Weak support: cited span has low relevance to claim
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Uncited Claims Banner */}
              {item.uncitedClaims && item.uncitedClaims.length > 0 && (
                <div className="p-3 rounded-lg bg-theme-warning-surface border border-theme-warning/30 text-theme-warning-text text-xs font-mono space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-theme-warning-text">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Uncited claims detected ({item.uncitedClaims.length}):</span>
                  </div>
                  <ul className="space-y-1 list-disc list-inside text-[11px] text-theme-warning-text">
                    {item.uncitedClaims.map((claim, idx) => (
                      <li key={idx} className="leading-relaxed">
                        &ldquo;{claim.sentence}&rdquo; — <span className="font-semibold underline">{claim.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <SaveSnapshotModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
      />
    </div>
  );
}
