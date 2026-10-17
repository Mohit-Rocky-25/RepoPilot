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
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { ArchitectureSummary, ArchitectureGraph } from "@repopilot/core";
import { generateMermaidDiagram, type MermaidDiagramType } from "@/lib/mermaidGenerator";
import { sanitizeSvg } from "@/lib/security";

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
          theme: "dark",
          securityLevel: "loose",
          themeVariables: {
            darkMode: true,
            background: "#0F1011",
            primaryColor: "#1e1b4b",
            primaryTextColor: "#F7F8F8",
            primaryBorderColor: "#828FFF",
            lineColor: "#62666D",
            secondaryColor: "#0f172a",
            tertiaryColor: "#141516"
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

        {/* View mode toggle & Action Buttons */}
        <div className="flex items-center gap-2">
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
      <Card className="p-6 bg-[#0F1011] border border-[#23252A] rounded-xl overflow-hidden min-h-[460px] flex flex-col justify-center">
        {viewMode === "visual" ? (
          <div className="w-full flex flex-col items-center justify-center">
            {isRendering ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-xs font-mono text-[#8A8F98]">
                <Loader2 className="w-6 h-6 animate-spin text-[#828FFF]" />
                <span>Compiling deterministic Mermaid vector diagram...</span>
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
              <div
                ref={containerRef}
                className="w-full flex items-center justify-center overflow-x-auto py-4 [&_svg]:max-w-full [&_svg]:h-auto transition-all"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
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
