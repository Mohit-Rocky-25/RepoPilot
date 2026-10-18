"use client";

import React, { useState, useEffect } from "react";
import { Folder, FolderOpen, FileCode, ChevronRight, ChevronDown, ChevronsUpDown, FolderMinus, FolderPlus } from "lucide-react";
import type { RepositoryFile } from "@repopilot/core";

interface FileNode {
  name: string;
  path: string;
  type: "tree" | "blob";
  children?: Map<string, FileNode>;
  file?: RepositoryFile;
}

interface FileTreeProps {
  files: RepositoryFile[];
  selectedPath: string | null;
  selectedDirectory?: string | null;
  onSelectFile: (file: RepositoryFile) => void;
  onSelectDirectory?: (dirPath: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  selectedPath,
  selectedDirectory,
  onSelectFile,
  onSelectDirectory
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState("");

  // Automatically expand all ancestor folders when selectedPath or selectedDirectory changes
  useEffect(() => {
    const pathToExpand = selectedPath || selectedDirectory;
    if (pathToExpand) {
      const parts = pathToExpand.split("/");
      const ancestors: string[] = [];
      for (let i = 1; i <= parts.length; i++) {
        ancestors.push(parts.slice(0, i).join("/"));
      }
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        ancestors.forEach((a) => next.add(a));
        return next;
      });
    }
  }, [selectedPath, selectedDirectory]);

  // Build hierarchical tree structure from flat file list
  const root: FileNode = { name: "", path: "", type: "tree", children: new Map() };

  for (const file of files) {
    if (filterText && !file.path.toLowerCase().includes(filterText.toLowerCase())) {
      continue;
    }

    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1 && file.type === "blob";
      const currentPath = parts.slice(0, i + 1).join("/");

      if (!current.children!.has(part)) {
        current.children!.set(part, {
          name: part,
          path: currentPath,
          type: isFile ? "blob" : "tree",
          children: isFile ? undefined : new Map(),
          file: isFile ? file : undefined
        });
      }
      current = current.children!.get(part)!;
    }
  }

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allFolders = new Set<string>();
    for (const file of files) {
      const parts = file.path.split("/");
      for (let i = 1; i < parts.length; i++) {
        allFolders.add(parts.slice(0, i).join("/"));
      }
    }
    setExpandedFolders(allFolders);
  };

  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

  const renderNode = (node: FileNode, depth: number = 0): React.ReactNode => {
    const isFolder = node.type === "tree";
    const isExpanded = expandedFolders.has(node.path) || Boolean(filterText);
    const isSelected = selectedPath === node.path;
    const isDirSelected = selectedDirectory === node.path;

    if (!node.name) {
      // Root level children
      if (!node.children) return null;
      return Array.from(node.children.values())
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .map((child) => renderNode(child, 0));
    }

    return (
      <div key={node.path} className="select-none font-mono text-xs">
        <div
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.path);
              onSelectDirectory?.(node.path);
            } else if (node.file) {
              onSelectFile(node.file);
            }
          }}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          className={`flex items-center justify-between py-1.5 pr-2 rounded cursor-pointer transition-colors group ${
            isSelected
              ? "bg-[#5E6AD2]/20 text-[#828FFF] font-medium border-l-2 border-[#5E6AD2]"
              : isDirSelected
              ? "bg-[#5E6AD2]/10 text-[#828FFF] font-medium border-l-2 border-[#5E6AD2]/60"
              : "text-console-muted hover:text-console-text hover:bg-console-subtle/70"
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {isFolder ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-console-dim shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-console-dim shrink-0" />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-3.5 h-3.5 text-[#5E6AD2] shrink-0" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-console-dim shrink-0" />
                )}
              </>
            ) : (
              <>
                <span className="w-3.5 shrink-0" />
                <FileCode className="w-3.5 h-3.5 text-console-muted group-hover:text-console-accent shrink-0" />
              </>
            )}
            <span className="truncate">{node.name}</span>
          </div>

          {!isFolder && node.file?.size !== undefined && (
            <span className="text-[10px] text-console-dim shrink-0">
              {node.file.size > 1024
                ? `${(node.file.size / 1024).toFixed(1)}k`
                : `${node.file.size}b`}
            </span>
          )}
        </div>

        {isFolder && isExpanded && node.children && (
          <div>
            {Array.from(node.children.values())
              .sort((a, b) => {
                if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
                return a.name.localeCompare(b.name);
              })
              .map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-console-surface border border-console-border rounded-lg overflow-hidden">
      {/* Search Filter Header with Expand/Collapse buttons */}
      <div className="p-2.5 border-b border-console-border bg-console-subtle space-y-1.5">
        <input
          type="text"
          placeholder="Filter files..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="w-full bg-console-surface border border-console-border text-console-text placeholder:text-console-dim text-xs font-mono rounded px-2.5 py-1.5 focus:outline-none focus:border-console-accent"
        />
        <div className="flex items-center justify-between text-[10px] font-mono text-[#8A8F98] pt-0.5">
          <span>{files.length} items</span>
          <div className="flex items-center gap-1">
            <button
              onClick={expandAll}
              className="px-1.5 py-0.5 rounded hover:bg-[#1C1D1F] hover:text-[#F7F8F8] transition-colors flex items-center gap-1"
              title="Expand all folders"
            >
              <FolderPlus className="w-3 h-3 text-[#5E6AD2]" />
              <span>Expand</span>
            </button>
            <span>·</span>
            <button
              onClick={collapseAll}
              className="px-1.5 py-0.5 rounded hover:bg-[#1C1D1F] hover:text-[#F7F8F8] transition-colors flex items-center gap-1"
              title="Collapse all folders"
            >
              <FolderMinus className="w-3 h-3 text-[#8A8F98]" />
              <span>Collapse</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Tree */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {files.length === 0 ? (
          <div className="p-6 text-center text-xs text-console-dim font-mono">
            No files to display.
          </div>
        ) : (
          renderNode(root)
        )}
      </div>
    </div>
  );
};

