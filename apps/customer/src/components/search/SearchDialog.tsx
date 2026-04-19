"use client";

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Search, X, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useCart } from '@/lib/cart-context';
import { Product, Category } from '@/lib/api';
import { getName, getSafeName, getSafeDescription } from '@/lib/helpers';
import { formatPrice } from '@/lib/format';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from 'sonner';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  categories: Category[];
  onProductSelect: (product: Product) => void;
}

export function SearchDialog({ open, onOpenChange, products, categories, onProductSelect }: SearchDialogProps) {
  const { addToCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debouncedQuery = useDebounce(searchQuery, 150);

  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const query = debouncedQuery.trim().toLowerCase();
    return products.filter((product) => {
      const name = getName(product.name_i18n).toLowerCase();
      const description = getName(product.description_i18n).toLowerCase();
      const tags = (product.tags || []).join(' ').toLowerCase();
      return name.includes(query) || description.includes(query) || tags.includes(query);
    }).slice(0, 20);
  }, [products, debouncedQuery]);

  const handleCategoryClick = (categoryId: string) => {
    handleClose();
    router.push(`/menu?category=${categoryId}`);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-[2rem] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 shadow-2xl h-[min(82vh,720px)] flex flex-col gap-0 [&>[data-slot=dialog-close]]:hidden [&_[data-slot=dialog-close]]:hidden">
        <DialogTitle className="sr-only">Search Menu</DialogTitle>

        {/* Search input */}
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6 flex-none border-b border-stone-100 dark:border-stone-900">
          <div className="flex-1 flex items-center gap-3 h-12 sm:h-14 px-4 bg-stone-100 dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100 dark:focus-within:ring-red-900/30 transition-all">
            <Search className="w-5 h-5 text-stone-400 flex-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu..."
              autoFocus
              className="flex-1 text-base bg-transparent outline-none placeholder:text-stone-300 dark:placeholder:text-stone-600"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                className="p-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800"
                type="button"
              >
                <X className="w-4 h-4 text-stone-400" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 sm:justify-start">
            <button
              onClick={handleClose}
              className="inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-black text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-800 dark:hover:bg-stone-900 dark:hover:text-stone-100"
              type="button"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {!searchQuery.trim() ? (
            <div className="px-5 pt-5 space-y-5 pb-8">
              {categories.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-3">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.slice(0, 8).map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.id)}
                        className="px-4 py-2.5 bg-stone-100 dark:bg-stone-900 rounded-2xl text-xs font-black uppercase tracking-widest text-stone-600 dark:text-stone-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 transition-colors"
                      >
                        {getName(cat.name_i18n)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={() => { handleClose(); router.push('/menu'); }}
                className="text-xs font-black uppercase tracking-widest text-red-600 hover:text-red-700 transition-colors"
              >
                Browse Full Menu →
              </button>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-stone-100 dark:bg-stone-900 rounded-full flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-stone-300 dark:text-stone-600" />
              </div>
              <p className="text-sm font-black tracking-tight">No results for &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-xs text-stone-400 mt-1">Try a different keyword</p>
            </div>
          ) : (
            <div className="pb-8">
              <div className="px-5 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </p>
              </div>
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    handleClose();
                    onProductSelect(item);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    handleClose();
                    onProductSelect(item);
                  }}
                  className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-900/50"
                  role="button"
                  tabIndex={0}
                >
                  <div className="w-14 h-14 rounded-[1rem] overflow-hidden flex-none bg-stone-100 dark:bg-stone-800">
                    <ImageWithFallback
                      src={item.image_url || ''}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black tracking-tight truncate">{getSafeName(item.name_i18n)}</h4>
                    <p className="text-xs text-stone-400 truncate mt-0.5">{getSafeDescription(item.description_i18n)}</p>
                    <span className="text-sm font-black text-red-600 mt-1 block">{formatPrice(item.base_price)}</span>
                  </div>
                  <motion.button
                    className="h-10 w-10 rounded-2xl bg-red-600 text-white flex items-center justify-center flex-none shadow-lg shadow-red-600/30"
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(item, 1);
                      toast.success('Added to cart', { description: getSafeName(item.name_i18n) });
                    }}
                    type="button"
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
