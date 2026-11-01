import React from "react";

export type AccentColor = "blue" | "red" | "yellow" | "green" | "auto";

export interface AccentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: AccentColor;
  index?: number;
  interactive?: boolean;
}

const ACCENT_CLASS_ROTATION = ["bg-theme-blue", "bg-theme-red", "bg-theme-yellow", "bg-theme-green"] as const;
const ACCENT_CLASS_MAP: Record<"blue" | "red" | "yellow" | "green", string> = {
  blue: "bg-theme-blue",
  red: "bg-theme-red",
  yellow: "bg-theme-yellow",
  green: "bg-theme-green"
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
  let resolvedClass: string;

  if (accent !== "auto" && ACCENT_CLASS_MAP[accent]) {
    resolvedClass = ACCENT_CLASS_MAP[accent];
  } else if (typeof index === "number") {
    resolvedClass = ACCENT_CLASS_ROTATION[Math.abs(index) % ACCENT_CLASS_ROTATION.length];
  } else {
    resolvedClass = ACCENT_CLASS_ROTATION[globalAutoIndex % ACCENT_CLASS_ROTATION.length];
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
        className={`dark:hidden absolute left-0 top-0 bottom-0 w-1 pointer-events-none ${resolvedClass}`}
      />
      {children}
    </div>
  );
};
