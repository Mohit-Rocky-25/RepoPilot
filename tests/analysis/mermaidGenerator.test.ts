import { describe, it, expect } from "vitest";
import { generateMermaidDiagram } from "../../src/lib/mermaidGenerator";
import type { ArchitectureSummary, ArchitectureGraph } from "@repopilot/core";

describe("Mermaid Diagram Generator", () => {
  const sampleSummary: ArchitectureSummary = {
    primaryLanguage: "TypeScript",
    detectedFrameworks: ["Next.js", "React", "Tailwind CSS"],
    entryPoints: ["src/app/page.tsx", "src/app/layout.tsx"],
    manifestFiles: ["package.json", "tsconfig.json"],
    keyModules: [
      { directory: "src/components", description: "UI Components", fileCount: 24 },
      { directory: "src/lib", description: "Helper Utilities", fileCount: 12 },
      { directory: "src/features", description: "Feature Modules", fileCount: 30 }
    ],
    dependencies: [
      { name: "react", version: "18.3.1", isDev: false },
      { name: "next", version: "14.2.15", isDev: false },
      { name: "vitest", version: "2.1.3", isDev: true }
    ]
  };

  const sampleGraph: ArchitectureGraph = {
    nodes: [
      { id: "root", name: "Root", path: "", type: "root", depth: 0, x: 0, y: 0, z: 0 },
      { id: "entry1", name: "page.tsx", path: "src/app/page.tsx", type: "entry", depth: 2, x: 10, y: 10, z: 0 },
      { id: "comp1", name: "Header.tsx", path: "src/components/Header.tsx", type: "component", depth: 3, x: 20, y: 20, z: 0 },
      { id: "route1", name: "api/route.ts", path: "src/app/api/route.ts", type: "route", depth: 3, x: 30, y: 30, z: 0 }
    ],
    edges: [
      { source: "root", target: "entry1", type: "contains" }
    ]
  };

  it("generates high-contrast System Flowchart TD diagram", () => {
    const code = generateMermaidDiagram(sampleSummary, sampleGraph, "system", "owner/test-repo");

    expect(code).toContain("flowchart TD");
    expect(code).toContain("classDef entry");
    expect(code).toContain("classDef route");
    expect(code).toContain("classDef core");
    expect(code).toContain("subgraph EntryPoints");
    expect(code).toContain("subgraph CoreModules");
    expect(code).toContain("subgraph TechStack");
    expect(code).toContain("page_tsx");
    expect(code).toContain("TypeScript");
    expect(code).toContain("Next_js");
  });

  it("generates Modular Hierarchy LR diagram", () => {
    const code = generateMermaidDiagram(sampleSummary, sampleGraph, "hierarchy", "owner/test-repo");

    expect(code).toContain("flowchart LR");
    expect(code).toContain("root_owner_test_repo");
    expect(code).toContain("src_components");
    expect(code).toContain("src_lib");
  });

  it("generates Tiered Component Architecture diagram dynamically without hardcoded RepoPilot strings", () => {
    const code = generateMermaidDiagram(sampleSummary, sampleGraph, "components", "owner/custom-project");

    expect(code).toContain("flowchart TD");
    expect(code).toContain("subgraph ClientTier");
    expect(code).toContain("subgraph DomainTier");
    expect(code).toContain("subgraph InfraTier");
    // Verify it uses real repository items, not RepoPilot hardcoded strings
    expect(code).not.toContain("AST Indexer & Analysis Engine");
    expect(code).toContain("ClientTier --> DomainTier");
    expect(code).toContain("DomainTier --> InfraTier");
  });

  it("handles minimal and empty repositories gracefully without crashing or broken syntax", () => {
    const minimalSummary: ArchitectureSummary = {
      primaryLanguage: "Python",
      detectedFrameworks: [],
      entryPoints: [],
      manifestFiles: [],
      keyModules: [],
      dependencies: []
    };

    const systemCode = generateMermaidDiagram(minimalSummary, null, "system", "empty/repo");
    expect(systemCode).toContain("flowchart TD");
    expect(systemCode).toContain("style EntryPoints");

    const compCode = generateMermaidDiagram(minimalSummary, null, "components", "empty/repo");
    expect(compCode).toContain("flowchart TD");
    expect(compCode).toContain("ClientTier --> DomainTier");

    const hierCode = generateMermaidDiagram(minimalSummary, null, "hierarchy", "empty/repo");
    expect(hierCode).toContain("flowchart LR");
    expect(hierCode).toContain("empty_repo");
  });

  it("generates Data Flow & Execution Pipeline diagram", () => {
    const dataflowCode = generateMermaidDiagram(sampleSummary, sampleGraph, "dataflow", "owner/test-repo");
    expect(dataflowCode).toContain("flowchart TD");
    expect(dataflowCode).toContain("subgraph IngestPipeline");
    expect(dataflowCode).toContain("subgraph ProcessingPipeline");
    expect(dataflowCode).toContain("subgraph StatePipeline");
    expect(dataflowCode).toContain("subgraph OutputPipeline");
    expect(dataflowCode).toContain("df_entry");
    expect(dataflowCode).toContain("df_router");
  });

  it("respects custom orientation parameter (TD vs LR)", () => {
    const lrSystem = generateMermaidDiagram(sampleSummary, sampleGraph, "system", "owner/test-repo", "LR");
    expect(lrSystem).toContain("flowchart LR");

    const tdHier = generateMermaidDiagram(sampleSummary, sampleGraph, "hierarchy", "owner/test-repo", "TD");
    expect(tdHier).toContain("flowchart TD");
  });
});
