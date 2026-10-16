import React from "react";

interface BadgeProps {
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
    neutral: "bg-[#141516] text-[#8A8F98] border border-[#23252A]",
    primary: "bg-[#5E6AD2]/10 text-[#828FFF] border border-[#5E6AD2]/30",
    cyan: "bg-[#0284C7]/10 text-[#38BDF8] border border-[#0284C7]/30",
    success: "bg-[#27A644]/10 text-[#27A644] border border-[#27A644]/30",
    warning: "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30",
    danger: "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30",
    violet: "bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/30"
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
