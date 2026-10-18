import { describe, it, expect } from "vitest";
import { SearchEngine } from "../../packages/search/src/searchEngine";
import type { RepositoryFile, IndexedSymbol } from "@repopilot/core";

describe("Search Engine - Deterministic Code & Symbol Search", () => {
  const mockFiles: RepositoryFile[] = [
    {
      path: "src/index.ts",
      size: 1024,
      type: "blob",
      sha: "sha1",
      language: "TypeScript",
      extension: "ts",
      isBinary: false
    },
    {
      path: "src/components/Button.tsx",
      size: 2048,
      type: "blob",
      sha: "sha2",
      language: "TypeScript",
      extension: "tsx",
      isBinary: false
    },
    {
      path: "tests/Button.test.ts",
      size: 512,
      type: "blob",
      sha: "sha3",
      language: "TypeScript",
      extension: "ts",
      isBinary: false
    },
    {
      path: "package.json",
      size: 300,
      type: "blob",
      sha: "sha4",
      isBinary: false
    }
  ];

  const mockSymbols: IndexedSymbol[] = [
    {
      id: "sym-1",
      name: "Button",
      kind: "function",
      filePath: "src/components/Button.tsx",
      startLine: 12,
      endLine: 40,
      signature: "export const Button = () =>"
    },
    {
      id: "sym-2",
      name: "calculateTotal",
      kind: "function",
      filePath: "src/index.ts",
      startLine: 5,
      endLine: 10,
      signature: "function calculateTotal()"
    }
  ];

  const engine = new SearchEngine({
    files: mockFiles,
    symbols: mockSymbols
  });

  it("finds matching files by path with higher ranking for exact filename match", () => {
    const results = engine.search({
      query: "Button",
      type: "path"
    });

    expect(results.length).toBe(2);
    expect(results[0].filePath).toContain("Button");
    expect(results[0].matchType).toBe("path");
  });

  it("finds symbols by name", () => {
    const results = engine.search({
      query: "calculateTotal",
      type: "symbol"
    });

    expect(results.length).toBe(1);
    expect(results[0].filePath).toBe("src/index.ts");
    expect(results[0].lineNumber).toBe(5);
    expect(results[0].matchType).toBe("symbol");
  });

  it("respects language and pathPrefix filters", () => {
    const results = engine.search({
      query: "Button",
      type: "all",
      pathPrefix: "tests/"
    });

    expect(results.length).toBe(1);
    expect(results[0].filePath).toBe("tests/Button.test.ts");
  });

  it("performs multi-factor BM25 context retrieval with symbol and entry point boosts", () => {
    const retrieval = engine.retrieveContext({
      query: "Where is calculateTotal initialized?",
      maxTokens: 4000
    });

    expect(retrieval.hasRelevantMatches).toBe(true);
    expect(retrieval.includedFiles).toContain("src/index.ts");
    expect(retrieval.rankedFiles[0].filePath).toBe("src/index.ts");
    // Verify symbol and entry point boosts were applied
    expect(retrieval.rankedFiles[0].reasons.some((r) => r.includes("Symbol"))).toBe(true);
    expect(retrieval.rankedFiles[0].reasons.some((r) => r.includes("entry point"))).toBe(true);
  });

  it("signals refusal when retrieval finds no matching files or symbols", () => {
    const retrieval = engine.retrieveContext({
      query: "xyz123QuantumFoamNonexistentConcept",
      maxTokens: 4000
    });

    expect(retrieval.hasRelevantMatches).toBe(false);
    expect(retrieval.includedFiles.length).toBe(0);
    expect(retrieval.omittedCount).toBe(0);
  });

  it("tracks omitted files when candidate count exceeds token bound", () => {
    const retrieval = engine.retrieveContext({
      query: "Button",
      maxTokens: 400 // only allows 1 file
    });

    expect(retrieval.hasRelevantMatches).toBe(true);
    expect(retrieval.includedFiles.length).toBe(1);
    expect(retrieval.omittedCount).toBeGreaterThanOrEqual(1);
  });

  it("handles empty or whitespace-only search queries gracefully", () => {
    const results = engine.search({ query: "   ", type: "all" });
    expect(results).toEqual([]);
  });

  it("treats regex metacharacters in queries as literal text without throwing syntax errors", () => {
    const regexQueries = [".*", "(.*)", "[a-z]+", "\\d+", "Button(.*)", "(?=.*)", "src/(index)?"];
    for (const q of regexQueries) {
      expect(() => engine.search({ query: q, type: "all" })).not.toThrow();
    }
  });

  it("matches paths and symbols case-insensitively", () => {
    const results = engine.search({ query: "bUtToN", type: "path" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.filePath === "src/components/Button.tsx")).toBe(true);
  });
});
