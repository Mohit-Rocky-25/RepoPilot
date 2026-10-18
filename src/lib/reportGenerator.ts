import type { ArchitectureSummary, RepositoryFile, RepositoryReference } from "@repopilot/core";

export interface CodebaseHealthScore {
  grade: "A+" | "A" | "B" | "C" | "D";
  score: number;
  maxScore: number;
  checks: {
    name: string;
    passed: boolean;
    reason: string;
  }[];
}

/**
 * Computes deterministic repository health score based on verified repository files.
 * Adheres strictly to Principle P-2 (Deterministic) and P-3 (Explainable).
 */
export function calculateHealthScore(
  files: RepositoryFile[],
  summary: ArchitectureSummary
): CodebaseHealthScore {
  const filePaths = new Set(files.map((f) => f.path.toLowerCase()));

  const hasTests =
    files.some((f) =>
      /(^|\/)(tests?|__tests__|spec)\//i.test(f.path) ||
      /\.(test|spec)\.[a-z0-9]+$/i.test(f.path) ||
      /test_[^/]+\.py$/i.test(f.path)
    );

  const hasLicense =
    filePaths.has("license") ||
    filePaths.has("license.md") ||
    filePaths.has("license.txt");

  const hasReadme =
    filePaths.has("readme.md") ||
    filePaths.has("readme.txt") ||
    filePaths.has("readme");

  const hasGitignore =
    filePaths.has(".gitignore");

  const hasCI =
    files.some((f) => f.path.startsWith(".github/workflows/") || f.path.startsWith(".gitlab-ci"));

  const hasManifest = summary.manifestFiles.length > 0;

  const checks = [
    {
      name: "Automated Test Suite",
      passed: hasTests,
      reason: hasTests
        ? "Identified automated test specifications or test directories."
        : "No automated unit or integration tests detected."
    },
    {
      name: "Open Source License",
      passed: hasLicense,
      reason: hasLicense
        ? "Explicit LICENSE file found in repository root."
        : "No root LICENSE file detected."
    },
    {
      name: "Documentation & Readme",
      passed: hasReadme,
      reason: hasReadme
        ? "README documentation file present."
        : "Missing root README documentation."
    },
    {
      name: "Version Control Hygiene (.gitignore)",
      passed: hasGitignore,
      reason: hasGitignore
        ? ".gitignore present to prevent accidental credential/build commits."
        : "No .gitignore found."
    },
    {
      name: "Continuous Integration (CI)",
      passed: hasCI,
      reason: hasCI
        ? "Automated CI workflow detected (.github/workflows)."
        : "No automated CI workflow configuration detected."
    },
    {
      name: "Project Manifest & Dependency Lock",
      passed: hasManifest,
      reason: hasManifest
        ? `Found ${summary.manifestFiles.length} project manifest/config files.`
        : "No standard package manifest detected."
    }
  ];

  const score = checks.filter((c) => c.passed).length;
  const maxScore = checks.length;

  let grade: CodebaseHealthScore["grade"] = "D";
  if (score === 6) grade = "A+";
  else if (score === 5) grade = "A";
  else if (score >= 4) grade = "B";
  else if (score >= 2) grade = "C";

  return { grade, score, maxScore, checks };
}

/**
 * Generates an exhaustive, GitHub-flavored Markdown audit report.
 */
export function generateMarkdownReport(
  repo: RepositoryReference,
  summary: ArchitectureSummary,
  files: RepositoryFile[]
): string {
  const timestamp = new Date().toISOString();
  const totalLines = files.reduce((acc, f) => acc + (f.lineCount || 0), 0);
  const health = calculateHealthScore(files, summary);

  const langMap = new Map<string, number>();
  for (const f of files) {
    if (f.language) {
      langMap.set(f.language, (langMap.get(f.language) || 0) + 1);
    }
  }

  const sortedLangs = Array.from(langMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const sourceDesc = repo.isLocal
    ? "Private Local In-Browser Workspace (Zero Network Upload)"
    : `GitHub Repository (${repo.url})`;

  return `# RepoPilot: Architecture & Code Health Brief

**Target Repository:** \`${repo.fullName}\`  
**Source:** ${sourceDesc}  
**Primary Language:** ${summary.primaryLanguage}  
**Generated At:** ${timestamp}  
**Health Grade:** **${health.grade}** (${health.score}/${health.maxScore} checks passed)  

---

## 1. Executive Summary

| Metric | Value |
| :--- | :--- |
| **Total Tracked Files** | ${files.length.toLocaleString()} files |
| **Total Code Lines (Est.)** | ${totalLines > 0 ? totalLines.toLocaleString() + " lines" : "Calculated on blob fetch"} |
| **Primary Frameworks** | ${summary.detectedFrameworks.join(", ") || "Standard Library"} |
| **Identified Entry Points** | ${summary.entryPoints.length} files |
| **Identified Modules** | ${summary.keyModules.length} core directories |
| **Manifests & Configs** | ${summary.manifestFiles.join(", ") || "None"} |

---

## 2. Codebase Health & Hygiene Scorecard

**Overall Quality Grade:** **${health.grade}** (${health.score} of ${health.maxScore} checks passing)

| Inspection Area | Status | Evidence & Rationale |
| :--- | :---: | :--- |
${health.checks
  .map(
    (c) =>
      `| **${c.name}** | ${c.passed ? "✅ PASS" : "⚠️ MISSING"} | ${c.reason} |`
  )
  .join("\n")}

---

## 3. Technology & Language Distribution

| Language | Files Count | Share |
| :--- | :---: | :---: |
${sortedLangs
  .map(([lang, count]) => {
    const pct = ((count / files.length) * 100).toFixed(1);
    return `| **${lang}** | ${count} | ${pct}% |`;
  })
  .join("\n")}

---

## 4. Application Entry Points & Critical Paths

${
  summary.entryPoints.length > 0
    ? summary.entryPoints.map((ep) => `- \`${ep}\``).join("\n")
    : "No conventional entry points detected in standard locations."
}

---

## 5. Architectural Module Hierarchy

| Directory | Files | Structural Role & Responsibility |
| :--- | :---: | :--- |
${
  summary.keyModules.length > 0
    ? summary.keyModules
        .map(
          (m) =>
            `| \`${m.directory}/\` | ${m.fileCount} | ${m.description} |`
        )
        .join("\n")
    : "| Root | All | Flat project structure |"
}

---

## 6. Dependency Footprint (${summary.dependencies.length} Total)

${
  summary.dependencies.length > 0
    ? `### Production Dependencies (${summary.dependencies.filter((d) => !d.isDev).length}):
${summary.dependencies
  .filter((d) => !d.isDev)
  .slice(0, 30)
  .map((d) => `- **${d.name}** ${d.version ? `(\`${d.version}\`)` : ""}`)
  .join("\n")}

### Development & Tooling Dependencies (${summary.dependencies.filter((d) => d.isDev).length}):
${summary.dependencies
  .filter((d) => d.isDev)
  .slice(0, 30)
  .map((d) => `- **${d.name}** ${d.version ? `(\`${d.version}\`)` : ""}`)
  .join("\n")}`
    : "No parsed package dependencies in manifest."
}

---

## 7. Deterministic Verification Sign-Off

- **Grounding:** All metrics in this brief are derived from actual repository files and AST symbol scans.
- **Privacy:** Ingested via RepoPilot Codebase Intelligence.
- **Tooling:** RepoPilot v3 Verification Engine.
`;
}

/**
 * Triggers client-side download of the markdown report file
 */
export function downloadMarkdownReport(filename: string, markdown: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Opens a clean, beautifully styled printable document and calls window.print()
 */
export function printOrSavePdfReport(title: string, markdown: string): void {
  if (typeof window === "undefined") return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print/export the PDF report.");
    return;
  }

  // Convert basic markdown elements to HTML for print styling
  const htmlBody = markdown
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold border-b pb-2 mb-4">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold border-b pb-1 mt-6 mb-3">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/^---$/gim, '<hr class="my-6 border-gray-300"/>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '<p class="my-2"></p>');

  printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @media print {
      @page { margin: 15mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 860px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1, h2, h3 { color: #000; margin-top: 24px; }
    h1 { border-bottom: 2px solid #eaecef; padding-bottom: 8px; }
    h2 { border-bottom: 1px solid #eaecef; padding-bottom: 6px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #f6f8fa; padding: 2px 5px; border-radius: 4px; font-size: 85%; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    th, td { border: 1px solid #dfe2e5; padding: 8px 12px; text-align: left; }
    th { background: #f6f8fa; font-weight: 600; }
    tr:nth-child(2n) { background: #fafbfc; }
    hr { border: 0; border-top: 1px solid #eaecef; margin: 24px 0; }
    .footer { margin-top: 40px; font-size: 12px; color: #586069; text-align: center; border-top: 1px solid #eaecef; padding-top: 16px; }
  </style>
</head>
<body>
  ${htmlBody}
  <div class="footer">
    RepoPilot Architecture & Code Health Report · Generated deterministically · ${new Date().toLocaleDateString()}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
  `);
  printWindow.document.close();
}
