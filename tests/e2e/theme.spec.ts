import { test, expect } from "@playwright/test";

test.describe("Google/GDG Theme System & Zero-Flash Persistence Specs", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test to simulate first-time visitors
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
      } catch (e) {}
    });
  });

  test("1. Fresh visit on machine with prefers-color-scheme: dark still defaults to Light theme", async ({ page }) => {
    // Emulate OS dark mode
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    // Verify HTML root attribute & CSS color-scheme
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");

    const colorScheme = await html.evaluate((el) => el.style.colorScheme);
    expect(colorScheme).toBe("light");

    // Top color bar should be visible
    const topBar = page.locator('div[aria-hidden="true"]').first();
    await expect(topBar).toBeVisible();
  });

  test("2. Zero FOUC: inline head script sets data-theme synchronously before rendering body", async ({ page }) => {
    // Seed dark theme into localStorage before document navigation
    await page.addInitScript(() => {
      window.localStorage.setItem("repopilot-theme", "dark");
    });

    await page.goto("/");

    // Even before any user interaction, data-theme should immediately be dark
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");
  });

  test("3. Selecting Dark via ThemeSwitcher sets html[data-theme='dark'] and persists across reload", async ({ page }) => {
    await page.goto("/");

    // Find and click the Dark option in ThemeSwitcher
    const darkBtn = page.locator('button[role="radio"][aria-label="Dark theme"]');
    await expect(darkBtn).toBeVisible();
    await darkBtn.click();

    // Verify DOM and storage
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const stored = await page.evaluate(() => window.localStorage.getItem("repopilot-theme"));
    expect(stored).toBe("dark");

    // Reload page
    await page.reload();

    // Verify persistent state
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(darkBtn).toHaveAttribute("aria-checked", "true");
  });

  test("4. Selecting Light via ThemeSwitcher sets html[data-theme='light'] and persists across reload", async ({ page }) => {
    // Pre-set dark mode
    await page.addInitScript(() => {
      window.localStorage.setItem("repopilot-theme", "dark");
    });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Click Light option
    const lightBtn = page.locator('button[role="radio"][aria-label="Light theme"]');
    await lightBtn.click();

    // Verify DOM and storage
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const stored = await page.evaluate(() => window.localStorage.getItem("repopilot-theme"));
    expect(stored).toBe("light");

    // Reload page
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(lightBtn).toHaveAttribute("aria-checked", "true");
  });

  test("5. Selecting System mode dynamically synchronizes with OS preference changes", async ({ page }) => {
    // Emulate light OS initially
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    // Click System mode
    const systemBtn = page.locator('button[role="radio"][aria-label="System theme"]');
    await systemBtn.click();

    const stored = await page.evaluate(() => window.localStorage.getItem("repopilot-theme"));
    expect(stored).toBe("system");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // Now change OS preference to dark
    await page.emulateMedia({ colorScheme: "dark" });

    // HTML data-theme must update dynamically to dark
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Switch OS preference back to light
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("6. ThemeSwitcher accessibility & keyboard navigation", async ({ page }) => {
    await page.goto("/");

    const radiogroup = page.locator('div[role="radiogroup"][aria-label="Theme selection"]');
    await expect(radiogroup).toBeVisible();

    const lightBtn = page.locator('button[role="radio"][aria-label="Light theme"]');
    const darkBtn = page.locator('button[role="radio"][aria-label="Dark theme"]');
    const systemBtn = page.locator('button[role="radio"][aria-label="System theme"]');

    // Focus the radiogroup button
    await lightBtn.focus();
    await expect(lightBtn).toBeFocused();

    // ArrowRight navigates to Dark
    await page.keyboard.press("ArrowRight");
    await expect(darkBtn).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(darkBtn).toHaveAttribute("aria-checked", "true");

    // ArrowRight navigates to System
    await page.keyboard.press("ArrowRight");
    await expect(systemBtn).toBeFocused();
    await expect(systemBtn).toHaveAttribute("aria-checked", "true");

    // ArrowLeft navigates back to Dark
    await page.keyboard.press("ArrowLeft");
    await expect(darkBtn).toBeFocused();
    await expect(darkBtn).toHaveAttribute("aria-checked", "true");
  });

  test("7. Cross-tab synchronization via storage events", async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto("/");
    await page2.goto("/");

    await expect(page1.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page2.locator("html")).toHaveAttribute("data-theme", "light");

    // Change to Dark on Page 1
    const darkBtn1 = page1.locator('button[role="radio"][aria-label="Dark theme"]');
    await darkBtn1.click();

    await expect(page1.locator("html")).toHaveAttribute("data-theme", "dark");

    // Page 2 should automatically receive storage event and update to Dark
    await expect(page2.locator("html")).toHaveAttribute("data-theme", "dark");

    await page1.close();
    await page2.close();
  });

  test("8. Settings page appearance section features ThemeSwitcher", async ({ page }) => {
    await page.goto("/settings");

    // Appearance section with theme description
    await expect(page.locator("text=Theme & Appearance")).toBeVisible();
    await expect(page.locator("text=Choose between Google developer-light")).toBeVisible();

    // Toggle theme in Settings page
    const darkBtn = page.locator('button[role="radio"][aria-label="Dark theme"]');
    await darkBtn.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

