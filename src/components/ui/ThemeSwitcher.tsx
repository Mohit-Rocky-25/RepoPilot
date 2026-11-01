"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import {
  ThemePreference,
  getStoredThemePreference,
  setStoredThemePreference,
  resolveActiveTheme,
  applyActiveThemeToDom,
  THEME_STORAGE_KEY
} from "@/lib/theme";

export interface ThemeSwitcherProps {
  className?: string;
  size?: "sm" | "md";
  showLabels?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className = "",
  size = "sm",
  showLabels = false
}) => {
  const [preference, setPreference] = useState<ThemePreference>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initialPref = getStoredThemePreference();
    setPreference(initialPref);
    const active = resolveActiveTheme(initialPref);
    applyActiveThemeToDom(active);

    // Cross-tab sync via storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) {
        const newPref = getStoredThemePreference();
        setPreference(newPref);
        applyActiveThemeToDom(resolveActiveTheme(newPref));
      }
    };

    // In-window custom event sync
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ preference: ThemePreference }>;
      if (customEvent.detail?.preference) {
        setPreference(customEvent.detail.preference);
      }
    };

    // System theme live update listener
    let mql: MediaQueryList | null = null;
    const handleSystemChange = () => {
      const current = getStoredThemePreference();
      if (current === "system") {
        applyActiveThemeToDom(resolveActiveTheme("system"));
      }
    };

    if (window.matchMedia) {
      mql = window.matchMedia("(prefers-color-scheme: dark)");
      if (mql.addEventListener) {
        mql.addEventListener("change", handleSystemChange);
      } else if ((mql as any).addListener) {
        (mql as any).addListener(handleSystemChange);
      }
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("repopilot-theme-change", handleThemeChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("repopilot-theme-change", handleThemeChange);
      if (mql) {
        if (mql.removeEventListener) {
          mql.removeEventListener("change", handleSystemChange);
        } else if ((mql as any).removeListener) {
          (mql as any).removeListener(handleSystemChange);
        }
      }
    };
  }, []);

  const handleSelect = (pref: ThemePreference) => {
    setPreference(pref);
    setStoredThemePreference(pref);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (index + 1) % options.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (index - 1 + options.length) % options.length;
    }

    if (nextIndex !== index) {
      const nextPref = options[nextIndex].value;
      handleSelect(nextPref);
      const buttons = e.currentTarget.parentElement?.querySelectorAll('button[role="radio"]');
      if (buttons && buttons[nextIndex]) {
        (buttons[nextIndex] as HTMLButtonElement).focus();
      }
    }
  };

  const options: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    {
      value: "light",
      label: "Light",
      icon: <Sun className="w-3.5 h-3.5 shrink-0" />
    },
    {
      value: "dark",
      label: "Dark",
      icon: <Moon className="w-3.5 h-3.5 shrink-0" />
    },
    {
      value: "system",
      label: "System",
      icon: <Laptop className="w-3.5 h-3.5 shrink-0" />
    }
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      className={`inline-flex items-center p-0.5 rounded-lg bg-theme-surface-alt border border-theme-border text-xs font-mono select-none ${className}`}
    >
      {options.map((opt, idx) => {
        const isSelected = mounted ? preference === opt.value : opt.value === "light";
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isSelected}
            aria-label={`${opt.label} theme`}
            title={`${opt.label} theme`}
            tabIndex={0}
            onClick={() => handleSelect(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-blue cursor-pointer ${
              isSelected
                ? "bg-theme-surface text-theme-text font-medium shadow-xs border border-theme-border"
                : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface/50 border border-transparent"
            } ${size === "sm" ? "text-[11px]" : "text-xs"}`}
          >
            <span
              className={
                isSelected
                  ? opt.value === "light"
                    ? "text-theme-yellow"
                    : "text-theme-blue"
                  : "text-theme-text-muted"
              }
            >
              {opt.icon}
            </span>
            {showLabels && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
};
