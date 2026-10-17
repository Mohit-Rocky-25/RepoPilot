import type { ArchitectureSummary, ArchitectureGraph } from "@repopilot/core";

export type MermaidDiagramType = "system" | "hierarchy" | "components";

/**
 * Deterministically generates GitHub-compatible Mermaid markdown diagrams
 * from ArchitectureSummary and ArchitectureGraph data.
 */
export function generateMermaidDiagram(
  summary: ArchitectureSummary,
  graph?: ArchitectureGraph | null,
  type: MermaidDiagramType = "system",
  repoFullName: string = "repository"
): string {
  if (type === "hierarchy") {
    return generateHierarchyDiagram(summary, repoFullName);
  }
  if (type === "components") {
    return generateComponentDiagram(summary, graph, repoFullName);
  }
  return generateSystemDiagram(summary, graph, repoFullName);
}

function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_]/g, "_");
}

function sanitizeLabel(str: string): string {
  return str.replace(/["[\](){}<>]/g, "").trim();
}

/**
 * 1. High-Level System Architecture Diagram (Flowchart TD)
 */
function generateSystemDiagram(
  summary: ArchitectureSummary,
  graph?: ArchitectureGraph | null,
  repoFullName: string = "repository"
): string {
  const lines: string[] = [];
  lines.push("graph TD");
  lines.push(`  %% Architecture Overview for ${sanitizeLabel(repoFullName)}`);
  lines.push("  classDef entry fill:#1e1b4b,stroke:#828FFF,stroke-width:2px,color:#F7F8F8;");
  lines.push("  classDef module fill:#0f172a,stroke:#38BDF8,stroke-width:1.5px,color:#F7F8F8;");
  lines.push("  classDef tool fill:#064e3b,stroke:#27A644,stroke-width:1.5px,color:#F7F8F8;");
  lines.push("  classDef config fill:#312e81,stroke:#A855F7,stroke-width:1.5px,color:#F7F8F8;");

  // Subgraph 1: Entry Points
  if (summary.entryPoints && summary.entryPoints.length > 0) {
    lines.push('  subgraph EntryPoints["🚀 Application Entry Points"]');
    summary.entryPoints.slice(0, 6).forEach((ep) => {
      const id = "ep_" + sanitizeId(ep);
      const label = sanitizeLabel(ep);
      lines.push(`    ${id}["📄 ${label}"]:::entry`);
    });
    lines.push("  end");
  }

  // Subgraph 2: Key Modules
  if (summary.keyModules && summary.keyModules.length > 0) {
    lines.push('  subgraph Modules["📦 Core Modules & Directories"]');
    summary.keyModules.slice(0, 8).forEach((mod) => {
      const id = "mod_" + sanitizeId(mod.directory);
      const label = sanitizeLabel(mod.directory) + ` (${mod.fileCount} files)`;
      lines.push(`    ${id}["📁 ${label}"]:::module`);
    });
    lines.push("  end");
  }

  // Subgraph 3: Frameworks & Build Config
  lines.push('  subgraph Stack["⚙️ Frameworks & Environment"]');
  const langId = "lang_" + sanitizeId(summary.primaryLanguage || "code");
  lines.push(`    ${langId}["🔷 Language: ${sanitizeLabel(summary.primaryLanguage || 'TypeScript')}"]:::tool`);

  if (summary.detectedFrameworks && summary.detectedFrameworks.length > 0) {
    summary.detectedFrameworks.slice(0, 4).forEach((fw) => {
      const id = "fw_" + sanitizeId(fw);
      lines.push(`    ${id}["⚡ Framework: ${sanitizeLabel(fw)}"]:::tool`);
    });
  }

  if (summary.manifestFiles && summary.manifestFiles.length > 0) {
    summary.manifestFiles.slice(0, 3).forEach((mf) => {
      const id = "mf_" + sanitizeId(mf);
      lines.push(`    ${id}["📜 Manifest: ${sanitizeLabel(mf)}"]:::config`);
    });
  }
  lines.push("  end");

  // Relationships / Edges
  if (summary.entryPoints && summary.entryPoints.length > 0 && summary.keyModules && summary.keyModules.length > 0) {
    const firstEpId = "ep_" + sanitizeId(summary.entryPoints[0]);
    summary.keyModules.slice(0, 4).forEach((mod) => {
      const modId = "mod_" + sanitizeId(mod.directory);
      lines.push(`  ${firstEpId} --> ${modId}`);
    });
  }

  if (summary.keyModules && summary.keyModules.length > 0) {
    const targetModuleId = "mod_" + sanitizeId(summary.keyModules[0].directory);
    const langId = "lang_" + sanitizeId(summary.primaryLanguage || "code");
    lines.push(`  ${targetModuleId} -.-> ${langId}`);
  }

  return lines.join("\n");
}

/**
 * 2. Horizontal Architecture & Component Flow (graph LR)
 */
function generateHierarchyDiagram(
  summary: ArchitectureSummary,
  repoFullName: string = "repository"
): string {
  const lines: string[] = [];
  lines.push("graph LR");
  lines.push(`  %% Modular Hierarchy for ${sanitizeLabel(repoFullName)}`);
  lines.push("  classDef root fill:#312e81,stroke:#828FFF,stroke-width:2px,color:#FFFFFF;");
  lines.push("  classDef node fill:#141516,stroke:#34343A,stroke-width:1.5px,color:#F7F8F8;");
  lines.push("  classDef leaf fill:#0F1011,stroke:#23252A,stroke-width:1px,color:#8A8F98;");

  const rootId = "root_" + sanitizeId(repoFullName);
  lines.push(`  ${rootId}["🏛️ ${sanitizeLabel(repoFullName)}"]:::root`);

  summary.keyModules.slice(0, 8).forEach((mod, idx) => {
    const modId = "m_" + sanitizeId(mod.directory);
    lines.push(`  ${rootId} --> ${modId}["📁 ${sanitizeLabel(mod.directory)}/"]:::node`);
    if (mod.description) {
      const descId = "desc_" + idx;
      lines.push(`  ${modId} -.-> ${descId}["📝 ${sanitizeLabel(mod.description).slice(0, 40)}"]:::leaf`);
    }
  });

  return lines.join("\n");
}

/**
 * 3. Component & Dependency Flow Diagram
 */
function generateComponentDiagram(
  summary: ArchitectureSummary,
  graph?: ArchitectureGraph | null,
  repoFullName: string = "repository"
): string {
  const lines: string[] = [];
  lines.push("graph TD");
  lines.push(`  %% Component Dependency Architecture for ${sanitizeLabel(repoFullName)}`);
  lines.push("  classDef ui fill:#1e1b4b,stroke:#828FFF,stroke-width:2px,color:#FFFFFF;");
  lines.push("  classDef api fill:#083344,stroke:#38BDF8,stroke-width:1.5px,color:#FFFFFF;");
  lines.push("  classDef core fill:#022c22,stroke:#27A644,stroke-width:1.5px,color:#FFFFFF;");

  // UI Tier
  lines.push('  subgraph ClientTier["💻 UI & Presentation Tier"]');
  const uiNodes = graph?.nodes.filter((n) => n.type === "component" || n.type === "entry").slice(0, 5) || [];
  if (uiNodes.length > 0) {
    uiNodes.forEach((n) => {
      lines.push(`    ui_${sanitizeId(n.id)}["${sanitizeLabel(n.name)}"]:::ui`);
    });
  } else {
    lines.push('    ui_main["App Views & UI Layout"]:::ui');
  }
  lines.push("  end");

  // API / Routing Tier
  lines.push('  subgraph APITier["🌐 API Routes & Networking"]');
  const routeNodes = graph?.nodes.filter((n) => n.type === "route").slice(0, 5) || [];
  if (routeNodes.length > 0) {
    routeNodes.forEach((n) => {
      lines.push(`    route_${sanitizeId(n.id)}["${sanitizeLabel(n.name)}"]:::api`);
    });
  } else {
    lines.push('    api_routes["Endpoints & Client API Fetchers"]:::api');
  }
  lines.push("  end");

  // Core / Logic Tier
  lines.push('  subgraph CoreTier["🧠 Engine & State Management"]');
  lines.push(`    core_engine["AST Indexer & Analysis Engine"]:::core`);
  if (summary.dependencies && summary.dependencies.length > 0) {
    summary.dependencies.slice(0, 4).forEach((d) => {
      lines.push(`    dep_${sanitizeId(d.name)}["📦 ${sanitizeLabel(d.name)}"]:::core`);
    });
  }
  lines.push("  end");

  lines.push("  ClientTier --> APITier");
  lines.push("  APITier --> CoreTier");

  return lines.join("\n");
}
