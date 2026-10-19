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
  ZoomOut,
  Maximize2,
  Minimize2,
  ArrowDownUp,
  ArrowLeftRight,
  Activity,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { ArchitectureSummary, ArchitectureGraph } from "@repopilot/core";
import {
  generateMermaidDiagram,
  type MermaidDiagramType,
  type DiagramOrientation
} from "@/lib/mermaidGenerator";
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
  const [orientation, setOrientation] = useState<DiagramOrientation>("TD");
  const [viewMode, setViewMode] = useState<"visual" | "code">("visual");
  const [copied, setCopied] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [svgContent, setSvgContent] = useState<string>("");
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Update orientation default when diagram type changes
  const handleSelectDiagramType = (type: MermaidDiagramType) => {
    setDiagramType(type);
    if (type === "hierarchy") {
      setOrientation("LR");
    } else {
      setOrientation("TD");
    }
    setZoom(1);
  };

  const toggleOrientation = () => {
    setOrientation((prev) => (prev === "TD" ? "LR" : "TD"));
  };

  // Generate Mermaid syntax based on current type & orientation
  const diagramCode = React.useMemo(() => {
    return generateMermaidDiagram(summary, graph, diagramType, repoFullName, orientation);
  }, [summary, graph, diagramType, repoFullName, orientation]);

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
            padding: 18,
            useMaxWidth: true
          },
          themeVariables: {
            darkMode: true,
            background: "#08090A",
            fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
            fontSize: "12.5px",
            // Subgraph / Cluster styles
            clusterBkg: "#0B0E14",
            clusterBorder: "#1E293B",
            titleColor: "#F8FAFC",
            // Edge lines
            lineColor: "#64748B",
            edgeLabelBackground: "#0F172A",
            // Nodes base
            mainBkg: "#0F172A",
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
          setRenderError(err.message || "Failed to compile visual diagram syntax");
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

  const copyRawCode = () => {
    navigator.clipboard.writeText(diagramCode);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const downloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${repoFullName.replace("/", "_")}_${diagramType}_architecture.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
    if (!svgContent) return;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      if (!svgEl) return;

      const viewBox = svgEl.getAttribute("viewBox");
      let width = 1400;
      let height = 900;
      if (viewBox) {
        const parts = viewBox.split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          width = parts[2];
          height = parts[3];
        }
      }

      svgEl.setAttribute("width", width.toString());
      svgEl.setAttribute("height", height.toString());

      const serialized = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
      const blobUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const scale = 2; // high-DPI 2x
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#08090A";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngUrl = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = pngUrl;
          link.download = `${repoFullName.replace("/", "_")}_${diagramType}_architecture.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(blobUrl);
      };
      img.src = blobUrl;
    } catch (err) {
      console.error("Failed to export PNG", err);
    }
  };

  const openMermaidLive = () => {
    try {
      const state = {
        code: diagramCode,
        mermaid: { theme: "dark" },
        autoSync: true,
        updateDiagram: true
      };
      const jsonStr = JSON.stringify(state);
      const bytes = new TextEncoder().encode(jsonStr);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      window.open(`https://mermaid.live/edit#base64:${base64}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Failed to open Mermaid Live Editor", err);
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(Number((z + 0.15).toFixed(2)), 2.2));
  const handleZoomOut = () => setZoom((z) => Math.max(Number((z - 0.15).toFixed(2)), 0.4));
  const handleZoomReset = () => setZoom(1);

  // Keyboard shortcut for escaping fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  return (
    <div className={`space-y-4 ${isFullscreen ? "fixed inset-0 z-50 bg-[#08090A]/95 backdrop-blur-md p-6 overflow-y-auto" : ""}`}>
      {/* Control Header */}
      <Card className="p-4 bg-linear-surface-1 border-linear-border-1 flex flex-col xl:flex-row xl:items-center justify-between gap-3 shadow-lg">
        {/* Diagram Type Selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0F1011] border border-[#23252A] rounded-lg">
          <button
            onClick={() => handleSelectDiagramType("system")}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              diagramType === "system"
                ? "bg-[#1E1B4B] text-[#828FFF] border border-[#5E6AD2]/50 shadow-xs"
                : "text-[#8A8F98] hover:text-[#F7F8F8]"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>System Flowchart</span>
          </button>

          <button
            onClick={() => handleSelectDiagramType("hierarchy")}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              diagramType === "hierarchy"
                ? "bg-[#1E1B4B] text-[#828FFF] border border-[#5E6AD2]/50 shadow-xs"
                : "text-[#8A8F98] hover:text-[#F7F8F8]"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Modular Hierarchy</span>
          </button>

          <button
            onClick={() => handleSelectDiagramType("components")}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              diagramType === "components"
                ? "bg-[#1E1B4B] text-[#828FFF] border border-[#5E6AD2]/50 shadow-xs"
                : "text-[#8A8F98] hover:text-[#F7F8F8]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tiered Architecture</span>
          </button>

          <button
            onClick={() => handleSelectDiagramType("dataflow")}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              diagramType === "dataflow"
                ? "bg-[#1E1B4B] text-[#828FFF] border border-[#5E6AD2]/50 shadow-xs"
                : "text-[#8A8F98] hover:text-[#F7F8F8]"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-[#34D399]" />
            <span>Data Flow Pipeline</span>
          </button>
        </div>

        {/* Orientation, View Mode, Zoom & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Orientation Toggle */}
          <button
            onClick={toggleOrientation}
            title={`Current layout: ${orientation === "TD" ? "Top-to-Bottom" : "Left-to-Right"}. Click to toggle layout.`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#0F1011] border border-[#23252A] hover:border-[#38BDF8]/50 text-xs font-mono text-[#8A8F98] hover:text-white transition-all cursor-pointer"
          >
            {orientation === "TD" ? (
              <>
                <ArrowDownUp className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Layout: TD</span>
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Layout: LR</span>
              </>
            )}
          </button>

          {/* Zoom controls */}
          {viewMode === "visual" && (
            <div className="flex items-center p-0.5 bg-[#0F1011] border border-[#23252A] rounded-md text-xs font-mono">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.4}
                title="Zoom Out"
                className="p-1.5 rounded hover:bg-[#141516] text-[#8A8F98] hover:text-[#F7F8F8] disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomReset}
                title="Reset Zoom to 100%"
                className="px-2 py-0.5 rounded text-[11px] font-mono text-[#8A8F98] hover:text-[#F7F8F8] hover:bg-[#141516] transition-colors cursor-pointer"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 2.2}
                title="Zoom In"
                className="p-1.5 rounded hover:bg-[#141516] text-[#8A8F98] hover:text-[#F7F8F8] disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand Diagram to Fullscreen"}
            className="p-1.5 rounded-md bg-[#0F1011] border border-[#23252A] hover:border-[#5E6AD2]/50 text-[#8A8F98] hover:text-[#F7F8F8] transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Visual vs Code Toggle */}
          <div className="flex items-center p-0.5 bg-[#0F1011] border border-[#23252A] rounded-md text-xs font-mono">
            <button
              onClick={() => setViewMode("visual")}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === "code"
                  ? "bg-[#141516] text-[#F7F8F8] font-medium border border-[#34343A]"
                  : "text-[#8A8F98] hover:text-[#F7F8F8]"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Markdown</span>
            </button>
          </div>

          {/* Export Dropdown / Buttons */}
          <Button
            variant="secondary"
            size="sm"
            onClick={downloadSvg}
            disabled={!svgContent || isRendering}
            icon={<Download className="w-3.5 h-3.5 text-[#38BDF8]" />}
            title="Download vector SVG format"
          >
            SVG
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={downloadPng}
            disabled={!svgContent || isRendering}
            icon={<ImageIcon className="w-3.5 h-3.5 text-[#34D399]" />}
            title="Download high-resolution PNG format"
          >
            PNG
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={openMermaidLive}
            icon={<ExternalLink className="w-3.5 h-3.5 text-[#C084FC]" />}
            title="Open and edit inside the official Mermaid Live Editor"
          >
            Mermaid Live
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={copyMarkdown}
            icon={copied ? <Check className="w-3.5 h-3.5 text-[#27A644]" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? "Copied for GitHub!" : "Copy for GitHub"}
          </Button>
        </div>
      </Card>

      {/* Diagram Statistics & Ecosystem Context Strip */}
      <div className="px-4 py-2.5 rounded-lg bg-[#0A0D14] border border-[#1E293B] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2 text-[#8A8F98]">
          <span className="text-white font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
            {repoFullName}
          </span>
          <span>•</span>
          <span className="text-[#38BDF8]">{summary.primaryLanguage || "TypeScript"}</span>
          {summary.detectedFrameworks && summary.detectedFrameworks.length > 0 && (
            <>
              <span>•</span>
              <span className="text-[#A78BFA]">{summary.detectedFrameworks.slice(0, 3).join(", ")}</span>
            </>
          )}
          <span>•</span>
          <span>{summary.keyModules.length} Modules</span>
          <span>•</span>
          <span>{summary.entryPoints.length} Entrypoints</span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="sm">
            {diagramType.toUpperCase()} ({orientation})
          </Badge>
          <button
            onClick={copyRawCode}
            className="text-[11px] text-[#828FFF] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            title="Copy raw Mermaid code without markdown backticks"
          >
            {copiedRaw ? <Check className="w-3 h-3 text-[#27A644]" /> : <Copy className="w-3 h-3" />}
            <span>{copiedRaw ? "Copied Raw!" : "Copy Raw"}</span>
          </button>
        </div>
      </div>

      {/* GitHub README Helper Banner */}
      <div className="p-3.5 rounded-lg bg-[#0F1011] border border-[#23252A] text-xs font-mono flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#8A8F98]">
          <Sparkles className="w-4 h-4 text-[#828FFF] shrink-0" />
          <span>
            <strong>GitHub Ready:</strong> GitHub automatically renders this high-contrast diagram in any repository{" "}
            <code className="text-[#F7F8F8] bg-[#141516] px-1 py-0.5 rounded border border-[#23252A]">README.md</code> or issue using{" "}
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

      {/* Main Content Canvas */}
      <Card className={`p-6 bg-[#08090A] border border-[#23252A] rounded-xl overflow-hidden flex flex-col justify-center relative shadow-2xl ${
        isFullscreen ? "min-h-[calc(100vh-220px)]" : "min-h-[560px]"
      }`}>
        {viewMode === "visual" ? (
          <div className="w-full flex flex-col items-center justify-center overflow-hidden">
            {isRendering ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-xs font-mono text-[#8A8F98]">
                <Loader2 className="w-7 h-7 animate-spin text-[#828FFF]" />
                <span className="text-white font-medium">Compiling high-contrast vector architecture graph...</span>
                <span className="text-[11px] text-[#64748B]">Sanitizing SVG structures and mapping component hierarchy</span>
              </div>
            ) : renderError ? (
              <div className="space-y-4 text-center py-12 max-w-lg mx-auto">
                <p className="text-xs font-mono text-[#F59E0B]">
                  Visual renderer fallback active: {renderError}
                </p>
                <div className="p-4 bg-[#141516] border border-[#23252A] rounded-lg text-left text-xs font-mono text-[#8A8F98] max-h-56 overflow-auto">
                  <pre>{diagramCode}</pre>
                </div>
                <div className="flex justify-center gap-3">
                  <Button variant="primary" size="sm" onClick={copyMarkdown} icon={<Copy className="w-3.5 h-3.5" />}>
                    Copy Mermaid Markdown
                  </Button>
                  <Button variant="secondary" size="sm" onClick={openMermaidLive} icon={<ExternalLink className="w-3.5 h-3.5" />}>
                    Open in Mermaid Live
                  </Button>
                </div>
              </div>
            ) : (
              <div className={`w-full overflow-auto flex items-center justify-center p-4 ${
                isFullscreen ? "max-h-[calc(100vh-260px)]" : "max-h-[780px]"
              }`}>
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
              <span className="text-white font-semibold">Mermaid Markdown Source ({diagramType.toUpperCase()})</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={openMermaidLive}
                  className="text-[#C084FC] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mermaid Live</span>
                </button>
                <button
                  onClick={copyMarkdown}
                  className="text-[#828FFF] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#27A644]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied!" : "Copy Markdown"}</span>
                </button>
              </div>
            </div>
            <pre className="p-4 rounded-lg bg-[#0F1011] border border-[#23252A] text-[#F7F8F8] overflow-x-auto leading-relaxed">
              <code>{`\`\`\`mermaid\n${diagramCode}\n\`\`\``}</code>
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
};
