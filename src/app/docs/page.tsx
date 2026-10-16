"use client";

import React from "react";
import { BookOpen, ShieldCheck, Cpu, Terminal, Zap, AlertTriangle, Layers } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function DocsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-3 border-b border-linear-border-1">
        <h1 className="text-lg font-semibold text-linear-text-main font-mono flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-linear-accent" />
          <span>Documentation, User Guide & Limitations</span>
        </h1>
        <p className="text-xs text-linear-text-muted mt-0.5">
          Comprehensive guide to RepoPilot's zero-budget architecture, local AI integration, and capabilities.
        </p>
      </div>

      {/* Mission & Overview */}
      <Card className="p-5 space-y-3 font-mono text-xs bg-linear-surface-1 border-linear-border-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-linear-accent" />
          <h2 className="text-sm font-semibold text-linear-text-main uppercase">
            Product Mission & Philosophy
          </h2>
        </div>
        <p className="text-linear-text-muted leading-relaxed">
          RepoPilot is built for students, open-source contributors, and software engineers investigating unfamiliar codebases. It provides a complete, evidence-grounded workflow from URL import to code exploration, symbol navigation, 3D architecture discovery, bug analysis, and PR patch preparation — without requiring expensive cloud API subscriptions or credit cards.
        </p>
      </Card>

      {/* Core Capabilities */}
      <Card className="p-5 space-y-3 font-mono text-xs bg-linear-surface-1 border-linear-border-1">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-linear-accent" />
          <h2 className="text-sm font-semibold text-linear-text-main uppercase">
            Implemented Feature Matrix
          </h2>
        </div>

        <div className="divide-y divide-linear-border-1 border border-linear-border-1 rounded-lg overflow-hidden">
          <div className="p-3.5 bg-linear-surface-1 flex items-start justify-between gap-4">
            <div>
              <span className="font-semibold text-linear-text-main block">1. Public Repository Ingestion</span>
              <span className="text-linear-text-muted">Validates public GitHub URLs, checks SSRF safety, pins commit revisions, and retrieves recursive file trees with rate-limit tracking.</span>
            </div>
            <Badge variant="success" size="sm">FOSS / LIVE</Badge>
          </div>

          <div className="p-3.5 bg-linear-surface-1 flex items-start justify-between gap-4">
            <div>
              <span className="font-semibold text-linear-text-main block">2. Code Explorer & Viewer</span>
              <span className="text-linear-text-muted">Interactive directory tree, line numbers, syntax highlighting presentation, line highlighting, and symbol definition jump chips.</span>
            </div>
            <Badge variant="success" size="sm">FOSS / LIVE</Badge>
          </div>

          <div className="p-3.5 bg-linear-surface-1 flex items-start justify-between gap-4">
            <div>
              <span className="font-semibold text-linear-text-main block">3. Full-Text & Symbol Search</span>
              <span className="text-linear-text-muted">Deterministic AST symbol extraction (functions, classes, interfaces) and ranked search without AI hallucination.</span>
            </div>
            <Badge variant="success" size="sm">FOSS / LIVE</Badge>
          </div>

          <div className="p-3.5 bg-linear-surface-1 flex items-start justify-between gap-4">
            <div>
              <span className="font-semibold text-linear-text-main block">4. Interactive 3D Spatial Architecture</span>
              <span className="text-linear-text-muted">Interactive 3D orbital perspective map with 2D planar mode, automatic framework detection, entry points identification, and module roles.</span>
            </div>
            <Badge variant="success" size="sm">FOSS / LIVE</Badge>
          </div>

          <div className="p-3.5 bg-linear-surface-1 flex items-start justify-between gap-4">
            <div>
              <span className="font-semibold text-linear-text-main block">5. Grounded Code Assistant</span>
              <span className="text-linear-text-muted">Optional local Ollama inference with bounded context prompts, verified citation validation, and deterministic offline fallback.</span>
            </div>
            <Badge variant="primary" size="sm">OPTIONAL LOCAL AI</Badge>
          </div>

          <div className="p-3.5 bg-linear-surface-1 flex items-start justify-between gap-4">
            <div>
              <span className="font-semibold text-linear-text-main block">6. Bug Investigation & Patch Review Handoff</span>
              <span className="text-linear-text-muted">Maps runtime error stack traces to repository files, formulates ranked hypotheses, generates candidate patches, regression tests, and copyable PR drafts.</span>
            </div>
            <Badge variant="success" size="sm">FOSS / LIVE</Badge>
          </div>
        </div>
      </Card>

      {/* Honest Limitations & Hardware Requirements */}
      <Card className="p-5 space-y-3 font-mono text-xs bg-linear-surface-1 border-linear-border-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-linear-warning" />
          <h2 className="text-sm font-semibold text-linear-text-main uppercase">
            Honest Limitations & Operating Constraints
          </h2>
        </div>

        <ul className="list-disc list-inside space-y-2 text-linear-text-muted leading-relaxed pl-1">
          <li>
            <strong className="text-linear-text-main">GitHub API Limits:</strong> Unauthenticated public GitHub access is capped by GitHub at 60 requests per hour per IP. To increase this to 5,000 req/hr, configure an optional Personal Access Token or GitHub CLI token in Settings.
          </li>
          <li>
            <strong className="text-linear-text-main">Repository Tree Bounds:</strong> For fast browser performance and zero-budget resource efficiency, repositories are indexed up to 1,500 source files. Binary assets and build artifacts (e.g. node_modules, dist) are automatically excluded.
          </li>
          <li>
            <strong className="text-linear-text-main">Local AI Hardware Requirements:</strong> If using Ollama, we recommend 8GB+ RAM for lightweight coding models like <code>qwen2.5-coder:1.5b</code> or <code>llama3.2:3b</code>. No GPU is required. The platform operates 100% fine without Ollama.
          </li>
          <li>
            <strong className="text-linear-text-main">Execution Security:</strong> Arbitrary code execution is strictly disabled. Proposed patches require human review and local execution via the provided reproduction instructions.
          </li>
        </ul>
      </Card>
    </div>
  );
}
