"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bot,
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
  Layers
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { SourceReference } from "@repopilot/core";
import { clientFetch } from "@/lib/api";

interface QAItem {
  id: string;
  question: string;
  answer: string;
  citations: SourceReference[];
  modelUsed?: string;
  confidence?: string;
  timestamp: string;
  qualityWarning?: string;
  citationWarning?: string;
  contextSummary?: {
    includedFiles: string[];
    omittedCount: number;
  };
  refused?: boolean;
}

export default function AssistantPage() {
  const { currentRepo, aiConfig, setIsImportModalOpen } = useRepository();

  const [providerMode, setProviderMode] = useState<"ollama" | "openai-compatible" | "offline">("offline");
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<QAItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          baseUrl: aiConfig.baseUrl,
          model: aiConfig.modelName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get an answer.");

      const newItem: QAItem = {
        id: "qa-" + Date.now(),
        question: qText.trim(),
        answer: data.answer,
        citations: data.citations || [],
        modelUsed: data.modelUsed,
        confidence: data.confidence,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        qualityWarning: data.qualityWarning,
        citationWarning: data.citationWarning,
        contextSummary: data.contextSummary,
        refused: data.refused
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
      <Card className="p-8 text-center max-w-xl mx-auto my-12 space-y-4 bg-linear-surface-1 border border-linear-border-1">
        <div className="w-12 h-12 rounded-full bg-linear-accent/15 border border-linear-accent/30 flex items-center justify-center text-linear-accent mx-auto">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-linear-text-main">
            No Active Repository
          </h2>
          <p className="text-xs text-linear-text-muted mt-1 leading-relaxed">
            Import a public GitHub repository to ask questions grounded directly in indexed code files with exact citations.
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-linear-border-1 gap-2">
        <div>
          <h1 className="text-lg font-semibold text-linear-text-main font-mono flex items-center gap-2">
            <Bot className="w-5 h-5 text-linear-accent" />
            <span>Grounded Code Assistant</span>
          </h1>
          <p className="text-xs text-linear-text-muted mt-0.5 font-mono">
            Evidence-grounded code intelligence for {currentRepo.owner}/{currentRepo.repo}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {providerMode === "openai-compatible" ? (
            <Badge variant="success" size="sm" className="font-mono">
              AI: Your API key
            </Badge>
          ) : providerMode === "ollama" ? (
            <Badge variant="primary" size="sm" className="font-mono">
              AI: Local Ollama ({aiConfig.modelName})
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm" className="font-mono">
              AI: Offline (deterministic only)
            </Badge>
          )}
          <Link href="/architecture">
            <Button variant="secondary" size="sm" icon={<Network className="w-3.5 h-3.5 text-[#828FFF]" />}>
              3D Spatial Map
            </Button>
          </Link>
          <Link href="/settings/ai">
            <Button variant="secondary" size="sm">
              Configure AI
            </Button>
          </Link>
        </div>
      </div>

      {/* Ollama Offline Guidance Banner with 1-Click Copy & Dismiss */}
      {!aiConfig.isAvailable && !hideOllamaBanner && (
        <div className="p-4 rounded-xl bg-[#0F1011] border border-[#23252A] flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs font-mono shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#5E6AD2]/10 border border-[#5E6AD2]/30 flex items-center justify-center shrink-0 mt-0.5">
              <Terminal className="w-4 h-4 text-[#828FFF]" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[#F7F8F8] font-semibold">
                  Zero-Budget Deterministic Engine Active
                </span>
                <Badge variant="violet" size="sm">Native Offline</Badge>
              </div>
              <p className="text-[#8A8F98] leading-relaxed">
                RepoPilot answers questions using fast deterministic AST and keyword search. To enable private local generative synthesis, run this command in your terminal or Git Bash:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <code className="px-3 py-1.5 rounded-lg bg-[#141516] border border-[#23252A] text-[#828FFF] font-semibold text-[11px] font-mono select-all">
                  ollama run {aiConfig.modelName}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`ollama run ${aiConfig.modelName}`);
                    setCopiedOllamaCmd(true);
                    setTimeout(() => setCopiedOllamaCmd(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E1B4B] hover:bg-[#2A2663] border border-[#5E6AD2]/40 text-[#828FFF] hover:text-white text-[11px] font-medium transition-all cursor-pointer shadow-xs"
                >
                  {copiedOllamaCmd ? <Check className="w-3.5 h-3.5 text-[#27A644]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedOllamaCmd ? "Copied Command!" : "Copy Command"}</span>
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setHideOllamaBanner(true)}
            className="text-[#62666D] hover:text-[#8A8F98] text-xs p-1.5 rounded hover:bg-[#141516] transition-colors shrink-0 self-start"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Question Form & Quick Actions */}
      <Card className="p-4 space-y-3 bg-linear-surface-1 border-linear-border-1">
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
          <p className="text-xs text-linear-danger font-mono pt-1">{error}</p>
        )}

        {/* Quick Suggestion Chips */}
        <div className="pt-2 border-t border-linear-border-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-linear-text-subtle uppercase tracking-wider block font-semibold">
              Quick Analysis & Visual Diagrams:
            </span>
            <Link
              href="/architecture"
              className="text-[11px] font-mono text-[#828FFF] hover:underline inline-flex items-center gap-1"
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
                className="px-2.5 py-1 rounded-lg bg-linear-surface-2 hover:bg-linear-surface-3 border border-linear-border-1 hover:border-linear-accent/40 text-[11px] font-mono text-linear-text-muted hover:text-linear-text-main transition-colors text-left flex items-center gap-1.5"
              >
                {i === 0 && <GitBranch className="w-3 h-3 text-[#828FFF]" />}
                {i === 1 && <FileCode className="w-3 h-3 text-[#27A644]" />}
                {i === 2 && <Network className="w-3 h-3 text-[#38BDF8]" />}
                <span>{sq}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Q&A Stream */}
      <div className="space-y-4">
        {history.length === 0 && (
          <Card className="p-8 text-center space-y-3 bg-[#0F1011] border-[#23252A]">
            <Bot className="w-8 h-8 text-[#5E6AD2] mx-auto opacity-70" />
            <h3 className="text-sm font-mono font-semibold text-white">Grounded Code Intelligence Console</h3>
            <p className="text-xs text-[#8A8F98] max-w-md mx-auto">
              Ask any question about {currentRepo.owner}/{currentRepo.repo}. Answers cite exact commit SHAs, files, and line numbers.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] font-mono text-linear-text-muted">Or try asking:</span>
              {sampleQuestions.slice(1, 3).map((sq, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuestion(sq);
                    handleAsk(sq);
                  }}
                  className="px-2.5 py-1 rounded bg-[#141516] hover:bg-[#1A1B1E] border border-[#23252A] text-[11px] font-mono text-[#828FFF] transition-all cursor-pointer"
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
            <Card key={item.id} className="p-5 space-y-4 bg-linear-surface-1 border-linear-border-1">
              <div className="flex items-center justify-between border-b border-linear-border-1 pb-2.5">
                <span className="text-sm font-semibold text-linear-text-main font-mono flex items-center gap-2">
                  <span className="text-[#828FFF]">Q:</span>
                  <span>{item.question}</span>
                </span>
                <div className="flex items-center gap-2">
                  {item.modelUsed && (
                    <Badge variant="primary" size="sm">
                      {item.modelUsed}
                    </Badge>
                  )}
                  <span className="text-[11px] font-mono text-linear-text-subtle">
                    {item.timestamp}
                  </span>
                  <button
                    onClick={() => handleCopyAnswer(item.id, item.answer)}
                    className="p-1 rounded text-[#8A8F98] hover:text-[#F7F8F8] hover:bg-[#141516] transition-colors"
                    title="Copy full answer"
                  >
                    {copiedItemId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-[#27A644]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Context Summary Bar */}
              {item.contextSummary && item.contextSummary.includedFiles.length > 0 && (
                <div className="p-2.5 rounded-lg bg-[#0F1011] border border-[#23252A] text-[11px] font-mono text-[#8A8F98] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-white">
                    <FileCode className="w-3.5 h-3.5 text-[#5E6AD2]" />
                    <span>Retrieved Context ({item.contextSummary.includedFiles.length} files included{item.contextSummary.omittedCount > 0 ? `, ${item.contextSummary.omittedCount} omitted by token bound` : ""}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px] text-[#828FFF]">
                    {item.contextSummary.includedFiles.map((f) => (
                      <span key={f} className="px-1.5 py-0.5 rounded bg-[#141516] border border-[#23252A]">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quality & Citation Warnings */}
              {item.qualityWarning && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.qualityWarning}</span>
                </div>
              )}

              {item.citationWarning && (
                <div className="p-2 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.citationWarning}</span>
                </div>
              )}

              {/* Answer Content */}
              <div className="text-xs text-linear-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
                {item.answer}
              </div>

              {/* Special Action Bar for Mermaid Diagrams */}
              {hasMermaid && (
                <div className="p-3.5 rounded-lg bg-[#0F1011] border border-[#23252A] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-2 text-[#828FFF]">
                    <GitBranch className="w-4 h-4 shrink-0" />
                    <span className="font-semibold text-white">GitHub Mermaid Diagram Ready</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyMermaidOnly(item.id, item.answer)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1E1B4B] hover:bg-[#2A2663] border border-[#5E6AD2]/40 text-[#828FFF] hover:text-white text-xs font-medium transition-all"
                    >
                      {copiedMermaidId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-[#27A644]" />
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
                <div className="pt-3 border-t border-linear-border-1 space-y-2">
                  <span className="text-[11px] font-mono text-linear-text-subtle uppercase tracking-wider block font-semibold">
                    Grounding Source References:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {item.citations.map((cit, idx) => (
                      <Link
                        key={idx}
                        href={`/explore?file=${encodeURIComponent(cit.filePath)}&line=${cit.startLine}`}
                        className="p-2.5 rounded bg-linear-surface-2 hover:bg-linear-surface-3 border border-linear-border-1 hover:border-linear-accent/40 transition-colors group font-mono text-xs block"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 truncate">
                            <FileCode className="w-3.5 h-3.5 text-linear-accent shrink-0" />
                            <span className="text-linear-text-main font-medium truncate group-hover:text-linear-accent">
                              {cit.filePath}
                            </span>
                          </div>
                          <span className="text-[11px] text-linear-text-subtle shrink-0">
                            L{cit.startLine}-{cit.endLine}
                          </span>
                        </div>
                        {cit.codeSnippet && (
                          <div className="mt-1.5 text-[10px] text-linear-text-muted truncate bg-linear-surface-3 p-1 rounded border border-linear-border-1">
                            {cit.codeSnippet.split("\n")[0]}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
