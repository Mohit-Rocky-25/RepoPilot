"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ShieldCheck,
  Cpu,
  Terminal,
  Zap,
  AlertTriangle,
  Layers,
  ArrowLeft,
  Home,
  ArrowRight
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function DocsPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Navigation Directions: Back, Home & Workspace */}
      <div className="flex items-center justify-between pb-1">
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/");
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-surface hover:bg-theme-surface-alt border border-theme-border text-xs font-mono text-theme-text-muted hover:text-theme-text transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go Back</span>
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-surface hover:bg-theme-surface-alt border border-theme-border text-xs font-mono text-theme-text-muted hover:text-theme-text transition-all shadow-xs"
          >
            <Home className="w-3.5 h-3.5 text-theme-blue" />
            <span>Home</span>
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-blue/10 hover:bg-theme-blue/20 border border-theme-blue/30 text-xs font-mono text-theme-blue hover:text-theme-blue-hover transition-all shadow-xs"
          >
            <span>Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="pb-3 border-b border-theme-border">
        <h1 className="text-lg font-semibold text-theme-text font-mono flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-theme-blue" />
          <span>Documentation, User Guide & Limitations</span>
        </h1>
        <p className="text-xs text-theme-text-muted mt-0.5">
          Comprehensive guide to RepoPilot&apos;s zero-budget architecture, local AI integration, and capabilities.
        </p>
      </div>

      {/* Mission & Overview */}
      <Card className="p-5 space-y-3 font-mono text-xs bg-theme-surface border-theme-border shadow-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-theme-blue" />
          <h2 className="text-sm font-semibold text-theme-text uppercase">
            Product Mission & Philosophy
          </h2>
        </div>
        <p className="text-theme-text-muted leading-relaxed">
          RepoPilot is built for students, open-source contributors, and software engineers investigating unfamiliar codebases. It provides a complete, evidence-grounded workflow from URL import to code exploration, symbol navigation, 3D architecture discovery, bug analysis, and PR patch preparation — without requiring expensive cloud API subscriptions or credit cards.
        </p>
      </Card>

      {/* Core Capabilities */}
      <Card className="p-5 space-y-3 font-mono text-xs bg-theme-surface border-theme-border shadow-xs">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-theme-blue" />
          <h2 className="text-sm font-semibold text-theme-text uppercase">
            Implemented Feature Matrix
          </h2>
        </div>

        <div className="divide-y divide-theme-border border border-theme-border rounded-lg overflow-hidden">
          <div className="p-3.5 bg-theme-surface flex items-start justify-between gap-4">
            <div>
              <span className="font-semibold text-theme-text block">1. Public Repository Ingestion</span>
              <span className="text-theme-text-muted">Validates public GitHub URLs, checks SSRF safety, pins commit revisions, and retrieves recursive file trees with rate-limit tracking.</span>
            </div>
            <Badge variant="success" size="sm">FOSS / LIVE</Badge>
          </div>

          <div className="p-3.5 bg-theme-surface flex items-start justify-between gap-4">
            <div>
              <span className="font-semibold text-theme-text block">2. Code Explorer & Viewer</span>
              <span className="text-theme-text-muted">Interactive directory tree, line numbers, syntax highlighting presentation, line highlighting, and symbol definition jump chips.</span>
            </div>
            <Badge variant="success" size="sm">FOSS / LIVE</Badge>
          </div>

          <div className="p-3.5 bg-theme-surface flex items-start justify-between gap-4">
            <div>
              <span className="font-semibold text-theme-text block">3. Full-Text & Symbol Search</span>
              <span className="text-theme-text-muted">Deterministic AST symbol extraction (functions, classes, interfaces) and ranked search without AI hallucination.</span>
            </div>
            <Badge variant="success" size="sm">FOSS / LIVE</Badge>
          </div>

          <div className="p-3.5 bg-theme-surface flex items-start justify-between gap-4">
            <div>
              <span className="font-semibold text-theme-text block">4. Interactive 3D Spatial Architecture</span>
              <span className="text-theme-text-muted">Interactive 3D orbital perspective map with 2D planar mode, automatic framework detection, entry points identification, and module roles.</span>
            </div>
            <Badge variant="success" size="sm">FOSS / LIVE</Badge>
          </div>

          <div className="p-3.5 bg-theme-surface flex items-start justify-between gap-4">
            <div>
              <span className="font-semibold text-theme-text block">5. Grounded Code Assistant</span>
              <span className="text-theme-text-muted">Optional local Ollama inference with bounded context prompts, verified citation validation, and deterministic offline fallback.</span>
            </div>
            <Badge variant="primary" size="sm">OPTIONAL LOCAL AI</Badge>
          </div>

          <div className="p-3.5 bg-theme-surface flex items-start justify-between gap-4">
            <div>
              <span className="font-semibold text-theme-text block">6. Bug Investigation & Patch Review Handoff</span>
              <span className="text-theme-text-muted">Maps runtime error stack traces to repository files, formulates ranked hypotheses, generates candidate patches, regression tests, and copyable PR drafts.</span>
            </div>
            <Badge variant="success" size="sm">FOSS / LIVE</Badge>
          </div>
        </div>
      </Card>

      {/* Honest Limitations & Hardware Requirements */}
      <Card className="p-5 space-y-3 font-mono text-xs bg-theme-surface border-theme-border shadow-xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-theme-warning-text" />
          <h2 className="text-sm font-semibold text-theme-text uppercase">
            Honest Limitations & Operating Constraints
          </h2>
        </div>

        <ul className="list-disc list-inside space-y-2 text-theme-text-muted leading-relaxed pl-1">
          <li>
            <strong className="text-theme-text">GitHub API Limits:</strong> Standard tier rate limits are managed at 5,000 requests per hour. Personal Access Tokens can be configured directly in Settings to increase or refresh limits.
          </li>
          <li>
            <strong className="text-theme-text">Repository Tree Bounds:</strong> For fast browser performance and zero-budget resource efficiency, repositories are indexed up to 1,500 source files. Binary assets and build artifacts (e.g. node_modules, dist) are automatically excluded.
          </li>
          <li>
            <strong className="text-theme-text">Local AI Hardware Requirements:</strong> If using Ollama, we recommend 8GB+ RAM for lightweight coding models like <code>qwen2.5-coder:1.5b</code> or <code>llama3.2:3b</code>. No GPU is required. The platform operates 100% fine without Ollama.
          </li>
          <li>
            <strong className="text-theme-text">Execution Security:</strong> Arbitrary code execution is strictly disabled. Proposed patches require human review and local execution via the provided reproduction instructions.
          </li>
        </ul>
      </Card>
    </div>
  );
}
