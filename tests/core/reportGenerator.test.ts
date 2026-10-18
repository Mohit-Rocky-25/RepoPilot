import { describe, it, expect } from "vitest";
import {
  calculateHealthScore,
  generateMarkdownReport
} from "../../src/lib/reportGenerator";
import type { ArchitectureSummary, RepositoryFile, RepositoryReference } from "@repopilot/core";

describe("Report Generator - calculateHealthScore", () => {
  const dummySummary: ArchitectureSummary = {
    primaryLanguage: "TypeScript",
    detectedFrameworks: ["Next.js", "React"],
    entryPoints: ["src/app/page.tsx"],
    manifestFiles: ["package.json"],
    keyModules: [{ directory: "src", description: "Source code", fileCount: 5 }],
    dependencies: [{ name: "react", isDev: false }]
  };

  it("calculates A+ grade when all health checks are satisfied", () => {
    const files: RepositoryFile[] = [
      { path: "package.json", size: 100, type: "blob", sha: "abc1234", isBinary: false },
      { path: "README.md", size: 200, type: "blob", sha: "abc1235", isBinary: false },
      { path: "LICENSE", size: 150, type: "blob", sha: "abc1236", isBinary: false },
      { path: ".gitignore", size: 50, type: "blob", sha: "abc1237", isBinary: false },
      { path: ".github/workflows/ci.yml", size: 300, type: "blob", sha: "abc1238", isBinary: false },
      { path: "tests/core/smoke.test.ts", size: 400, type: "blob", sha: "abc1239", isBinary: false }
    ];

    const health = calculateHealthScore(files, dummySummary);
    expect(health.score).toBe(6);
    expect(health.maxScore).toBe(6);
    expect(health.grade).toBe("A+");
    expect(health.checks.every((c) => c.passed)).toBe(true);
  });

  it("downgrades grade accurately when tests and license are missing", () => {
    const files: RepositoryFile[] = [
      { path: "package.json", size: 100, type: "blob", sha: "abc1234", isBinary: false },
      { path: "README.md", size: 200, type: "blob", sha: "abc1235", isBinary: false },
      { path: ".gitignore", size: 50, type: "blob", sha: "abc1237", isBinary: false }
    ];

    const health = calculateHealthScore(files, dummySummary);
    expect(health.score).toBe(3);
    expect(health.grade).toBe("C");
    const testCheck = health.checks.find((c) => c.name === "Automated Test Suite");
    expect(testCheck?.passed).toBe(false);
  });
});

describe("Report Generator - generateMarkdownReport", () => {
  it("formats a complete markdown report with accurate sections", () => {
    const repo: RepositoryReference = {
      owner: "facebook",
      repo: "react",
      fullName: "facebook/react",
      url: "https://github.com/facebook/react",
      defaultBranch: "main",
      primaryLanguage: "JavaScript"
    };

    const summary: ArchitectureSummary = {
      primaryLanguage: "JavaScript",
      detectedFrameworks: ["React"],
      entryPoints: ["packages/react/index.js"],
      manifestFiles: ["package.json"],
      keyModules: [
        { directory: "packages/react", description: "Core React package", fileCount: 12 }
      ],
      dependencies: [
        { name: "loose-envify", version: "^1.1.0", isDev: false },
        { name: "jest", version: "^29.0.0", isDev: true }
      ]
    };

    const files: RepositoryFile[] = [
      { path: "package.json", size: 100, type: "blob", sha: "abc1234", lineCount: 20, isBinary: false },
      { path: "README.md", size: 200, type: "blob", sha: "abc1235", lineCount: 50, isBinary: false },
      { path: "packages/react/index.js", size: 300, type: "blob", sha: "abc1236", lineCount: 80, language: "JavaScript", isBinary: false }
    ];

    const markdown = generateMarkdownReport(repo, summary, files);

    expect(markdown).toContain("# RepoPilot: Architecture & Code Health Brief");
    expect(markdown).toContain("`facebook/react`");
    expect(markdown).toContain("packages/react/index.js");
    expect(markdown).toContain("loose-envify");
    expect(markdown).toContain("jest");
    expect(markdown).toContain("150 lines"); // 20 + 50 + 80
  });
});
