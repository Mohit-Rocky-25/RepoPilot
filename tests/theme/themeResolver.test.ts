import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  resolveActiveTheme,
  getStoredThemePreference,
  setStoredThemePreference,
  applyActiveThemeToDom,
  THEME_STORAGE_KEY,
  type ThemePreference
} from "../../src/lib/theme";

class MockLocalStorage {
  store: Record<string, string> = {};
  clear() {
    this.store = {};
  }
  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
}

describe("Theme Resolver & Persistence System", () => {
  let mockStorage: MockLocalStorage;
  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalLocalStorage = global.localStorage;

  let attributes: Record<string, string> = {};
  let colorSchemeStyle = "";

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    attributes = {};
    colorSchemeStyle = "";

    const mockDocument = {
      documentElement: {
        setAttribute: vi.fn((k: string, v: string) => {
          attributes[k] = v;
        }),
        getAttribute: vi.fn((k: string) => attributes[k] || null),
        removeAttribute: vi.fn((k: string) => {
          delete attributes[k];
        }),
        style: {
          get colorScheme() {
            return colorSchemeStyle;
          },
          set colorScheme(val: string) {
            colorSchemeStyle = val;
          }
        }
      }
    };

    const mockEventTarget = {
      listeners: {} as Record<string, Function[]>,
      addEventListener: vi.fn((event: string, fn: Function) => {
        if (!mockEventTarget.listeners[event]) mockEventTarget.listeners[event] = [];
        mockEventTarget.listeners[event].push(fn);
      }),
      removeEventListener: vi.fn((event: string, fn: Function) => {
        if (mockEventTarget.listeners[event]) {
          mockEventTarget.listeners[event] = mockEventTarget.listeners[event].filter(
            (f) => f !== fn
          );
        }
      }),
      dispatchEvent: vi.fn((event: any) => {
        const fns = mockEventTarget.listeners[event.type] || [];
        fns.forEach((f) => f(event));
        return true;
      }),
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    };

    // Attach to globals
    (global as any).window = mockEventTarget;
    (global as any).document = mockDocument;
    (global as any).localStorage = mockStorage;
    (global as any).CustomEvent = class {
      type: string;
      detail: any;
      constructor(type: string, opts?: any) {
        this.type = type;
        this.detail = opts?.detail;
      }
    };
  });

  afterEach(() => {
    (global as any).window = originalWindow;
    (global as any).document = originalDocument;
    (global as any).localStorage = originalLocalStorage;
  });

  describe("resolveActiveTheme", () => {
    it("returns 'light' when preference is 'light'", () => {
      expect(resolveActiveTheme("light")).toBe("light");
    });

    it("returns 'dark' when preference is 'dark'", () => {
      expect(resolveActiveTheme("dark")).toBe("dark");
    });

    it("defaults to 'light' for invalid or unknown preference strings", () => {
      // @ts-expect-error Testing invalid preference string
      expect(resolveActiveTheme("unknown")).toBe("light");
      // @ts-expect-error Testing null
      expect(resolveActiveTheme(null)).toBe("light");
      // @ts-expect-error Testing undefined
      expect(resolveActiveTheme(undefined)).toBe("light");
    });

    it("resolves system mode based on window.matchMedia", () => {
      // With matchMedia returning dark
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark"),
        media: query
      }));
      expect(resolveActiveTheme("system")).toBe("dark");

      // With matchMedia returning light
      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: false,
        media: ""
      }));
      expect(resolveActiveTheme("system")).toBe("light");
    });
  });

  describe("getStoredThemePreference", () => {
    it("defaults to 'light' when localStorage is empty", () => {
      expect(getStoredThemePreference()).toBe("light");
    });

    it("retrieves valid 'dark' preference", () => {
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
      expect(getStoredThemePreference()).toBe("dark");
    });

    it("retrieves valid 'system' preference", () => {
      localStorage.setItem(THEME_STORAGE_KEY, "system");
      expect(getStoredThemePreference()).toBe("system");
    });

    it("falls back to 'light' when localStorage has invalid value", () => {
      localStorage.setItem(THEME_STORAGE_KEY, "neon-cyberpunk");
      expect(getStoredThemePreference()).toBe("light");
    });

    it("gracefully falls back to 'light' if localStorage throws an error", () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error("SecurityError: Access denied");
      });

      expect(getStoredThemePreference()).toBe("light");

      localStorage.getItem = originalGetItem;
    });
  });

  describe("setStoredThemePreference", () => {
    it("stores valid preference and applies data-theme to documentElement", () => {
      const active = setStoredThemePreference("dark");
      expect(active).toBe("dark");
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.documentElement.style.colorScheme).toBe("dark");
    });

    it("switches back to light and updates DOM", () => {
      setStoredThemePreference("dark");
      const active = setStoredThemePreference("light");
      expect(active).toBe("light");
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.documentElement.style.colorScheme).toBe("light");
    });

    it("dispatches repopilot-theme-change custom event", () => {
      let eventPayload: any = null;
      const handler = (e: any) => {
        eventPayload = e.detail;
      };

      window.addEventListener("repopilot-theme-change", handler);
      setStoredThemePreference("dark");

      expect(eventPayload).toEqual({
        preference: "dark",
        active: "dark"
      });

      window.removeEventListener("repopilot-theme-change", handler);
    });

    it("handles storage write failure gracefully without throwing", () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      expect(() => setStoredThemePreference("light")).not.toThrow();
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");

      localStorage.setItem = originalSetItem;
    });
  });

  describe("applyActiveThemeToDom", () => {
    it("sets data-theme and style.colorScheme correctly", () => {
      applyActiveThemeToDom("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.documentElement.style.colorScheme).toBe("dark");

      applyActiveThemeToDom("light");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.documentElement.style.colorScheme).toBe("light");
    });
  });
});
