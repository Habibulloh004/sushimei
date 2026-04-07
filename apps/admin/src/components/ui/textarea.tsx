import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full resize-y rounded-xl border border-stone-200/90 dark:border-stone-700 bg-white/95 dark:bg-stone-900 px-4 py-3 text-sm font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 shadow-[0_1px_2px_rgba(12,10,9,0.05)] transition-all duration-200 hover:border-stone-300 dark:hover:border-stone-600 focus:outline-none focus:ring-4 focus:ring-red-500/12 focus:border-red-500/70 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
