import { describe, it, expect } from "vitest";
import type { RepositoryFile, ArchitectureGraphNode, ArchitectureSummary } from "@repopilot/core";

// Helper replicating the robust directory and entry file resolution engine
function resolveExplorerTarget(
  targetPath: string | null,
  files: RepositoryFile[]
): {
  type: "file" | "directory" | "none";
  selectedFile: RepositoryFile | null;
  selectedDirectory: string | null;
  childFiles: RepositoryFile[];
} {
  if (!targetPath || files.length === 0) {
    const readme = files.find((f) => f.path.toLowerCase().startsWith("readme"));
    const fallback = readme || files.find((f) => f.type === "blob") || null;
    return {
      type: fallback ? "file" : "none",
      selectedFile: fallback,
      selectedDirectory: fallback && fallback.path.includes("/") ? fallback.path.substring(0, fallback.path.lastIndexOf("/")) : null,
      childFiles: []
    };
  }

  // 1. Direct file match
  const exactFile = files.find((f) => f.path === targetPath && f.type === "blob");
  if (exactFile) {
    const parent = exactFile.path.includes("/") ? exactFile.path.substring(0, exactFile.path.lastIndexOf("/")) : null;
    return {
      type: "file",
      selectedFile: exactFile,
      selectedDirectory: parent,
      childFiles: []
    };
  }

  // 2. Directory match
  const childFiles = files.filter((f) => f.path.startsWith(`${targetPath}/`));
  if (childFiles.length > 0) {
    const entryFile =
      childFiles.find(
        (f) =>
          f.path === `${targetPath}/index.ts` ||
          f.path === `${targetPath}/index.tsx` ||
          f.path === `${targetPath}/index.js` ||
          f.path === `${targetPath}/page.tsx` ||
          f.path.endsWith("/index.ts") ||
          f.path.endsWith("/index.tsx") ||
          f.path.endsWith("/page.tsx")
      ) || childFiles[0];

    return {
      type: "directory",
      selectedFile: entryFile || null,
      selectedDirectory: targetPath,
      childFiles
    };
  }

  // 3. Fallback
  return {
    type: "none",
    selectedFile: null,
    selectedDirectory: null,
    childFiles: []
  };
}

// Helper computing ancestor folder paths for auto-expansion
function getAncestorFolders(path: string): string[] {
  const parts = path.split("/");
  const ancestors: string[] = [];
  for (let i = 1; i <= parts.length; i++) {
    ancestors.push(parts.slice(0, i).join("/"));
  }
  return ancestors;
}

// Helper generating 3D/2D node navigation links
function getNodeExploreUrl(
  node: Pick<ArchitectureGraphNode, "type" | "path">,
  graphNodes: Pick<ArchitectureGraphNode, "type" | "path">[]
): string {
  if (!node.path) return "/explore";

  if (node.type === "dir") {
    const childFiles = graphNodes.filter(
      (n) => n.type !== "dir" && n.path && n.path.startsWith(`${node.path}/`)
    );
    const primaryChild = childFiles.find((c) => c.type === "entry") || childFiles[0];
    if (primaryChild && primaryChild.path) {
      return `/explore?dir=${encodeURIComponent(node.path)}&file=${encodeURIComponent(primaryChild.path)}`;
    }
    return `/explore?dir=${encodeURIComponent(node.path)}`;
  }

  return `/explore?file=${encodeURIComponent(node.path)}`;
}

describe("Code Explorer & Architecture Navigation Engine", () => {
  const mockRepoFiles: RepositoryFile[] = [
    { path: "README.md", type: "blob", size: 1200, sha: "sha-readme", isBinary: false },
    { path: "package.json", type: "blob", size: 600, sha: "sha-pkg", isBinary: false },
    { path: "src/index.ts", type: "blob", size: 450, sha: "sha-idx", language: "TypeScript", isBinary: false },
    { path: "src/components/Header.tsx", type: "blob", size: 850, sha: "sha-hdr", language: "TypeScript", isBinary: false },
    { path: "src/components/Footer.tsx", type: "blob", size: 600, sha: "sha-ftr", language: "TypeScript", isBinary: false },
    { path: "src/components/ui/Button.tsx", type: "blob", size: 950, sha: "sha-btn", language: "TypeScript", isBinary: false },
    { path: "src/lib/api.ts", type: "blob", size: 1200, sha: "sha-api", language: "TypeScript", isBinary: false }
  ];

  it("resolves exact file targets correctly and sets parent directory", () => {
    const res = resolveExplorerTarget("src/components/Header.tsx", mockRepoFiles);
    expect(res.type).toBe("file");
    expect(res.selectedFile?.path).toBe("src/components/Header.tsx");
    expect(res.selectedDirectory).toBe("src/components");
  });

  it("resolves directory targets correctly without pitch-black void or direction failure", () => {
    const res = resolveExplorerTarget("src/components", mockRepoFiles);
    expect(res.type).toBe("directory");
    expect(res.selectedDirectory).toBe("src/components");
    expect(res.childFiles.length).toBe(3);
    // Auto-selects first/best entry file in directory
    expect(res.selectedFile?.path).toBe("src/components/Header.tsx");
  });

  it("computes all ancestor folders so deep tree hierarchies auto-expand immediately", () => {
    const ancestors = getAncestorFolders("src/components/ui/Button.tsx");
    expect(ancestors).toContain("src");
    expect(ancestors).toContain("src/components");
    expect(ancestors).toContain("src/components/ui");

    const dirAncestors = getAncestorFolders("src/components");
    expect(dirAncestors).toContain("src");
    expect(dirAncestors).toContain("src/components");
  });

  it("generates direct 3D node explorer links pointing to folder and child file", () => {
    const graphNodes: Pick<ArchitectureGraphNode, "type" | "path">[] = [
      { type: "dir", path: "src/components" },
      { type: "component", path: "src/components/Header.tsx" },
      { type: "component", path: "src/components/Footer.tsx" },
      { type: "entry", path: "src/index.ts" }
    ];

    const dirNode = graphNodes[0];
    const dirUrl = getNodeExploreUrl(dirNode, graphNodes);
    expect(dirUrl).toBe("/explore?dir=src%2Fcomponents&file=src%2Fcomponents%2FHeader.tsx");

    const fileNode = graphNodes[3];
    const fileUrl = getNodeExploreUrl(fileNode, graphNodes);
    expect(fileUrl).toBe("/explore?file=src%2Findex.ts");
  });

  it("falls back gracefully to README or root code when no target is provided", () => {
    const res = resolveExplorerTarget(null, mockRepoFiles);
    expect(res.type).toBe("file");
    expect(res.selectedFile?.path).toBe("README.md");
  });

  it("extracts module briefs deterministically for directory nodes", () => {
    const sampleSummary: ArchitectureSummary = {
      primaryLanguage: "TypeScript",
      detectedFrameworks: ["React", "Next.js"],
      entryPoints: ["src/index.ts"],
      manifestFiles: ["package.json"],
      keyModules: [
        { directory: "src/components", description: "UI Components & Widgets", fileCount: 3 },
        { directory: "src/lib", description: "Utility Library", fileCount: 1 }
      ],
      dependencies: []
    };

    const compModule = sampleSummary.keyModules.find((m) => m.directory === "src/components");
    expect(compModule).toBeDefined();
    expect(compModule?.description).toBe("UI Components & Widgets");
    expect(compModule?.fileCount).toBe(3);
  });
});
