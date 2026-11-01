import { describe, it, expect } from "vitest";
import { SearchEngine, splitIdentifier } from "../../packages/search/src/searchEngine";
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
    },
    {
      path: "src/auth/session.ts",
      size: 800,
      type: "blob",
      sha: "sha5",
      language: "TypeScript",
      extension: "ts",
      isBinary: false
    },
    {
      path: "src/auth/callback.ts",
      size: 1200,
      type: "blob",
      sha: "sha6",
      language: "TypeScript",
      extension: "ts",
      isBinary: false
    },
    {
      path: "src/utils/callback.ts",
      size: 600,
      type: "blob",
      sha: "sha7",
      language: "TypeScript",
      extension: "ts",
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
    },
    {
      id: "sym-3",
      name: "authenticateSession",
      kind: "function",
      filePath: "src/auth/session.ts",
      startLine: 15,
      endLine: 35,
      signature: "export function authenticateSession(token: string)"
    },
    {
      id: "sym-4",
      name: "handleAuthCallback",
      kind: "function",
      filePath: "src/auth/callback.ts",
      startLine: 20,
      endLine: 50,
      signature: "export async function handleAuthCallback(req: Request)"
    },
    {
      id: "sym-5",
      name: "callbackHandler",
      kind: "function",
      filePath: "src/utils/callback.ts",
      startLine: 5,
      endLine: 25,
      signature: "function callbackHandler()"
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

  describe("Identifier Splitting & Tokenized Search (Task 1)", () => {
    it("splitIdentifier splits camelCase, PascalCase, snake_case, kebab-case, and digits while preserving original token", () => {
      const tokens1 = splitIdentifier("handleAuthCallback");
      expect(tokens1).toContain("handle");
      expect(tokens1).toContain("auth");
      expect(tokens1).toContain("callback");
      expect(tokens1).toContain("handleauthcallback");

      const tokens2 = splitIdentifier("authenticateSession");
      expect(tokens2).toContain("authenticate");
      expect(tokens2).toContain("session");
      expect(tokens2).toContain("authenticatesession");

      const tokens3 = splitIdentifier("parse_v8_stack_trace");
      expect(tokens3).toContain("parse");
      expect(tokens3).toContain("v");
      expect(tokens3).toContain("8");
      expect(tokens3).toContain("stack");
      expect(tokens3).toContain("trace");

      const tokens4 = splitIdentifier("kebab-case-identifier");
      expect(tokens4).toContain("kebab");
      expect(tokens4).toContain("case");
      expect(tokens4).toContain("identifier");
    });

    it("query 'login session' finds authenticateSession", () => {
      const results = engine.search({
        query: "login session",
        type: "symbol"
      });

      expect(results.length).toBeGreaterThanOrEqual(1);
      const found = results.find((r) => r.previewText.includes("authenticateSession"));
      expect(found).toBeDefined();
      expect(found?.filePath).toBe("src/auth/session.ts");
    });

    it("query 'auth callback' ranks handleAuthCallback first", () => {
      const results = engine.search({
        query: "auth callback",
        type: "symbol"
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0].previewText).toContain("handleAuthCallback");
      expect(results[0].filePath).toBe("src/auth/callback.ts");
      // Verify it ranked above callbackHandler which only matched one token
      const callbackHandlerIndex = results.findIndex((r) => r.previewText.includes("callbackHandler"));
      expect(callbackHandlerIndex).toBeGreaterThan(0);
    });

    it("retrieveContext applies 3.0x exact-symbol boost and token split match bonus", () => {
      const retrieval = engine.retrieveContext({
        query: "handleAuthCallback",
        maxTokens: 4000
      });

      expect(retrieval.hasRelevantMatches).toBe(true);
      expect(retrieval.rankedFiles[0].filePath).toBe("src/auth/callback.ts");
      expect(retrieval.rankedFiles[0].reasons.some((r) => r.includes("3.0x boost"))).toBe(true);
    });
  });
});
