import { describe, it, expect } from "vitest";
import { CitationValidator } from "../../packages/ai/src/citationValidator";
import type { RepositoryFile, IndexedSymbol } from "@repopilot/core";

describe("Citation Validator - Strict Verification", () => {
  const validFiles: RepositoryFile[] = [
    {
      path: "src/index.ts",
      size: 500,
      type: "blob",
      sha: "sha1",
      lineCount: 50,
      isBinary: false
    },
    {
      path: "src/utils.ts",
      size: 300,
      type: "blob",
      sha: "sha2",
      lineCount: 100,
      isBinary: false
    }
  ];

  const validSymbols: IndexedSymbol[] = [
    {
      id: "src/utils.ts:fn:calculateSum:10",
      name: "calculateSum",
      kind: "function",
      filePath: "src/utils.ts",
      startLine: 10,
      endLine: 25,
      confidence: "ast"
    }
  ];

  it("extracts formatted citations with line ranges and symbol identifiers", () => {
    const text =
      "Entry point is in [src/index.ts:1-20] while helper functions are in [src/utils.ts:10-25#calculateSum].";

    const extracted = CitationValidator.extractCitations(text);
    expect(extracted.length).toBe(2);

    expect(extracted[0].filePath).toBe("src/index.ts");
    expect(extracted[0].startLine).toBe(1);
    expect(extracted[0].endLine).toBe(20);

    expect(extracted[1].filePath).toBe("src/utils.ts");
    expect(extracted[1].startLine).toBe(10);
    expect(extracted[1].endLine).toBe(25);
    expect(extracted[1].symbolName).toBe("calculateSum");
  });

  it("accepts valid citations within real file boundaries", () => {
    const citations = [{ filePath: "src/index.ts", startLine: 5, endLine: 15 }];
    const res = CitationValidator.validate(citations, validFiles, validSymbols);
    expect(res.validCitations.length).toBe(1);
    expect(res.invalidCitations.length).toBe(0);
    expect(res.warning).toBeUndefined();
  });

  it("rejects citations pointing to missing files", () => {
    const citations = [{ filePath: "src/nonexistent.ts", startLine: 1, endLine: 10 }];
    const res = CitationValidator.validate(citations, validFiles, validSymbols);
    expect(res.validCitations.length).toBe(0);
    expect(res.invalidCitations.length).toBe(1);
    expect(res.invalidCitations[0].reason).toContain("does not exist");
    expect(res.warning).toContain("Some citations could not be verified");
  });

  it("rejects citations with out-of-range lines exceeding file length", () => {
    // src/index.ts only has 50 lines
    const citations = [{ filePath: "src/index.ts", startLine: 60, endLine: 90 }];
    const res = CitationValidator.validate(citations, validFiles, validSymbols);
    expect(res.validCitations.length).toBe(0);
    expect(res.invalidCitations.length).toBe(1);
    expect(res.invalidCitations[0].reason).toContain("exceeds file length");
  });

  it("rejects citations referencing symbols not found in the file", () => {
    const citations = [
      {
        filePath: "src/utils.ts",
        startLine: 10,
        endLine: 25,
        symbolName: "missingFunction"
      }
    ];
    const res = CitationValidator.validate(citations, validFiles, validSymbols);
    expect(res.validCitations.length).toBe(0);
    expect(res.invalidCitations.length).toBe(1);
    expect(res.invalidCitations[0].reason).toContain("does not exist in file");
  });

  it("rejects citations where symbol span does not overlap citation range", () => {
    // calculateSum is at lines 10-25, but citation specifies lines 80-90
    const citations = [
      {
        filePath: "src/utils.ts",
        startLine: 80,
        endLine: 90,
        symbolName: "calculateSum"
      }
    ];
    const res = CitationValidator.validate(citations, validFiles, validSymbols);
    expect(res.validCitations.length).toBe(0);
    expect(res.invalidCitations.length).toBe(1);
    expect(res.invalidCitations[0].reason).toContain("does not overlap");
  });

  it("cleans invalid citations from generated response text", () => {
    const originalText =
      "Check [src/index.ts:5-10] and also [fake/path.ts:1-10] for details.";
    const invalid = [
      {
        filePath: "fake/path.ts",
        startLine: 1,
        endLine: 10,
        isValid: false
      }
    ];

    const cleaned = CitationValidator.cleanInvalidCitations(originalText, invalid);
    expect(cleaned).toContain("[src/index.ts:5-10]");
    expect(cleaned).not.toContain("[fake/path.ts:1-10]");
  });

  describe("Stronger Citation Validation & Support Checking (Task 3)", () => {
    const mockFileContents = new Map<string, string>([
      [
        "src/utils.ts",
        [
          "// Header", // 1
          "",          // 2
          "   ",       // 3
          "",          // 4
          "export function helper() {", // 5
          "  return 42;",               // 6
          "}",                          // 7
          "",                           // 8
          "// Math calculation section", // 9
          "export function calculateSum(a: number, b: number): number {", // 10
          "  return a + b;",            // 11
          "}",                          // 12
          "",                           // 13
          "export function formatOutput(str: string): string {", // 14
          "  return str.trim();",       // 15
          "}"                           // 16
        ].join("\n")
      ]
    ]);

    it("rejects citations pointing to empty or whitespace-only line spans (Pass 2 fix)", () => {
      // Lines 2-4 in src/utils.ts are purely empty/whitespace
      const citations = [{ filePath: "src/utils.ts", startLine: 2, endLine: 4 }];
      const res = CitationValidator.validate(citations, validFiles, validSymbols, mockFileContents);

      expect(res.validCitations.length).toBe(0);
      expect(res.invalidCitations.length).toBe(1);
      expect(res.invalidCitations[0].reason).toContain("only empty or whitespace lines");
    });

    it("tags real-but-irrelevant ranges as 'Weak support' (Pass 3 support check)", () => {
      // Claim is about calculateSum math logic, but citation cites lines 14-16 (formatOutput)
      const claimText =
        "The mathematical calculateSum logic aggregates all user numbers [src/utils.ts:14-16].";
      const citations = [{ filePath: "src/utils.ts", startLine: 14, endLine: 16, rawTag: "[src/utils.ts:14-16]" }];

      const res = CitationValidator.validate(
        citations,
        validFiles,
        validSymbols,
        mockFileContents,
        claimText
      );

      // Kept in validCitations, but visibly tagged as weak
      expect(res.validCitations.length).toBe(1);
      expect(res.validCitations[0].supportStatus).toBe("weak");
      expect(res.validCitations[0].isWeakSupport).toBe(true);
      expect(res.validCitations[0].reason).toContain("does not contain key terms or symbols");
      expect(res.weakCitations.length).toBe(1);
      expect(res.invalidCitations.length).toBe(0);
    });

    it("marks relevant citation with matching claim terms as 'verified'", () => {
      const claimText =
        "The calculateSum function computes summation for inputs [src/utils.ts:10-12].";
      const citations = [{ filePath: "src/utils.ts", startLine: 10, endLine: 12, rawTag: "[src/utils.ts:10-12]" }];

      const res = CitationValidator.validate(
        citations,
        validFiles,
        validSymbols,
        mockFileContents,
        claimText
      );

      expect(res.validCitations.length).toBe(1);
      expect(res.validCitations[0].supportStatus).toBe("verified");
      expect(res.validCitations[0].isWeakSupport).toBe(false);
      expect(res.weakCitations.length).toBe(0);
    });

    it("strips fake files while preserving weak-support citations in answer text", () => {
      const text =
        "Math is in [src/utils.ts:14-16] while phantom code is in [src/fake-nonexistent.ts:1-10].";
      const extracted = CitationValidator.extractCitations(text);
      const res = CitationValidator.validate(extracted, validFiles, validSymbols, mockFileContents, text);

      expect(res.invalidCitations.some((c) => c.filePath === "src/fake-nonexistent.ts")).toBe(true);
      expect(res.weakCitations.some((c) => c.filePath === "src/utils.ts")).toBe(true);

      const cleaned = CitationValidator.cleanInvalidCitations(text, res.invalidCitations);
      expect(cleaned).toContain("[src/utils.ts:14-16]");
      expect(cleaned).not.toContain("[src/fake-nonexistent.ts:1-10]");
    });

    it("detects uncited factual sentences mentioning file paths or symbols as 'Uncited claim'", () => {
      const text =
        "The calculateSum algorithm handles addition. Also check src/index.ts for configuration settings.";

      const uncited = CitationValidator.detectUncitedClaims(text, validFiles, validSymbols);

      expect(uncited.length).toBe(2);
      expect(uncited.some((u) => u.mentionedEntities.includes("calculateSum"))).toBe(true);
      expect(uncited.some((u) => u.mentionedEntities.includes("src/index.ts"))).toBe(true);
      expect(uncited[0].reason).toContain("without a citation");
    });
  });
});
