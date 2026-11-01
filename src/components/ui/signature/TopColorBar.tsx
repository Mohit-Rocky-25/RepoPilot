import React from "react";

export interface TopColorBarProps {
  className?: string;
  height?: string;
}

/**
 * Signature 4-color top bar (Blue, Red, Yellow, Green)
 * Equal 25% width segments reflecting Google / GDG developer platform identity.
 */
export const TopColorBar: React.FC<TopColorBarProps> = ({
  className = "",
  height = "h-[3.5px]"
}) => {
  return (
    <div
      aria-hidden="true"
      className={`w-full ${height} flex shrink-0 select-none overflow-hidden ${className}`}
    >
      <div className="w-1/4 h-full bg-[#1A73E8]" />
      <div className="w-1/4 h-full bg-[#EA4335]" />
      <div className="w-1/4 h-full bg-[#FBBC04]" />
      <div className="w-1/4 h-full bg-[#34A853]" />
    </div>
  );
};
