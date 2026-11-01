import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "elevated" | "interactive";
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  className = "",
  ...props
}) => {
  const variantStyles = {
    default: "bg-theme-surface border-theme-border shadow-xs",
    subtle: "bg-theme-surface-alt border-theme-border-subtle",
    elevated: "bg-theme-surface border-theme-border shadow-md",
    interactive:
      "bg-theme-surface border-theme-border hover:border-theme-blue/40 hover:bg-theme-surface-alt hover:shadow-card-hover transition-all cursor-pointer"
  };

  return (
    <div
      className={`border rounded-xl transition-all duration-150 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
