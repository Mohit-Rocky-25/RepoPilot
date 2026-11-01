import React from "react";

export interface TopColorBarProps {
  className?: string;
  height?: string;
}

/**
 * Signature 4-color top bar (Blue, Red, Yellow, Green)
 * Equal 25% width segments reflecting Google / GDG developer platform identity in Light Mode.
 * Automatically hidden in Dark Mode to preserve the original sleek Obsidian dark theme.
 */
export const TopColorBar: React.FC<TopColorBarProps> = ({
  className = "",
  height = "h-[3.5px]"
}) => {
  return (
    <div
      aria-hidden="true"
      className={`w-full ${height} flex shrink-0 select-none overflow-hidden dark:hidden ${className}`}
    >
      <div className="w-1/4 h-full bg-theme-blue" />
      <div className="w-1/4 h-full bg-theme-red" />
      <div className="w-1/4 h-full bg-theme-yellow" />
      <div className="w-1/4 h-full bg-theme-green" />
    </div>
  );
};
