#!/usr/bin/env node

/**
 * Secret Scanner Script for RepoPilot
 * Scans the codebase for accidentally committed secrets, tokens, and private keys.
 */

const fs = require("fs");
const path = require("path");

const SECRET_PATTERNS = [
  { name: "GitHub Personal Access Token (classic)", regex: /ghp_[a-zA-Z0-9]{36}/ },
  { name: "GitHub Fine-Grained Personal Access Token", regex: /github_pat_[a-zA-Z0-9_]{82}/ },
  { name: "OpenAI Secret API Key", regex: /sk-[a-zA-Z0-9_-]{32,}/ },
  { name: "Private RSA/EC/SSH Key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "AWS Access Key ID", regex: /AKIA[0-9A-Z]{16}/ },
  { name: "Slack Webhook URL", regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/ },
  { name: "Discord Webhook URL", regex: /https:\/\/discord\.com\/api\/webhooks\/\d+\/[a-zA-Z0-9_-]+/ }
];

const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
  "artifacts"
]);

const IGNORED_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "securityControls.test.ts", // Contains synthetic/mock invalid secret strings for negative tests
  "modelProvider.test.ts"     // Contains synthetic/mock secret strings for redaction tests
]);

let violations = 0;

function scanFile(filePath) {
  const baseName = path.basename(filePath);
  if (IGNORED_FILES.has(baseName)) return;

  // Only scan text files
  const ext = path.extname(filePath).toLowerCase();
  const allowedExts = [".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".env", ".yaml", ".yml", ".sh"];
  if (!allowedExts.includes(ext) && baseName !== ".env.example") return;

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    // Skip test files or test fixtures mentioning dummy/synthetic keys
    if (line.includes("sk-super-secret") || line.includes("sk-test-") || line.includes("[REDACTED")) {
      return;
    }

    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(line)) {
        console.error(`🚨 SECRET DETECTED in ${filePath}:${idx + 1}`);
        console.error(`   Type: ${pattern.name}`);
        console.error(`   Line: ${line.trim().slice(0, 80)}...`);
        violations++;
      }
    }
  });
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        walkDir(path.join(dir, entry.name));
      }
    } else if (entry.isFile()) {
      scanFile(path.join(dir, entry.name));
    }
  }
}

console.log("🔍 Scanning codebase for credentials, tokens, and private keys...");
walkDir(path.resolve(__dirname, ".."));

if (violations > 0) {
  console.error(`\n❌ Secret scan failed: ${violations} potential credential leak(s) detected.`);
  process.exit(1);
} else {
  console.log("✅ Secret scan passed: No hardcoded credentials detected in repository source.");
  process.exit(0);
}
