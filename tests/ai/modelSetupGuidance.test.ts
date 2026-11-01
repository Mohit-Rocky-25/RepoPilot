import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Model and Setup Guidance (Task 5)", () => {
  const settingsPath = path.resolve(__dirname, "../../src/app/settings/ai/page.tsx");
  const assistantPath = path.resolve(__dirname, "../../src/app/assistant/page.tsx");
  const readmePath = path.resolve(__dirname, "../../README.md");

  it("Settings UI includes 'Choose Your AI Setup' panel with 3 modes and hardware guidance", () => {
    expect(fs.existsSync(settingsPath)).toBe(true);
    const content = fs.readFileSync(settingsPath, "utf8");

    // Title and panel presence
    expect(content).toContain("Choose Your AI Setup");

    // Mode 1: Local Ollama hardware recommendations
    expect(content).toContain("Local Ollama");
    expect(content).toContain("16 GB RAM");
    expect(content).toContain("7B model");
    expect(content).toContain("8 GB RAM");
    expect(content).toContain("1.5B model");
    expect(content).toContain("Hardware limited");

    // Mode 2: Bring-your-own key
    expect(content).toContain("Bring-Your-Own Key");
    expect(content).toContain("sessionStorage");
    expect(content).toContain("Provider limits");

    // Mode 3: Offline mode
    expect(content).toContain("Offline Mode");
    expect(content).toContain("Deterministic");
  });

  it("Assistant header displays active mode clearly", () => {
    expect(fs.existsSync(assistantPath)).toBe(true);
    const content = fs.readFileSync(assistantPath, "utf8");

    expect(content).toContain("AI Mode: BYO Key");
    expect(content).toContain("AI Mode: Local Ollama");
    expect(content).toContain("AI Mode: Offline");
    expect(content).toContain("Choose AI Setup");
  });

  it("README.md documents the 3 setups with hardware recommendations", () => {
    expect(fs.existsSync(readmePath)).toBe(true);
    const content = fs.readFileSync(readmePath, "utf8");

    expect(content).toContain("## 8. Choose Your AI Setup");
    expect(content).toContain("Local Ollama");
    expect(content).toContain("16 GB+ RAM");
    expect(content).toContain("7B model");
    expect(content).toContain("8 GB RAM");
    expect(content).toContain("1.5B model");
    expect(content).toContain("Bring-Your-Own Key");
    expect(content).toContain("sessionStorage");
    expect(content).toContain("Offline Mode");
  });
});
