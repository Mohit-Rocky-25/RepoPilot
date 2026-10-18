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
  Compass,
  List,
  Eye,
  GitBranch,
  Folder,
  FileCode
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { ArchitectureGraph, ArchitectureGraphNode, ArchitectureSummary } from "@repopilot/core";

interface Props {
  graph: ArchitectureGraph;
  repoFullName: string;
  summary?: ArchitectureSummary | null;
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

const NODE_CAP = 50;

export const ArchitectureMap3D: React.FC<Props> = ({ graph, repoFullName, summary }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Default to 2D Mode as required by Phase 8
  const [is2DMode, setIs2DMode] = useState(true);
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [distance, setDistance] = useState(420);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Node cap & view format
  const [showAllNodes, setShowAllNodes] = useState(false);
  const [viewFormat, setViewFormat] = useState<"canvas" | "text-list">("canvas");

  // Interaction state
  const [hoveredNode, setHoveredNode] = useState<ArchitectureGraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<ArchitectureGraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"orbit" | "pan">("orbit");
  const dragStartRef = useRef({ x: 0, y: 0, yaw: 0, pitch: 0, panX: 0, panY: 0 });

  // Reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, []);

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

  // Capped visible nodes (Rule 3: Cap rendered nodes with a "show more" control)
  const displayNodes = useMemo(() => {
    if (showAllNodes || filteredNodes.length <= NODE_CAP) {
      return filteredNodes;
    }
    const priority: Record<string, number> = {
      root: 0,
      entry: 1,
      dir: 2,
      config: 3,
      route: 4,
      component: 5,
      test: 6,
      source: 7
    };
    return [...filteredNodes]
      .sort((a, b) => (priority[a.type] ?? 9) - (priority[b.type] ?? 9))
      .slice(0, NODE_CAP);
  }, [filteredNodes, showAllNodes]);

  const displayNodeIds = useMemo(() => new Set(displayNodes.map((n) => n.id)), [displayNodes]);

  // Edges between visible nodes
  const visibleEdges = useMemo(() => {
    return graph.edges.filter((e) => displayNodeIds.has(e.source) && displayNodeIds.has(e.target));
  }, [graph.edges, displayNodeIds]);

  // Map node lookup
  const nodeById = useMemo(() => {
    const map = new Map<string, ArchitectureGraphNode>();
    graph.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [graph.nodes]);

  // Reset Camera
  const handleResetCamera = () => {
    setYaw(is2DMode ? 0 : 0.45);
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
      setPitch(prefersReducedMotion ? 0.2 : 0.38);
      setYaw(prefersReducedMotion ? 0.2 : 0.45);
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
    if (viewFormat !== "canvas") return;
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

    // Dark Obsidian Canvas
    ctx.fillStyle = "#010102";
    ctx.fillRect(0, 0, width, height);

    // Perspective Grid in 3D Mode
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
    const projectedNodes = displayNodes.map((node) => {
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
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
      } else if (edge.type === "dependency") {
        // Emerald dashed edge for real import dependency relationships
        ctx.strokeStyle = "rgba(52, 211, 153, 0.65)";
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
      } else if (edge.type === "entry") {
        ctx.strokeStyle = "rgba(94, 106, 210, 0.5)";
        ctx.setLineDash([]);
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = "rgba(52, 52, 58, 0.4)";
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
      }
      ctx.stroke();
      ctx.setLineDash([]);
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
        ctx.font = isHovered || isSelected ? "bold 11px monospace" : "10px monospace";
        ctx.fillStyle = isSelected ? "#828FFF" : isHovered ? "#F7F8F8" : "#8A8F98";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(node.name, proj.screenX, proj.screenY + radius + 4);
      }
    });
  }, [displayNodes, visibleEdges, hoveredNode, selectedNode, distance, is2DMode, project3D, viewFormat]);

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

    for (const node of displayNodes) {
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

  // Mobile Touch Gestures (Single finger orbit/pan, two-finger pinch zoom, tap select)
  const touchStartRef = useRef<{ x: number; y: number; dist?: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        yaw,
        pitch,
        panX: pan.x,
        panY: pan.y
      };
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current.dist = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;

      if (is2DMode) {
        setPan({
          x: dragStartRef.current.panX + dx,
          y: dragStartRef.current.panY + dy
        });
      } else {
        setYaw(dragStartRef.current.yaw + dx * 0.008);
        const newPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, dragStartRef.current.pitch + dy * 0.008));
        setPitch(newPitch);
      }
    } else if (e.touches.length === 2 && touchStartRef.current.dist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const delta = (touchStartRef.current.dist - newDist) * 1.5;
      setDistance((prev) => Math.max(140, Math.min(850, prev + delta)));
      touchStartRef.current.dist = newDist;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const moveDist = Math.hypot(touch.clientX - touchStartRef.current.x, touch.clientY - touchStartRef.current.y);
      if (moveDist < 10) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        let closestNode: ArchitectureGraphNode | null = null;
        let minDistance = 24;
        for (const node of displayNodes) {
          const proj = project3D(node.x || 0, node.y || 0, node.z || 0, width, height);
          if (!proj.visible) continue;
          const dist = Math.hypot(proj.screenX - touchX, proj.screenY - touchY);
          if (dist < minDistance) {
            minDistance = dist;
            closestNode = node;
          }
        }
        if (closestNode) {
          setSelectedNode(closestNode);
        }
      }
    }
  };

  // Keyboard navigation for accessibility (Rule 5)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setYaw((y) => y + 0.1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setYaw((y) => y - 0.1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!is2DMode) setPitch((p) => Math.min(Math.PI / 2.2, p + 0.1));
      else setPan((p) => ({ ...p, y: p.y - 20 }));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!is2DMode) setPitch((p) => Math.max(-Math.PI / 2.2, p - 0.1));
      else setPan((p) => ({ ...p, y: p.y + 20 }));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setDistance((d) => Math.max(140, d - 40));
    } else if (e.key === "-") {
      e.preventDefault();
      setDistance((d) => Math.min(850, d + 40));
    } else if (e.key === "Escape") {
      setSelectedNode(null);
      setHoveredNode(null);
    } else if (e.key === "Enter" && hoveredNode) {
      setSelectedNode(hoveredNode);
    }
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
          <div className="relative w-44 sm:w-52">
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

          {/* Show more / cap toggle (Rule 3) */}
          {filteredNodes.length > NODE_CAP && (
            <button
              onClick={() => setShowAllNodes(!showAllNodes)}
              className="px-2 py-1 rounded-md text-[11px] font-mono bg-[#141516] text-[#828FFF] hover:text-[#F7F8F8] border border-[#23252A] hover:border-[#5E6AD2] transition-colors"
            >
              {showAllNodes
                ? `Showing All (${filteredNodes.length})`
                : `Showing ${displayNodes.length} of ${filteredNodes.length} (Show All)`}
            </button>
          )}
        </div>

        {/* View mode actions (Rule 1: 2D Default, 3D opt-in; Rule 5: Text list alternative) */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <Button
            variant={viewFormat === "text-list" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setViewFormat(viewFormat === "canvas" ? "text-list" : "canvas")}
            icon={viewFormat === "text-list" ? <Eye className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
            title="Toggle Accessible Text List Alternative"
          >
            {viewFormat === "text-list" ? "Graph View" : "Accessible List"}
          </Button>

          {viewFormat === "canvas" && (
            <>
              <Button
                variant={is2DMode ? "primary" : "secondary"}
                size="sm"
                onClick={toggle2D}
                icon={<Layers className="w-3.5 h-3.5" />}
                title="Toggle between 2D Planar and 3D Perspective map"
              >
                {is2DMode ? "2D Mode" : "3D Mode"}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDistance((d) => Math.max(140, d - 60))}
                icon={<ZoomIn className="w-3.5 h-3.5" />}
                title="Zoom In"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDistance((d) => Math.min(850, d + 60))}
                icon={<ZoomOut className="w-3.5 h-3.5" />}
                title="Zoom Out"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetCamera}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                title="Reset Camera View"
              />
            </>
          )}
        </div>
      </div>

      {/* Main Viewport: Canvas OR Accessible Text List Alternative */}
      {viewFormat === "text-list" ? (
        /* Accessible Text List Alternative (Rule 5) */
        <div
          role="tree"
          aria-label="Repository Architecture Tree Structure"
          className="border border-[#23252A] rounded-xl bg-[#010102] p-5 h-[520px] overflow-y-auto space-y-3 font-mono text-xs"
        >
          <div className="pb-2 border-b border-[#23252A] flex items-center justify-between text-[#8A8F98]">
            <span>Accessible Hierarchy Tree ({displayNodes.length} nodes)</span>
            <span className="text-[11px]">Navigate with Tab / Enter</span>
          </div>

          <div className="space-y-1.5">
            {displayNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <div
                  key={node.id}
                  role="treeitem"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => setSelectedNode(node)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedNode(node);
                    }
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-[#5E6AD2] ${
                    isSelected
                      ? "bg-[#5E6AD2]/20 border border-[#5E6AD2]/50 text-[#F7F8F8]"
                      : "bg-[#0F1011] hover:bg-[#141516] border border-[#23252A] text-[#D0D6E0]"
                  }`}
                  style={{ paddingLeft: `${Math.max(8, node.depth * 16)}px` }}
                >
                  <div className="flex items-center gap-2 truncate">
                    {node.type === "dir" ? (
                      <Folder className="w-3.5 h-3.5 text-[#8A8F98] shrink-0" />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-[#5E6AD2] shrink-0" />
                    )}
                    <span className="font-medium truncate">{node.name}</span>
                    <span className="text-[10px] text-[#62666D] truncate">{node.path}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="neutral" size="sm">
                      {TYPE_LABELS[node.type]}
                    </Badge>
                    {node.path && (
                      <Link
                        href={
                          node.type === "dir"
                            ? `/explore?dir=${encodeURIComponent(node.path)}`
                            : `/explore?file=${encodeURIComponent(node.path)}`
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-[#828FFF] hover:underline"
                      >
                        inspect →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="relative border border-[#23252A] rounded-xl overflow-hidden bg-[#010102] h-[520px]">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Interactive architecture graph. Arrow keys pan/orbit, +/- zoom, Enter selects, Esc clears."
            tabIndex={0}
            onKeyDown={handleKeyDown}
            className="w-full h-full cursor-grab active:cursor-grabbing block focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleClick}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
          >
            <p className="text-xs text-[#8A8F98] p-4">
              Interactive canvas is not supported in this environment. Please switch to the Accessible List view above.
            </p>
          </canvas>

          {/* Instructions Overlay */}
          <div className="absolute left-3 bottom-3 p-2.5 bg-[#0F1011]/85 backdrop-blur-xs border border-[#23252A] rounded-lg shadow-md font-mono text-[11px] text-[#8A8F98] pointer-events-none space-y-0.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#F7F8F8]">
              <Compass className="w-3.5 h-3.5 text-[#5E6AD2]" />
              <span>{is2DMode ? "2D Mode Controls" : "3D Perspective Controls"}</span>
            </div>
            <p>• Click + Drag to {is2DMode ? "Pan" : "Orbit"} • Shift/Right-Click to Pan</p>
            <p>• Scroll to Zoom • Arrow Keys for Keyboard Nav</p>
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
                  aria-label="Close details"
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
                    Outgoing Relations ({selectedNodeRelations.outgoing.length})
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

              {/* Architectural Module Brief (if directory) */}
              {selectedNode.type === "dir" && (
                <div className="p-2.5 rounded-lg bg-[#141516] border border-[#23252A] space-y-1">
                  <span className="text-[10px] text-[#62666D] uppercase block font-semibold">
                    Architectural Module Brief
                  </span>
                  <p className="text-[#D0D6E0] font-sans text-xs leading-relaxed">
                    {summary?.keyModules?.find((m) => m.directory === selectedNode.path)?.description ||
                      "Module directory grouping related implementation targets."}
                  </p>
                  {summary?.keyModules?.find((m) => m.directory === selectedNode.path)?.fileCount !== undefined && (
                    <span className="text-[10px] text-[#828FFF] block font-mono">
                      {summary.keyModules.find((m) => m.directory === selectedNode.path)?.fileCount} tracked files in this module
                    </span>
                  )}
                </div>
              )}

              {selectedNode.path && (() => {
                const childFiles = graph.nodes.filter(
                  (n) => n.type !== "dir" && n.path && n.path.startsWith(`${selectedNode.path}/`)
                );
                const primaryChild = childFiles.find((c) => c.type === "entry") || childFiles[0];
                const exploreUrl =
                  selectedNode.type === "dir"
                    ? primaryChild
                      ? `/explore?dir=${encodeURIComponent(selectedNode.path)}&file=${encodeURIComponent(primaryChild.path)}`
                      : `/explore?dir=${encodeURIComponent(selectedNode.path)}`
                    : `/explore?file=${encodeURIComponent(selectedNode.path)}`;

                return (
                  <div className="space-y-2 pt-1">
                    {childFiles.length > 0 && selectedNode.type === "dir" && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#62666D] uppercase block font-semibold">
                          Files in this Module ({childFiles.length})
                        </span>
                        <div className="max-h-24 overflow-y-auto divide-y divide-[#23252A] border border-[#23252A] rounded bg-[#141516]">
                          {childFiles.slice(0, 10).map((child) => (
                            <Link
                              key={child.id}
                              href={`/explore?dir=${encodeURIComponent(selectedNode.path!)}&file=${encodeURIComponent(child.path!)}`}
                              className="p-1.5 hover:bg-[#18191A] flex items-center justify-between text-[11px] group transition-colors"
                            >
                              <span className="text-[#D0D6E0] group-hover:text-[#828FFF] truncate">
                                {child.name}
                              </span>
                              <span className="text-[10px] text-[#62666D] group-hover:text-[#8A8F98]">
                                inspect →
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    <Link href={exploreUrl} className="w-full block">
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        icon={<ExternalLink className="w-3.5 h-3.5" />}
                      >
                        {selectedNode.type === "dir" ? "Open Module in Code Explorer →" : "Open in Code Explorer →"}
                      </Button>
                    </Link>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Legend Bar (Rule 4: Edge types labeled) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 bg-[#0F1011] border border-[#23252A] rounded-xl font-mono text-[11px] text-[#8A8F98]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-[#D0D6E0]">Nodes:</span>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="capitalize">{type}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t sm:border-t-0 sm:border-l border-[#23252A] pt-1 sm:pt-0 sm:pl-3">
          <span className="font-semibold text-[#D0D6E0]">Edges:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-[#52525A] inline-block" />
            <span>Contains</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-[#5E6AD2] inline-block" />
            <span>Entry Path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 border-t border-dashed border-[#34D399] inline-block" />
            <span>Import Dependency</span>
          </div>
        </div>
      </div>
    </div>
  );
};
