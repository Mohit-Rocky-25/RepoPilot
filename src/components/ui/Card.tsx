import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "elevated" | "interactive";
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  className = "",
  ...props
}) => {
  const variantStyles = {
    default: "bg-[#0F1011] border-[#23252A] shadow-[0_1px_2px_rgba(0,0,0,0.6)]",
    subtle: "bg-[#141516] border-[#23252A]",
    elevated: "bg-[#18191A] border-[#34343A] shadow-[0_4px_16px_rgba(0,0,0,0.7)]",
    interactive: "bg-[#0F1011] border-[#23252A] hover:border-[#34343A] hover:bg-[#141516] transition-colors cursor-pointer"
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
