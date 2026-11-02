import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Configuration for RepoPilot
 *
 * Configured with responsive mobile and tablet target devices:
 * - iPhone SE (375x667)
 * - iPhone 14 (390x844)
 * - Pixel 7 (412x915)
 * - Android 360px (360x800)
 * - iPad Portrait (768x1024)
 * - iPad Landscape (1024x768)
 * - Desktop Chrome (1280x720)
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["list"], ["json", { outputFile: "playwright-results.json" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    headless: true,
    defaultBrowserType: "chromium"
  },
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  },
  projects: process.env.CI
    ? [
        {
          name: "Desktop Chrome",
          use: { ...devices["Desktop Chrome"] }
        },
        {
          name: "iPhone 14",
          use: { ...devices["iPhone 14"], defaultBrowserType: "chromium" }
        }
      ]
    : [
        {
          name: "Desktop Chrome",
          use: { ...devices["Desktop Chrome"] }
        },
        {
          name: "iPhone SE",
          use: { ...devices["iPhone SE"], defaultBrowserType: "chromium" }
        },
        {
          name: "iPhone 14",
          use: { ...devices["iPhone 14"], defaultBrowserType: "chromium" }
        },
        {
          name: "Pixel 7",
          use: { ...devices["Pixel 7"] }
        },
        {
          name: "Android 360px",
          use: {
            viewport: { width: 360, height: 800 },
            userAgent:
              "Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
            isMobile: true,
            hasTouch: true
          }
        },
        {
          name: "iPad Portrait",
          use: {
            viewport: { width: 768, height: 1024 },
            userAgent:
              "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            isMobile: true,
            hasTouch: true
          }
        },
        {
          name: "iPad Landscape",
          use: {
            viewport: { width: 1024, height: 768 },
            userAgent:
              "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            isMobile: true,
            hasTouch: true
          }
        }
      ]
});
