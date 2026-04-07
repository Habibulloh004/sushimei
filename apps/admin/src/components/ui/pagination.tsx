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
  const safeTotalItems = Number.isFinite(totalItems) ? Math.max(0, Math.floor(totalItems)) : 0;
  const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 10;
  const metaTotalPages = Number.isFinite(totalPages) ? Math.floor(totalPages) : 0;
  const safeTotalPages = Math.max(1, metaTotalPages || Math.ceil(safeTotalItems / safePageSize) || 1);
  const rawCurrentPage = Number.isFinite(currentPage) ? Math.floor(currentPage) : 1;
  const safeCurrentPage = Math.min(Math.max(1, rawCurrentPage), safeTotalPages);
  const visiblePageCount = Math.max(1, Math.min(safeTotalPages, 5));

  let startPage = Math.max(1, safeCurrentPage - Math.floor(visiblePageCount / 2));
  let endPage = Math.min(safeTotalPages, startPage + visiblePageCount - 1);
  startPage = Math.max(1, endPage - visiblePageCount + 1);

  const visiblePages = Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);

  const start = safeTotalItems === 0 ? 0 : (safeCurrentPage - 1) * safePageSize + 1;
  const end = safeTotalItems === 0 ? 0 : Math.min(safeCurrentPage * safePageSize, safeTotalItems);

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
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1">
          {startPage > 1 ? (
            <button
              onClick={() => onPageChange(1)}
              className="h-9 w-9 rounded-xl text-xs font-black text-stone-500 transition-all hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              1
            </button>
          ) : null}
          {startPage > 2 ? <MoreHorizontal className="w-4 h-4 text-stone-400 mx-1" /> : null}
          {visiblePages.map((pageNumber) => (
            <button
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              className={`h-9 w-9 rounded-xl text-xs font-black transition-all ${
                safeCurrentPage === pageNumber
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                  : "text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              {pageNumber}
            </button>
          ))}
          {endPage < safeTotalPages - 1 ? <MoreHorizontal className="w-4 h-4 text-stone-400 mx-1" /> : null}
          {endPage < safeTotalPages ? (
            <button
              onClick={() => onPageChange(safeTotalPages)}
              className="h-9 w-9 rounded-xl text-xs font-black text-stone-500 transition-all hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              {safeTotalPages}
            </button>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= safeTotalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export { Pagination };
