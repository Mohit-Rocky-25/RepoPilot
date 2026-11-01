"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderTree,
  Search,
  Cpu,
  Bot,
  Bug,
  GitPullRequest,
  Github,
  ArrowRight,
  ShieldCheck,
  Zap,
  Terminal,
  Activity,
  GitBranch,
  GitCommit,
  CheckCircle2,
  FileCode,
  Layers,
  Code2,
  Lock,
  Compass,
  BookOpen,
  Sparkles,
  Check,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Clock
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { FourDots, AccentCard } from "@/components/ui/signature";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { clientFetch } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const { currentRepo, setIsImportModalOpen, saveRecentRepo, recentRepos } = useRepository();
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleHeroImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await clientFetch("/api/github/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: repoUrl.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import repository");

      saveRecentRepo(data.repository);
      router.push("/explore");
    } catch (err: any) {
      setError(err.message || "Failed to import repository");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text font-sans antialiased selection:bg-theme-blue/20">
      {/* SECTION 1: HERO */}
      <section className="relative px-6 lg:px-12 pt-12 pb-20 md:pt-16 md:pb-28 overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-theme-blue/5 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          {/* Badge with Google/GDG signature 4-dot motif & Landing Page Theme Switcher */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-theme-surface border border-theme-border text-theme-text text-xs font-mono shadow-xs">
              <FourDots size="xs" animated />
              <span className="font-semibold text-theme-text">RepoPilot v1.0</span>
              <span className="text-theme-border">|</span>
              <span className="text-theme-text-muted">Evidence-First Codebase Intelligence</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-theme-surface border border-theme-border text-xs font-mono shadow-xs">
              <span className="text-[11px] text-theme-text-muted font-medium">Theme:</span>
              <ThemeSwitcher size="sm" showLabels />
            </div>
          </div>

          {/* Editorial Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-theme-text leading-[1.08] max-w-4xl mx-auto">
            Understand any codebase.
            <br />
            <span className="text-theme-blue">Trace the evidence.</span>
            <br />
            Find the fix.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-theme-text-muted max-w-2xl mx-auto leading-relaxed font-normal">
            A developer platform for contributors and software engineers.
            Explore unfamiliar architectures, search symbols deterministically, and investigate bugs with evidence-backed local AI — with zero mandatory cloud API costs.
          </p>

          {/* Hero Repository Input Form */}
          <div className="pt-4 max-w-xl mx-auto w-full">
            <form
              onSubmit={handleHeroImport}
              className="flex flex-col sm:flex-row gap-2 p-1.5 bg-theme-surface border border-theme-border rounded-xl shadow-card focus-within:border-theme-blue focus-within:ring-2 focus-within:ring-theme-blue/20 transition-all"
            >
              <div className="flex-1 flex items-center px-3 gap-2">
                <Github className="w-4 h-4 text-theme-text-muted shrink-0" />
                <input
                  type="text"
                  placeholder="https://github.com/owner/repository"
                  value={repoUrl}
                  onChange={(e) => {
                    setRepoUrl(e.target.value);
                    setError(null);
                  }}
                  disabled={loading}
                  className="w-full bg-transparent text-base sm:text-sm text-theme-text placeholder:text-theme-text-muted font-mono focus:outline-none min-h-[44px] sm:min-h-0"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-lg bg-theme-blue text-white text-sm sm:text-xs font-semibold hover:bg-theme-blue-hover transition-all disabled:opacity-60 shrink-0 shadow-xs cursor-pointer min-h-[44px]"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Resolving Commit...</span>
                  </>
                ) : (
                  <>
                    <span>Begin Exploration</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Local Folder Option Directly Below */}
            <div className="pt-2.5 text-center">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-alt text-xs font-mono text-theme-text-muted hover:text-theme-text transition-all shadow-xs cursor-pointer min-h-[44px]"
              >
                <FolderTree className="w-4 h-4 text-theme-blue" />
                <span>Or open a local folder on this device</span>
              </button>
            </div>

            {error && (
              <p className="text-xs text-theme-danger font-mono mt-2 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-theme-text-muted pt-3">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-theme-green" /> Public GitHub Repos
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-theme-green" /> Pinned Commit SHAs
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-theme-green" /> ₹0 API Spend
              </span>
            </div>

            {/* Try an Example Quick-Launch Pills */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
              <span className="text-[11px] font-mono text-theme-text-muted">Try an example:</span>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setRepoUrl("https://github.com/vercel/swr");
                    router.push("/explore?owner=vercel&repo=swr");
                  }}
                  className="px-2.5 py-1 rounded-full bg-theme-surface hover:bg-theme-surface-alt border border-theme-border hover:border-theme-blue text-[11px] font-mono text-theme-text transition-all cursor-pointer shadow-xs"
                >
                  ⚡ vercel/swr <span className="text-theme-blue font-semibold">(TS)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRepoUrl("https://github.com/pallets/flask");
                    router.push("/explore?owner=pallets&repo=flask");
                  }}
                  className="px-2.5 py-1 rounded-full bg-theme-surface hover:bg-theme-surface-alt border border-theme-border hover:border-theme-blue text-[11px] font-mono text-theme-text transition-all cursor-pointer shadow-xs"
                >
                  🐍 pallets/flask <span className="text-theme-warning-text font-semibold">(Py)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRepoUrl("https://github.com/gin-gonic/gin");
                    router.push("/explore?owner=gin-gonic&repo=gin");
                  }}
                  className="px-2.5 py-1 rounded-full bg-theme-surface hover:bg-theme-surface-alt border border-theme-border hover:border-theme-blue text-[11px] font-mono text-theme-text transition-all cursor-pointer shadow-xs"
                >
                  🚀 gin-gonic/gin <span className="text-theme-blue font-semibold">(Go)</span>
                </button>
                <Link
                  href="/assistant?mode=sample"
                  className="px-2.5 py-1 rounded-full bg-theme-surface-alt hover:bg-theme-surface border border-theme-border text-[11px] font-mono text-theme-text transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-theme-warning-text" />
                  <span>Sample Analysis</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-theme-blue/10 text-theme-blue">Pre-recorded</span>
                </Link>
                <Link
                  href="/examples"
                  className="px-2 py-1 rounded-full text-[11px] font-mono text-theme-blue hover:text-theme-blue-hover font-semibold transition-colors"
                >
                  All Examples →
                </Link>
              </div>
            </div>

            {/* Landing Page Theme Switcher Banner */}
            <div className="pt-4 max-w-xl mx-auto">
              <div className="p-3 bg-theme-surface border border-theme-border rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-blue shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-theme-text font-mono flex items-center gap-1.5">
                      <span>Experience & Theme</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-theme-blue-surface text-theme-blue font-semibold">Live</span>
                    </div>
                    <div className="text-[11px] text-theme-text-muted font-sans">
                      Toggle Google Light (Default) or Obsidian Dark — saved directly to your device.
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <ThemeSwitcher size="sm" showLabels />
                </div>
              </div>
            </div>
          </div>

          {/* Active Repo Banner if already loaded */}
          {currentRepo && (
            <div className="pt-2 max-w-xl mx-auto">
              <div className="p-3 bg-theme-surface border border-theme-border rounded-xl shadow-xs flex items-center justify-between gap-3 text-left">
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-theme-green" />
                    <span className="text-xs font-mono font-semibold text-theme-text truncate">
                      {currentRepo.fullName}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-theme-text-muted">
                    Commit: {currentRepo.selectedRevision ? currentRepo.selectedRevision.slice(0, 7) : "HEAD"}
                  </span>
                </div>
                <Link href="/explore">
                  <Button variant="secondary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Open Workspace
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Recently Loaded Repositories (Stored Locally) */}
          {recentRepos && recentRepos.length > 0 && (
            <div className="pt-4 max-w-2xl mx-auto text-left">
              <div className="flex items-center justify-between pb-2 border-b border-theme-border">
                <span className="text-xs font-mono text-theme-text-muted flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-theme-blue" />
                  <span>Recent Repositories</span>
                </span>
                <span className="text-[11px] font-mono text-theme-text-muted">
                  Saved in local browser
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3">
                {recentRepos.slice(0, 4).map((repo) => (
                  <Link
                    key={repo.fullName}
                    href={repo.isLocal ? "/explore" : `/explore?owner=${repo.owner}&repo=${repo.repo}${repo.selectedRevision ? `&sha=${repo.selectedRevision}` : ""}`}
                    className="p-3 bg-theme-surface hover:bg-theme-surface-alt border border-theme-border rounded-xl shadow-xs flex items-center justify-between gap-2 group transition-all"
                  >
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <Github className="w-3.5 h-3.5 text-theme-text-muted shrink-0" />
                        <span className="text-xs font-mono font-semibold text-theme-text group-hover:text-theme-blue truncate">
                          {repo.fullName}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-theme-text-muted block truncate mt-0.5">
                        {repo.description || "Public repository"}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-theme-text-muted group-hover:text-theme-blue shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Architecture Pipeline Graphic */}
          <div className="pt-8 max-w-4xl mx-auto">
            <div className="p-6 md:p-8 bg-theme-surface border border-theme-border rounded-2xl shadow-card text-left relative overflow-hidden">
              <div className="flex items-center justify-between pb-6 border-b border-theme-border">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-theme-text-muted block">
                    System Architecture Overview
                  </span>
                  <h2 className="text-base font-semibold text-theme-text font-mono mt-0.5">
                    Deterministic Ingestion & Local Reasoning Pipeline
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-theme-surface-alt border border-theme-border text-[11px] font-mono text-theme-text-muted">
                  Isolated Sandbox
                </span>
              </div>

              {/* Architecture Workflow Graphic with 4-Color Accents */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6">
                <AccentCard accent="blue" className="p-4 space-y-2">
                  <div className="w-7 h-7 rounded-md bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-blue font-mono text-xs font-bold">
                    01
                  </div>
                  <h3 className="text-xs font-semibold font-mono text-theme-text">
                    Public Ingestion
                  </h3>
                  <p className="text-[11px] text-theme-text-muted leading-relaxed">
                    Validates URL, checks SSRF safety, pins to explicit commit SHA, and retrieves recursive tree without private tokens.
                  </p>
                </AccentCard>

                <AccentCard accent="red" className="p-4 space-y-2">
                  <div className="w-7 h-7 rounded-md bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-red font-mono text-xs font-bold">
                    02
                  </div>
                  <h3 className="text-xs font-semibold font-mono text-theme-text">
                    AST & Symbol Parsing
                  </h3>
                  <p className="text-[11px] text-theme-text-muted leading-relaxed">
                    Deterministic regex & parser extraction of functions, classes, interfaces, and entry points across TS, JS, Python, Go, Rust, and Java.
                  </p>
                </AccentCard>

                <AccentCard accent="yellow" className="p-4 space-y-2">
                  <div className="w-7 h-7 rounded-md bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-warning-text font-mono text-xs font-bold">
                    03
                  </div>
                  <h3 className="text-xs font-semibold font-mono text-theme-text">
                    Bounded RAG Context
                  </h3>
                  <p className="text-[11px] text-theme-text-muted leading-relaxed">
                    Relevant source files are ranked and injected with strict token bounds. Citations are verified against real indexed files.
                  </p>
                </AccentCard>

                <AccentCard accent="green" className="p-4 space-y-2">
                  <div className="w-7 h-7 rounded-md bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-green font-mono text-xs font-bold">
                    04
                  </div>
                  <h3 className="text-xs font-semibold font-mono text-theme-text">
                    Verified Patch Diff
                  </h3>
                  <p className="text-[11px] text-theme-text-muted leading-relaxed">
                    Produces ranked hypotheses, minimal unified diffs, and reproducible regression test procedures for human review.
                  </p>
                </AccentCard>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: THE PROBLEM */}
      <section id="problem" className="px-6 lg:px-12 py-20 bg-theme-surface-alt border-y border-theme-border">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-mono text-theme-blue font-semibold uppercase tracking-wider">
              The Engineering Problem
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-theme-text">
              Entering an unfamiliar codebase is daunting.
            </h2>
            <p className="text-sm text-theme-text-muted leading-relaxed">
              Software engineers spend up to 70% of their time reading and navigating existing code. When opening a new open-source repository or investigating a critical issue, developers encounter distinct technical obstacles:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AccentCard index={0} className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-blue">
                <FolderTree className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-theme-text font-mono">
                Thousands of files, zero clear entry points
              </h3>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                Large mono-repos or nested directory structures conceal where boot execution starts, where configuration is evaluated, and which modules are active.
              </p>
            </AccentCard>

            <AccentCard index={1} className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-red">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-theme-text font-mono">
                Cross-module execution is hard to trace
              </h3>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                Navigating between API handlers, middleware, database models, and service abstractions requires mental context that takes days to build manually.
              </p>
            </AccentCard>

            <AccentCard index={2} className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-warning-text">
                <Bug className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-theme-text font-mono">
                Locating the source of runtime errors
              </h3>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                A stack trace dumped in production or CI points to internal library frames, leaving engineers searching for the exact user-code line where invalid state originated.
              </p>
            </AccentCard>

            <AccentCard index={3} className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-green">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-theme-text font-mono">
                Uncertainty about where tests belong
              </h3>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                Knowing how to write a regression test requires knowing whether the project uses Vitest, Jest, PyTest, or Go test, and where fixtures and test helpers reside.
              </p>
            </AccentCard>

            <AccentCard index={0} className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-blue">
                <GitPullRequest className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-theme-text font-mono">
                Friction for first-time OSS contributors
              </h3>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                Contributors often get stuck before writing their first line of code because understanding contribution rules and project conventions is buried in outdated documentation.
              </p>
            </AccentCard>

            <AccentCard index={1} className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-red">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-theme-text font-mono">
                AI answers that lack verified citations
              </h3>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                Generic cloud chatbots invent non-existent APIs, cite fabricated file paths, and produce hallucinated methods because they lack deterministic grounding in the repository revision.
              </p>
            </AccentCard>
          </div>
        </div>
      </section>

      {/* SECTION 3: THE REPOPILOT APPROACH */}
      <section id="how-it-works" className="px-6 lg:px-12 py-20 bg-theme-bg">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-mono text-theme-blue font-semibold uppercase tracking-wider">
              The RepoPilot Approach
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-theme-text">
              Deterministic evidence first. AI only where grounded.
            </h2>
            <p className="text-sm text-theme-text-muted leading-relaxed">
              RepoPilot follows a verifiable engineering methodology. We pin analysis to exact commit SHAs, extract deterministic symbol tables, and enforce citation checks on every output.
            </p>
          </div>

          {/* 8-Step Workflow Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: "01",
                title: "Select Public Repo",
                desc: "Paste any public GitHub repository URL. Validates host and SSRF boundaries."
              },
              {
                step: "02",
                title: "Pin Commit Revision",
                desc: "Resolves the exact Git commit SHA to ensure all line references remain permanent."
              },
              {
                step: "03",
                title: "Index Source Files",
                desc: "Filters binary and oversized files, extracting deterministic AST symbols."
              },
              {
                step: "04",
                title: "Search & Navigate",
                desc: "Deterministic text and symbol search works entirely offline without AI calls."
              },
              {
                step: "05",
                title: "Trace Relationships",
                desc: "Maps framework entry points, manifests, module roles, and package dependencies."
              },
              {
                step: "06",
                title: "Optional Local AI",
                desc: "Connects to your local Ollama instance with bounded context prompts and verified citations."
              },
              {
                step: "07",
                title: "Investigate Root Cause",
                desc: "Correlates runtime exception stack frames with source lines to formulate testable hypotheses."
              },
              {
                step: "08",
                title: "Validate & Export Patch",
                desc: "Reviews candidate unified diffs and exports reproducible markdown PR drafts."
              }
            ].map((st, i) => (
              <AccentCard
                key={st.step}
                index={i}
                className="p-5 space-y-2"
              >
                <div className="text-xs font-mono font-bold text-theme-blue">
                  STEP {st.step}
                </div>
                <h3 className="text-sm font-semibold text-theme-text font-mono">
                  {st.title}
                </h3>
                <p className="text-xs text-theme-text-muted leading-relaxed">
                  {st.desc}
                </p>
              </AccentCard>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: TECHNICAL CAPABILITIES */}
      <section id="capabilities" className="px-6 lg:px-12 py-20 bg-theme-surface-alt border-y border-theme-border">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-mono text-theme-blue font-semibold uppercase tracking-wider">
              Technical Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-theme-text">
              Real developer tools, not marketing labels.
            </h2>
            <p className="text-sm text-theme-text-muted leading-relaxed">
              Every capability is implemented with concrete data structures, strict TypeScript schemas, and deterministic algorithms:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Capability 1 */}
            <AccentCard index={0} className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-theme-text uppercase">
                  1. Repository Ingestion & SHA Pinning
                </span>
                <Badge variant="success" size="sm">Implemented</Badge>
              </div>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                <strong className="text-theme-text">What it addresses:</strong> Prevents broken line references caused by dynamic branch drift.
                <br />
                <strong className="text-theme-text">How it works:</strong> Ingests GitHub URLs, checks SSRF safety, resolves default branch HEAD to an immutable commit SHA, and streams the tree up to 1,500 supported code files.
                <br />
                <strong className="text-theme-text">Output:</strong> Pinned revision metadata, language statistics, and filtered file tree.
                <br />
                <strong className="text-theme-text">Limitations:</strong> Capped at 60 unauthenticated requests/hr without a GitHub token.
              </p>
            </AccentCard>

            {/* Capability 2 */}
            <AccentCard index={1} className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-theme-text uppercase">
                  2. Deterministic Symbol Extraction
                </span>
                <Badge variant="success" size="sm">Implemented</Badge>
              </div>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                <strong className="text-theme-text">What it addresses:</strong> Quickly jumping to class, function, or interface definitions without language server daemon overhead.
                <br />
                <strong className="text-theme-text">How it works:</strong> Multi-language regex & AST pattern extractors parse declarations and signatures across TS, JS, Python, Go, Rust, and Java.
                <br />
                <strong className="text-theme-text">Output:</strong> Structured symbol table with start/end line coordinates and type kind.
                <br />
                <strong className="text-theme-text">Limitations:</strong> Macro expansions and dynamically generated metaprogramming symbols are not parsed.
              </p>
            </AccentCard>

            {/* Capability 3 */}
            <AccentCard index={2} className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-theme-text uppercase">
                  3. Multi-Modal Ranked Code Search
                </span>
                <Badge variant="success" size="sm">Implemented</Badge>
              </div>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                <strong className="text-theme-text">What it addresses:</strong> Finding exact occurrences of strings, symbol names, or paths without hallucinated vector distance false positives.
                <br />
                <strong className="text-theme-text">How it works:</strong> Client-side deterministic search engine with path matching, symbol boosts, identifier splitting, and language filters.
                <br />
                <strong className="text-theme-text">Output:</strong> Ranked search results with exact line numbers and code previews.
                <br />
                <strong className="text-theme-text">Limitations:</strong> Purely lexical and syntactic; does not perform semantic embeddings.
              </p>
            </AccentCard>

            {/* Capability 4 */}
            <AccentCard index={3} className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-theme-text uppercase">
                  4. Architecture & Framework Detector
                </span>
                <Badge variant="success" size="sm">Implemented</Badge>
              </div>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                <strong className="text-theme-text">What it addresses:</strong> Understanding project scaffolding and conventions without manual inspection.
                <br />
                <strong className="text-theme-text">How it works:</strong> Inspects manifest files (package.json, pom.xml, pyproject.toml, go.mod, Cargo.toml) to identify Next.js, React, Spring Boot, Flask, FastAPI, Express, entry points, and directory roles.
                <br />
                <strong className="text-theme-text">Output:</strong> Architecture summary with entry points, module directory roles, and dependencies.
                <br />
                <strong className="text-theme-text">Limitations:</strong> Bespoke proprietary directory layouts may be categorized as custom.
              </p>
            </AccentCard>

            {/* Capability 5 */}
            <AccentCard index={0} className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-theme-text uppercase">
                  5. Evidence-Grounded Local AI (Ollama)
                </span>
                <Badge variant="cyan" size="sm">Optional Local AI</Badge>
              </div>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                <strong className="text-theme-text">What it addresses:</strong> Getting code explanations without paying per-token API bills or sending code to third-party clouds.
                <br />
                <strong className="text-theme-text">How it works:</strong> Retrieves relevant files, bounds prompt to configured budget, queries local Ollama, and validates returned file paths and line ranges against repository index.
                <br />
                <strong className="text-theme-text">Output:</strong> Concise explanation accompanied by clickable verified source citations.
                <br />
                <strong className="text-theme-text">Limitations:</strong> Requires local Ollama running on your machine; falls back gracefully to deterministic search if offline.
              </p>
            </AccentCard>

            {/* Capability 6 */}
            <AccentCard index={1} className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-theme-text uppercase">
                  6. Stack Trace Parser & Bug Hypotheses
                </span>
                <Badge variant="success" size="sm">Implemented</Badge>
              </div>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                <strong className="text-theme-text">What it addresses:</strong> Bridging the gap between a crash error message and the exact fix in code.
                <br />
                <strong className="text-theme-text">How it works:</strong> Parses Node/V8 and Python stack traces, filters vendor frames, correlates frames to repository files, and formulates ranked root cause hypotheses.
                <br />
                <strong className="text-theme-text">Output:</strong> Parsed frame list, ranked hypotheses, candidate unified diffs, and reproducible issue reports.
                <br />
                <strong className="text-theme-text">Limitations:</strong> Does not execute code automatically; human review is mandatory before PR submission.
              </p>
            </AccentCard>
          </div>
        </div>
      </section>

      {/* SECTION 5: ZERO-BUDGET AND PRIVACY MODEL */}
      <section id="zero-budget" className="px-6 lg:px-12 py-20 bg-theme-bg">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-mono text-theme-blue font-semibold uppercase tracking-wider">
              Zero-Budget & Privacy Model
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-theme-text">
              No credit card. No cloud bills. No telemetry tracking.
            </h2>
            <p className="text-sm text-theme-text-muted leading-relaxed">
              We designed RepoPilot so any student, researcher, or open-source maintainer can run it without recurring expenses:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AccentCard accent="green" className="p-6 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-green">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-theme-text font-mono">
                No Mandatory Hosted AI API
              </h3>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                Core repository browsing, tree exploration, symbol discovery, and text searches work completely without AI. You never pay OpenAI, Anthropic, or cloud providers to use the tool.
              </p>
            </AccentCard>

            <AccentCard accent="blue" className="p-6 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-blue">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-theme-text font-mono">
                Local Ollama Integration
              </h3>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                If you choose to enable AI synthesis, connect your local Ollama server running open-weights coding models like <code>qwen2.5-coder:1.5b</code>. Inference runs entirely on your machine.
              </p>
            </AccentCard>

            <AccentCard accent="yellow" className="p-6 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center text-theme-warning-text">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-theme-text font-mono">
                Local-Only Secrets
              </h3>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                Optional GitHub Personal Access Tokens are stored purely in your browser&apos;s sessionStorage and are never sent to external servers or logged in telemetry.
              </p>
            </AccentCard>
          </div>
        </div>
      </section>

      {/* SECTION 6: FINAL CALL TO ACTION */}
      <section className="px-6 lg:px-12 py-24 bg-theme-surface-alt border-t border-theme-border text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-theme-blue/5 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <span className="text-xs font-mono text-theme-blue font-semibold uppercase tracking-wider">
            Ready to explore?
          </span>

          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-theme-text leading-tight">
            Stop guessing unfamiliar code.
            <br />
            Start with evidence.
          </h2>

          <p className="text-sm sm:text-base text-theme-text-muted max-w-xl mx-auto leading-relaxed">
            Import any public repository from GitHub, browse files, trace symbols, and formulate testable bug fixes with zero API bills.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-theme-blue text-white text-sm font-semibold hover:bg-theme-blue-hover shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Import Public Repository</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link href="/docs">
              <Button variant="secondary" size="lg">
                Read Documentation
              </Button>
            </Link>

            <a
              href="https://github.com/Mohit-Rocky-25/RepoPilot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-theme-border bg-theme-surface text-xs font-mono font-medium text-theme-text hover:bg-theme-surface-alt transition-all shadow-xs"
            >
              <Github className="w-4 h-4" />
              <span>Inspect on GitHub</span>
            </a>
          </div>

          <div className="pt-12 text-xs font-mono text-theme-text-muted flex flex-wrap items-center justify-center gap-6 border-t border-theme-border">
            <span>MIT License</span>
            <span>·</span>
            <span>Zero Mandatory Cloud AI</span>
            <span>·</span>
            <span>Grounded In Pinned Commits</span>
            <span>·</span>
            <div className="flex items-center gap-2">
              <span className="text-theme-text-muted">Theme:</span>
              <ThemeSwitcher size="sm" showLabels />
            </div>
            <span>·</span>
            <span>Independent Open-Source · Not affiliated with GitHub, Inc.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
