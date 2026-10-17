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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1011] hover:bg-[#141516] border border-[#23252A] hover:border-[#34343A] text-xs font-mono text-[#8A8F98] hover:text-[#F7F8F8] transition-all cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go Back</span>
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1011] hover:bg-[#141516] border border-[#23252A] hover:border-[#34343A] text-xs font-mono text-[#8A8F98] hover:text-[#F7F8F8] transition-all shadow-xs"
          >
            <Home className="w-3.5 h-3.5 text-[#828FFF]" />
            <span>Home</span>
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5E6AD2]/15 hover:bg-[#5E6AD2]/25 border border-[#5E6AD2]/30 text-xs font-mono text-[#828FFF] hover:text-white transition-all shadow-xs"
          >
            <span>Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

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
            <strong className="text-linear-text-main">GitHub API Limits:</strong> Standard tier rate limits are managed at 5,000 requests per hour. Personal Access Tokens can be configured directly in Settings to increase or refresh limits.
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
