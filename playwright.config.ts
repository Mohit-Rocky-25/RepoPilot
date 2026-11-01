import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Configuration for RepoPilot
 *
 * Configured for deterministic UI & workflow testing:
 * - Public repo ingestion
 * - Explorer navigation & symbol chips
 * - Architecture 2D/3D map
 * - Offline Assistant with citation jumps
 * - Stack trace debugging with confidence badges
 * - Local folder ingestion
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["json", { outputFile: "playwright-results.json" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    headless: true
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
