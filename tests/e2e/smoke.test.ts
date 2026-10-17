import { describe, it, expect } from "vitest";
import { extractSymbols } from "@repopilot/indexer";
import { SearchEngine } from "@repopilot/search";
import { ArchitectureAnalyzer } from "@repopilot/analysis";
import { PromptBuilder, CitationValidator, OfflineProvider } from "@repopilot/ai";
import { StackTraceParser, HypothesisEngine } from "@repopilot/debugging";
import type { RepositoryFile, IndexedSymbol } from "@repopilot/core";

describe("E2E Integration & Core App Workflow Smoke Tests", () => {
  const mockManifest = JSON.stringify({
    name: "test-app",
    dependencies: { react: "^18.3.0", next: "^14.2.0" },
    devDependencies: { vitest: "^2.0.0" }
  });

  const mockRepoFiles: RepositoryFile[] = [
    {
      path: "package.json",
      type: "blob",
      sha: "sha-pkg",
      size: 150,
      isBinary: false,
      content: mockManifest
    },
    {
      path: "src/index.ts",
      type: "blob",
      sha: "sha-idx",
      size: 400,
      lineCount: 20,
      language: "TypeScript",
      isBinary: false,
      content: `export function initApp(config: { port: number }) {
  console.log("Starting server on port", config.port);
  return { status: "running" };
}

export const APP_VERSION = "1.0.0";
`
    },
    {
      path: "src/utils.ts",
      type: "blob",
      sha: "sha-utl",
      size: 300,
      lineCount: 15,
      language: "TypeScript",
      isBinary: false,
      content: `export function sanitizeInput(str: string): string {
  return str.trim();
}
`
    }
  ];

  it("Step 1: Ingests repository metadata and extracts symbols via AST", async () => {
    const extractedSymbols = await extractSymbols(
      mockRepoFiles[1].path,
      mockRepoFiles[1].content!,
      "TypeScript"
    );

    expect(extractedSymbols.length).toBeGreaterThan(0);
    const funcSym = extractedSymbols.find((s) => s.name === "initApp");
    expect(funcSym).toBeDefined();
    expect(funcSym?.kind).toBe("function");
    expect(funcSym?.startLine).toBe(1);
  });

  it("Step 2: Searches files and symbols deterministically with SearchEngine", () => {
    const symbols: IndexedSymbol[] = [
      {
        id: "src/index.ts:fn:initApp:1",
        name: "initApp",
        kind: "function",
        filePath: "src/index.ts",
        startLine: 1,
        endLine: 4
      }
    ];

    const engine = new SearchEngine({ files: mockRepoFiles, symbols });
    const searchResults = engine.search({ query: "initApp", type: "all" });

    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults.some((r) => r.filePath === "src/index.ts")).toBe(true);
  });

  it("Step 3: Analyzes architecture and generates valid 2D/3D map graph", () => {
    const analysis = ArchitectureAnalyzer.analyze(mockRepoFiles, mockManifest);
    expect(analysis.detectedFrameworks).toContain("Next.js");
    expect(analysis.detectedFrameworks).toContain("React");

    const graph = ArchitectureAnalyzer.generateGraph(mockRepoFiles, "test/repo");
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThanOrEqual(0);

    for (const node of graph.nodes) {
      expect(node.id).toBeDefined();
      expect(node.name).toBeDefined();
    }
  });

  it("Step 4: Executes grounded question answering with verified citations", async () => {
    const provider = new OfflineProvider();
    const prompt = PromptBuilder.buildGroundedPrompt(
      "How is the app initialized?",
      [
        {
          filePath: "src/index.ts",
          startLine: 1,
          endLine: 4,
          content: mockRepoFiles[1].content!
        }
      ],
      "test-owner/test-repo"
    );

    const rawResponse = await provider.generate({
      model: "offline-deterministic",
      prompt: prompt.userPrompt,
      systemPrompt: prompt.systemPrompt
    });

    expect(rawResponse).toContain("Deterministic Offline Mode Active");

    const symbols: IndexedSymbol[] = [
      {
        id: "src/index.ts:fn:initApp:1",
        name: "initApp",
        kind: "function",
        filePath: "src/index.ts",
        startLine: 1,
        endLine: 4
      }
    ];

    const validation = CitationValidator.validate(
      [{ filePath: "src/index.ts", startLine: 1, endLine: 4, symbolName: "initApp" }],
      mockRepoFiles,
      symbols
    );
    expect(validation.validCitations.length).toBe(1);
    expect(validation.validCitations[0].filePath).toBe("src/index.ts");
    expect(validation.invalidCitations.length).toBe(0);
  });

  it("Step 5: Parses stack trace and derives debugging hypotheses honestly", () => {
    const trace = `Error: crash in initApp
    at initApp (src/index.ts:2:5)
    at Object.<anonymous> (src/index.ts:8:1)`;

    const parsed = StackTraceParser.parse(trace, ["src/index.ts", "src/utils.ts"]);
    expect(parsed.frames.length).toBe(2);
    expect(parsed.frames[0].isUserCode).toBe(true);
    expect(parsed.frames[0].filePath).toBe("src/index.ts");

    const snippets = new Map<string, string>();
    snippets.set("src/index.ts", mockRepoFiles[1].content!);

    const hypothesis = HypothesisEngine.analyze(
      "test-owner/test-repo",
      "main",
      "App crashes on start",
      "Crash in initApp",
      parsed,
      snippets,
      undefined, // No fake diff
      ["src/index.ts", "src/utils.ts"]
    );

    expect(hypothesis.hypotheses.length).toBeGreaterThan(0);
    expect(hypothesis.hypotheses[0].culpritFile).toBe("src/index.ts");
    expect(hypothesis.suggestedTests.length).toBeGreaterThan(0);
  });
});
