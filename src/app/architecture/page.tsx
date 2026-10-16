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
  Network
} from "lucide-react";
import { useRepository } from "@/context/RepositoryContext";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ArchitectureMap3D } from "@/components/architecture/ArchitectureMap3D";
import type { ArchitectureSummary, ArchitectureGraph } from "@repopilot/core";
import { clientFetch } from "@/lib/api";

export default function ArchitecturePage() {
  const { currentRepo, setIsImportModalOpen } = useRepository();

  const [summary, setSummary] = useState<ArchitectureSummary | null>(null);
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "brief">("map");

  const loadArchitecture = () => {
    if (!currentRepo) return;

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
      .catch((err) => setError("Error loading architecture intelligence."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadArchitecture();
  }, [currentRepo]);

  const copyMarkdownBrief = () => {
    if (!summary || !currentRepo) return;

    const briefMd = `# Architecture Brief: ${currentRepo.owner}/${currentRepo.repo}
**Commit SHA:** \`${currentRepo.selectedRevision || "HEAD"}\`
**Analysis Time:** ${new Date().toISOString()}

## 1. Executive Summary
- **Primary Language:** ${summary.primaryLanguage}
- **Detected Frameworks:** ${summary.detectedFrameworks.join(", ") || "Standard Library"}
- **Identified Entry Points:** ${summary.entryPoints.length} files
- **Key Modules Identified:** ${summary.keyModules.length} directories

## 2. Application Entry Points
${summary.entryPoints.map((ep) => `- \`${ep}\``).join("\n") || "No conventional entry points detected."}

## 3. Module Hierarchy & Responsibilities
${summary.keyModules.map((m) => `- **${m.directory}/** (${m.fileCount} files): ${m.description}`).join("\n")}

## 4. Manifest Files & Build Tooling
${summary.manifestFiles.map((mf) => `- \`${mf}\``).join("\n") || "None detected"}

## 5. Key Dependencies (${summary.dependencies.length})
${summary.dependencies.slice(0, 30).map((d) => `- ${d.name} (${d.isDev ? "dev" : "prod"})`).join("\n")}

---
*Generated deterministically by RepoPilot Codebase Intelligence.*`;

    navigator.clipboard.writeText(briefMd);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
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
            Import a public GitHub repository to explore its interactive 3D spatial architecture graph, detect frameworks, and generate an evidence-backed architectural brief.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsImportModalOpen(true)}
          className="mx-auto"
        >
          Connect Repository
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#23252A] gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#F7F8F8] font-sans flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#5E6AD2]" />
            <span>Architecture Intelligence & Spatial Map</span>
          </h1>
          <p className="text-xs text-[#8A8F98] mt-0.5 font-mono">
            Deterministic AST analysis and 3D spatial exploration for {currentRepo.owner}/{currentRepo.repo}.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
          >
            {copiedBrief ? "Copied Brief!" : "Copy Architecture Brief"}
          </Button>

          <Badge variant="neutral" size="sm">
            <GitCommit className="w-3 h-3 mr-1 inline text-[#8A8F98]" />
            {currentRepo.selectedRevision ? currentRepo.selectedRevision.slice(0, 7) : "HEAD"}
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#23252A] pb-3 font-mono text-xs">
        <button
          onClick={() => setActiveTab("map")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === "map"
              ? "bg-[#5E6AD2] text-white"
              : "bg-[#141516] text-[#8A8F98] hover:text-[#F7F8F8] border border-[#23252A]"
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Interactive 3D Spatial Map</span>
        </button>

        <button
          onClick={() => setActiveTab("brief")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === "brief"
              ? "bg-[#5E6AD2] text-white"
              : "bg-[#141516] text-[#8A8F98] hover:text-[#F7F8F8] border border-[#23252A]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Evidence-Backed Architecture Brief</span>
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

          {/* Tab 1: Interactive 3D Spatial Map */}
          {activeTab === "map" && graph && (
            <div className="space-y-4">
              <ArchitectureMap3D graph={graph} repoFullName={currentRepo.fullName} />
            </div>
          )}

          {/* Tab 2: Full Architecture Brief */}
          {activeTab === "brief" && (
            <div className="space-y-6">
              {/* Evidence Taxonomy Notice */}
              <div className="p-4 rounded-xl bg-[#0F1011] border border-[#23252A] text-xs font-mono space-y-2">
                <span className="font-semibold text-[#F7F8F8] block">
                  Deterministic Evidence Taxonomy
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[#8A8F98]">
                  <div>
                    <span className="font-bold text-[#27A644]">✓ DETECTED:</span> Directly observed in AST, files, or package manifests.
                  </div>
                  <div>
                    <span className="font-bold text-[#F59E0B]">~ INFERRED:</span> Plausible directory and structural role interpretations.
                  </div>
                  <div>
                    <span className="font-bold text-[#8A8F98]">? UNKNOWN:</span> Requires runtime or external deployment configuration.
                  </div>
                </div>
              </div>

              {/* Entry Points Section */}
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#5E6AD2]" />
                  <h2 className="text-sm font-semibold text-[#F7F8F8] font-mono uppercase">
                    Application Entry Points (Detected)
                  </h2>
                </div>
                <p className="text-xs text-[#8A8F98]">
                  Key execution targets where servers mount, commands execute, or bundles initialize:
                </p>

                {summary.entryPoints.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {summary.entryPoints.map((ep) => (
                      <Link
                        key={ep}
                        href={`/explore?file=${encodeURIComponent(ep)}`}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-[#141516] hover:bg-[#18191A] border border-[#23252A] hover:border-[#34343A] transition-colors group font-mono text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCode className="w-4 h-4 text-[#5E6AD2] shrink-0" />
                          <span className="truncate group-hover:text-[#828FFF] text-[#F7F8F8] font-medium">
                            {ep}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#62666D] group-hover:text-[#8A8F98]">
                          Inspect →
                        </span>
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
        </div>
      ) : null}
    </div>
  );
}
