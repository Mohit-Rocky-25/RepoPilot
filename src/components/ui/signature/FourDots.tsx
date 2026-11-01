import React from "react";

export interface FourDotsProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  animated?: boolean;
}

const DOT_SIZES = {
  xs: "w-1.5 h-1.5",
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3"
};

/**
 * Signature 4-dot cluster (Blue, Red, Yellow, Green)
 * Subtle accent motif for badges, hero sections, and active statuses.
 */
export const FourDots: React.FC<FourDotsProps> = ({
  className = "",
  size = "sm",
  animated = false
}) => {
  const dotSize = DOT_SIZES[size];
  const animClass = animated ? "animate-pulse" : "";

  return (
    <div
      aria-hidden="true"
      className={`inline-flex items-center gap-1.5 shrink-0 select-none ${className}`}
    >
      <span className={`${dotSize} rounded-full bg-[#1A73E8] ${animClass}`} />
      <span className={`${dotSize} rounded-full bg-[#EA4335] ${animClass}`} />
      <span className={`${dotSize} rounded-full bg-[#FBBC04] ${animClass}`} />
      <span className={`${dotSize} rounded-full bg-[#34A853] ${animClass}`} />
    </div>
  );
};
