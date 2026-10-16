import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ icon, rightElement, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-[#62666D] pointer-events-none shrink-0">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-[#0F1011] border border-[#34343A] text-[#F7F8F8] placeholder:text-[#62666D] text-sm rounded-lg px-3 py-2 transition-all duration-150 focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/50 disabled:opacity-50 disabled:bg-[#141516] ${
              icon ? "pl-9" : ""
            } ${rightElement ? "pr-10" : ""} ${
              error ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/40" : ""
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center shrink-0">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-[#EF4444] font-mono">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
