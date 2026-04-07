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
          "w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all",
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
