import React from "react";

export type AccentColor = "blue" | "red" | "yellow" | "green" | "auto";

export interface AccentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: AccentColor;
  index?: number;
  interactive?: boolean;
}

const ACCENT_ROTATION = ["#1A73E8", "#EA4335", "#FBBC04", "#34A853"] as const;
const ACCENT_COLOR_MAP: Record<"blue" | "red" | "yellow" | "green", string> = {
  blue: "#1A73E8",
  red: "#EA4335",
  yellow: "#FBBC04",
  green: "#34A853"
};

let globalAutoIndex = 0;

/**
 * Signature AccentCard:
 * - Light Mode: Card with a 4px solid left accent bar rotating through Blue, Red, Yellow, Green.
 * - Dark Mode: Pristine original Obsidian card with subtle border and Linear violet hover state.
 */
export const AccentCard: React.FC<AccentCardProps> = ({
  children,
  accent = "auto",
  index,
  interactive = false,
  className = "",
  style,
  ...props
}) => {
  let resolvedColor: string;

  if (accent !== "auto" && ACCENT_COLOR_MAP[accent]) {
    resolvedColor = ACCENT_COLOR_MAP[accent];
  } else if (typeof index === "number") {
    resolvedColor = ACCENT_ROTATION[Math.abs(index) % ACCENT_ROTATION.length];
  } else {
    resolvedColor = ACCENT_ROTATION[globalAutoIndex % ACCENT_ROTATION.length];
    globalAutoIndex++;
  }

  return (
    <div
      className={`relative bg-theme-surface border border-theme-border rounded-xl shadow-xs overflow-hidden transition-all duration-150 ${
        interactive
          ? "hover:border-theme-blue/40 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer"
          : ""
      } ${className}`}
      style={style}
      {...props}
    >
      {/* Light Theme: 4px Google colored left accent bar */}
      <div
        className="dark:hidden absolute left-0 top-0 bottom-0 w-1 pointer-events-none"
        style={{ backgroundColor: resolvedColor }}
      />
      {children}
    </div>
  );
};
