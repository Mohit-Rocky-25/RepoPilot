import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Task 7: CI Workflow Configuration", () => {
  const workflowPath = path.resolve(__dirname, "../../.github/workflows/ci.yml");

  it("ensures .github/workflows/ci.yml exists and defines a pull_request trigger for main", () => {
    expect(fs.existsSync(workflowPath)).toBe(true);
    const content = fs.readFileSync(workflowPath, "utf-8");

    expect(content).toContain("pull_request:");
    expect(content).toContain('branches: [ "main" ]');
  });

  it("runs security:scan, lint, typecheck, and test steps", () => {
    const content = fs.readFileSync(workflowPath, "utf-8");

    expect(content).toMatch(/npm run security:scan/i);
    expect(content).toMatch(/npm run lint/i);
    expect(content).toMatch(/npm run typecheck/i);
    expect(content).toMatch(/npm test/i);
  });

  it("runs npm audit failing on high severity vulnerabilities", () => {
    const content = fs.readFileSync(workflowPath, "utf-8");

    expect(content).toMatch(/npm audit --audit-level=high/i);
  });

  it("configures Playwright browser installation and end-to-end tests", () => {
    const content = fs.readFileSync(workflowPath, "utf-8");

    expect(content).toMatch(/playwright install/i);
    expect(content).toMatch(/npm run test:e2e/i);
  });
});
