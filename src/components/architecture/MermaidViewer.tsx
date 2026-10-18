"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Copy,
  Check,
  Code2,
  Eye,
  Download,
  ExternalLink,
  Layers,
  GitBranch,
  Network,
  RotateCcw,
  Sparkles,
  Loader2,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { ArchitectureSummary, ArchitectureGraph } from "@repopilot/core";
import { generateMermaidDiagram, type MermaidDiagramType } from "@/lib/mermaidGenerator";
import { sanitizeSvg } from "@/lib/svgSanitizer";

interface Props {
  summary: ArchitectureSummary;
  graph?: ArchitectureGraph | null;
  repoFullName: string;
}

declare global {
  interface Window {
    mermaid?: any;
  }
}

export const MermaidViewer: React.FC<Props> = ({ summary, graph, repoFullName }) => {
  const [diagramType, setDiagramType] = useState<MermaidDiagramType>("system");
  const [viewMode, setViewMode] = useState<"visual" | "code">("visual");
  const [copied, setCopied] = useState(false);
  const [svgContent, setSvgContent] = useState<string>("");
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Generate Mermaid syntax based on current type
  const diagramCode = React.useMemo(() => {
    return generateMermaidDiagram(summary, graph, diagramType, repoFullName);
  }, [summary, graph, diagramType, repoFullName]);

  // Dynamically load Mermaid script if not present
  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      setIsRendering(true);
      setRenderError(null);

      try {
        if (!window.mermaid) {
          // Load mermaid script from CDN
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.getElementById("mermaid-cdn-script");
            if (existingScript) {
              if (window.mermaid) return resolve();
              existingScript.addEventListener("load", () => resolve());
              existingScript.addEventListener("error", () => reject(new Error("Failed to load Mermaid CDN")));
              return;
            }

            const script = document.createElement("script");
            script.id = "mermaid-cdn-script";
            script.src = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js";
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Mermaid script"));
            document.head.appendChild(script);
          });
        }

        if (!isMounted) return;

        window.mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          securityLevel: "loose",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
          flowchart: {
            htmlLabels: false, // Critical: Renders native SVG <text> elements so labels never get stripped
            curve: "basis",
            nodeSpacing: 45,
            rankSpacing: 55,
            padding: 16,
            useMaxWidth: true
          },
          themeVariables: {
            darkMode: true,
            background: "#0C0D0E",
            fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
            fontSize: "12.5px",
            // Subgraph / Cluster styles
            clusterBkg: "#0C0E14",
            clusterBorder: "#262A36",
            titleColor: "#E2E8F0",
            // Edge lines
            lineColor: "#64748B",
            edgeLabelBackground: "#141516",
            // Nodes base
            mainBkg: "#0C243B",
            nodeBorder: "#38BDF8",
            nodeTextColor: "#FFFFFF",
            // Color palettes
            primaryColor: "#1E1B4B",
            primaryTextColor: "#FFFFFF",
            primaryBorderColor: "#818CF8",
            secondaryColor: "#082F49",
            secondaryTextColor: "#FFFFFF",
            secondaryBorderColor: "#38BDF8",
            tertiaryColor: "#064E3B",
            tertiaryTextColor: "#FFFFFF",
            tertiaryBorderColor: "#34D399"
          }
        });

        const uniqueId = "mermaid_svg_" + Math.random().toString(36).substring(2, 9);
        const { svg } = await window.mermaid.render(uniqueId, diagramCode);

        if (isMounted) {
          setSvgContent(sanitizeSvg(svg));
          setIsRendering(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setRenderError(err.message || "Failed to render visual diagram");
          setIsRendering(false);
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [diagramCode]);

  const copyMarkdown = () => {
    const fullMarkdown = `\`\`\`mermaid\n${diagramCode}\n\`\`\``;
    navigator.clipboard.writeText(fullMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${repoFullName.replace("/", "_")}_architecture_mermaid.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(Number((z + 0.15).toFixed(2)), 2.0));
  const handleZoomOut = () => setZoom((z) => Math.max(Number((z - 0.15).toFixed(2)), 0.5));
  const handleZoomReset = () => setZoom(1);

  return (
    <div className="space-y-4">
      {/* Control Header */}
      <Card className="p-4 bg-linear-surface-1 border-linear-border-1 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Diagram Type Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0F1011] border border-[#23252A] rounded-lg">
          <button
            onClick={() => setDiagramType("system")}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
              diagramType === "system"
                ? "bg-[#1E1B4B] text-[#828FFF] border border-[#5E6AD2]/40 shadow-xs"
                : "text-[#8A8F98] hover:text-[#F7F8F8]"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>System Flowchart (TD)</span>
          </button>

          <button
            onClick={() => setDiagramType("hierarchy")}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
              diagramType === "hierarchy"
                ? "bg-[#1E1B4B] text-[#828FFF] border border-[#5E6AD2]/40 shadow-xs"
                : "text-[#8A8F98] hover:text-[#F7F8F8]"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Modular Hierarchy (LR)</span>
          </button>

          <button
            onClick={() => setDiagramType("components")}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
              diagramType === "components"
                ? "bg-[#1E1B4B] text-[#828FFF] border border-[#5E6AD2]/40 shadow-xs"
                : "text-[#8A8F98] hover:text-[#F7F8F8]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tiered Architecture</span>
          </button>
        </div>

        {/* View mode toggle, Zoom & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom controls (only in visual mode) */}
          {viewMode === "visual" && (
            <div className="flex items-center p-0.5 bg-[#0F1011] border border-[#23252A] rounded-md text-xs font-mono">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                title="Zoom Out"
                className="p-1.5 rounded hover:bg-[#141516] text-[#8A8F98] hover:text-[#F7F8F8] disabled:opacity-40 transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomReset}
                title="Reset Zoom"
                className="px-2 py-0.5 rounded text-[11px] font-mono text-[#8A8F98] hover:text-[#F7F8F8] hover:bg-[#141516] transition-colors"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 2.0}
                title="Zoom In"
                className="p-1.5 rounded hover:bg-[#141516] text-[#8A8F98] hover:text-[#F7F8F8] disabled:opacity-40 transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Visual vs Code Toggle */}
          <div className="flex items-center p-0.5 bg-[#0F1011] border border-[#23252A] rounded-md text-xs font-mono">
            <button
              onClick={() => setViewMode("visual")}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                viewMode === "visual"
                  ? "bg-[#141516] text-[#F7F8F8] font-medium border border-[#34343A]"
                  : "text-[#8A8F98] hover:text-[#F7F8F8]"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Diagram</span>
            </button>
            <button
              onClick={() => setViewMode("code")}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                viewMode === "code"
                  ? "bg-[#141516] text-[#F7F8F8] font-medium border border-[#34343A]"
                  : "text-[#8A8F98] hover:text-[#F7F8F8]"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Markdown</span>
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={downloadSvg}
            disabled={!svgContent || isRendering}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export SVG
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={copyMarkdown}
            icon={copied ? <Check className="w-3.5 h-3.5 text-[#27A644]" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? "Copied for GitHub!" : "Copy Mermaid for GitHub"}
          </Button>
        </div>
      </Card>

      {/* GitHub README Helper Banner */}
      <div className="p-3.5 rounded-lg bg-[#0F1011] border border-[#23252A] text-xs font-mono flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#8A8F98]">
          <Sparkles className="w-4 h-4 text-[#828FFF] shrink-0" />
          <span>
            <strong>GitHub Ready:</strong> GitHub automatically renders this diagram inside any repository{" "}
            <code className="text-[#F7F8F8] bg-[#141516] px-1 py-0.5 rounded border border-[#23252A]">README.md</code> using{" "}
            <code className="text-[#828FFF]">```mermaid</code> blocks.
          </span>
        </div>
        <a
          href="https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams"
          target="_blank"
          rel="noreferrer"
          className="text-[#828FFF] hover:underline text-[11px] shrink-0 inline-flex items-center gap-1"
        >
          <span>GitHub Docs</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Main Content Area */}
      <Card className="p-6 bg-[#0B0C0E] border border-[#23252A] rounded-xl overflow-hidden min-h-[500px] flex flex-col justify-center relative">
        {viewMode === "visual" ? (
          <div className="w-full flex flex-col items-center justify-center overflow-hidden">
            {isRendering ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-xs font-mono text-[#8A8F98]">
                <Loader2 className="w-6 h-6 animate-spin text-[#828FFF]" />
                <span>Compiling high-contrast Mermaid vector diagram...</span>
              </div>
            ) : renderError ? (
              <div className="space-y-4 text-center py-10 max-w-lg mx-auto">
                <p className="text-xs font-mono text-[#F59E0B]">
                  Visual renderer fallback active: {renderError}
                </p>
                <div className="p-4 bg-[#141516] border border-[#23252A] rounded-lg text-left text-xs font-mono text-[#8A8F98] max-h-48 overflow-auto">
                  <pre>{diagramCode}</pre>
                </div>
                <Button variant="primary" size="sm" onClick={copyMarkdown} icon={<Copy className="w-3.5 h-3.5" />}>
                  Copy Mermaid Markdown
                </Button>
              </div>
            ) : (
              <div className="w-full overflow-auto max-h-[750px] flex items-center justify-center p-4">
                <div
                  ref={containerRef}
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "center center",
                    transition: "transform 0.15s ease-out"
                  }}
                  className="mermaid-viewport w-full flex items-center justify-center transition-all select-none"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-[#8A8F98] pb-2 border-b border-[#23252A]">
              <span>Mermaid Markdown Source</span>
              <button
                onClick={copyMarkdown}
                className="text-[#828FFF] hover:text-white flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#27A644]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Code"}</span>
              </button>
            </div>
            <pre className="p-4 rounded-lg bg-[#141516] border border-[#23252A] text-[#F7F8F8] overflow-x-auto leading-relaxed">
              <code>{`\`\`\`mermaid\n${diagramCode}\n\`\`\``}</code>
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
};
