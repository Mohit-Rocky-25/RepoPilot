import type {
  RepositoryFile,
  ArchitectureSummary,
  ArchitectureGraph,
  ArchitectureGraphNode,
  ArchitectureGraphEdge
} from "@repopilot/core";

export class ArchitectureAnalyzer {
  static analyze(files: RepositoryFile[], manifestContent?: string): ArchitectureSummary {
    const frameworks = new Set<string>();
    const entryPoints: string[] = [];
    const manifestFiles: string[] = [];
    const dependencies: { name: string; version?: string; isDev?: boolean }[] = [];

    // Tally languages
    const langCounts = new Map<string, number>();
    for (const f of files) {
      if (f.language) {
        langCounts.set(f.language, (langCounts.get(f.language) || 0) + 1);
      }
    }

    let topLang = "Unknown";
    let maxCount = 0;
    for (const [lang, count] of langCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        topLang = lang;
      }
    }

    // Identify entry points using comprehensive structural patterns
    const ENTRY_PATTERNS = [
      /^(?:src\/|app\/|pages\/|lib\/|cmd\/[^/]+\/|backend\/|api\/)?(?:index|main|app|server|cli|page|layout|run|manage)\.(?:ts|tsx|js|jsx|mjs|py|go|rs|rb|php|java)$/i,
      /^(?:src\/)?(?:App|Server|Main)\.(?:tsx|jsx|ts|js|java)$/,
      /^(?:src\/)?(?:lib|main)\.rs$/i,
      /^(?:cmd\/main\.go|main\.go|app\.py|wsgi\.py|asgi\.py|index\.html)$/i
    ];

    for (const file of files) {
      if (ENTRY_PATTERNS.some((pat) => pat.test(file.path))) {
        entryPoints.push(file.path);
      }

      // Check config / manifest files
      const baseName = file.path.split("/").pop()?.toLowerCase();
      if (
        baseName === "package.json" ||
        baseName === "tsconfig.json" ||
        baseName === "requirements.txt" ||
        baseName === "pyproject.toml" ||
        baseName === "cargo.toml" ||
        baseName === "go.mod" ||
        baseName === "dockerfile" ||
        baseName === "docker-compose.yml" ||
        baseName === "vite.config.ts" ||
        baseName === "next.config.mjs" ||
        baseName === "next.config.js"
      ) {
        manifestFiles.push(file.path);
      }
    }

    // Fallback: If no conventional entry point was detected, pick root source files
    if (entryPoints.length === 0) {
      const rootSourceFiles = files.filter(
        (f) => !f.path.includes("/") && f.language && !f.path.startsWith(".")
      );
      if (rootSourceFiles.length > 0) {
        entryPoints.push(rootSourceFiles[0].path);
      } else {
        const srcFiles = files.filter(
          (f) => f.path.startsWith("src/") && f.path.split("/").length === 2 && f.language
        );
        if (srcFiles.length > 0) {
          entryPoints.push(srcFiles[0].path);
        }
      }
    }

    // Inspect manifestContent (e.g. package.json)
    if (manifestContent) {
      try {
        const pkg = JSON.parse(manifestContent);
        const deps = pkg.dependencies || {};
        const devDeps = pkg.devDependencies || {};

        const allDepKeys = Object.keys(deps).concat(Object.keys(devDeps));

        if (allDepKeys.includes("react")) frameworks.add("React");
        if (allDepKeys.includes("next")) frameworks.add("Next.js");
        if (allDepKeys.includes("vue")) frameworks.add("Vue");
        if (allDepKeys.includes("svelte")) frameworks.add("Svelte");
        if (allDepKeys.includes("express")) frameworks.add("Express");
        if (allDepKeys.includes("fastify")) frameworks.add("Fastify");
        if (allDepKeys.includes("tailwindcss")) frameworks.add("Tailwind CSS");
        if (allDepKeys.includes("vitest")) frameworks.add("Vitest");
        if (allDepKeys.includes("jest")) frameworks.add("Jest");
        if (allDepKeys.includes("@angular/core")) frameworks.add("Angular");
        if (allDepKeys.includes("prisma") || allDepKeys.includes("@prisma/client")) frameworks.add("Prisma");
        if (allDepKeys.includes("zustand")) frameworks.add("Zustand");
        if (allDepKeys.includes("redux") || allDepKeys.includes("@reduxjs/toolkit")) frameworks.add("Redux");

        for (const [dep, ver] of Object.entries(deps)) {
          dependencies.push({ name: dep, version: String(ver), isDev: false });
        }
        for (const [dep, ver] of Object.entries(devDeps)) {
          dependencies.push({ name: dep, version: String(ver), isDev: true });
        }
      } catch (e) {
        // Not JSON, could be requirements.txt or go.mod
        if (manifestContent.includes("flask")) frameworks.add("Flask");
        if (manifestContent.includes("django")) frameworks.add("Django");
        if (manifestContent.includes("fastapi")) frameworks.add("FastAPI");
        if (manifestContent.includes("gin-gonic")) frameworks.add("Gin");
        if (manifestContent.includes("actix")) frameworks.add("Actix");
      }
    }

    // Infer modules from directory hierarchy
    const dirMap = new Map<string, number>();
    for (const f of files) {
      const parts = f.path.split("/");
      if (parts.length > 1) {
        const topDir = parts[0] === "src" && parts.length > 2 ? `src/${parts[1]}` : parts[0];
        dirMap.set(topDir, (dirMap.get(topDir) || 0) + 1);
      }
    }

    const keyModules = Array.from(dirMap.entries())
      .filter(([dir]) => !dir.startsWith(".") && !dir.startsWith("node_modules"))
      .map(([dir, count]) => ({
        directory: dir,
        description: getModuleDescription(dir),
        fileCount: count
      }))
      .sort((a, b) => b.fileCount - a.fileCount);

    return {
      primaryLanguage: topLang,
      detectedFrameworks: Array.from(frameworks),
      entryPoints,
      manifestFiles,
      keyModules,
      dependencies: dependencies.slice(0, 50)
    };
  }

  static generateGraph(files: RepositoryFile[], repoName: string): ArchitectureGraph {
    const nodes: ArchitectureGraphNode[] = [];
    const edges: ArchitectureGraphEdge[] = [];
    const nodeMap = new Set<string>();

    const rootId = "node-root";
    nodes.push({
      id: rootId,
      name: repoName || "Repository Root",
      path: "",
      type: "root",
      depth: 0,
      x: 0,
      y: 0,
      z: 0
    });
    nodeMap.add(rootId);

    const classifyType = (path: string): ArchitectureGraphNode["type"] => {
      const p = path.toLowerCase();
      if (
        p.endsWith("index.ts") ||
        p.endsWith("index.js") ||
        p.endsWith("main.ts") ||
        p.endsWith("main.py") ||
        p.endsWith("app/page.tsx") ||
        p.endsWith("main.go")
      ) {
        return "entry";
      }
      if (p.includes("/api/") || p.includes("/routes/") || p.endsWith("route.ts")) {
        return "route";
      }
      if (p.includes("/components/") || p.endsWith("button.tsx") || p.endsWith("card.tsx") || p.endsWith("modal.tsx")) {
        return "component";
      }
      if (p.includes("test") || p.includes("spec") || p.endsWith(".test.ts") || p.endsWith(".spec.js")) {
        return "test";
      }
      if (
        p.endsWith("package.json") ||
        p.endsWith("tsconfig.json") ||
        p.endsWith("tailwind.config.ts") ||
        p.endsWith(".env.example") ||
        p.endsWith("dockerfile") ||
        p.endsWith("cargo.toml")
      ) {
        return "config";
      }
      return "source";
    };

    const dirCounts = new Map<string, number>();
    for (const f of files) {
      const parts = f.path.split("/");
      if (parts.length > 1) {
        const d1 = parts[0];
        dirCounts.set(d1, (dirCounts.get(d1) || 0) + 1);
        if (parts.length > 2 && (d1 === "src" || d1 === "packages" || d1 === "app")) {
          const d2 = `${d1}/${parts[1]}`;
          dirCounts.set(d2, (dirCounts.get(d2) || 0) + 1);
        }
      }
    }

    const keyDirs = Array.from(dirCounts.keys())
      .filter((d) => !d.startsWith("."))
      .slice(0, 16);

    const dirNodeMap = new Map<string, string>();

    keyDirs.forEach((dir, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(keyDirs.length, 1);
      const radius = 180 + (idx % 2 === 0 ? 30 : -20);
      const dirId = `dir-${dir.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      const depth = dir.split("/").length;

      const node: ArchitectureGraphNode = {
        id: dirId,
        name: dir,
        path: dir,
        type: "dir",
        depth,
        x: Math.round(Math.cos(angle) * radius),
        y: Math.round(Math.sin(angle) * radius),
        z: Math.round((idx % 3 - 1) * 35)
      };

      nodes.push(node);
      nodeMap.add(dirId);
      dirNodeMap.set(dir, dirId);

      const parentDir = dir.includes("/") ? dir.split("/")[0] : null;
      const parentId = parentDir && dirNodeMap.has(parentDir) ? dirNodeMap.get(parentDir)! : rootId;

      edges.push({
        source: parentId,
        target: dirId,
        type: "contains"
      });
    });

    const scoredFiles = files
      .filter((f) => !f.path.startsWith(".") && !f.path.includes("node_modules/"))
      .map((f) => {
        const type = classifyType(f.path);
        let score = 0;
        if (type === "entry") score = 100;
        else if (type === "config") score = 80;
        else if (type === "route") score = 70;
        else if (type === "component") score = 60;
        else if (type === "test") score = 50;
        else score = 10;
        return { file: f, type, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 80);

    scoredFiles.forEach(({ file, type }, idx) => {
      const fileId = `file-${file.path.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      if (nodeMap.has(fileId)) return;

      const parts = file.path.split("/");
      const fileName = parts.pop() || file.path;

      let parentNodeId = rootId;
      let parentX = 0;
      let parentY = 0;
      let parentZ = 0;

      for (const [dir, dId] of dirNodeMap.entries()) {
        if (file.path.startsWith(dir + "/") || file.path === dir) {
          parentNodeId = dId;
          const pNode = nodes.find((n) => n.id === dId);
          if (pNode) {
            parentX = pNode.x || 0;
            parentY = pNode.y || 0;
            parentZ = pNode.z || 0;
          }
          break;
        }
      }

      const localAngle = (2 * Math.PI * idx) / 8 + (idx * 0.4);
      const localRadius = parentNodeId === rootId ? 90 + (idx % 4) * 25 : 55 + (idx % 3) * 20;

      let zOffset = (idx % 5 - 2) * 25;
      if (type === "entry") zOffset = 55;
      if (type === "config") zOffset = -45;

      const node: ArchitectureGraphNode = {
        id: fileId,
        name: fileName,
        path: file.path,
        type,
        language: file.language,
        size: file.size,
        depth: parts.length + 1,
        x: Math.round(parentX + Math.cos(localAngle) * localRadius),
        y: Math.round(parentY + Math.sin(localAngle) * localRadius),
        z: Math.round(parentZ + zOffset)
      };

      nodes.push(node);
      nodeMap.add(fileId);

      edges.push({
        source: parentNodeId,
        target: fileId,
        type: type === "entry" ? "entry" : "contains"
      });
    });

    // Build real dependency edges from import statements when content is present
    const filePathToId = new Map<string, string>();
    nodes.forEach((n) => {
      if (n.path) filePathToId.set(n.path, n.id);
    });

    for (const { file } of scoredFiles) {
      if (!file.content) continue;
      const sourceId = filePathToId.get(file.path);
      if (!sourceId) continue;

      // Extract JS/TS imports (bounded non-backtracking regex)
      const jsImportRegex = /(?:import\s+(?:[^'"]*?\s+from\s+)?|require\s*\(\s*)['"]([./][^'"]+)['"]/g;
      let match: RegExpExecArray | null;
      while ((match = jsImportRegex.exec(file.content)) !== null) {
        const importSpecifier = match[1];
        const dir = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : "";
        const candidateRelative = dir ? `${dir}/${importSpecifier}` : importSpecifier;

        const parts = candidateRelative.split("/");
        const resolvedParts: string[] = [];
        for (const p of parts) {
          if (p === "." || p === "") continue;
          if (p === "..") resolvedParts.pop();
          else resolvedParts.push(p);
        }
        const resolvedPath = resolvedParts.join("/");

        for (const [targetPath, targetId] of filePathToId.entries()) {
          if (
            targetPath === resolvedPath ||
            targetPath.startsWith(`${resolvedPath}.`) ||
            targetPath === `${resolvedPath}/index.ts` ||
            targetPath === `${resolvedPath}/index.js`
          ) {
            if (targetId !== sourceId) {
              const exists = edges.some((e) => e.source === sourceId && e.target === targetId);
              if (!exists) {
                edges.push({
                  source: sourceId,
                  target: targetId,
                  type: "dependency"
                });
              }
            }
            break;
          }
        }
      }
    }

    return { nodes, edges };
  }
}

function getModuleDescription(dir: string): string {
  const lower = dir.toLowerCase();
  if (lower.includes("feature")) return "Domain Feature Modules & Workflows";
  if (lower.includes("suite")) return "Integrated Feature Suites";
  if (lower.includes("component")) return "UI Presentational & Interactive Components";
  if (lower.includes("hook")) return "Custom State & Lifecycle Hooks";
  if (lower.includes("api") || lower.includes("route")) return "Server API Endpoints & Route Handlers";
  if (lower.includes("controller") || lower.includes("handler")) return "Request Controllers & Handlers";
  if (lower.includes("service")) return "Business Logic & Service Layer";
  if (lower.includes("model") || lower.includes("entity") || lower.includes("schema") || lower.includes("db") || lower.includes("prisma")) return "Data Models, Schema & Persistence";
  if (lower.includes("ai") || lower.includes("llm") || lower.includes("prompt")) return "AI Models & Intelligence Engine";
  if (lower.includes("store") || lower.includes("state") || lower.includes("redux") || lower.includes("zustand")) return "Global State Management & Stores";
  if (lower.includes("lib") || lower.includes("util")) return "Shared Helper Functions & Utilities";
  if (lower.includes("test") || lower.includes("spec") || lower.includes("__tests__")) return "Automated Test Suites & Fixtures";
  if (lower.includes("doc")) return "Documentation & Guides";
  if (lower.includes("style") || lower.includes("theme")) return "Design System, CSS & Theme Tokens";
  if (lower.includes("package")) return "Modular Packages & Domain Libraries";
  if (lower.includes("core") || lower.includes("engine")) return "Core Domain Logic & Execution Engine";
  if (lower.includes("middleware")) return "Request Interceptors & Security Middleware";
  if (lower.includes("type") || lower.includes("interface")) return "TypeScript Types & Interface Contracts";
  if (lower.includes("config")) return "Build Tooling & Environment Configuration";
  if (lower.includes("script")) return "Automation Scripts & Tooling";
  if (lower.includes("asset") || lower.includes("public")) return "Static Assets & Media";
  return "Modular Subsystem";
}
