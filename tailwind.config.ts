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
        linear: {
          canvas: "#010102",
          surface1: "#0F1011",
          surface2: "#141516",
          surface3: "#18191A",
          surface4: "#191A1B",
          accent: "#5E6AD2",
          accentHover: "#828FFF",
          textMain: "#F7F8F8",
          textSecondary: "#D0D6E0",
          textMuted: "#8A8F98",
          textTertiary: "#62666D",
          borderSubtle: "#23252A",
          borderDefault: "#34343A",
          borderStrong: "#3E3E44",
          success: "#27A644",
          warning: "#F59E0B",
          danger: "#EF4444"
        },
        console: {
          bg: "#010102",
          surface: "#0F1011",
          subtle: "#141516",
          elevated: "#18191A",
          border: "#23252A",
          borderHover: "#34343A",
          text: "#F7F8F8",
          muted: "#8A8F98",
          dim: "#62666D",
          accent: "#5E6AD2",
          accentHover: "#828FFF",
          violet: "#5E6AD2",
          success: "#27A644",
          warning: "#F59E0B",
          danger: "#EF4444"
        }
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "16px"
      },
      fontFamily: {
        sans: ["Inter", "Geist Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Geist Mono", "SFMono-Regular", "Menlo", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
