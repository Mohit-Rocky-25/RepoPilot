import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
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
            <div className="absolute left-3 text-theme-text-subtle pointer-events-none shrink-0">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full min-h-[44px] sm:min-h-[38px] bg-theme-surface border border-theme-border text-theme-text placeholder:text-theme-text-subtle text-base sm:text-sm rounded-lg px-3 py-2 transition-all duration-150 focus:outline-none focus:border-theme-blue focus:ring-2 focus:ring-theme-blue/30 disabled:opacity-50 disabled:bg-theme-surface-alt ${
              icon ? "pl-9" : ""
            } ${rightElement ? "pr-10" : ""} ${
              error
                ? "border-theme-red focus:border-theme-red focus:ring-theme-red/30"
                : ""
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
          <p className="mt-1 text-xs text-theme-danger-text font-mono">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
