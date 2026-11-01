/**
 * Theme Manager for RepoPilot
 *
 * Implements 3-tier theme resolution: Light (default), Dark, and System.
 * Guarantees Light theme by default even on dark OS unless System is explicitly chosen.
 * Enforces localStorage persistence under key "repopilot-theme" with try/catch safety.
 */

export type ThemePreference = "light" | "dark" | "system";
export type ActiveTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "repopilot-theme";

export function resolveActiveTheme(preference: ThemePreference): ActiveTheme {
  if (preference === "dark") {
    return "dark";
  }

  if (preference === "system") {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  }

  // Default is always light
  return "light";
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Storage access blocked (e.g. strict private mode or sandboxed iframe)
  }

  return "light";
}

export function setStoredThemePreference(preference: ThemePreference): ActiveTheme {
  const active = resolveActiveTheme(preference);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Storage access blocked
    }

    applyActiveThemeToDom(active);

    // Dispatch a custom event so other components in the same window re-render
    window.dispatchEvent(
      new CustomEvent("repopilot-theme-change", {
        detail: { preference, active }
      })
    );
  }

  return active;
}

export function applyActiveThemeToDom(active: ActiveTheme): void {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", active);
    document.documentElement.style.colorScheme = active;
  }
}
