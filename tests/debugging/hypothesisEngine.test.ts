import { describe, it, expect } from "vitest";
import { HypothesisEngine } from "../../packages/debugging/src/hypothesisEngine";
import { DiffValidator } from "../../packages/debugging/src/diffValidator";
import type { ParsedTrace } from "../../packages/debugging/src/stackTraceParser";

describe("Hypothesis Engine - Honest Bug Analysis & Diff Validation", () => {
  const parsedTrace: ParsedTrace = {
    errorType: "TypeError",
    errorMessage: "Cannot read property of undefined",
    frames: [
      {
        raw: "at render (src/components/Dashboard.tsx:42:10)",
        filePath: "src/components/Dashboard.tsx",
        lineNumber: 42,
        isUserCode: true,
        isDependency: false,
        candidateFiles: ["src/components/Dashboard.tsx"]
      }
    ]
  };

  const originalFileContent = `import React from "react";

export function Dashboard({ items }: { items?: string[] }) {
  const count = items.length;
  return <div>{count}</div>;
}
`;

  const snippets = new Map<string, string>();
  snippets.set("src/components/Dashboard.tsx", originalFileContent);

  it("yields no fake diff when AI proposal is absent (no-AI path)", () => {
    const analysis = HypothesisEngine.analyze(
      "test/repo",
      "abcdef123456",
      "Dashboard Crash",
      "Crash on mount",
      parsedTrace,
      snippets,
      undefined, // No AI diff
      ["vitest.config.ts", "src/components/Dashboard.tsx"]
    );

    expect(analysis.hypotheses.length).toBe(1);
    expect(analysis.hypotheses[0].culpritFile).toBe("src/components/Dashboard.tsx");

    // CRITICAL: Honest engineering - no fake diffs!
    expect(analysis.candidatePatch).toBeUndefined();

    // Suggestion scaffold is generated instead
    expect(analysis.reproducibleReport).toContain("Suggestion Scaffold (No automated diff generated)");
    expect(analysis.reproducibleReport).toContain("Unverified: review before applying");
    expect(analysis.reproducibleReport).toContain("abcdef123456");
  });

  it("generates a regression-test skeleton when test framework is detected", () => {
    const analysis = HypothesisEngine.analyze(
      "test/repo",
      "abcdef123456",
      "Dashboard Crash",
      "Crash on mount",
      parsedTrace,
      snippets,
      undefined,
      ["vitest.config.ts", "src/components/Dashboard.tsx"]
    );

    expect(analysis.detectedFramework).toBe("vitest");
    expect(analysis.suggestedTests.length).toBeGreaterThan(0);
    expect(analysis.suggestedTests[0]).toContain("import { describe, it, expect } from \"vitest\";");
  });

  it("validates and accepts clean unified diffs matching file contents", () => {
    const cleanDiff = `--- a/src/components/Dashboard.tsx
+++ b/src/components/Dashboard.tsx
@@ -3,3 +3,3 @@
 export function Dashboard({ items }: { items?: string[] }) {
-  const count = items.length;
+  const count = items?.length ?? 0;
   return <div>{count}</div>;
`;

    const validation = DiffValidator.validateAndApply(cleanDiff, snippets);
    expect(validation.valid).toBe(true);
    expect(validation.targetFile).toBe("src/components/Dashboard.tsx");
    expect(validation.patchedContent).toContain("const count = items?.length ?? 0;");

    // Propose candidate patch when diff is valid
    const analysis = HypothesisEngine.analyze(
      "test/repo",
      "abcdef123456",
      "Dashboard Crash",
      "Crash on mount",
      parsedTrace,
      snippets,
      cleanDiff,
      ["vitest.config.ts"]
    );

    expect(analysis.candidatePatch).toBeDefined();
    expect(analysis.candidatePatch?.diff).toBe(cleanDiff);
    expect(analysis.candidatePatch?.rationale).toContain("Unverified: review before applying");
  });

  it("rejects conflicting unified diffs with context mismatches", () => {
    const conflictingDiff = `--- a/src/components/Dashboard.tsx
+++ b/src/components/Dashboard.tsx
@@ -3,3 +3,3 @@
 export function NonexistentFunction() {
-  const wrong = 0;
+  const fixed = 1;
   return null;
`;

    const validation = DiffValidator.validateAndApply(conflictingDiff, snippets);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("context mismatch");

    // Does not produce candidate patch on conflict
    const analysis = HypothesisEngine.analyze(
      "test/repo",
      "abcdef123456",
      "Dashboard Crash",
      "Crash on mount",
      parsedTrace,
      snippets,
      conflictingDiff
    );

    expect(analysis.candidatePatch).toBeUndefined();
  });

  it("rejects unified diffs targeting non-existent files", () => {
    const wrongFileDiff = `--- a/src/fake/file.ts
+++ b/src/fake/file.ts
@@ -1,3 +1,3 @@
-line1
+line2
`;

    const validation = DiffValidator.validateAndApply(wrongFileDiff, snippets);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("does not exist in repository");
  });
});
