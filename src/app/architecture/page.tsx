"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Cpu,
  Layers,
  FileCode,
  FolderTree,
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
  XCircle
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
        <div className="w-12 h-12 rounded-xl bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center text-[#828FFF] mx-auto shadow-[0_0_16px_rgba(94,106,210,0.25)]">
          <Cpu className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#F7F8F8]">
            No Active Repository
          </h2>
          <p className="text-xs text-[#8A8F98] mt-1.5 leading-relaxed max-w-md mx-auto">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#23252A] gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#F7F8F8] font-sans flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#5E6AD2]" />
            <span>Architecture Intelligence & Spatial Map</span>
            {currentRepo.isLocal && (
              <Badge variant="success" size="sm" className="ml-1">
                Local Workspace
              </Badge>
            )}
          </h1>
          <p className="text-xs text-[#8A8F98] mt-0.5 font-mono">
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
            icon={copiedBrief ? <Check className="w-3.5 h-3.5 text-[#27A644]" /> : <Copy className="w-3.5 h-3.5" />}
            onClick={copyMarkdownBrief}
            disabled={!summary}
            title="Copy Markdown Brief to clipboard"
          >
            {copiedBrief ? "Copied Brief!" : "Copy Brief"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5 text-[#5E6AD2]" />}
            onClick={handleDownloadReport}
            disabled={!summary}
            title="Download complete Markdown audit report (.md)"
          >
            Download .md
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Printer className="w-3.5 h-3.5 text-[#828FFF]" />}
            onClick={handlePrintPdf}
            disabled={!summary}
            title="Print or Save as PDF"
          >
            Print / PDF
          </Button>

          <Badge variant="neutral" size="sm">
            <GitCommit className="w-3 h-3 mr-1 inline text-[#8A8F98]" />
            {currentRepo.selectedRevision ? currentRepo.selectedRevision.slice(0, 7) : currentRepo.defaultBranch || "HEAD"}
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#23252A] pb-3 font-mono text-xs">
        <button
          onClick={() => setActiveTab("map")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === "map"
              ? "bg-[#5E6AD2] text-white"
              : "bg-[#141516] text-[#8A8F98] hover:text-[#F7F8F8] border border-[#23252A]"
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Interactive Architecture Graph (2D/3D)</span>
        </button>

        <button
          onClick={() => setActiveTab("mermaid")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === "mermaid"
              ? "bg-[#5E6AD2] text-white"
              : "bg-[#141516] text-[#8A8F98] hover:text-[#F7F8F8] border border-[#23252A]"
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Mermaid Dependency Diagram</span>
        </button>

        <button
          onClick={() => setActiveTab("brief")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === "brief"
              ? "bg-[#5E6AD2] text-white"
              : "bg-[#141516] text-[#8A8F98] hover:text-[#F7F8F8] border border-[#23252A]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Architecture Brief</span>
        </button>

        <button
          onClick={() => setActiveTab("health")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === "health"
              ? "bg-[#5E6AD2] text-white"
              : "bg-[#141516] text-[#8A8F98] hover:text-[#F7F8F8] border border-[#23252A]"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#27A644]" />
          <span>Code Health & Scorecard</span>
          {healthScore && (
            <Badge variant="primary" size="sm" className="ml-1 py-0 px-1 text-[10px]">
              {healthScore.grade}
            </Badge>
          )}
        </button>
      </div>

      {loading ? (
        <div className="h-72 flex flex-col items-center justify-center border border-[#23252A] rounded-xl bg-[#0F1011] text-xs font-mono text-[#8A8F98] gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#5E6AD2]" />
          <span>Analyzing repository AST, manifests, and spatial hierarchy...</span>
        </div>
      ) : error ? (
        <div className="p-5 rounded-xl bg-red-950/20 border border-red-900/40 text-[#EF4444] text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
          <span>{error}</span>
        </div>
      ) : summary ? (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1">
              <span className="text-[11px] font-mono text-[#62666D] uppercase">
                Primary Language
              </span>
              <div className="text-base font-semibold text-[#F7F8F8] font-mono flex items-center gap-2">
                <Code className="w-4 h-4 text-[#5E6AD2]" />
                <span>{summary.primaryLanguage || "Multi-language"}</span>
              </div>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[11px] font-mono text-[#62666D] uppercase">
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
                  <span className="text-xs text-[#8A8F98] font-mono">
                    Standard Library
                  </span>
                )}
              </div>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[11px] font-mono text-[#62666D] uppercase">
                Identified Entry Points
              </span>
              <div className="text-base font-semibold text-[#F7F8F8] font-mono">
                {summary.entryPoints.length} Files
              </div>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[11px] font-mono text-[#62666D] uppercase">
                Modular Hierarchy
              </span>
              <div className="text-base font-semibold text-[#F7F8F8] font-mono">
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
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-[#5E6AD2]" />
                  <h2 className="text-sm font-semibold text-[#F7F8F8] font-mono uppercase">
                    Application Entry Points ({summary.entryPoints.length})
                  </h2>
                </div>

                {summary.entryPoints.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-xs">
                    {summary.entryPoints.map((ep) => (
                      <Link
                        key={ep}
                        href={`/explore?file=${encodeURIComponent(ep)}`}
                        className="p-2.5 rounded-lg bg-[#141516] hover:bg-[#18191A] border border-[#23252A] hover:border-[#34343A] text-[#828FFF] flex items-center justify-between group transition-all"
                      >
                        <span className="truncate">{ep}</span>
                        <Badge variant="primary" size="sm">
                          Entry
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-[#62666D] font-mono">
                    No conventional entry point files detected.
                  </div>
                )}
              </Card>

              {/* Module Roles & Directory Hierarchy */}
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-[#5E6AD2]" />
                  <h2 className="text-sm font-semibold text-[#F7F8F8] font-mono uppercase">
                    Module Roles & Responsibilities (Inferred)
                  </h2>
                </div>

                <div className="divide-y divide-[#23252A] border border-[#23252A] rounded-xl overflow-hidden font-mono text-xs">
                  {summary.keyModules.map((mod) => (
                    <div
                      key={mod.directory}
                      className="flex items-center justify-between p-3 bg-[#0F1011] hover:bg-[#141516] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="font-semibold text-[#F7F8F8]">
                          {mod.directory}/
                        </span>
                        <span className="text-[#8A8F98] text-[11px]">
                          ({mod.description})
                        </span>
                      </div>
                      <Badge variant="neutral" size="sm">
                        {mod.fileCount} files
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Dependencies & Manifests */}
              {summary.dependencies.length > 0 && (
                <Card className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-[#5E6AD2]" />
                    <h2 className="text-sm font-semibold text-[#F7F8F8] font-mono uppercase">
                      Declared Dependencies & Manifests ({summary.dependencies.length})
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 font-mono text-xs">
                    {summary.dependencies.map((dep) => (
                      <div
                        key={dep.name}
                        className="p-2.5 rounded-lg bg-[#141516] border border-[#23252A] flex items-center justify-between"
                      >
                        <span className="text-[#F7F8F8] truncate font-medium">
                          {dep.name}
                        </span>
                        <Badge variant={dep.isDev ? "neutral" : "primary"} size="sm">
                          {dep.isDev ? "dev" : "prod"}
                        </Badge>
                      </div>
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
              <Card className="p-6 bg-gradient-to-br from-[#141516] to-[#0F1011] border border-[#23252A] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center text-2xl font-bold font-mono text-[#828FFF] shadow-[0_0_24px_rgba(94,106,210,0.3)]">
                    {healthScore.grade}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#F7F8F8] flex items-center gap-2">
                      <span>Codebase Health & Hygiene Rating</span>
                      <Badge variant="primary" size="sm">
                        {healthScore.score} / {healthScore.maxScore} Checks Passing
                      </Badge>
                    </h2>
                    <p className="text-xs text-[#8A8F98] mt-1 font-mono">
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
                <h3 className="text-xs font-mono font-semibold text-[#D0D6E0] uppercase tracking-wider">
                  Deterministic Audit Checks Breakdown
                </h3>

                <div className="divide-y divide-[#23252A] border border-[#23252A] rounded-xl overflow-hidden font-mono text-xs">
                  {healthScore.checks.map((check) => (
                    <div
                      key={check.name}
                      className="p-4 flex items-start justify-between gap-4 bg-[#0F1011] hover:bg-[#141516]/60 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {check.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-[#27A644] shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-semibold text-[#F7F8F8] block">
                            {check.name}
                          </span>
                          <span className="text-[11px] text-[#8A8F98] mt-0.5 block leading-relaxed">
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
