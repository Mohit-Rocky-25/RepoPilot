import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "packages/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["packages/*/src/**/*.ts", "src/lib/**/*.ts"],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@repopilot/core": path.resolve(__dirname, "./packages/core/src/index.ts"),
      "@repopilot/github": path.resolve(__dirname, "./packages/github/src/index.ts"),
      "@repopilot/indexer": path.resolve(__dirname, "./packages/indexer/src/index.ts"),
      "@repopilot/search": path.resolve(__dirname, "./packages/search/src/index.ts"),
      "@repopilot/analysis": path.resolve(__dirname, "./packages/analysis/src/index.ts"),
      "@repopilot/ai": path.resolve(__dirname, "./packages/ai/src/index.ts"),
      "@repopilot/debugging": path.resolve(__dirname, "./packages/debugging/src/index.ts"),
      "@repopilot/storage": path.resolve(__dirname, "./packages/storage/src/index.ts")
    }
  }
});
