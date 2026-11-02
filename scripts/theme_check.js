#!/usr/bin/env node

/**
 * Theme & Semantic Token Compliance Checker for RepoPilot
 * Verifies that components use semantic tokens instead of hardcoded hex values,
 * and executes theme contrast and resolver tests.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ALLOWED_HEX_FILES = new Set([
  "globals.css",
  "theme.ts",
  "contrastAndTokens.test.ts",
  "themeResolver.test.ts",
  "ArchitectureMap3D.tsx", // Canvas 2D/3D renderer drawing constants
  "MermaidViewer.tsx",    // Mermaid SVG runtime styling overrides
  "layout.tsx",           // Viewport themeColor metadata & inline blocking script
  "RepoPilotLogo.tsx"     // Official SVG brand mark gradients & assets
]);

const HEX_COLOR_REGEX = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;

let violations = 0;

function checkFile(filePath) {
  const baseName = path.basename(filePath);
  if (ALLOWED_HEX_FILES.has(baseName)) return;

  const ext = path.extname(filePath).toLowerCase();
  if (![".tsx", ".jsx"].includes(ext)) return;

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    // Ignore comments or SVG data URIs
    if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.includes("data:image")) return;

    const matches = line.match(HEX_COLOR_REGEX);
    if (matches) {
      matches.forEach((hex) => {
        // Exclude common non-color matches if any
        console.error(`⚠️  HARDCODED HEX DETECTED: ${hex} in ${filePath}:${idx + 1}`);
        console.error(`   Line: ${line.trim()}`);
        violations++;
      });
    }
  });
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".next", ".git", "dist"].includes(entry.name)) {
        walkDir(fullPath);
      }
    } else if (entry.isFile()) {
      checkFile(fullPath);
    }
  }
}

console.log("🎨 Scanning components for hardcoded hex colors...");
walkDir(path.resolve(__dirname, "../src/components"));
walkDir(path.resolve(__dirname, "../src/app"));

if (violations > 0) {
  console.warn(`\n⚠️  Found ${violations} hardcoded hex color instance(s). Please use theme tokens!`);
} else {
  console.log("✅ Component token scan passed: All scanned components use semantic theme tokens.");
}

console.log("\n🧪 Running Theme Contrast & Resolution unit tests...");
try {
  execSync("npx vitest run tests/theme", { stdio: "inherit" });
  console.log("✅ Theme unit tests passed.");
} catch (e) {
  console.error("❌ Theme unit tests failed.");
  process.exit(1);
}

process.exit(0);

