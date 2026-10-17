import type { BugHypothesis, PatchProposal, SourceReference } from "@repopilot/core";
import type { StackFrame, ParsedTrace } from "./stackTraceParser";
import { DiffValidator, DiffValidationResult } from "./diffValidator";

export interface BugAnalysisResult {
  hypotheses: BugHypothesis[];
  candidatePatch?: PatchProposal;
  suggestedTests: string[];
  reproducibleReport: string;
  diffValidation?: DiffValidationResult;
  detectedFramework?: string;
}

export class HypothesisEngine {
  static analyze(
    repoKey: string,
    commitSha: string,
    issueTitle: string,
    issueDescription: string,
    parsedTrace: ParsedTrace,
    fileSnippets: Map<string, string>,
    aiDiffProposal?: string,
    repoFiles: string[] = []
  ): BugAnalysisResult {
    const hypotheses: BugHypothesis[] = [];
    const suggestedTests: string[] = [];

    // Filter frames that belong to user code in the repository
    const userFrames = parsedTrace.frames.filter((f) => f.isUserCode);
    const culpritFrame = userFrames[0] || parsedTrace.frames.find((f) => !f.isDependency) || parsedTrace.frames[0];

    if (culpritFrame) {
      const snippet = fileSnippets.get(culpritFrame.filePath) || "";

      const citation: SourceReference = {
        repoKey,
        commitSha,
        filePath: culpritFrame.filePath,
        startLine: culpritFrame.lineNumber,
        endLine: culpritFrame.lineNumber + 4,
        codeSnippet: snippet
      };

      hypotheses.push({
        id: "hypo-1",
        rank: 1,
        culpritFile: culpritFrame.filePath,
        startLine: culpritFrame.lineNumber,
        endLine: culpritFrame.lineNumber + 4,
        confidence: culpritFrame.isUserCode ? "high" : "low",
        explanation: `Execution failure in "${culpritFrame.filePath}" at line ${culpritFrame.lineNumber}${
          culpritFrame.functionName ? ` inside "${culpritFrame.functionName}()"` : ""
        }. ${
          parsedTrace.errorMessage
            ? `Root cause matches: "${parsedTrace.errorMessage}". Probable unhandled null reference or missing guard condition.`
            : "Probable boundary violation or missing validation."
        }`,
        evidenceCitations: [citation]
      });

      // Secondary hypothesis if caller frame exists
      if (userFrames.length > 1) {
        const caller = userFrames[1];
        hypotheses.push({
          id: "hypo-2",
          rank: 2,
          culpritFile: caller.filePath,
          startLine: caller.lineNumber,
          endLine: caller.lineNumber + 2,
          confidence: "medium",
          explanation: `Caller "${caller.filePath}" at line ${caller.lineNumber} passed an unexpected or undefined argument to "${culpritFrame.filePath}".`,
          evidenceCitations: [
            {
              repoKey,
              commitSha,
              filePath: caller.filePath,
              startLine: caller.lineNumber,
              endLine: caller.lineNumber,
              codeSnippet: fileSnippets.get(caller.filePath) || ""
            }
          ]
        });
      }
    } else {
      hypotheses.push({
        id: "hypo-fallback",
        rank: 1,
        culpritFile: "Unknown",
        confidence: "low",
        explanation: "No stack frames directly mapped to repository files. Review external dependency versions.",
        evidenceCitations: []
      });
    }

    // Detect test framework from repo files
    const detectedFramework = detectTestFramework(repoFiles);

    // Regression-test generation
    if (detectedFramework && culpritFrame) {
      const testName = `test_${culpritFrame.functionName || "reproduce_issue"}`;
      if (detectedFramework === "vitest" || detectedFramework === "jest") {
        suggestedTests.push(`import { describe, it, expect } from "${detectedFramework}";

describe("Regression: ${issueTitle || "Issue Reproduction"}", () => {
  it("handles boundary condition without throwing in ${culpritFrame.filePath}", async () => {
    // Unverified test scaffold - review before running
    // Expect failure prior to patch; expect success after patch
    expect(true).toBe(true);
  });
});`);
      } else if (detectedFramework === "pytest") {
        suggestedTests.push(`import pytest

def ${testName}():
    """Regression test for: ${issueTitle || "Issue Reproduction"}"""
    # Unverified test scaffold - review before running
    pass`);
      } else if (detectedFramework === "go") {
        suggestedTests.push(`func TestRegression_${culpritFrame.functionName || "Issue"}(t *testing.T) {
    // Unverified test scaffold - review before running
}`);
      } else if (detectedFramework === "cargo") {
        suggestedTests.push(`#[test]
fn test_regression() {
    // Unverified test scaffold - review before running
}`);
      }
    } else {
      // Plain checklist if framework not confidently detected
      suggestedTests.push(
        "1. Write a unit test reproducing the input conditions that triggered the error.",
        "2. Execute the test and verify that it fails with the expected error message.",
        "3. Apply fix and confirm the test transitions from failing to passing.",
        "4. Verify that existing test suite passes without regressions."
      );
    }

    // Patch proposal: ONLY validate and propose if a real AI diff is provided
    let candidatePatch: PatchProposal | undefined;
    let diffValidation: DiffValidationResult | undefined;

    if (aiDiffProposal) {
      diffValidation = DiffValidator.validateAndApply(aiDiffProposal, fileSnippets);
      if (diffValidation.valid && diffValidation.targetFile) {
        candidatePatch = {
          id: "patch-1",
          bugId: hypotheses[0]?.id || "bug-1",
          filePath: diffValidation.targetFile,
          diff: aiDiffProposal,
          rationale: `Fixes failure in ${diffValidation.targetFile} (Unverified: review before applying). Validated against in-memory file content.`,
          suggestedTests: suggestedTests.length > 0 ? suggestedTests : ["Verify reproduction trace resolves."],
          verificationStatus: "unverified"
        };
      }
    }

    // Reproducible PR Draft Markdown Report
    const prDraftMarkdown = `## 🐞 Bug Investigation & Candidate Fix (Unverified: review before applying)

- **Pinned Commit SHA:** \`${commitSha}\`
- **Target Repository:** \`${repoKey}\`
- **Suspected Culprit File:** \`${culpritFrame ? culpritFrame.filePath : "Unknown"}\`
- **Error Signature:** \`${parsedTrace.errorType || "Error"}: ${parsedTrace.errorMessage || "Unknown"}\`

### 🔍 Root Cause Analysis
${hypotheses.map((h) => `- **Hypothesis ${h.rank} (${h.confidence} confidence):** ${h.explanation}`).join("\n")}

### 🛡️ Risk Assessment & Human Review Notes
- **Risk Level:** Medium. Automated patch suggestions must be verified with regression tests before merging.
- **Touched Files:** ${culpritFrame ? `\`${culpritFrame.filePath}\`` : "None"}
- **Verification Requirement:** Run the regression test skeleton below to verify the fix.

${candidatePatch ? `### 📝 Validated Unified Diff
\`\`\`diff
${candidatePatch.diff}
\`\`\`` : `### 📋 Suggestion Scaffold (No automated diff generated)
${suggestedTests.join("\n")}
`}
`;

    return {
      hypotheses,
      candidatePatch,
      diffValidation,
      suggestedTests,
      reproducibleReport: prDraftMarkdown,
      detectedFramework
    };
  }
}

function detectTestFramework(repoFiles: string[]): string | undefined {
  const fileSet = new Set(repoFiles.map((f) => f.toLowerCase()));

  for (const f of fileSet) {
    if (f.endsWith("vitest.config.ts") || f.endsWith("vitest.config.js")) return "vitest";
    if (f.endsWith("jest.config.js") || f.endsWith("jest.config.ts")) return "jest";
    if (f.endsWith("pytest.ini") || f.endsWith("conftest.py") || f.includes("tests/test_")) return "pytest";
    if (f.endsWith("_test.go")) return "go";
    if (f.endsWith("cargo.toml")) return "cargo";
  }

  return undefined;
}
