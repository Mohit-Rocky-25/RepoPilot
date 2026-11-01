import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Evaluation Harness Configuration & Coverage (Task 4)", () => {
  const reposPath = path.resolve(__dirname, "../../eval/repos.json");
  const questionsPath = path.resolve(__dirname, "../../eval/questions.json");
  const docsResultsPath = path.resolve(__dirname, "../../docs/eval-results.md");

  it("includes at least 6 repositories with at least 3 lesser-known projects", () => {
    expect(fs.existsSync(reposPath)).toBe(true);
    const repos = JSON.parse(fs.readFileSync(reposPath, "utf8"));
    expect(repos.length).toBeGreaterThanOrEqual(6);

    const repoNames = repos.map((r: any) => r.name);
    // 3 major frameworks
    expect(repoNames).toContain("vercel/swr");
    expect(repoNames).toContain("pallets/flask");
    expect(repoNames).toContain("gin-gonic/gin");

    // At least 3 lesser-known / focused micro-libraries
    expect(repoNames).toContain("developit/mitt");
    expect(repoNames).toContain("pallets/itsdangerous");
    expect(repoNames).toContain("uber-go/ratelimit");
  });

  it("contains at least 50 questions across 6 repos with expected files defined", () => {
    expect(fs.existsSync(questionsPath)).toBe(true);
    const questions = JSON.parse(fs.readFileSync(questionsPath, "utf8"));
    expect(questions.length).toBeGreaterThanOrEqual(50);

    const reposInQuestions = new Set(questions.map((q: any) => q.repo));
    expect(reposInQuestions.size).toBeGreaterThanOrEqual(6);

    for (const q of questions) {
      expect(q.id).toBeDefined();
      expect(q.expectedFiles).toBeInstanceOf(Array);
      expect(q.expectedFiles.length).toBeGreaterThan(0);
      expect(typeof q.question).toBe("string");
    }
  });

  it("eval-results.md reports retrieval recall@5, citation validity, and weak-support rate separately", () => {
    expect(fs.existsSync(docsResultsPath)).toBe(true);
    const content = fs.readFileSync(docsResultsPath, "utf8");

    expect(content).toContain("Retrieval Recall@5");
    expect(content).toContain("Citation Strict Validity");
    expect(content).toContain("Weak-Support Rate");
    expect(content).toContain("Per-Repository Breakdown");
    expect(content).toContain("Detailed Failures & Flagged Questions Log");

    // No single "100%" headline claim
    expect(content).not.toMatch(/^# .*100%/m);
  });
});
