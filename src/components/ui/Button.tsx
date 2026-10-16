import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
    "inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-[#5E6AD2] disabled:opacity-40 disabled:cursor-not-allowed select-none rounded-lg tracking-tight";

  const sizeStyles = {
    sm: "text-xs px-2.5 py-1.5 gap-1.5 h-8",
    md: "text-sm px-3.5 py-2 gap-2 h-9",
    lg: "text-base px-5 py-2.5 gap-2.5 h-11"
  };

  const variantStyles = {
    primary:
      "bg-[#5E6AD2] text-white font-medium hover:bg-[#828FFF] active:bg-[#4D58B4] shadow-[0_1px_2px_rgba(0,0,0,0.6),0_0_12px_rgba(94,106,210,0.35)] border border-[#6E7BE2]/40 active:scale-[0.98]",
    secondary:
      "bg-[#141516] hover:bg-[#18191A] text-[#F7F8F8] border border-[#34343A] hover:border-[#3E3E44] shadow-xs active:scale-[0.98]",
    outline:
      "bg-transparent text-[#D0D6E0] border border-[#34343A] hover:bg-[#141516] hover:text-[#F7F8F8] hover:border-[#3E3E44]",
    ghost:
      "bg-transparent text-[#8A8F98] hover:text-[#F7F8F8] hover:bg-[#18191A]",
    danger:
      "bg-red-950/20 text-[#EF4444] border border-red-900/40 hover:bg-red-950/40 hover:border-red-800/60"
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
