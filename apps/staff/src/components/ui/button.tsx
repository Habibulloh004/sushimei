import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer uppercase tracking-tight [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-red-600 text-white hover:bg-red-700 shadow-[0_12px_30px_rgba(220,38,38,0.25)] active:scale-95 active:shadow-none",
        primary:
          "bg-red-600 text-white hover:bg-red-700 shadow-[0_12px_30px_rgba(220,38,38,0.25)] active:scale-95 active:shadow-none",
        secondary:
          "bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950 hover:opacity-90 active:scale-95 shadow-lg shadow-black/10",
        outline:
          "border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white hover:bg-stone-50 dark:hover:bg-stone-900 active:scale-95",
        ghost:
          "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900 active:scale-95",
        destructive:
          "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30",
        link: "text-red-600 underline-offset-4 hover:underline"
      },
      size: {
        default: "px-7 py-3 text-sm font-semibold tracking-wide",
        md: "px-7 py-3 text-sm font-semibold tracking-wide",
        sm: "px-4 py-2 text-xs uppercase tracking-widest font-bold",
        lg: "px-10 py-4 text-base font-bold tracking-tight",
        icon: "p-2.5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    isLoading?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  if (asChild) {
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </Comp>
  );
}

export { Button, buttonVariants };
