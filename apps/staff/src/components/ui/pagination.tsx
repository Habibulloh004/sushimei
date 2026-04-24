import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "./button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
  className?: string;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className
}: PaginationProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-stone-100 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50 ${className ?? ""}`}
    >
      <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">
        Showing <span className="text-stone-900 dark:text-stone-100">{start}</span> to{" "}
        <span className="text-stone-900 dark:text-stone-100">{end}</span> of{" "}
        <span className="text-stone-900 dark:text-stone-100">{totalItems}</span> results
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1">
          {[...Array(Math.min(totalPages, 5))].map((_, i) => (
            <button
              key={i}
              onClick={() => onPageChange(i + 1)}
              className={`h-9 w-9 rounded-xl text-xs font-black transition-all ${
                currentPage === i + 1
                  ? "bg-[#5775FF] text-white shadow-lg shadow-[#5775FF]/20"
                  : "text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              {i + 1}
            </button>
          ))}
          {totalPages > 5 ? <MoreHorizontal className="w-4 h-4 text-stone-400 mx-1" /> : null}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export { Pagination };
