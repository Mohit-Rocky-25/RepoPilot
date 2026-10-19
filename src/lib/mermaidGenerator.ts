import type { ArchitectureSummary, ArchitectureGraph } from "@repopilot/core";

export type MermaidDiagramType = "system" | "hierarchy" | "components" | "dataflow";
export type DiagramOrientation = "TD" | "LR";

/**
 * Deterministically generates GitHub-compatible, high-contrast, modern Mermaid diagrams
 * from ArchitectureSummary and ArchitectureGraph data for any repository.
 */
export function generateMermaidDiagram(
  summary: ArchitectureSummary,
  graph?: ArchitectureGraph | null,
  type: MermaidDiagramType = "system",
  repoFullName: string = "repository",
  orientation?: DiagramOrientation
): string {
  if (type === "hierarchy") {
    return generateHierarchyDiagram(summary, repoFullName, orientation);
  }
  if (type === "components") {
    return generateComponentDiagram(summary, graph, repoFullName, orientation);
  }
  if (type === "dataflow") {
    return generateDataflowDiagram(summary, graph, repoFullName, orientation);
  }
  return generateSystemDiagram(summary, graph, repoFullName, orientation);
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
    "  %% Modern High-Contrast Aesthetic Color Palette",
    "  classDef entry fill:#1E1B4B,stroke:#818CF8,stroke-width:2px,color:#FFFFFF,font-weight:600,rx:8px;",
    "  classDef route fill:#082F49,stroke:#38BDF8,stroke-width:2px,color:#FFFFFF,font-weight:600,rx:8px;",
    "  classDef core fill:#064E3B,stroke:#34D399,stroke-width:2px,color:#FFFFFF,font-weight:600,rx:8px;",
    "  classDef data fill:#451A03,stroke:#FBBF24,stroke-width:2px,color:#FFFFFF,font-weight:600,rx:8px;",
    "  classDef util fill:#2E1065,stroke:#C084FC,stroke-width:2px,color:#FFFFFF,font-weight:600,rx:8px;",
    "  classDef external fill:#4C0519,stroke:#FB7185,stroke-width:2px,color:#FFFFFF,font-weight:600,rx:8px;",
    "  classDef storage fill:#18181B,stroke:#94A3B8,stroke-width:2px,color:#FFFFFF,font-weight:600,rx:8px;",
    "  classDef highlight fill:#312E81,stroke:#A5B4FC,stroke-width:2.5px,color:#FFFFFF,font-weight:700,rx:10px;"
  ];
}

/**
 * 1. High-Level System Architecture Diagram (flowchart TD / LR)
 * Categorizes and links entry points, domain modules, routing controllers,
 * runtime technology stack, and third-party dependencies.
 */
function generateSystemDiagram(
  summary: ArchitectureSummary,
  graph?: ArchitectureGraph | null,
  repoFullName: string = "repository",
  orientation: DiagramOrientation = "TD"
): string {
  const dir = orientation === "LR" ? "LR" : "TD";
  const lines: string[] = [];
  lines.push(`flowchart ${dir}`);
  lines.push(`  %% End-to-End System Architecture for ${sanitizeLabel(repoFullName)}`);
  lines.push(...getCommonClassDefs());
  lines.push("");

  // Subgraph 1: Entry Points
  const entryPoints = summary.entryPoints && summary.entryPoints.length > 0
    ? summary.entryPoints.slice(0, 6)
    : [summary.primaryLanguage ? `main.${summary.primaryLanguage.toLowerCase().slice(0, 2)}` : "index.ts"];

  lines.push('  subgraph EntryPoints["  🚀  APPLICATION ENTRY POINTS & CLIENTS  "]');
  entryPoints.forEach((ep) => {
    const id = "ep_" + sanitizeId(ep);
    const label = sanitizeLabel(ep);
    lines.push(`    ${id}(["📄 ${label}"]):::entry`);
  });
  lines.push("  end");
  lines.push("  style EntryPoints fill:#0B0F19,stroke:#312E81,stroke-width:1.5px,color:#C7D2FE;");
  lines.push("");

  // Subgraph 2: Key Modules & Directory Roles
  lines.push('  subgraph CoreModules["  📦  CORE MODULES & SUBSYSTEMS  "]');
  const modules = summary.keyModules && summary.keyModules.length > 0
    ? summary.keyModules.slice(0, 8)
    : [{ directory: "src", description: "Application Source", fileCount: 1 }];

  const modIds: string[] = [];
  modules.forEach((mod, idx) => {
    const id = "mod_" + sanitizeId(mod.directory);
    modIds.push(id);
    const label = sanitizeLabel(mod.directory) + ` (${mod.fileCount} files)`;
    
    // Semantic class assignment based on directory role
    let cls = "core";
    const dirLower = mod.directory.toLowerCase();
    if (/routes|api|pages|app|controllers|handlers/.test(dirLower)) {
      cls = "route";
    } else if (/lib|utils|helpers|tools|scripts/.test(dirLower)) {
      cls = "util";
    } else if (/models|db|store|state|data|schemas/.test(dirLower)) {
      cls = "data";
    } else if (idx % 2 === 1) {
      cls = "route";
    }

    lines.push(`    ${id}["📁 ${label}"]:::${cls}`);
  });
  lines.push("  end");
  lines.push("  style CoreModules fill:#061A14,stroke:#065F46,stroke-width:1.5px,color:#A7F3D0;");
  lines.push("");

  // Subgraph 3: Frameworks, Tooling & Environment
  lines.push('  subgraph TechStack["  ⚙️  FRAMEWORKS, CONFIG & RUNTIME  "]');
  const langId = "lang_" + sanitizeId(summary.primaryLanguage || "code");
  lines.push(`    ${langId}(["🔷 Language: ${sanitizeLabel(summary.primaryLanguage || 'TypeScript')}"]):::data`);

  const fwIds: string[] = [];
  if (summary.detectedFrameworks && summary.detectedFrameworks.length > 0) {
    summary.detectedFrameworks.slice(0, 4).forEach((fw) => {
      const id = "fw_" + sanitizeId(fw);
      fwIds.push(id);
      lines.push(`    ${id}[["⚡ Framework: ${sanitizeLabel(fw)}"]]:::data`);
    });
  }

  const mfIds: string[] = [];
  if (summary.manifestFiles && summary.manifestFiles.length > 0) {
    summary.manifestFiles.slice(0, 3).forEach((mf) => {
      const id = "mf_" + sanitizeId(mf);
      mfIds.push(id);
      lines.push(`    ${id}[("📜 Manifest: ${sanitizeLabel(mf)}")]:::util`);
    });
  }
  lines.push("  end");
  lines.push("  style TechStack fill:#0F172A,stroke:#1E3A8A,stroke-width:1.5px,color:#93C5FD;");
  lines.push("");

  // Subgraph 4: External Dependencies (if available)
  const topDeps = summary.dependencies && summary.dependencies.length > 0
    ? summary.dependencies.slice(0, 4)
    : [];

  if (topDeps.length > 0) {
    lines.push('  subgraph Dependencies["  🛡️  EXTERNAL ECOSYSTEM & PACKAGES  "]');
    topDeps.forEach((dep) => {
      const depId = "dep_" + sanitizeId(dep.name);
      lines.push(`    ${depId}{{"📦 ${sanitizeLabel(dep.name)} (${dep.isDev ? "tool" : "runtime"})"}}:::external`);
    });
    lines.push("  end");
    lines.push("  style Dependencies fill:#1F0910,stroke:#9F1239,stroke-width:1.5px,color:#FECDD3;");
    lines.push("");
  }

  // Interconnect Entry Points -> Primary Modules
  if (entryPoints.length > 0 && modules.length > 0) {
    const primaryEpId = "ep_" + sanitizeId(entryPoints[0]);
    // Connect primary entrypoint to first 3 modules
    modules.slice(0, Math.min(modules.length, 3)).forEach((mod, idx) => {
      const modId = "mod_" + sanitizeId(mod.directory);
      lines.push(`  ${primaryEpId} -->|mounts| ${modId}`);
    });

    // If second entry point exists, connect to remaining modules
    if (entryPoints.length > 1 && modules.length > 3) {
      const secEpId = "ep_" + sanitizeId(entryPoints[1]);
      lines.push(`  ${secEpId} -->|routes to| ${modIds[3]}`);
    }
  }

  // Interconnect Core Modules -> Tech Stack
  if (modules.length > 0) {
    const mainModId = "mod_" + sanitizeId(modules[0].directory);
    lines.push(`  ${mainModId} -.->|runtime| ${langId}`);

    if (fwIds.length > 0) {
      lines.push(`  ${mainModId} -.->|powered by| ${fwIds[0]}`);
    }
    if (mfIds.length > 0 && modules.length > 1) {
      const secModId = "mod_" + sanitizeId(modules[1].directory);
      lines.push(`  ${secModId} -.->|configured by| ${mfIds[0]}`);
    }
  }

  // Interconnect Modules -> Dependencies
  if (modules.length > 0 && topDeps.length > 0) {
    const depTargetId = "dep_" + sanitizeId(topDeps[0].name);
    lines.push(`  ${modIds[0]} -.->|imports| ${depTargetId}`);
  }

  lines.push("");
  lines.push("  linkStyle default stroke:#64748B,stroke-width:1.5px;");

  return lines.join("\n");
}

/**
 * 2. Horizontal Architecture & Modular Hierarchy Diagram (flowchart LR / TD)
 */
function generateHierarchyDiagram(
  summary: ArchitectureSummary,
  repoFullName: string = "repository",
  orientation: DiagramOrientation = "LR"
): string {
  const dir = orientation === "TD" ? "TD" : "LR";
  const lines: string[] = [];
  lines.push(`flowchart ${dir}`);
  lines.push(`  %% Modular Directory Hierarchy for ${sanitizeLabel(repoFullName)}`);
  lines.push(...getCommonClassDefs());
  lines.push("");

  const rootId = "root_" + sanitizeId(repoFullName);
  lines.push(`  ${rootId}(["🏛️ ${sanitizeLabel(repoFullName)}"]):::entry`);

  const modules = summary.keyModules && summary.keyModules.length > 0
    ? summary.keyModules.slice(0, 10)
    : [{ directory: "src", description: "Application Core", fileCount: 1 }];

  modules.forEach((mod, idx) => {
    const modId = "m_" + sanitizeId(mod.directory);
    const cls = idx % 3 === 0 ? "core" : idx % 3 === 1 ? "route" : "util";
    lines.push(`  ${rootId} -->|subsystem| ${modId}["📁 ${sanitizeLabel(mod.directory)}/ (${mod.fileCount} files)"]:::${cls}`);
    if (mod.description) {
      const descId = "desc_" + idx;
      lines.push(`  ${modId} -.->|role| ${descId}["📝 ${sanitizeLabel(mod.description).slice(0, 36)}"]:::util`);
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
  repoFullName: string = "repository",
  orientation: DiagramOrientation = "TD"
): string {
  const dir = orientation === "LR" ? "LR" : "TD";
  const lines: string[] = [];
  lines.push(`flowchart ${dir}`);
  lines.push(`  %% Tiered Component Architecture for ${sanitizeLabel(repoFullName)}`);
  lines.push(...getCommonClassDefs());
  lines.push("");

  // 1. Presentation / Interface Tier
  lines.push('  subgraph ClientTier["  💻  PRESENTATION & INTERFACE TIER  "]');
  const presentationCandidates = graph?.nodes.filter(
    (n) => n.type === "component" || n.type === "entry" || n.type === "route"
  ).slice(0, 6) || [];

  if (presentationCandidates.length > 0) {
    presentationCandidates.forEach((n) => {
      const id = "ui_" + sanitizeId(n.id);
      const icon = n.type === "entry" ? "🚀" : n.type === "route" ? "🌐" : "⚛️";
      lines.push(`    ${id}(["${icon} ${sanitizeLabel(n.name)}"]):::entry`);
    });
  } else if (summary.entryPoints && summary.entryPoints.length > 0) {
    summary.entryPoints.slice(0, 5).forEach((ep) => {
      const id = "ui_" + sanitizeId(ep);
      lines.push(`    ${id}(["🚀 ${sanitizeLabel(ep)}"]):::entry`);
    });
  } else {
    lines.push(`    ui_main(["🚀 ${sanitizeLabel(repoFullName)} Interface Layer"]):::entry`);
  }
  lines.push("  end");
  lines.push("  style ClientTier fill:#0B0F19,stroke:#312E81,stroke-width:1.5px,color:#C7D2FE;");
  lines.push("");

  // 2. Core Domain & Business Logic Tier
  lines.push('  subgraph DomainTier["  🧠  DOMAIN LOGIC & CORE MODULES  "]');
  const domainModules = summary.keyModules && summary.keyModules.length > 0
    ? summary.keyModules.slice(0, 6)
    : [{ directory: "core", description: "Business Logic Subsystem", fileCount: 1 }];

  domainModules.forEach((m) => {
    const id = "domain_" + sanitizeId(m.directory);
    const label = `${sanitizeLabel(m.directory)} (${m.description})`;
    lines.push(`    ${id}[["🧩 ${label}"]]:::core`);
  });
  lines.push("  end");
  lines.push("  style DomainTier fill:#061A14,stroke:#065F46,stroke-width:1.5px,color:#A7F3D0;");
  lines.push("");

  // 3. Infrastructure, Data & Runtime Tier
  lines.push('  subgraph InfraTier["  🛡️  INFRASTRUCTURE, DATA & DEPENDENCIES  "]');
  const topDeps = summary.dependencies && summary.dependencies.length > 0
    ? summary.dependencies.slice(0, 5)
    : [];

  if (topDeps.length > 0) {
    topDeps.forEach((dep) => {
      const id = "dep_" + sanitizeId(dep.name);
      lines.push(`    ${id}{{"📦 ${sanitizeLabel(dep.name)} (${dep.isDev ? "tool" : "runtime"})"}}:::data`);
    });
  }

  if (summary.manifestFiles && summary.manifestFiles.length > 0) {
    const mfId = "mf_" + sanitizeId(summary.manifestFiles[0]);
    lines.push(`    ${mfId}[("📜 Config: ${sanitizeLabel(summary.manifestFiles[0])}")]:::util`);
  } else {
    const langId = "env_" + sanitizeId(summary.primaryLanguage || "runtime");
    lines.push(`    ${langId}(["🔷 Runtime: ${sanitizeLabel(summary.primaryLanguage || 'Standard Library')}"]):::data`);
  }
  lines.push("  end");
  lines.push("  style InfraTier fill:#0F172A,stroke:#1E3A8A,stroke-width:1.5px,color:#93C5FD;");
  lines.push("");

  // Connect Tiers
  lines.push("  ClientTier --> DomainTier");
  lines.push("  DomainTier --> InfraTier");
  lines.push("");
  lines.push("  linkStyle default stroke:#64748B,stroke-width:1.5px;");

  return lines.join("\n");
}

/**
 * 4. End-to-End Data & Execution Pipeline Diagram (flowchart TD / LR)
 * Traces input events, execution dispatch, state mutation, and client presentation.
 */
function generateDataflowDiagram(
  summary: ArchitectureSummary,
  graph?: ArchitectureGraph | null,
  repoFullName: string = "repository",
  orientation: DiagramOrientation = "TD"
): string {
  const dir = orientation === "LR" ? "LR" : "TD";
  const lines: string[] = [];
  lines.push(`flowchart ${dir}`);
  lines.push(`  %% End-to-End Data & Execution Flow for ${sanitizeLabel(repoFullName)}`);
  lines.push(...getCommonClassDefs());
  lines.push("");

  // 1. Ingestion Pipeline
  lines.push('  subgraph IngestPipeline["  📥  1. INGESTION & USER INGRESS  "]');
  const ep = summary.entryPoints && summary.entryPoints.length > 0 ? summary.entryPoints[0] : "main";
  lines.push(`    df_entry(["🌐 Ingress Entrypoint: ${sanitizeLabel(ep)}"]):::entry`);
  lines.push(`    df_router[["🔀 Router & Dispatch Controller"]]:::route`);
  lines.push("    df_entry -->|dispatches| df_router");
  lines.push("  end");
  lines.push("  style IngestPipeline fill:#0B0F19,stroke:#312E81,stroke-width:1.5px,color:#C7D2FE;");
  lines.push("");

  // 2. Processing Pipeline
  lines.push('  subgraph ProcessingPipeline["  ⚙️  2. DOMAIN LOGIC & PROCESSING  "]');
  const mainModule = summary.keyModules && summary.keyModules.length > 0
    ? summary.keyModules[0].directory
    : "core";
  lines.push(`    df_core[["🧠 Business Logic Engine: ${sanitizeLabel(mainModule)}"]]:::core`);
  lines.push(`    df_validator[["🛡️ Contract & Parameter Validation"]]:::highlight`);
  lines.push("    df_validator -->|verified state| df_core");
  lines.push("  end");
  lines.push("  style ProcessingPipeline fill:#061A14,stroke:#065F46,stroke-width:1.5px,color:#A7F3D0;");
  lines.push("");

  // 3. State & Infrastructure
  lines.push('  subgraph StatePipeline["  💾  3. STATE, STORAGE & RUNTIME  "]');
  const lang = summary.primaryLanguage || "TypeScript";
  const mf = summary.manifestFiles && summary.manifestFiles.length > 0 ? summary.manifestFiles[0] : "config";
  lines.push(`    df_storage[("🗄️ Manifest & Environment: ${sanitizeLabel(mf)}")]:::storage`);
  lines.push(`    df_runtime(["🔷 Engine Runtime: ${sanitizeLabel(lang)}"]):::data`);
  lines.push("    df_storage <-->|config sync| df_runtime");
  lines.push("  end");
  lines.push("  style StatePipeline fill:#18181B,stroke:#52525B,stroke-width:1.5px,color:#E4E4E7;");
  lines.push("");

  // 4. Output / Presentation
  lines.push('  subgraph OutputPipeline["  📤  4. PRESENTATION & RESPONSES  "]');
  lines.push(`    df_output(["✨ Client Presentation / Formatted Result"]):::entry`);
  lines.push("  end");
  lines.push("  style OutputPipeline fill:#081A26,stroke:#0369A1,stroke-width:1.5px,color:#BAE6FD;");
  lines.push("");

  // Connect pipeline stages
  lines.push("  df_router -->|dispatches payload| df_validator");
  lines.push("  df_core -->|queries / persists| df_storage");
  lines.push("  df_core -->|produces output| df_output");
  lines.push("");
  lines.push("  linkStyle default stroke:#64748B,stroke-width:1.5px;");

  return lines.join("\n");
}
