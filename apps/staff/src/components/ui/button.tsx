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
          "bg-[#5775FF] text-white hover:bg-[#3f5de0] shadow-[0_12px_30px_rgba(87,117,255,0.25)] active:scale-95 active:shadow-none",
        primary:
          "bg-[#5775FF] text-white hover:bg-[#3f5de0] shadow-[0_12px_30px_rgba(87,117,255,0.25)] active:scale-95 active:shadow-none",
        secondary:
          "bg-[#5775FF] text-white hover:bg-[#3f5de0] active:scale-95 shadow-lg shadow-[#5775FF]/20",
        outline:
          "bg-white border border-stone-200 text-stone-700 hover:bg-[#5775FF]/5 hover:border-[#5775FF]/40 hover:text-[#5775FF] active:scale-95",
        ghost:
          "text-stone-600 hover:bg-stone-100 active:scale-95",
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
