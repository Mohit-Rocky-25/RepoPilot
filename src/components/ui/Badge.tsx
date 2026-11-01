import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "neutral" | "primary" | "cyan" | "success" | "warning" | "danger" | "violet";
  size?: "sm" | "md";
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "sm",
  className = "",
  icon
}) => {
  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 font-mono tracking-tight",
    md: "text-xs px-2.5 py-1 font-mono tracking-tight"
  };

  const variantStyles = {
    neutral: "bg-theme-surface-alt text-theme-text-muted border border-theme-border",
    primary: "bg-theme-blue-surface text-theme-blue border border-theme-blue/30",
    cyan: "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40",
    success: "bg-theme-green-surface text-theme-green-text border border-theme-green/30",
    warning: "bg-theme-warning-surface text-theme-warning-text border border-theme-yellow/30",
    danger: "bg-theme-danger-surface text-theme-danger-text border border-theme-red/30",
    violet: "bg-theme-purple-surface text-theme-purple border border-theme-purple/30"
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-[4px] select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
