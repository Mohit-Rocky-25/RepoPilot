import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./packages/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: "var(--color-bg)",
          surface: "var(--color-surface)",
          "surface-alt": "var(--color-surface-alt)",
          border: "var(--color-border)",
          "border-subtle": "var(--color-border-subtle)",
          text: "var(--color-text)",
          "text-muted": "var(--color-text-muted)",
          "text-subtle": "var(--color-text-subtle)",
          blue: "var(--color-blue)",
          "blue-hover": "var(--color-blue-hover)",
          "blue-surface": "var(--color-blue-surface)",
          red: "var(--color-red)",
          "danger-text": "var(--color-danger-text)",
          "danger-surface": "var(--color-danger-surface)",
          yellow: "var(--color-yellow)",
          "warning-text": "var(--color-warning-text)",
          "warning-surface": "var(--color-warning-surface)",
          green: "var(--color-green)",
          "green-text": "var(--color-green-text)",
          "green-surface": "var(--color-green-surface)",
          purple: "var(--color-purple)",
          "purple-surface": "var(--color-purple-surface)",
          "code-bg": "var(--color-code-bg)",
          "code-text": "var(--color-code-text)",
          "code-comment": "var(--color-code-comment)"
        },
        linear: {
          canvas: "var(--linear-canvas)",
          surface1: "var(--linear-surface-1)",
          surface2: "var(--linear-surface-2)",
          surface3: "var(--linear-surface-3)",
          surface4: "var(--linear-surface-4)",
          accent: "var(--linear-accent)",
          accentHover: "var(--linear-accent-hover)",
          textMain: "var(--linear-text-main)",
          textSecondary: "var(--linear-text-secondary)",
          textMuted: "var(--linear-text-muted)",
          textTertiary: "var(--linear-text-tertiary)",
          borderSubtle: "var(--linear-border-subtle)",
          borderDefault: "var(--linear-border-default)",
          borderStrong: "var(--linear-border-strong)",
          success: "var(--linear-success)",
          warning: "var(--linear-warning)",
          danger: "var(--linear-danger)"
        },
        console: {
          bg: "var(--console-bg)",
          surface: "var(--console-surface)",
          subtle: "var(--console-subtle)",
          elevated: "var(--console-elevated)",
          border: "var(--console-border)",
          borderHover: "var(--console-border-hover)",
          text: "var(--console-text)",
          muted: "var(--console-muted)",
          dim: "var(--console-dim)",
          accent: "var(--console-accent)",
          accentHover: "var(--console-accent-hover)",
          violet: "var(--console-violet)",
          success: "var(--console-success)",
          warning: "var(--console-warning)",
          danger: "var(--console-danger)"
        }
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "9999px"
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Roboto",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ],
        mono: [
          "var(--font-mono)",
          "Roboto Mono",
          "JetBrains Mono",
          "SFMono-Regular",
          "Menlo",
          "monospace"
        ]
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(60, 64, 67, 0.08)",
        sm: "0 1px 3px 0 rgba(60, 64, 67, 0.12), 0 1px 2px 0 rgba(60, 64, 67, 0.06)",
        md: "0 4px 6px -1px rgba(60, 64, 67, 0.12), 0 2px 4px -1px rgba(60, 64, 67, 0.06)",
        lg: "0 10px 15px -3px rgba(60, 64, 67, 0.12), 0 4px 6px -2px rgba(60, 64, 67, 0.05)",
        card: "0 1px 3px 0 rgba(60, 64, 67, 0.1), 0 1px 2px 0 rgba(60, 64, 67, 0.06)",
        "card-hover": "0 4px 12px 0 rgba(60, 64, 67, 0.15)"
      }
    }
  },
  plugins: []
};

export default config;
