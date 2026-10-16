"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Layers,
  Search,
  ExternalLink,
  Compass
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { ArchitectureGraph, ArchitectureGraphNode } from "@repopilot/core";

interface Props {
  graph: ArchitectureGraph;
  repoFullName: string;
}

const TYPE_COLORS: Record<ArchitectureGraphNode["type"], string> = {
  root: "#F7F8F8",
  dir: "#8A8F98",
  entry: "#5E6AD2",
  route: "#38BDF8",
  component: "#27A644",
  test: "#F59E0B",
  config: "#A855F7",
  source: "#62666D"
};

const TYPE_LABELS: Record<ArchitectureGraphNode["type"], string> = {
  root: "Repository Root",
  dir: "Module Directory",
  entry: "Application Entry Point",
  route: "API Route / Endpoint",
  component: "UI Component",
  test: "Test Suite",
  config: "Config & Manifest",
  source: "Source Code"
};

export const ArchitectureMap3D: React.FC<Props> = ({ graph, repoFullName }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Camera & view state
  const [yaw, setYaw] = useState(0.45);
  const [pitch, setPitch] = useState(0.38);
  const [distance, setDistance] = useState(420);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [is2DMode, setIs2DMode] = useState(false);

  // Interaction state
  const [hoveredNode, setHoveredNode] = useState<ArchitectureGraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<ArchitectureGraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"orbit" | "pan">("orbit");
  const dragStartRef = useRef({ x: 0, y: 0, yaw: 0, pitch: 0, panX: 0, panY: 0 });

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return graph.nodes.filter((node) => {
      if (filterType !== "all") {
        if (filterType === "entry" && node.type !== "entry") return false;
        if (filterType === "dir" && node.type !== "dir" && node.type !== "root") return false;
        if (filterType === "route" && node.type !== "route") return false;
        if (filterType === "component" && node.type !== "component") return false;
        if (filterType === "test" && node.type !== "test") return false;
        if (filterType === "config" && node.type !== "config") return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q);
      }
      return true;
    });
  }, [graph.nodes, filterType, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // Edges between visible nodes
  const visibleEdges = useMemo(() => {
    return graph.edges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [graph.edges, filteredNodeIds]);

  // Map node lookup
  const nodeById = useMemo(() => {
    const map = new Map<string, ArchitectureGraphNode>();
    graph.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [graph.nodes]);

  // Reset Camera
  const handleResetCamera = () => {
    setYaw(0.45);
    setPitch(is2DMode ? 0 : 0.38);
    setDistance(420);
    setPan({ x: 0, y: 0 });
  };

  // Toggle 2D / 3D
  const toggle2D = () => {
    if (!is2DMode) {
      setIs2DMode(true);
      setPitch(0);
      setYaw(0);
    } else {
      setIs2DMode(false);
      setPitch(0.38);
      setYaw(0.45);
    }
  };

  // 3D Projection math
  const project3D = useCallback(
    (x: number, y: number, z: number, width: number, height: number) => {
      if (is2DMode) {
        const scale = 500 / distance;
        return {
          screenX: width / 2 + pan.x + x * scale,
          screenY: height / 2 + pan.y + y * scale,
          scale,
          depth: 0,
          visible: true
        };
      }

      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      const x1 = x * cosY - y * sinY;
      const y1 = x * sinY + y * cosY;
      const z1 = z;

      const x2 = x1;
      const y2 = y1 * cosP - z1 * sinP;
      const z2 = y1 * sinP + z1 * cosP;

      const fov = 450;
      const cameraZ = z2 + distance;

      if (cameraZ <= 10) {
        return { screenX: 0, screenY: 0, scale: 0, depth: cameraZ, visible: false };
      }

      const perspective = fov / cameraZ;
      const screenX = width / 2 + pan.x + x2 * perspective;
      const screenY = height / 2 + pan.y + y2 * perspective;

      return {
        screenX,
        screenY,
        scale: perspective,
        depth: cameraZ,
        visible: true
      };
    },
    [yaw, pitch, distance, pan, is2DMode]
  );

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Linear Deep Obsidian Canvas
    ctx.fillStyle = "#010102";
    ctx.fillRect(0, 0, width, height);

    // Subtle Perspective Grid in 3D Mode
    if (!is2DMode) {
      ctx.strokeStyle = "rgba(35, 37, 42, 0.45)";
      ctx.lineWidth = 1;
      const gridSize = 240;
      const step = 60;
      for (let g = -gridSize; g <= gridSize; g += step) {
        const p1 = project3D(g, -gridSize, -60, width, height);
        const p2 = project3D(g, gridSize, -60, width, height);
        if (p1.visible && p2.visible) {
          ctx.beginPath();
          ctx.moveTo(p1.screenX, p1.screenY);
          ctx.lineTo(p2.screenX, p2.screenY);
          ctx.stroke();
        }

        const p3 = project3D(-gridSize, g, -60, width, height);
        const p4 = project3D(gridSize, g, -60, width, height);
        if (p3.visible && p4.visible) {
          ctx.beginPath();
          ctx.moveTo(p3.screenX, p3.screenY);
          ctx.lineTo(p4.screenX, p4.screenY);
          ctx.stroke();
        }
      }
    }

    // Project all nodes
    const projectedNodes = filteredNodes.map((node) => {
      const proj = project3D(node.x || 0, node.y || 0, node.z || 0, width, height);
      return { node, proj };
    });

    const projMap = new Map<string, (typeof projectedNodes)[0]>();
    projectedNodes.forEach((pn) => projMap.set(pn.node.id, pn));

    // Draw edges
    visibleEdges.forEach((edge) => {
      const src = projMap.get(edge.source);
      const tgt = projMap.get(edge.target);
      if (!src || !tgt || !src.proj.visible || !tgt.proj.visible) return;

      const isHighlighted =
        hoveredNode && (hoveredNode.id === edge.source || hoveredNode.id === edge.target);

      ctx.beginPath();
      ctx.moveTo(src.proj.screenX, src.proj.screenY);
      ctx.lineTo(tgt.proj.screenX, tgt.proj.screenY);

      if (isHighlighted) {
        ctx.strokeStyle = "#828FFF";
        ctx.lineWidth = 2;
      } else if (edge.type === "entry") {
        ctx.strokeStyle = "rgba(94, 106, 210, 0.45)";
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = "rgba(52, 52, 58, 0.4)";
        ctx.lineWidth = 1;
      }
      ctx.stroke();
    });

    // Depth sort nodes
    projectedNodes.sort((a, b) => b.proj.depth - a.proj.depth);

    // Draw nodes
    projectedNodes.forEach(({ node, proj }) => {
      if (!proj.visible) return;

      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNode?.id === node.id;
      const baseRadius = node.type === "root" ? 10 : node.type === "dir" ? 7 : node.type === "entry" ? 7 : 5;
      const radius = Math.max(3, baseRadius * Math.min(1.4, Math.max(0.6, proj.scale * 1.1))) * (isHovered || isSelected ? 1.3 : 1);

      // Node shadow / glow
      ctx.beginPath();
      ctx.arc(proj.screenX, proj.screenY, radius + 2, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? "rgba(94, 106, 210, 0.45)"
        : isHovered
        ? "rgba(130, 143, 255, 0.35)"
        : "rgba(0, 0, 0, 0.5)";
      ctx.fill();

      // Node circle
      ctx.beginPath();
      ctx.arc(proj.screenX, proj.screenY, radius, 0, Math.PI * 2);
      ctx.fillStyle = TYPE_COLORS[node.type] || "#8A8F98";
      ctx.fill();

      // Node border ring
      ctx.strokeStyle = isSelected ? "#828FFF" : isHovered ? "#F7F8F8" : "#23252A";
      ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1;
      ctx.stroke();

      // Draw label
      const shouldDrawLabel =
        node.type === "root" ||
        node.type === "entry" ||
        node.type === "dir" ||
        isHovered ||
        isSelected ||
        distance < 300;

      if (shouldDrawLabel) {
        ctx.font = isHovered || isSelected ? "bold 11px JetBrains Mono, monospace" : "10px JetBrains Mono, monospace";
        ctx.fillStyle = isSelected ? "#828FFF" : isHovered ? "#F7F8F8" : "#8A8F98";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(node.name, proj.screenX, proj.screenY + radius + 4);
      }
    });
  }, [filteredNodes, visibleEdges, hoveredNode, selectedNode, distance, is2DMode, project3D]);

  // Mouse interaction: Hover & Drag
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2 || e.shiftKey) {
      setDragMode("pan");
    } else {
      setDragMode("orbit");
    }
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      yaw,
      pitch,
      panX: pan.x,
      panY: pan.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      if (dragMode === "pan") {
        setPan({
          x: dragStartRef.current.panX + dx,
          y: dragStartRef.current.panY + dy
        });
      } else {
        setYaw(dragStartRef.current.yaw + dx * 0.008);
        if (!is2DMode) {
          const newPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, dragStartRef.current.pitch + dy * 0.008));
          setPitch(newPitch);
        }
      }
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    let closestNode: ArchitectureGraphNode | null = null;
    let minDistance = 16;

    for (const node of filteredNodes) {
      const proj = project3D(node.x || 0, node.y || 0, node.z || 0, width, height);
      if (!proj.visible) continue;

      const dist = Math.hypot(proj.screenX - mouseX, proj.screenY - mouseY);
      if (dist < minDistance) {
        minDistance = dist;
        closestNode = node;
      }
    }

    setHoveredNode(closestNode);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (!isDragging && hoveredNode) {
      setSelectedNode(hoveredNode);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY * 0.4;
    setDistance((prev) => Math.max(140, Math.min(850, prev + delta)));
  };

  const selectedNodeRelations = useMemo(() => {
    if (!selectedNode) return { incoming: [], outgoing: [] };
    const incoming: ArchitectureGraphNode[] = [];
    const outgoing: ArchitectureGraphNode[] = [];

    graph.edges.forEach((edge) => {
      if (edge.target === selectedNode.id) {
        const srcNode = nodeById.get(edge.source);
        if (srcNode) incoming.push(srcNode);
      }
      if (edge.source === selectedNode.id) {
        const tgtNode = nodeById.get(edge.target);
        if (tgtNode) outgoing.push(tgtNode);
      }
    });

    return { incoming, outgoing };
  }, [selectedNode, graph.edges, nodeById]);

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0F1011] border border-[#23252A] rounded-xl shadow-xs">
        {/* Search & Filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#62666D] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141516] border border-[#23252A] text-[#F7F8F8] font-mono text-xs pl-8 pr-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#5E6AD2]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto text-xs font-mono">
            {[
              { id: "all", label: "All" },
              { id: "entry", label: "Entry Points" },
              { id: "dir", label: "Modules" },
              { id: "route", label: "API Routes" },
              { id: "component", label: "Components" },
              { id: "test", label: "Tests" },
              { id: "config", label: "Configs" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterType === tab.id
                    ? "bg-[#5E6AD2] text-white font-medium"
                    : "bg-[#141516] text-[#8A8F98] hover:text-[#F7F8F8] hover:bg-[#18191A]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* View mode actions */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <Button
            variant={is2DMode ? "primary" : "secondary"}
            size="sm"
            onClick={toggle2D}
            icon={<Layers className="w-3.5 h-3.5" />}
          >
            {is2DMode ? "2D Mode" : "3D Perspective"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDistance((d) => Math.max(140, d - 60))}
            icon={<ZoomIn className="w-3.5 h-3.5" />}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDistance((d) => Math.min(850, d + 60))}
            icon={<ZoomOut className="w-3.5 h-3.5" />}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetCamera}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            title="Reset Camera View"
          />
        </div>
      </div>

      {/* Main Graph Viewport */}
      <div className="relative border border-[#23252A] rounded-xl overflow-hidden bg-[#010102] h-[520px]">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing block"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Instructions Overlay */}
        <div className="absolute left-3 bottom-3 p-2.5 bg-[#0F1011]/85 backdrop-blur-xs border border-[#23252A] rounded-lg shadow-md font-mono text-[11px] text-[#8A8F98] pointer-events-none space-y-0.5">
          <div className="flex items-center gap-1.5 font-semibold text-[#F7F8F8]">
            <Compass className="w-3.5 h-3.5 text-[#5E6AD2]" />
            <span>Interactive Controls</span>
          </div>
          <p>• Click + Drag to Orbit • Shift/Right-Click to Pan</p>
          <p>• Scroll to Zoom • Click Node to Inspect</p>
        </div>

        {/* Hover Tooltip */}
        {hoveredNode && !selectedNode && (
          <div className="absolute top-3 right-3 p-3 bg-[#141516] border border-[#34343A] rounded-xl shadow-2xl font-mono text-xs space-y-1.5 max-w-xs pointer-events-none animate-fadeIn">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: TYPE_COLORS[hoveredNode.type] }}
              />
              <span className="font-semibold text-[#F7F8F8] truncate">
                {hoveredNode.name}
              </span>
            </div>
            <p className="text-[11px] text-[#8A8F98] truncate">
              {hoveredNode.path || "Repository Root"}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="neutral" size="sm">
                {TYPE_LABELS[hoveredNode.type]}
              </Badge>
              {hoveredNode.language && (
                <span className="text-[11px] text-[#D0D6E0] font-medium">
                  {hoveredNode.language}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute top-3 right-3 w-80 bg-[#0F1011] border border-[#34343A] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.9)] font-mono text-xs p-4 space-y-3 max-h-[480px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#23252A] pb-2.5">
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: TYPE_COLORS[selectedNode.type] }}
                />
                <h3 className="font-semibold text-[#F7F8F8] truncate text-xs">
                  {selectedNode.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[#8A8F98] hover:text-[#F7F8F8] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-[#62666D] uppercase block">
                Repository Path
              </span>
              <p className="p-1.5 bg-[#141516] border border-[#23252A] rounded text-[#D0D6E0] break-all text-[11px]">
                {selectedNode.path || "/ (Root)"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[#62666D] block">Type</span>
                <Badge variant="neutral" size="sm" className="mt-0.5">
                  {TYPE_LABELS[selectedNode.type]}
                </Badge>
              </div>
              <div>
                <span className="text-[#62666D] block">Depth</span>
                <span className="font-semibold text-[#D0D6E0] mt-0.5 block">
                  Level {selectedNode.depth}
                </span>
              </div>
            </div>

            {selectedNodeRelations.outgoing.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-[#62666D] uppercase block">
                  Contains ({selectedNodeRelations.outgoing.length})
                </span>
                <div className="max-h-24 overflow-y-auto divide-y divide-[#23252A] border border-[#23252A] rounded bg-[#141516]">
                  {selectedNodeRelations.outgoing.slice(0, 10).map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => setSelectedNode(rel)}
                      className="p-1.5 hover:bg-[#18191A] cursor-pointer flex items-center justify-between text-[11px]"
                    >
                      <span className="text-[#D0D6E0] truncate">{rel.name}</span>
                      <span className="text-[10px] text-[#62666D]">view</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedNode.path && (
              <div className="pt-2">
                <Link
                  href={`/explore?file=${encodeURIComponent(selectedNode.path)}`}
                  className="w-full"
                >
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    Open in Code Explorer →
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#0F1011] border border-[#23252A] rounded-xl font-mono text-[11px] text-[#8A8F98]">
        <span className="font-semibold text-[#D0D6E0]">Node Legend:</span>
        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
