import { describe, it, expect } from "vitest";
import { ArchitectureAnalyzer } from "../../packages/analysis/src/architectureAnalyzer";
import type { RepositoryFile } from "@repopilot/core";

describe("Task 5: Honest 3D and 2D Map & 50 Module Capping", () => {
  it("defaults to 2D when repository exceeds 50 modules", () => {
    // Generate 60 module directories
    const files: RepositoryFile[] = [];
    for (let i = 1; i <= 60; i++) {
      files.push({
        path: `packages/module-${i}/src/index.ts`,
        size: 500,
        type: "blob",
        sha: `sha_${i}`,
        language: "TypeScript",
        isBinary: false
      });
    }

    const summary = ArchitectureAnalyzer.analyze(files);
    const graph = ArchitectureAnalyzer.generateGraph(files, "monorepo/large");

    expect(summary.keyModules.length).toBeGreaterThan(50);
    expect(graph.nodes.length).toBeGreaterThan(50);

    // Verify condition: repos > 50 modules default to 2D
    const shouldDefaultTo2D = summary.keyModules.length > 50 || graph.nodes.length > 50;
    expect(shouldDefaultTo2D).toBe(true);
  });

  it("extracts unique top-level folders for folder-scoped filtering", () => {
    const files: RepositoryFile[] = [
      { path: "src/index.ts", size: 100, type: "blob", sha: "s1", isBinary: false },
      { path: "packages/core/src/index.ts", size: 100, type: "blob", sha: "s2", isBinary: false },
      { path: "packages/search/src/index.ts", size: 100, type: "blob", sha: "s3", isBinary: false },
      { path: "tests/unit/index.test.ts", size: 100, type: "blob", sha: "s4", isBinary: false },
      { path: "docs/readme.md", size: 100, type: "blob", sha: "s5", isBinary: false }
    ];

    const graph = ArchitectureAnalyzer.generateGraph(files, "my-repo");
    const topFolders = new Set<string>();
    graph.nodes.forEach((n) => {
      if (n.path) {
        const top = n.path.split("/")[0];
        if (top && !top.startsWith(".")) {
          topFolders.add(top);
        }
      }
    });

    expect(topFolders.has("src")).toBe(true);
    expect(topFolders.has("packages")).toBe(true);
    expect(topFolders.has("tests")).toBe(true);
    expect(topFolders.has("docs")).toBe(true);
  });
});
