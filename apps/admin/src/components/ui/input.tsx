import * as React from "react";

import { cn } from "./utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode;
  error?: React.ReactNode;
  containerClassName?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, containerClassName, id, ...props }, ref) => {
    const inputId =
      id ?? (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    const field = (
      <input
        ref={ref}
        type={type}
        id={inputId}
        data-slot="input"
        className={cn(
          "w-full h-11 rounded-xl border border-stone-200/90 dark:border-stone-700 bg-white/95 dark:bg-stone-900 px-4 text-sm font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 shadow-[0_1px_2px_rgba(12,10,9,0.05)] transition-all duration-200 hover:border-stone-300 dark:hover:border-stone-600 focus:outline-none focus:ring-4 focus:ring-red-500/12 focus:border-red-500/70 disabled:cursor-not-allowed disabled:opacity-60 file:h-8 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:text-xs file:font-bold file:tracking-wide file:text-red-700 file:cursor-pointer dark:file:bg-red-500/15 dark:file:text-red-200",
          className
        )}
        {...props}
      />
    );

    if (!label && !error) {
      return field;
    }

    return (
      <div className={cn("w-full space-y-1.5", containerClassName)}>
        {label ? (
          <label htmlFor={inputId} className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            {label}
          </label>
        ) : null}
        {field}
        {error ? <p className="text-xs text-red-500">{error}</p> : null}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
