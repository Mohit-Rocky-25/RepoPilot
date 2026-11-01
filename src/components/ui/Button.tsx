import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "secondary",
  size = "md",
  isLoading = false,
  icon,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-theme-blue/40 disabled:opacity-40 disabled:cursor-not-allowed select-none rounded-lg tracking-tight min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0";

  const sizeStyles = {
    sm: "text-xs px-2.5 py-2 sm:py-1.5 gap-1.5 sm:h-8",
    md: "text-sm px-3.5 py-2.5 sm:py-2 gap-2 sm:h-9",
    lg: "text-base px-5 py-3 sm:py-2.5 gap-2.5 sm:h-11"
  };

  const variantStyles = {
    primary:
      "bg-theme-blue text-white font-medium hover:bg-theme-blue-hover shadow-xs active:scale-[0.98]",
    secondary:
      "bg-theme-surface hover:bg-theme-surface-alt text-theme-text border border-theme-border shadow-xs active:scale-[0.98]",
    outline:
      "bg-transparent text-theme-text border border-theme-border hover:bg-theme-surface-alt hover:text-theme-text",
    ghost:
      "bg-transparent text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-alt",
    danger:
      "bg-theme-danger-surface text-theme-danger-text border border-theme-red/30 hover:bg-theme-red/20"
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};
