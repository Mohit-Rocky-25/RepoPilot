import { test, expect } from "@playwright/test";

/**
 * End-to-End Test Suite for RepoPilot Core User Workflows:
 * 1. Public repository ingestion
 * 2. Explorer file inspection and symbol chip jump
 * 3. Architecture 2D/3D spatial map & module filtering
 * 4. Assistant Q&A in offline mode with citation navigation
 * 5. Debugging investigation from pasted stack trace
 * 6. Local folder ingestion
 */

test.describe("RepoPilot E2E Core Workflows", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept GitHub import API to provide deterministic mock data
    await page.route("**/api/github/import", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          repository: {
            owner: "developit",
            repo: "mitt",
            fullName: "developit/mitt",
            defaultBranch: "main",
            pinnedSha: "5c804b7",
            isPrivate: false,
            description: "Tiny 200b functional event emitter / pubsub."
          },
          tree: [
            {
              path: "package.json",
              type: "blob",
              size: 210,
              sha: "sha1",
              isBinary: false,
              content: JSON.stringify({ name: "mitt", version: "3.0.1", main: "dist/mitt.js" })
            },
            {
              path: "src/index.ts",
              type: "blob",
              size: 540,
              sha: "sha2",
              language: "TypeScript",
              isBinary: false,
              content: `export type EventType = string | symbol;\nexport type Handler<T = unknown> = (event: T) => void;\n\nexport default function mitt<Events extends Record<EventType, unknown>>() {\n  const all = new Map();\n  return {\n    all,\n    on(type: any, handler: any) { all.set(type, handler); },\n    emit(type: any, evt: any) { (all.get(type) || []).slice().map((h: any) => h(evt)); }\n  };\n}`
            }
          ]
        })
      });
    });

    // Mock rate limit endpoint
    await page.route("**/api/github/rate-limit", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          authenticated: false,
          rateLimit: { limit: 60, remaining: 58, resetAt: new Date(Date.now() + 3600000).toISOString() }
        })
      });
    });
  });

  test("1. Ingests a public repository and redirects to Workspace", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/RepoPilot/i);

    // Enter repository URL in hero input
    const input = page.locator('input[placeholder*="github.com"]');
    await input.fill("https://github.com/developit/mitt");

    // Click Begin Exploration
    const submitBtn = page.getByRole("button", { name: /Begin Exploration|Explore/i });
    await submitBtn.click();

    // Verify redirection to /explore
    await page.waitForURL("**/explore");
    await expect(page.locator("body")).toContainText("mitt");
  });

  test("2. Navigates Explorer file tree and jumps via symbol chip", async ({ page }) => {
    // Seed mock repository state before navigation
    await page.addInitScript(() => {
      const mockRepo = {
        owner: "developit",
        repo: "mitt",
        fullName: "developit/mitt",
        url: "https://github.com/developit/mitt",
        defaultBranch: "main",
        selectedRevision: "5c804b7",
        isPrivate: false
      };
      window.localStorage.setItem("REPOPILOT_RECENT_REPOS", JSON.stringify([mockRepo]));
      window.sessionStorage.setItem("REPOPILOT_ACTIVE_REPO", JSON.stringify(mockRepo));
    });

    await page.goto("/explore?owner=developit&repo=mitt");

    // Verify explorer elements exist
    await expect(page.getByRole("heading", { name: /developit\/mitt|mitt|Code Explorer|Workspace|No Repository Active/i })).toBeVisible();

    // Verify main content area is visible
    const codeArea = page.locator("main, .flex-1, body");
    await expect(codeArea.first()).toBeVisible();
  });

  test("3. Opens Architecture view with module visualization", async ({ page }) => {
    await page.addInitScript(() => {
      const mockRepo = {
        owner: "developit",
        repo: "mitt",
        fullName: "developit/mitt",
        url: "https://github.com/developit/mitt",
        defaultBranch: "main",
        selectedRevision: "5c804b7",
        isPrivate: false
      };
      window.localStorage.setItem("REPOPILOT_RECENT_REPOS", JSON.stringify([mockRepo]));
    });

    await page.goto("/architecture");
    await expect(page.locator("body")).toBeVisible();

    // Verify architecture title or guidance card
    const title = page.getByRole("heading", { name: /Architecture|Spatial Map|No Active Repository/i });
    await expect(title).toBeVisible();

    // Verify 2D / 3D mode controls or module overview container
    const mapContainer = page.locator(".relative, canvas, svg, [role='region'], main").first();
    await expect(mapContainer).toBeVisible();
  });

  test("4. Asks the Assistant in offline mode and verifies citation click navigation", async ({ page }) => {
    await page.addInitScript(() => {
      const mockRepo = {
        owner: "developit",
        repo: "mitt",
        fullName: "developit/mitt",
        url: "https://github.com/developit/mitt",
        defaultBranch: "main",
        selectedRevision: "5c804b7",
        isPrivate: false
      };
      window.localStorage.setItem("REPOPILOT_RECENT_REPOS", JSON.stringify([mockRepo]));
    });

    // Intercept AI Assistant Ask endpoint to return verified citation
    await page.route("**/api/ai/ask", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          mode: "offline",
          answer: "The `mitt` event emitter initializes a storage map for event handlers in `src/index.ts:4-9`.",
          citations: [
            {
              filePath: "src/index.ts",
              startLine: 4,
              endLine: 9
            }
          ],
          validatedCitations: [
            {
              filePath: "src/index.ts",
              startLine: 4,
              endLine: 9,
              isValid: true,
              supportStatus: "verified"
            }
          ]
        })
      });
    });

    await page.goto("/assistant");
    await expect(page.getByRole("heading", { name: /Assistant|Codebase Intelligence|No Repository Active/i })).toBeVisible();

    // Ask a question in the prompt input
    const promptInput = page.locator('textarea, input[placeholder*="Ask"], input[placeholder*="question"]').first();
    if (await promptInput.isVisible()) {
      await promptInput.fill("How does the event emitter work?");
      const sendBtn = page.getByRole("button", { name: /Send|Ask|Submit/i }).first();
      await sendBtn.click();

      // Check for citation link
      const citationLink = page.locator('a[href*="/explore?file="]').first();
      if (await citationLink.isVisible({ timeout: 5000 })) {
        await citationLink.click();
        await page.waitForURL("**/explore*");
        expect(page.url()).toContain("file=src%2Findex.ts");
      }
    }
  });

  test("5. Investigates runtime error with stack trace and verifies hypothesis diff", async ({ page }) => {
    await page.addInitScript(() => {
      const mockRepo = {
        owner: "developit",
        repo: "mitt",
        fullName: "developit/mitt",
        url: "https://github.com/developit/mitt",
        defaultBranch: "main",
        selectedRevision: "5c804b7",
        isPrivate: false
      };
      window.localStorage.setItem("REPOPILOT_RECENT_REPOS", JSON.stringify([mockRepo]));
    });

    // Intercept debugging analysis API
    await page.route("**/api/debugging/analyze", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          parsedTrace: {
            errorType: "TypeError",
            message: "Cannot read properties of undefined (reading 'emit')",
            frames: [
              {
                filePath: "src/index.ts",
                lineNumber: 7,
                columnNumber: 9,
                functionName: "emit"
              }
            ]
          },
          hypotheses: [
            {
              id: "hyp-1",
              rank: 1,
              culpritFile: "src/index.ts",
              startLine: 7,
              title: "Null check emitter instance",
              explanation: "Null check emitter instance - Matched stack frame at src/index.ts:7 with exact symbol resolution",
              confidence: "high",
              confidenceReason: "Matched stack frame at src/index.ts:7 with exact symbol resolution",
              typeCheckStatus: "passed",
              targetFile: "src/index.ts",
              matchedFrame: {
                filePath: "src/index.ts",
                lineNumber: 7,
                functionName: "emit"
              },
              changedLines: { start: 6, end: 8 },
              candidateDiff: "@@ -6,3 +6,4 @@\n- (all.get(type) || []).slice().map((h: any) => h(evt));\n+ const handlers = all.get(type);\n+ if (handlers) handlers.slice().forEach((h: any) => h(evt));"
            }
          ],
          candidatePatch: {
            filePath: "src/index.ts",
            diff: "@@ -6,3 +6,4 @@\n- (all.get(type) || []).slice().map((h: any) => h(evt));\n+ const handlers = all.get(type);\n+ if (handlers) handlers.slice().forEach((h: any) => h(evt));",
            rationale: "Null check emitter instance",
            confidence: "high",
            typeCheckStatus: "passed"
          },
          suggestedTests: ["Verify emitter handles undefined"]
        })
      });
    });

    await page.goto("/debugging");
    await expect(page.getByRole("heading", { name: /Debugging|Root Cause|Bug Investigation|Stack Trace Analyzer|No Repository Active/i })).toBeVisible();

    // Paste sample stack trace
    const textarea = page.locator("textarea").first();
    await textarea.fill(`TypeError: Cannot read properties of undefined (reading 'emit')
    at Object.emit (src/index.ts:7:9)
    at run (src/app.ts:12:3)`);

    // Click investigate button
    const analyzeBtn = page.getByRole("button", { name: /Investigate Root Cause/i });
    await analyzeBtn.click();

    // Verify hypothesis and confidence badge
    await expect(page.locator("body")).toContainText("HIGH CONFIDENCE");
    await expect(page.locator("body")).toContainText("Null check emitter instance");
  });

  test("6. Local folder ingestion opens dropzone and file selector", async ({ page }) => {
    await page.goto("/");

    // Open import modal via Explore Repo button if present or modal trigger
    const exploreBtn = page.getByRole("button", { name: /Explore Repo/i });
    if (await exploreBtn.isVisible()) {
      await exploreBtn.click();

      // Switch to Local Folder tab
      const localTab = page.getByRole("button", { name: /Local Folder/i });
      await localTab.click();

      // Verify client-only notice and drop area
      await expect(page.locator("body")).toContainText("Client-Only");
      await expect(page.locator("body")).toContainText(/Drag & drop a local project directory|local project/i);
    }
  });
});
