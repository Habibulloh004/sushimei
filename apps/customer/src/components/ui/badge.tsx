import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
  {
    variants: {
      variant: {
        default:
          "bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800/50 dark:text-stone-400 dark:border-stone-700",
        neutral:
          "bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800/50 dark:text-stone-400 dark:border-stone-700",
        secondary:
          "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
        success:
          "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
        warning:
          "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
        error:
          "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
        info:
          "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
        destructive:
          "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
        outline:
          "bg-transparent text-foreground border-stone-300 dark:border-stone-700"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
