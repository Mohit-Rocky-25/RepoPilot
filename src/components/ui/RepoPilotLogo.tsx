"use client";

import React from "react";

export interface RepoPilotLogoProps {
  /** Size variant or explicit pixel size */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  /** Visual display style */
  variant?: "mark" | "icon" | "full" | "monochrome";
  /** Optional subtitled version badge in "full" variant */
  showVersion?: boolean;
  version?: string;
  /** Enable subtle ambient glow behind the delta wing */
  withGlow?: boolean;
  /** Custom CSS classes */
  className?: string;
}

const SIZE_MAP = {
  xs: 16,
  sm: 20,
  md: 28,
  lg: 40,
  xl: 64
};

export const RepoPilotLogo: React.FC<RepoPilotLogoProps> = ({
  size = "md",
  variant = "mark",
  showVersion = false,
  version = "v1.0",
  withGlow = false,
  className = ""
}) => {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] || 28;

  // 1. Standalone Squircle App Icon
  if (variant === "icon") {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ width: pixelSize, height: pixelSize }}
      >
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 512 512"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="RepoPilot Logo"
        >
          <defs>
            <linearGradient id="rpi-bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0E131F" />
              <stop offset="100%" stopColor="#07090E" />
            </linearGradient>
            <radialGradient id="rpi-glow" cx="256" cy="240" r="220" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="rpi-left" x1="100" y1="80" x2="256" y2="360" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="rpi-right" x1="256" y1="80" x2="410" y2="360" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="rpi-keel" x1="256" y1="260" x2="256" y2="450" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
            <linearGradient id="rpi-core" x1="230" y1="198" x2="282" y2="250" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>

          <rect width="512" height="512" rx="116" fill="url(#rpi-bg)" />
          <rect x="1.5" y="1.5" width="509" height="509" rx="114.5" stroke="#1E283D" strokeWidth="3" />
          <circle cx="256" cy="240" r="200" fill="url(#rpi-glow)" />

          <path d="M256 68 L100 354 L208 322 L256 220 Z" fill="url(#rpi-left)" />
          <path d="M256 68 L256 220 L304 322 L412 354 Z" fill="url(#rpi-right)" />
          <path d="M256 266 L304 322 L256 444 L208 322 Z" fill="url(#rpi-keel)" />
          <circle cx="256" cy="220" r="26" fill="#FFFFFF" />
          <circle cx="256" cy="220" r="14" fill="url(#rpi-core)" />
          <circle cx="100" cy="354" r="12" fill="#60A5FA" />
          <circle cx="100" cy="354" r="5" fill="#FFFFFF" />
          <circle cx="412" cy="354" r="12" fill="#93C5FD" />
          <circle cx="412" cy="354" r="5" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  // 2. Monochrome Vector Mark (Uses currentColor)
  if (variant === "monochrome") {
    return (
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        role="img"
        aria-label="RepoPilot Mark"
      >
        <path d="M256 68 L100 354 L208 322 L256 220 Z" fill="currentColor" opacity="0.8" />
        <path d="M256 68 L256 220 L304 322 L412 354 Z" fill="currentColor" opacity="1" />
        <path d="M256 266 L304 322 L256 444 L208 322 Z" fill="currentColor" opacity="0.6" />
        <circle cx="256" cy="220" r="24" fill="currentColor" />
        <circle cx="100" cy="354" r="10" fill="currentColor" opacity="0.8" />
        <circle cx="412" cy="354" r="10" fill="currentColor" opacity="0.8" />
      </svg>
    );
  }

  // 3. Pure Vector Mark (Default transparent mark)
  const markElement = (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="RepoPilot Mark"
    >
      <defs>
        <linearGradient id="rpm-left" x1="100" y1="80" x2="256" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="rpm-right" x1="256" y1="80" x2="410" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="rpm-keel" x1="256" y1="260" x2="256" y2="450" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="rpm-core" x1="230" y1="198" x2="282" y2="250" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        {withGlow && (
          <filter id="rpm-glow" x="40" y="30" width="432" height="432" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="6" stdDeviation="14" floodColor="#3B82F6" floodOpacity="0.35" />
          </filter>
        )}
      </defs>

      <g filter={withGlow ? "url(#rpm-glow)" : undefined}>
        <path d="M256 68 L100 354 L208 322 L256 220 Z" fill="url(#rpm-left)" />
        <path d="M256 68 L256 220 L304 322 L412 354 Z" fill="url(#rpm-right)" />
        <path d="M256 266 L304 322 L256 444 L208 322 Z" fill="url(#rpm-keel)" />
        <circle cx="256" cy="220" r="26" fill="#FFFFFF" />
        <circle cx="256" cy="220" r="14" fill="url(#rpm-core)" />
        <circle cx="100" cy="354" r="12" fill="#60A5FA" />
        <circle cx="100" cy="354" r="5" fill="#FFFFFF" />
        <circle cx="412" cy="354" r="12" fill="#93C5FD" />
        <circle cx="412" cy="354" r="5" fill="#FFFFFF" />
      </g>
    </svg>
  );

  // 4. Full Brand Lockup (Mark + Premium Wordmark + Version Badge)
  if (variant === "full") {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        {markElement}
        <div className="flex items-center gap-1.5 font-sans">
          <span className="font-bold text-sm tracking-tight text-theme-text font-mono">
            RepoPilot
          </span>
          {showVersion && (
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-theme-surface-alt text-theme-text-muted border border-theme-border">
              {version}
            </span>
          )}
        </div>
      </div>
    );
  }

  return markElement;
};
