import type { RepositoryFile, ArchitectureSummary } from "@repopilot/core";
import { ArchitectureAnalyzer } from "@repopilot/analysis";

export type QueryIntent =
  | "architecture"
  | "entry_points"
  | "tests"
  | "configuration"
  | "dependencies"
  | "database_models"
  | "api_routes"
  | "contributing"
  | "security"
  | "prompt_injection"
  | "negative_check"
  | "general";

export interface KnowledgeAnalysis {
  intent: QueryIntent;
  confidence: "high" | "medium" | "low";
  summary: ArchitectureSummary;
  relevantFiles: string[];
  keyInsights: string[];
  negativeAssertion?: string;
  isInjectionAttempt?: boolean;
}

export class CodebaseKnowledgeBase {
  /**
   * Analyzes user question against repository file tree and architecture metadata
   * to categorize intent, identify relevant files, and detect edge cases.
   */
  static analyzeQuery(
    question: string,
    files: RepositoryFile[],
    manifestContent?: string
  ): KnowledgeAnalysis {
    const q = question.trim().toLowerCase();
    const summary = ArchitectureAnalyzer.analyze(files, manifestContent);
    const relevantFiles: string[] = [];
    const keyInsights: string[] = [];

    // 1. Detect Prompt Injection / Jailbreak Edge Case
    const INJECTION_PATTERNS = [
      /ignore (all )?(previous|prior) instructions/i,
      /system override/i,
      /disregard (all )?(instructions|rules)/i,
      /you are now (unrestricted|dan|jailbroken)/i,
      /leak (the )?(system prompt|api key|secret|password)/i,
      /reveal (the )?(hidden prompt|internal instructions)/i
    ];
    if (INJECTION_PATTERNS.some((pat) => pat.test(question))) {
      return {
        intent: "prompt_injection",
        confidence: "high",
        summary,
        relevantFiles: [],
        keyInsights: [
          "Security Defense: Query contains prompt injection or system override pattern.",
          "RepoPilot enforces immutable passive-data boundaries on all repository files."
        ],
        isInjectionAttempt: true
      };
    }

    // 2. Tests & QA Intent
    if (/(^|\b)(tests?|testing|specs?|coverage|vitest|jest|pytest|unittest|mock|fixtures?)(\b|$)/i.test(q)) {
      const testFiles = files.filter((f) =>
        /(^|\/)(tests?|__tests__|spec)\//i.test(f.path) ||
        /\.(test|spec)\.[a-z0-9]+$/i.test(f.path) ||
        /_(test|spec)\.[a-z0-9]+$/i.test(f.path) ||
        /test_[^/]+\.py$/i.test(f.path)
      );

      if (testFiles.length > 0) {
        relevantFiles.push(...testFiles.slice(0, 10).map((f) => f.path));
        keyInsights.push(`Found ${testFiles.length} automated test files.`);
        if (summary.detectedFrameworks.includes("Vitest")) keyInsights.push("Uses Vitest as test runner.");
        if (summary.detectedFrameworks.includes("Jest")) keyInsights.push("Uses Jest as test runner.");
      } else {
        return {
          intent: "negative_check",
          confidence: "high",
          summary,
          relevantFiles: [],
          keyInsights: ["No automated test suite or test files (*.test.*, *_test.*, tests/) were found."],
          negativeAssertion: "No automated test directory or test files (*.test.*, *_test.*, tests/) exist in this repository revision."
        };
      }
      return {
        intent: "tests",
        confidence: "high",
        summary,
        relevantFiles,
        keyInsights
      };
    }

    // 3. Entry Points & Bootstrapping
    if (/(^|\b)(entry|main|start|bootstrap|initialize|boot|run|launcher|executable|root|entrypoint)(\b|$)/i.test(q)) {
      if (summary.entryPoints.length > 0) {
        relevantFiles.push(...summary.entryPoints);
        keyInsights.push(`Identified ${summary.entryPoints.length} application entry points.`);
        keyInsights.push(`Primary boot files: ${summary.entryPoints.slice(0, 3).join(", ")}`);
      } else {
        keyInsights.push("Standard framework entry points were not detected; inspect top-level source files.");
      }
      return {
        intent: "entry_points",
        confidence: "high",
        summary,
        relevantFiles,
        keyInsights
      };
    }

    // 4. Configuration & Environment
    if (/(^|\b)(config|configuration|environment|\.env|settings?|options?|parameters?|env variables?)(\b|$)/i.test(q)) {
      const configFiles = files.filter((f) => {
        const base = f.path.split("/").pop()?.toLowerCase() || "";
        return (
          base.startsWith(".env") ||
          base.endsWith(".config.js") ||
          base.endsWith(".config.ts") ||
          base.endsWith(".config.mjs") ||
          base.endsWith(".config.json") ||
          base === "tsconfig.json" ||
          base === "settings.py" ||
          base === "docker-compose.yml" ||
          base === "dockerfile"
        );
      });

      if (configFiles.length > 0) {
        relevantFiles.push(...configFiles.slice(0, 10).map((f) => f.path));
        keyInsights.push(`Found ${configFiles.length} project configuration files.`);
      } else {
        keyInsights.push("No dedicated configuration files or .env templates were detected in root.");
      }
      return {
        intent: "configuration",
        confidence: "high",
        summary,
        relevantFiles,
        keyInsights
      };
    }

    // 5. Dependencies & Stack
    if (/(^|\b)(dependencies|packages|libraries|frameworks|stack|tech stack|version|npm|pip|cargo|modules)(\b|$)/i.test(q)) {
      relevantFiles.push(...summary.manifestFiles);
      keyInsights.push(`Primary Language: ${summary.primaryLanguage}`);
      keyInsights.push(`Detected Frameworks: ${summary.detectedFrameworks.join(", ") || "Standard Library"}`);
      if (summary.dependencies.length > 0) {
        keyInsights.push(`Total declared dependencies: ${summary.dependencies.length}`);
      }
      return {
        intent: "dependencies",
        confidence: "high",
        summary,
        relevantFiles,
        keyInsights
      };
    }

    // 6. Database, Models & State
    if (/(^|\b)(database|db|models?|schemas?|entities|prisma|sql|mongo|orm|state|redux|zustand|store|migrations?)(\b|$)/i.test(q)) {
      const dbFiles = files.filter((f) =>
        /(^|\/)(models?|schemas?|entities|migrations?|db|database|store|slices?)\//i.test(f.path) ||
        /\.(prisma|sql)$/i.test(f.path) ||
        /schema\.[a-z0-9]+$/i.test(f.path)
      );

      if (dbFiles.length > 0) {
        relevantFiles.push(...dbFiles.slice(0, 10).map((f) => f.path));
        keyInsights.push(`Found ${dbFiles.length} database, model, or state store files.`);
      } else {
        return {
          intent: "negative_check",
          confidence: "high",
          summary,
          relevantFiles: [],
          keyInsights: ["No database schemas, ORM models, or SQL migrations detected."],
          negativeAssertion: "No database schema files (e.g., schema.prisma, *.sql, models/) were found in this repository revision."
        };
      }
      return {
        intent: "database_models",
        confidence: "high",
        summary,
        relevantFiles,
        keyInsights
      };
    }

    // 7. API Routes & Network Endpoints
    if (/(^|\b)(api|routes?|endpoints?|http|controllers?|handlers?|rest|graphql|webhook)(\b|$)/i.test(q)) {
      const apiFiles = files.filter((f) =>
        /(^|\/)(api|routes?|controllers?|handlers?|endpoints?)\//i.test(f.path) ||
        /route\.(ts|js|mjs)$/i.test(f.path)
      );

      if (apiFiles.length > 0) {
        relevantFiles.push(...apiFiles.slice(0, 10).map((f) => f.path));
        keyInsights.push(`Found ${apiFiles.length} API route or request handler files.`);
      } else {
        return {
          intent: "negative_check",
          confidence: "medium",
          summary,
          relevantFiles: [],
          keyInsights: ["No server API routes or controller directories were found."],
          negativeAssertion: "No dedicated server API routes (e.g. app/api, routes/, controllers/) were detected in this repository."
        };
      }
      return {
        intent: "api_routes",
        confidence: "high",
        summary,
        relevantFiles,
        keyInsights
      };
    }

    // 8. Contributing, PRs & License
    if (/(^|\b)(contribut(e|ing)?|guidelines?|pull requests?|prs?|licenses?|authors?|readme)(\b|$)/i.test(q)) {
      const docFiles = files.filter((f) => {
        const base = f.path.split("/").pop()?.toUpperCase() || "";
        return (
          base.startsWith("CONTRIBUTING") ||
          base.startsWith("LICENSE") ||
          base.startsWith("README") ||
          base.startsWith("CODE_OF_CONDUCT")
        );
      });
      relevantFiles.push(...docFiles.map((f) => f.path));
      keyInsights.push(`Found documentation files: ${docFiles.map((f) => f.path).join(", ")}`);
      return {
        intent: "contributing",
        confidence: "high",
        summary,
        relevantFiles,
        keyInsights
      };
    }

    // 9. Architecture & High-Level System Structure
    if (/(^|\b)(architecture|structure|modules?|scaffolding|overview|system design|components?|folders?)(\b|$)/i.test(q)) {
      keyInsights.push(`Primary Language: ${summary.primaryLanguage}`);
      keyInsights.push(`Detected Frameworks: ${summary.detectedFrameworks.join(", ") || "Standard Library"}`);
      keyInsights.push(`Top Modules: ${summary.keyModules.slice(0, 5).map((m) => `${m.directory}/ (${m.fileCount} files)`).join(", ")}`);
      if (summary.entryPoints.length > 0) {
        keyInsights.push(`Entry points: ${summary.entryPoints.slice(0, 3).join(", ")}`);
      }
      relevantFiles.push(...summary.entryPoints.slice(0, 3));
      relevantFiles.push(...summary.manifestFiles.slice(0, 2));
      return {
        intent: "architecture",
        confidence: "high",
        summary,
        relevantFiles,
        keyInsights
      };
    }

    // 10. Specific Component Negative Check (e.g. Docker, GraphQL, Kubernetes)
    const negativeChecks = [
      { name: "Docker", regex: /docker/i, fileCheck: (p: string) => /dockerfile|docker-compose/i.test(p) },
      { name: "Kubernetes", regex: /k8s|kubernetes|helm/i, fileCheck: (p: string) => /helm|k8s|kubernetes/i.test(p) },
      { name: "GraphQL", regex: /graphql/i, fileCheck: (p: string) => /\.graphql$|schema\.gql$/i.test(p) }
    ];

    for (const check of negativeChecks) {
      if (check.regex.test(q)) {
        const match = files.some((f) => check.fileCheck(f.path));
        if (!match) {
          return {
            intent: "negative_check",
            confidence: "high",
            summary,
            relevantFiles: [],
            keyInsights: [`No ${check.name} configurations or manifest files were found.`],
            negativeAssertion: `No ${check.name} configuration files or manifests exist in this repository revision.`
          };
        }
      }
    }

    // General fallback
    return {
      intent: "general",
      confidence: "low",
      summary,
      relevantFiles: summary.entryPoints.slice(0, 2),
      keyInsights: [
        `Primary Language: ${summary.primaryLanguage}`,
        `Frameworks: ${summary.detectedFrameworks.join(", ") || "Standard Library"}`
      ]
    };
  }

  /**
   * Generates a deterministic, beautifully formatted markdown response
   * when AI providers are offline or when deterministic synthesis is preferred.
   */
  static generateDeterministicAnswer(
    question: string,
    analysis: KnowledgeAnalysis,
    repoFullName: string,
    chunks: { filePath: string; startLine: number; endLine: number; content: string }[] = []
  ): string {
    const { intent, summary, keyInsights, negativeAssertion, isInjectionAttempt } = analysis;

    // Handle Prompt Injection Attempt
    if (isInjectionAttempt) {
      return `### 🛡️ Security Defense Boundary Activated

**Query:** "${question}"

RepoPilot enforces strict deterministic isolation on untrusted repository code. Prompt injection sequences, system overrides, and credential exfiltration instructions are blocked.

- **Status:** Passive analysis only.
- **Boundary:** Execution sandboxed.`;
    }

    // Handle Negative Assertion (Component does not exist)
    if (negativeAssertion) {
      return `### 🔍 Evidence-Grounded Verification

**Query:** "${question}"

#### ❌ Verified Absence:
> **${negativeAssertion}**

RepoPilot verified the repository index for **${repoFullName}** and confirmed that no matching files or directories were present in this revision.

#### 💡 Repository Context:
- **Primary Language:** ${summary.primaryLanguage}
- **Detected Frameworks:** ${summary.detectedFrameworks.join(", ") || "Standard Library"}
- **Top Modules:** ${summary.keyModules.slice(0, 4).map((m) => `\`${m.directory}/\``).join(", ")}`;
    }

    // Handle Specific Query Intents
    switch (intent) {
      case "tests":
        return `### 🧪 Test Suite & QA Architecture for ${repoFullName}

${keyInsights.map((k) => `- **${k}**`).join("\n")}

#### 📁 Discovered Test Files:
${analysis.relevantFiles.map((p) => `- **[\`${p}\`](/explore?file=${encodeURIComponent(p)}&line=1)**`).join("\n")}

#### 💡 Running Tests:
${summary.detectedFrameworks.includes("Vitest") ? "Execute: `npm test` or `npx vitest`" : summary.detectedFrameworks.includes("Jest") ? "Execute: `npm test` or `npx jest`" : summary.primaryLanguage === "Go" ? "Execute: `go test ./...`" : summary.primaryLanguage === "Python" ? "Execute: `pytest`" : "Check the project manifest for the test script."}`;

      case "entry_points":
        return `### 🚀 Application Entry Points & Execution Flow for ${repoFullName}

${keyInsights.map((k) => `- **${k}**`).join("\n")}

#### 📌 Boot & Entry Files:
${analysis.relevantFiles.map((p) => `- **[\`${p}\`](/explore?file=${encodeURIComponent(p)}&line=1)**`).join("\n")}

${chunks.length > 0 ? `#### 📄 Entry File Preview:\n\`\`\`typescript\n${chunks[0].content.slice(0, 350)}\n\`\`\`` : ""}`;

      case "configuration":
        return `### ⚙️ Project Configuration & Environment for ${repoFullName}

${keyInsights.map((k) => `- **${k}**`).join("\n")}

#### 📄 Configuration Files:
${analysis.relevantFiles.map((p) => `- **[\`${p}\`](/explore?file=${encodeURIComponent(p)}&line=1)**`).join("\n")}

> 💡 **Tip:** Check \`.env.example\` or root configuration files to verify required environment variables before local execution.`;

      case "dependencies":
        return `### 📦 Tech Stack & Dependencies for ${repoFullName}

- **Primary Language:** ${summary.primaryLanguage}
- **Detected Frameworks:** ${summary.detectedFrameworks.join(", ") || "Standard Library"}
- **Manifest Files:** ${summary.manifestFiles.map((m) => `\`${m}\``).join(", ")}

#### 📋 Key Dependencies (${summary.dependencies.length}):
${summary.dependencies.slice(0, 15).map((d) => `- **\`${d.name}\`** ${d.version ? `(\`${d.version}\`)` : ""} ${d.isDev ? "*(dev)*" : ""}`).join("\n")}`;

      case "database_models":
        return `### 🗄️ Database, Schemas & State Management for ${repoFullName}

${keyInsights.map((k) => `- **${k}**`).join("\n")}

#### 📂 Schema & Model Files:
${analysis.relevantFiles.map((p) => `- **[\`${p}\`](/explore?file=${encodeURIComponent(p)}&line=1)**`).join("\n")}`;

      case "api_routes":
        return `### 🌐 API Routes & Network Handlers for ${repoFullName}

${keyInsights.map((k) => `- **${k}**`).join("\n")}

#### 🛣️ Route Endpoints:
${analysis.relevantFiles.map((p) => `- **[\`${p}\`](/explore?file=${encodeURIComponent(p)}&line=1)**`).join("\n")}`;

      case "contributing":
        return `### 🤝 Contribution Guidelines & Conventions for ${repoFullName}

${keyInsights.map((k) => `- **${k}**`).join("\n")}

#### 📖 Documentation & Guidelines:
${analysis.relevantFiles.map((p) => `- **[\`${p}\`](/explore?file=${encodeURIComponent(p)}&line=1)**`).join("\n")}`;

      case "architecture":
      default:
        return `### 🏗️ Codebase Architecture & Structural Overview

**Repository:** ${repoFullName}

#### 📊 Core Architecture Details:
- **Primary Language:** ${summary.primaryLanguage}
- **Detected Frameworks:** ${summary.detectedFrameworks.join(", ") || "Standard Library"}
- **Identified Entry Points (${summary.entryPoints.length}):** ${summary.entryPoints.slice(0, 4).join(", ") || "None"}

#### 📂 Key Directory Modules:
${summary.keyModules.slice(0, 8).map((m) => `- **\`${m.directory}/\`** (${m.fileCount} files) — ${m.description}`).join("\n")}

${chunks.length > 0 ? `#### 📌 Code Evidence Snippet:\n\`\`\`typescript\n${chunks[0].content.slice(0, 350)}\n\`\`\`` : ""}`;
    }
  }

  /**
   * Builds an enriched system context block for LLM prompts
   * so neural models have complete architectural ground truth.
   */
  static buildSystemContext(summary: ArchitectureSummary, repoFullName: string): string {
    return `REPOSITORY GROUND TRUTH METADATA for "${repoFullName}":
- Primary Language: ${summary.primaryLanguage}
- Detected Frameworks: ${summary.detectedFrameworks.join(", ") || "None"}
- Application Entry Points: ${summary.entryPoints.slice(0, 5).join(", ") || "None detected"}
- Key Modules: ${summary.keyModules.slice(0, 6).map((m) => `${m.directory}/ (${m.fileCount} files)`).join(", ")}
- Manifest Files: ${summary.manifestFiles.join(", ") || "None"}
- Declared Dependencies: ${summary.dependencies.slice(0, 10).map((d) => d.name).join(", ")}`;
  }
}
