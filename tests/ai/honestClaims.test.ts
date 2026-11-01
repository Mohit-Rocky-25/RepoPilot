import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Honest Claims & Comparison Audit (Task 7)", () => {
  const readmePath = path.resolve(__dirname, "../../README.md");
  const deploymentPath = path.resolve(__dirname, "../../DEPLOYMENT.md");

  it("ensures README.md does not contain banned hype claims", () => {
    const readme = fs.readFileSync(readmePath, "utf8");
    expect(readme).not.toMatch(/bank-grade/i);
    expect(readme).not.toMatch(/0%\s*hallucinat/i);
    expect(readme).not.toMatch(/zero\s*hallucination/i);
    expect(readme).not.toMatch(/cryptographic/i);
  });

  it("ensures DEPLOYMENT.md does not contain banned hype claims", () => {
    const deployment = fs.readFileSync(deploymentPath, "utf8");
    expect(deployment).not.toMatch(/bank-grade/i);
    expect(deployment).not.toMatch(/0%\s*hallucinat/i);
    expect(deployment).not.toMatch(/zero\s*hallucination/i);
    expect(deployment).not.toMatch(/cryptographic/i);
  });

  it("comparison table in README.md compares against DeepWiki, Aider, and Sourcegraph Cody", () => {
    const readme = fs.readFileSync(readmePath, "utf8");
    expect(readme).toContain("DeepWiki");
    expect(readme).toContain("Aider");
    expect(readme).toContain("Sourcegraph Cody");
  });

  it("comparison table explicitly includes dimensions where RepoPilot loses", () => {
    const readme = fs.readFileSync(readmePath, "utf8");
    expect(readme).toMatch(/Code Modification & Editing.*RepoPilot Loses/i);
    expect(readme).toMatch(/Multi-Repo & Enterprise Scope.*RepoPilot Loses/i);
    expect(readme).toMatch(/Type-Aware Semantic Intelligence.*RepoPilot Loses/i);
    expect(readme).toContain("LOSS (Read-Only)");
    expect(readme).toContain("Summary of Where RepoPilot Loses");
  });

  it("contains measured citation claim wording", () => {
    const readme = fs.readFileSync(readmePath, "utf8");
    expect(readme).toMatch(/citations are verified to exist in the pinned commit; (?:relevance is flagged, not guaranteed|invalid citations are stripped)/i);
  });
});
