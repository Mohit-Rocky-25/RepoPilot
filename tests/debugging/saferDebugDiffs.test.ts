import { describe, it, expect } from "vitest";
import { HypothesisEngine } from "../../packages/debugging/src/hypothesisEngine";
import { runLightweightTypeCheck } from "../../packages/debugging/src/typeChecker";
import type { ParsedTrace } from "../../packages/debugging/src/stackTraceParser";

describe("Task 4: Safer Debug Diffs & Verification", () => {
  const tsContent = `export function calculateTotal(items: number[]): number {
  let total = 0;
  for (const item of items) {
    total += item;
  }
  return total;
}
`;

  const pyContent = `def compute_sum(items):
    total = 0
    for item in items:
        total += item
    return total
`;

  const parsedTrace: ParsedTrace = {
    errorType: "TypeError",
    errorMessage: "items is not iterable",
    frames: [
      {
        raw: "at calculateTotal (src/utils/math.ts:3:22)",
        filePath: "src/utils/math.ts",
        lineNumber: 3,
        functionName: "calculateTotal",
        isUserCode: true,
        isDependency: false,
        candidateFiles: ["src/utils/math.ts"]
      },
      {
        raw: "at handleRequest (src/server/handler.ts:15:10)",
        filePath: "src/server/handler.ts",
        lineNumber: 15,
        functionName: "handleRequest",
        isUserCode: true,
        isDependency: false,
        candidateFiles: ["src/server/handler.ts"]
      }
    ]
  };

  const snippets = new Map<string, string>();
  snippets.set("src/utils/math.ts", tsContent);
  snippets.set("src/server/handler.ts", "export function handleRequest() {}\n");

  it("assigns High confidence when diff targets the exact culprit stack frame and changes lines", () => {
    const diff = `--- a/src/utils/math.ts
+++ b/src/utils/math.ts
@@ -2,3 +2,3 @@
   let total = 0;
-  for (const item of items) {
+  for (const item of items || []) {
     total += item;
`;

    const analysis = HypothesisEngine.analyze(
      "test/repo",
      "sha123456",
      "Null Pointer Crash",
      "Crash in calculateTotal",
      parsedTrace,
      snippets,
      diff
    );

    expect(analysis.candidatePatch).toBeDefined();
    expect(analysis.candidatePatch?.verificationStatus).toBe("unverified");
    expect(analysis.candidatePatch?.confidence).toBe("high");
    expect(analysis.candidatePatch?.confidenceReason).toContain("src/utils/math.ts:3");
    expect(analysis.candidatePatch?.matchedStackFrame).toEqual({
      filePath: "src/utils/math.ts",
      lineNumber: 3,
      functionName: "calculateTotal"
    });
    expect(analysis.candidatePatch?.changedLines).toBeDefined();
    expect(analysis.candidatePatch?.changedLines?.startLine).toBe(2);
    expect(analysis.candidatePatch?.typeCheckStatus).toBe("passed");
  });

  it("never presents a diff without a matched stack frame", () => {
    // Diff targets a real file in repo, but that file is NOT in the stack trace
    const unrelatedFileDiff = `--- a/src/other/unrelated.ts
+++ b/src/other/unrelated.ts
@@ -1,1 +1,1 @@
-console.log(1);
+console.log(2);
`;
    snippets.set("src/other/unrelated.ts", "console.log(1);\n");

    const analysis = HypothesisEngine.analyze(
      "test/repo",
      "sha123456",
      "Crash",
      "Trace does not mention unrelated.ts",
      parsedTrace,
      snippets,
      unrelatedFileDiff
    );

    // CRITICAL: Diff is NOT presented because target does not match any stack frame
    expect(analysis.candidatePatch).toBeUndefined();
  });

  it("runs lightweight in-memory type check on TypeScript files and flags failures", () => {
    // 1. Valid TypeScript syntax
    const validResult = runLightweightTypeCheck("src/math.ts", "export const x: number = 42;");
    expect(validResult.status).toBe("passed");

    // 2. Syntax/Type broken patch
    const invalidResult = runLightweightTypeCheck("src/math.ts", "export const x: number = ;");
    expect(invalidResult.status).toBe("failed");
    expect(invalidResult.reason).toContain("Syntax error");

    // 3. Non-TypeScript file
    const nonTsResult = runLightweightTypeCheck("src/math.py", pyContent);
    expect(nonTsResult.status).toBe("not_run");
  });

  it("downgrades confidence to low when in-memory type check fails", () => {
    const syntaxBrokenDiff = `--- a/src/utils/math.ts
+++ b/src/utils/math.ts
@@ -2,3 +2,3 @@
   let total = 0;
-  for (const item of items) {
+  for (const item of ;;) {
     total += item;
`;

    const analysis = HypothesisEngine.analyze(
      "test/repo",
      "sha123456",
      "Syntax breaking diff",
      "Broken diff proposal",
      parsedTrace,
      snippets,
      syntaxBrokenDiff
    );

    expect(analysis.candidatePatch).toBeDefined();
    expect(analysis.candidatePatch?.confidence).toBe("low");
    expect(analysis.candidatePatch?.typeCheckStatus).toBe("failed");
    expect(analysis.candidatePatch?.confidenceReason).toContain("type check failed");
  });
});
