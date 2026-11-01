"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Cpu,
  Layers,
  FileCode,
  FolderTree,
  Folder,
  FileText,
  Box,
  AlertCircle,
  Loader2,
  Code,
  Copy,
  Check,
  RefreshCw,
  GitCommit,
  Network,
  GitBranch,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ExternalLink
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ArchitectureMap3D } from "@/components/architecture/ArchitectureMap3D";
import { MermaidViewer } from "@/components/architecture/MermaidViewer";
import type { ArchitectureSummary, ArchitectureGraph } from "@repopilot/core";
import { ArchitectureAnalyzer } from "@repopilot/analysis";
import { clientFetch } from "@/lib/api";
import {
  generateMarkdownReport,
  downloadMarkdownReport,
  printOrSavePdfReport,
  calculateHealthScore
} from "@/lib/reportGenerator";

export default function ArchitecturePage() {
  const { currentRepo, files, setIsImportModalOpen } = useRepository();

  const [summary, setSummary] = useState<ArchitectureSummary | null>(null);
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "mermaid" | "brief" | "health">("map");

  const loadArchitecture = () => {
    if (!currentRepo) return;

    // In-memory instant architecture analysis for local repositories
    if (currentRepo.isLocal) {
      setLoading(true);
      setError(null);
      try {
        const manifestFile = files.find(
          (f) =>
            f.path === "package.json" ||
            f.path === "requirements.txt" ||
            f.path === "go.mod" ||
            f.path === "Cargo.toml" ||
            f.path === "pyproject.toml"
        );
        const localSummary = ArchitectureAnalyzer.analyze(files, manifestFile?.content);
        const localGraph = ArchitectureAnalyzer.generateGraph(files, currentRepo.fullName);
        setSummary(localSummary);
        setGraph(localGraph);
      } catch (err: any) {
        setError(err.message || "Failed to analyze local repository architecture.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    clientFetch("/api/architecture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: currentRepo.owner,
        repo: currentRepo.repo,
        sha: currentRepo.selectedRevision
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) {
          setSummary(data.summary);
          if (data.graph) {
            setGraph(data.graph);
          }
        } else {
          setError(data.error || "Failed to analyze architecture.");
        }
      })
      .catch(() => setError("Error loading architecture intelligence."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadArchitecture();
  }, [currentRepo]);

  const copyMarkdownBrief = () => {
    if (!summary || !currentRepo) return;

    const briefMd = generateMarkdownReport(currentRepo, summary, files);
    navigator.clipboard.writeText(briefMd);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!summary || !currentRepo) return;
    const markdown = generateMarkdownReport(currentRepo, summary, files);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `repopilot-audit-${currentRepo.repo}-${dateStr}.md`;
    downloadMarkdownReport(filename, markdown);
  };

  const handlePrintPdf = () => {
    if (!summary || !currentRepo) return;
    const markdown = generateMarkdownReport(currentRepo, summary, files);
    printOrSavePdfReport(`RepoPilot Architecture & Health Audit - ${currentRepo.fullName}`, markdown);
  };

  if (!currentRepo) {
    return (
      <Card className="p-8 text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-theme-blue/10 border border-theme-blue/30 flex items-center justify-center text-theme-blue mx-auto shadow-xs">
          <Cpu className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-theme-text">
            No Active Repository
          </h2>
          <p className="text-xs text-theme-text-muted mt-1.5 leading-relaxed max-w-md mx-auto">
            Import a public GitHub repository or open a local folder to explore its interactive 3D spatial architecture graph, detect frameworks, and generate an evidence-backed architectural brief.
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
            Connect Repository
          </Button>
        </div>
      </Card>
    );
  }

  const healthScore = summary ? calculateHealthScore(files, summary) : null;

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-theme-border gap-3">
        <div>
          <h1 className="text-lg font-semibold text-theme-text font-sans flex items-center gap-2">
            <Cpu className="w-5 h-5 text-theme-blue" />
            <span>Architecture Intelligence & Spatial Map</span>
            {currentRepo.isLocal && (
              <Badge variant="success" size="sm" className="ml-1">
                Local Workspace
              </Badge>
            )}
          </h1>
          <p className="text-xs text-theme-text-muted mt-0.5 font-mono">
            Deterministic AST analysis and spatial hierarchy for {currentRepo.fullName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            onClick={loadArchitecture}
            disabled={loading}
          >
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={copiedBrief ? <Check className="w-3.5 h-3.5 text-theme-green" /> : <Copy className="w-3.5 h-3.5" />}
            onClick={copyMarkdownBrief}
            disabled={!summary}
            title="Copy Markdown Brief to clipboard"
          >
            {copiedBrief ? "Copied Brief!" : "Copy Brief"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5 text-theme-blue" />}
            onClick={handleDownloadReport}
            disabled={!summary}
            title="Download complete Markdown audit report (.md)"
          >
            Download .md
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Printer className="w-3.5 h-3.5 text-theme-blue" />}
            onClick={handlePrintPdf}
            disabled={!summary}
            title="Print or Save as PDF"
          >
            Print / PDF
          </Button>

          <Badge variant="neutral" size="sm">
            <GitCommit className="w-3 h-3 mr-1 inline text-theme-text-muted" />
            {currentRepo.selectedRevision ? currentRepo.selectedRevision.slice(0, 7) : currentRepo.defaultBranch || "HEAD"}
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-theme-border pb-3 font-mono text-xs">
        <button
          onClick={() => setActiveTab("map")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === "map"
              ? "bg-theme-blue text-white"
              : "bg-theme-surface-alt text-theme-text-muted hover:text-theme-text border border-theme-border"
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Interactive Architecture Graph (2D/3D)</span>
        </button>

        <button
          onClick={() => setActiveTab("mermaid")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === "mermaid"
              ? "bg-theme-blue text-white"
              : "bg-theme-surface-alt text-theme-text-muted hover:text-theme-text border border-theme-border"
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Mermaid Dependency Diagram</span>
        </button>

        <button
          onClick={() => setActiveTab("brief")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === "brief"
              ? "bg-theme-blue text-white"
              : "bg-theme-surface-alt text-theme-text-muted hover:text-theme-text border border-theme-border"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Architecture Brief</span>
        </button>

        <button
          onClick={() => setActiveTab("health")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === "health"
              ? "bg-theme-blue text-white"
              : "bg-theme-surface-alt text-theme-text-muted hover:text-theme-text border border-theme-border"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-theme-green" />
          <span>Code Health & Scorecard</span>
          {healthScore && (
            <Badge variant="primary" size="sm" className="ml-1 py-0 px-1 text-[10px]">
              {healthScore.grade}
            </Badge>
          )}
        </button>
      </div>

      {loading ? (
        <div className="h-72 flex flex-col items-center justify-center border border-theme-border rounded-xl bg-theme-surface text-xs font-mono text-theme-text-muted gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-theme-blue" />
          <span>Analyzing repository AST, manifests, and spatial hierarchy...</span>
        </div>
      ) : error ? (
        <div className="p-5 rounded-xl bg-theme-danger/10 border border-theme-danger/20 text-theme-danger text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-theme-danger" />
          <span>{error}</span>
        </div>
      ) : summary ? (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1">
              <span className="text-[11px] font-mono text-theme-text-muted uppercase">
                Primary Language
              </span>
              <div className="text-base font-semibold text-theme-text font-mono flex items-center gap-2">
                <Code className="w-4 h-4 text-theme-blue" />
                <span>{summary.primaryLanguage || "Multi-language"}</span>
              </div>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[11px] font-mono text-theme-text-muted uppercase">
                Detected Frameworks
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {summary.detectedFrameworks.length > 0 ? (
                  summary.detectedFrameworks.map((fw) => (
                    <Badge key={fw} variant="primary" size="sm">
                      {fw}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-theme-text-muted font-mono">
                    Standard Library
                  </span>
                )}
              </div>
            </Card>

            <Card
              className="p-4 space-y-1 cursor-pointer hover:border-theme-blue/40 hover:bg-theme-surface-alt transition-all group"
              onClick={() => setActiveTab("brief")}
              title="Click to view identified application entry points in brief"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-theme-text-muted group-hover:text-theme-text-muted uppercase">
                  Identified Entry Points
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-theme-text-muted group-hover:text-theme-blue transition-colors" />
              </div>
              <div className="text-base font-semibold text-theme-text font-mono group-hover:text-theme-blue transition-colors">
                {summary.entryPoints.length} Files
              </div>
            </Card>

            <Card
              className="p-4 space-y-1 cursor-pointer hover:border-theme-blue/40 hover:bg-theme-surface-alt transition-all group"
              onClick={() => setActiveTab("brief")}
              title="Click to view modular directory roles in brief"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-theme-text-muted group-hover:text-theme-text-muted uppercase">
                  Modular Hierarchy
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-theme-text-muted group-hover:text-theme-blue transition-colors" />
              </div>
              <div className="text-base font-semibold text-theme-text font-mono group-hover:text-theme-blue transition-colors">
                {summary.keyModules.length} Modules
              </div>
            </Card>
          </div>

          {/* Tab 1: Interactive Spatial Map */}
          {activeTab === "map" && graph && (
            <div className="space-y-3">
              <ArchitectureMap3D
                graph={graph}
                repoFullName={currentRepo.fullName}
                summary={summary}
              />
            </div>
          )}

          {/* Tab 2: Mermaid Diagram View */}
          {activeTab === "mermaid" && (
            <MermaidViewer
              summary={summary}
              graph={graph}
              repoFullName={currentRepo.fullName}
            />
          )}

          {/* Tab 3: Architecture Brief */}
          {activeTab === "brief" && (
            <div className="space-y-6">
              {/* Entry Points Section */}
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-theme-blue" />
                    <h2 className="text-sm font-semibold text-theme-text font-mono uppercase">
                      Application Entry Points ({summary.entryPoints.length})
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-theme-text-muted">
                    Click any entrypoint to inspect in Code Explorer
                  </span>
                </div>

                {summary.entryPoints.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-xs">
                    {summary.entryPoints.map((ep) => {
                      const cleanEp = ep.replace(/^\/+/, "");
                      const epUrl = currentRepo && !currentRepo.isLocal
                        ? `/explore?owner=${encodeURIComponent(currentRepo.owner)}&repo=${encodeURIComponent(currentRepo.repo)}&file=${encodeURIComponent(cleanEp)}`
                        : `/explore?file=${encodeURIComponent(cleanEp)}`;
                      return (
                        <Link
                          key={ep}
                          href={epUrl}
                          className="p-2.5 rounded-lg bg-theme-surface-alt hover:bg-theme-surface-alt border border-theme-border hover:border-theme-blue/40 text-theme-blue flex items-center justify-between group transition-all cursor-pointer"
                          title={`Open ${cleanEp} in Code Explorer`}
                        >
                          <span className="truncate group-hover:text-white transition-colors">{cleanEp}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="primary" size="sm">
                              Entry
                            </Badge>
                            <ArrowUpRight className="w-3.5 h-3.5 text-theme-text-muted group-hover:text-theme-blue transition-colors" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-theme-text-muted font-mono">
                    No conventional entry point files detected.
                  </div>
                )}
              </Card>

              {/* Module Roles & Directory Hierarchy */}
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-theme-blue" />
                    <h2 className="text-sm font-semibold text-theme-text font-mono uppercase">
                      Module Roles & Responsibilities (Inferred)
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-theme-text-muted">
                    Click any directory or files badge to open in Code Explorer
                  </span>
                </div>

                <div className="divide-y divide-theme-border border border-theme-border rounded-xl overflow-hidden font-mono text-xs">
                  {summary.keyModules.map((mod) => {
                    const cleanDir = mod.directory.replace(/^\/+|\/+$/g, "");
                    const exploreUrl = currentRepo && !currentRepo.isLocal
                      ? `/explore?owner=${encodeURIComponent(currentRepo.owner)}&repo=${encodeURIComponent(currentRepo.repo)}&dir=${encodeURIComponent(cleanDir)}`
                      : `/explore?dir=${encodeURIComponent(cleanDir)}`;

                    return (
                      <Link
                        key={mod.directory}
                        href={exploreUrl}
                        className="flex items-center justify-between p-3.5 bg-theme-surface hover:bg-theme-surface-alt transition-all group cursor-pointer border-b border-theme-border last:border-b-0"
                        title={`Explore ${cleanDir}/ (${mod.fileCount} files) in Code Explorer`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Folder className="w-4 h-4 text-theme-blue shrink-0 group-hover:text-theme-blue transition-colors" />
                          <span className="font-semibold text-theme-text group-hover:text-theme-blue transition-colors">
                            {cleanDir}/
                          </span>
                          <span className="text-theme-text-muted text-[11px] group-hover:text-theme-text transition-colors">
                            ({mod.description})
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <Badge
                            variant="neutral"
                            size="sm"
                            className="group-hover:border-theme-blue/40 group-hover:text-white transition-colors"
                          >
                            {mod.fileCount} files
                          </Badge>
                          <ArrowUpRight className="w-3.5 h-3.5 text-theme-text-muted group-hover:text-theme-blue transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </Card>

              {/* Manifest & Configuration Files */}
              {summary.manifestFiles && summary.manifestFiles.length > 0 && (
                <Card className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-theme-blue" />
                      <h2 className="text-sm font-semibold text-theme-text font-mono uppercase">
                        Configuration & Manifest Files ({summary.manifestFiles.length})
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-theme-text-muted">
                      Click to open file in Code Explorer
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-xs">
                    {summary.manifestFiles.map((mf) => {
                      const cleanMf = mf.replace(/^\/+/, "");
                      const mfUrl = currentRepo && !currentRepo.isLocal
                        ? `/explore?owner=${encodeURIComponent(currentRepo.owner)}&repo=${encodeURIComponent(currentRepo.repo)}&file=${encodeURIComponent(cleanMf)}`
                        : `/explore?file=${encodeURIComponent(cleanMf)}`;
                      return (
                        <Link
                          key={mf}
                          href={mfUrl}
                          className="p-2.5 rounded-lg bg-theme-surface-alt hover:bg-theme-surface-alt border border-theme-border hover:border-theme-blue/40 text-theme-text flex items-center justify-between group transition-all cursor-pointer"
                          title={`Open ${cleanMf} in Code Explorer`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileCode className="w-3.5 h-3.5 text-theme-blue shrink-0" />
                            <span className="truncate group-hover:text-theme-blue transition-colors font-medium">{cleanMf}</span>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-theme-text-muted group-hover:text-theme-blue transition-colors" />
                        </Link>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Dependencies Section */}
              {summary.dependencies.length > 0 && (
                <Card className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-theme-blue" />
                      <h2 className="text-sm font-semibold text-theme-text font-mono uppercase">
                        Declared Dependencies ({summary.dependencies.length})
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-theme-text-muted">
                      Click to search package registry
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 font-mono text-xs">
                    {summary.dependencies.map((dep) => (
                      <a
                        key={dep.name}
                        href={`https://www.google.com/search?q=${encodeURIComponent(dep.name + " " + (summary.primaryLanguage || "") + " package")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-lg bg-theme-surface-alt hover:bg-theme-surface-alt border border-theme-border hover:border-theme-blue/40 flex items-center justify-between group transition-all cursor-pointer"
                        title={`Search package documentation for ${dep.name}`}
                      >
                        <span className="text-theme-text group-hover:text-theme-blue truncate font-medium transition-colors">
                          {dep.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={dep.isDev ? "neutral" : "primary"} size="sm">
                            {dep.isDev ? "dev" : "prod"}
                          </Badge>
                          <ExternalLink className="w-3 h-3 text-theme-text-muted group-hover:text-theme-blue transition-colors" />
                        </div>
                      </a>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Tab 4: Code Health & Scorecard */}
          {activeTab === "health" && healthScore && (
            <div className="space-y-6">
              {/* Grade Hero Card */}
              <Card className="p-6 bg-theme-surface border border-theme-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-theme-blue/10 border border-theme-blue/30 flex items-center justify-center text-2xl font-bold font-mono text-theme-blue shadow-xs">
                    {healthScore.grade}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-theme-text flex items-center gap-2">
                      <span>Codebase Health & Hygiene Rating</span>
                      <Badge variant="primary" size="sm">
                        {healthScore.score} / {healthScore.maxScore} Checks Passing
                      </Badge>
                    </h2>
                    <p className="text-xs text-theme-text-muted mt-1 font-mono">
                      Deterministic verification of test coverage, licensing, version hygiene, and continuous integration.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={handleDownloadReport}
                  >
                    Download Audit (.md)
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Printer className="w-3.5 h-3.5" />}
                    onClick={handlePrintPdf}
                  >
                    Save as PDF
                  </Button>
                </div>
              </Card>

              {/* Inspection Checks Breakdown */}
              <Card className="p-5 space-y-4">
                <h3 className="text-xs font-mono font-semibold text-theme-text uppercase tracking-wider">
                  Deterministic Audit Checks Breakdown
                </h3>

                <div className="divide-y divide-theme-border border border-theme-border rounded-xl overflow-hidden font-mono text-xs">
                  {healthScore.checks.map((check) => (
                    <div
                      key={check.name}
                      className="p-4 flex items-start justify-between gap-4 bg-theme-surface hover:bg-theme-surface-alt/60 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {check.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-theme-green shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-theme-danger shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-semibold text-theme-text block">
                            {check.name}
                          </span>
                          <span className="text-[11px] text-theme-text-muted mt-0.5 block leading-relaxed">
                            {check.reason}
                          </span>
                        </div>
                      </div>

                      <Badge variant={check.passed ? "success" : "danger"} size="sm">
                        {check.passed ? "PASSED" : "MISSING"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
