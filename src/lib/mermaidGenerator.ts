import type { ArchitectureSummary, ArchitectureGraph } from "@repopilot/core";

export type MermaidDiagramType = "system" | "hierarchy" | "components";

/**
 * Deterministically generates GitHub-compatible, high-contrast, modern Mermaid diagrams
 * from ArchitectureSummary and ArchitectureGraph data for any repository.
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
  const cleaned = str.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "node_" + Math.random().toString(36).substring(2, 6);
}

function sanitizeLabel(str: string): string {
  if (!str) return "module";
  return str
    .replace(/["[\](){}<>#`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Common color classes with rich high-contrast dark-mode palette.
 * All text is explicitly colored #FFFFFF for complete readability.
 */
function getCommonClassDefs(): string[] {
  return [
    "  %% High-Contrast Aesthetic Color Palette",
    "  classDef entry fill:#1E1B4B,stroke:#818CF8,stroke-width:2px,color:#FFFFFF,font-weight:600;",
    "  classDef route fill:#082F49,stroke:#38BDF8,stroke-width:2px,color:#FFFFFF,font-weight:600;",
    "  classDef core fill:#064E3B,stroke:#34D399,stroke-width:2px,color:#FFFFFF,font-weight:600;",
    "  classDef data fill:#451A03,stroke:#FBBF24,stroke-width:2px,color:#FFFFFF,font-weight:600;",
    "  classDef util fill:#2E1065,stroke:#C084FC,stroke-width:2px,color:#FFFFFF,font-weight:600;",
    "  classDef external fill:#4C0519,stroke:#FB7185,stroke-width:2px,color:#FFFFFF,font-weight:600;"
  ];
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
  lines.push("flowchart TD");
  lines.push(`  %% High-Level System Architecture for ${sanitizeLabel(repoFullName)}`);
  lines.push(...getCommonClassDefs());
  lines.push("");

  // Subgraph 1: Entry Points
  const entryPoints = summary.entryPoints && summary.entryPoints.length > 0
    ? summary.entryPoints.slice(0, 5)
    : [summary.primaryLanguage ? `main.${summary.primaryLanguage.toLowerCase().slice(0, 2)}` : "index.ts"];

  lines.push('  subgraph EntryPoints["  🚀  APPLICATION ENTRY POINTS  "]');
  entryPoints.forEach((ep) => {
    const id = "ep_" + sanitizeId(ep);
    const label = sanitizeLabel(ep);
    lines.push(`    ${id}["📄 ${label}"]:::entry`);
  });
  lines.push("  end");
  lines.push("  style EntryPoints fill:#0C0E14,stroke:#262A36,stroke-width:1.5px,color:#E2E8F0;");
  lines.push("");

  // Subgraph 2: Key Modules & Directory Roles
  lines.push('  subgraph CoreModules["  📦  CORE MODULES & SUBSYSTEMS  "]');
  const modules = summary.keyModules && summary.keyModules.length > 0
    ? summary.keyModules.slice(0, 6)
    : [{ directory: "src", description: "Application Source", fileCount: 1 }];

  modules.forEach((mod, idx) => {
    const id = "mod_" + sanitizeId(mod.directory);
    const label = sanitizeLabel(mod.directory) + ` (${mod.fileCount} files)`;
    const cls = idx % 3 === 0 ? "core" : idx % 3 === 1 ? "route" : "util";
    lines.push(`    ${id}["📁 ${label}"]:::${cls}`);
  });
  lines.push("  end");
  lines.push("  style CoreModules fill:#0A121E,stroke:#1D3354,stroke-width:1.5px,color:#BAE6FD;");
  lines.push("");

  // Subgraph 3: Frameworks, Tooling & Environment
  lines.push('  subgraph TechStack["  ⚙️  FRAMEWORKS, CONFIG & RUNTIME  "]');
  const langId = "lang_" + sanitizeId(summary.primaryLanguage || "code");
  lines.push(`    ${langId}["🔷 Language: ${sanitizeLabel(summary.primaryLanguage || 'TypeScript')}"]:::data`);

  if (summary.detectedFrameworks && summary.detectedFrameworks.length > 0) {
    summary.detectedFrameworks.slice(0, 4).forEach((fw) => {
      const id = "fw_" + sanitizeId(fw);
      lines.push(`    ${id}["⚡ Framework: ${sanitizeLabel(fw)}"]:::data`);
    });
  }

  if (summary.manifestFiles && summary.manifestFiles.length > 0) {
    summary.manifestFiles.slice(0, 3).forEach((mf) => {
      const id = "mf_" + sanitizeId(mf);
      lines.push(`    ${id}["📜 Manifest: ${sanitizeLabel(mf)}"]:::util`);
    });
  }
  lines.push("  end");
  lines.push("  style TechStack fill:#091A14,stroke:#164E3D,stroke-width:1.5px,color:#A7F3D0;");
  lines.push("");

  // Connect Entry Points -> Modules
  if (entryPoints.length > 0 && modules.length > 0) {
    const firstEpId = "ep_" + sanitizeId(entryPoints[0]);
    modules.slice(0, Math.min(modules.length, 3)).forEach((mod) => {
      const modId = "mod_" + sanitizeId(mod.directory);
      lines.push(`  ${firstEpId} --> ${modId}`);
    });
  }

  // Connect Modules -> Stack
  if (modules.length > 0) {
    const mainModId = "mod_" + sanitizeId(modules[0].directory);
    lines.push(`  ${mainModId} -.-> ${langId}`);
  }

  lines.push("");
  lines.push("  linkStyle default stroke:#64748B,stroke-width:1.5px;");

  return lines.join("\n");
}

/**
 * 2. Horizontal Architecture & Modular Hierarchy Diagram (flowchart LR)
 */
function generateHierarchyDiagram(
  summary: ArchitectureSummary,
  repoFullName: string = "repository"
): string {
  const lines: string[] = [];
  lines.push("flowchart LR");
  lines.push(`  %% Modular Directory Hierarchy for ${sanitizeLabel(repoFullName)}`);
  lines.push(...getCommonClassDefs());
  lines.push("");

  const rootId = "root_" + sanitizeId(repoFullName);
  lines.push(`  ${rootId}["🏛️ ${sanitizeLabel(repoFullName)}"]:::entry`);

  const modules = summary.keyModules && summary.keyModules.length > 0
    ? summary.keyModules.slice(0, 8)
    : [{ directory: "src", description: "Application Core", fileCount: 1 }];

  modules.forEach((mod, idx) => {
    const modId = "m_" + sanitizeId(mod.directory);
    const cls = idx % 2 === 0 ? "core" : "route";
    lines.push(`  ${rootId} --> ${modId}["📁 ${sanitizeLabel(mod.directory)}/ (${mod.fileCount} files)"]:::${cls}`);
    if (mod.description) {
      const descId = "desc_" + idx;
      lines.push(`  ${modId} -.-> ${descId}["📝 ${sanitizeLabel(mod.description).slice(0, 36)}"]:::util`);
    }
  });

  lines.push("");
  lines.push("  linkStyle default stroke:#64748B,stroke-width:1.5px;");

  return lines.join("\n");
}

/**
 * 3. Tiered Architecture & Component Flow Diagram
 * Dynamically tailored to the repository's real structure without hardcoding.
 */
function generateComponentDiagram(
  summary: ArchitectureSummary,
  graph?: ArchitectureGraph | null,
  repoFullName: string = "repository"
): string {
  const lines: string[] = [];
  lines.push("flowchart TD");
  lines.push(`  %% Tiered Component Architecture for ${sanitizeLabel(repoFullName)}`);
  lines.push(...getCommonClassDefs());
  lines.push("");

  // 1. Presentation / Interface Tier
  lines.push('  subgraph ClientTier["  💻  PRESENTATION & INTERFACE TIER  "]');
  const presentationCandidates = graph?.nodes.filter(
    (n) => n.type === "component" || n.type === "entry" || n.type === "route"
  ).slice(0, 5) || [];

  if (presentationCandidates.length > 0) {
    presentationCandidates.forEach((n) => {
      const id = "ui_" + sanitizeId(n.id);
      const icon = n.type === "entry" ? "🚀" : n.type === "route" ? "🌐" : "⚛️";
      lines.push(`    ${id}["${icon} ${sanitizeLabel(n.name)}"]:::entry`);
    });
  } else if (summary.entryPoints && summary.entryPoints.length > 0) {
    summary.entryPoints.slice(0, 4).forEach((ep) => {
      const id = "ui_" + sanitizeId(ep);
      lines.push(`    ${id}["🚀 ${sanitizeLabel(ep)}"]:::entry`);
    });
  } else {
    lines.push(`    ui_main["🚀 ${sanitizeLabel(repoFullName)} Interface Layer"]:::entry`);
  }
  lines.push("  end");
  lines.push("  style ClientTier fill:#0C0E14,stroke:#262A36,stroke-width:1.5px,color:#E2E8F0;");
  lines.push("");

  // 2. Core Domain & Business Logic Tier (Extracted from repository modules)
  lines.push('  subgraph DomainTier["  🧠  DOMAIN LOGIC & CORE MODULES  "]');
  const domainModules = summary.keyModules && summary.keyModules.length > 0
    ? summary.keyModules.slice(0, 5)
    : [{ directory: "core", description: "Business Logic Subsystem", fileCount: 1 }];

  domainModules.forEach((m) => {
    const id = "domain_" + sanitizeId(m.directory);
    const label = `${sanitizeLabel(m.directory)} (${m.description})`;
    lines.push(`    ${id}["🧩 ${label}"]:::core`);
  });
  lines.push("  end");
  lines.push("  style DomainTier fill:#0A121E,stroke:#1D3354,stroke-width:1.5px,color:#BAE6FD;");
  lines.push("");

  // 3. Infrastructure, Data & Runtime Tier (Dependencies and environment)
  lines.push('  subgraph InfraTier["  🛡️  INFRASTRUCTURE, DATA & DEPENDENCIES  "]');
  const topDeps = summary.dependencies && summary.dependencies.length > 0
    ? summary.dependencies.slice(0, 4)
    : [];

  if (topDeps.length > 0) {
    topDeps.forEach((dep) => {
      const id = "dep_" + sanitizeId(dep.name);
      lines.push(`    ${id}["📦 ${sanitizeLabel(dep.name)} (${dep.isDev ? "tool" : "runtime"})"]:::data`);
    });
  }

  if (summary.manifestFiles && summary.manifestFiles.length > 0) {
    const mfId = "mf_" + sanitizeId(summary.manifestFiles[0]);
    lines.push(`    ${mfId}["📜 Config: ${sanitizeLabel(summary.manifestFiles[0])}"]:::util`);
  } else {
    const langId = "env_" + sanitizeId(summary.primaryLanguage || "runtime");
    lines.push(`    ${langId}["🔷 Runtime: ${sanitizeLabel(summary.primaryLanguage || 'Standard Library')}"]:::data`);
  }
  lines.push("  end");
  lines.push("  style InfraTier fill:#091A14,stroke:#164E3D,stroke-width:1.5px,color:#A7F3D0;");
  lines.push("");

  // Connect Tiers
  lines.push("  ClientTier --> DomainTier");
  lines.push("  DomainTier --> InfraTier");
  lines.push("");
  lines.push("  linkStyle default stroke:#64748B,stroke-width:1.5px;");

  return lines.join("\n");
}
