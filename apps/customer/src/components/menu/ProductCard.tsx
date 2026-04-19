"use client";

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Product } from '@/lib/api';
import { useCart } from '@/lib/cart-context';
import { useOptionalProductDialog } from '@/lib/product-dialog-context';
import { getSafeName, getSafeDescription } from '@/lib/helpers';
import { formatPrice } from '@/lib/format';
import { PRODUCT_CARD_ADD_BUTTON_CLASS_NAME } from '@/lib/constants';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  variant?: 'featured' | 'grid';
  onSelect?: (product: Product) => void;
}

export function ProductCard({ product, variant = 'grid', onSelect }: ProductCardProps) {
  const { addToCart, addedToCartId } = useCart();
  const productDialog = useOptionalProductDialog();

  const handleClick = () => {
    if (onSelect) {
      onSelect(product);
      return;
    }

    productDialog?.openProduct(product);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleClick();
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
    toast.success('Added to cart', { description: getSafeName(product.name_i18n) });
  };

  if (variant === 'featured') {
    return (
      <motion.div
        key={product.id}
        whileHover={{ y: -12 }}
        className="group relative cursor-pointer"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-stone-100 shadow-lg transition-all duration-500 group-hover:shadow-3xl dark:bg-stone-900 sm:aspect-[3/4] sm:rounded-[2rem]">
          <ImageWithFallback
            src={product.image_url || ''}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 sm:left-6 sm:top-6 sm:gap-2">
            {product.tags?.slice(0, 2).map(tag => (
              <span key={tag} className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-white backdrop-blur-md sm:px-3 sm:py-1.5 sm:text-[9px]">
                {tag}
              </span>
            ))}
            {product.is_spicy && (
              <span className="rounded-full bg-red-600/80 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-white backdrop-blur-md sm:px-3 sm:py-1.5 sm:text-[9px]">
                Spicy
              </span>
            )}
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-2 transition-transform duration-500 group-hover:translate-y-0 sm:bottom-8 sm:left-8 sm:right-8 sm:gap-3 sm:translate-y-4">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="line-clamp-2 text-sm font-black tracking-tight text-white sm:text-base">{getSafeName(product.name_i18n)}</p>
              <p className="text-xs font-bold text-stone-300 sm:text-sm">{formatPrice(product.base_price)}</p>
            </div>
            <motion.button
              className={PRODUCT_CARD_ADD_BUTTON_CLASS_NAME}
              whileTap={{ scale: 0.85 }}
              animate={addedToCartId === product.id ? { scale: [1, 1.2, 1], backgroundColor: ['#dc2626', '#16a34a', '#16a34a'] } : {}}
              transition={{ duration: 0.4 }}
              onClick={handleAddToCart}
              type="button"
            >
              <AnimatePresence mode="wait">
                {addedToCartId === product.id ? (
                  <motion.span key="check" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.2 }}>
                    <Check className="h-5 w-5 sm:h-6 sm:w-6" />
                  </motion.span>
                ) : (
                  <motion.span key="plus" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.2 }}>
                    <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid variant
  return (
    <div
      className="group cursor-pointer rounded-[1.5rem] border border-stone-100 bg-white p-3 transition-all hover:shadow-2xl hover:shadow-stone-200/50 dark:border-stone-800 dark:bg-stone-900 dark:hover:shadow-black/50 sm:rounded-[2rem] sm:p-4 md:rounded-[2.5rem] md:p-5"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="relative mb-3 aspect-square overflow-hidden rounded-[1.2rem] sm:mb-4 sm:rounded-[1.4rem] md:mb-6 md:aspect-[4/3] md:rounded-[1.8rem]">
        <ImageWithFallback src={product.image_url || ''} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute left-2.5 top-2.5 flex gap-1.5 sm:left-4 sm:top-4 sm:gap-2">
          {product.tags?.slice(0, 2).map(t => <span key={t} className="rounded-lg bg-black/40 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-white backdrop-blur-md sm:rounded-xl sm:px-2.5 sm:py-1.5 sm:text-[9px]">{t}</span>)}
          {product.is_spicy && <span className="rounded-lg bg-red-600/80 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-white backdrop-blur-md sm:rounded-xl sm:px-2.5 sm:py-1.5 sm:text-[9px]">Spicy</span>}
        </div>
      </div>
      <div className="space-y-2 sm:space-y-3 md:space-y-4">
        <h4 className="min-h-[2.6rem] text-base font-black tracking-tight transition-colors line-clamp-2 group-hover:text-red-600 sm:min-h-[3rem] sm:text-lg md:min-h-[3.5rem] md:text-xl">{getSafeName(product.name_i18n)}</h4>
        <p className="hidden line-clamp-2 text-xs font-medium leading-relaxed text-stone-500 md:block">{getSafeDescription(product.description_i18n)}</p>
        <div className="flex items-center justify-between border-t border-stone-50 pt-3 dark:border-stone-800 sm:pt-4">
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-widest text-stone-400 sm:text-[9px]">Price</span>
            <span className="text-lg font-black tracking-tight sm:text-xl">{formatPrice(product.base_price)}</span>
          </div>
          <motion.button
            className={`${PRODUCT_CARD_ADD_BUTTON_CLASS_NAME} p-0 hover:bg-red-600 hover:shadow-xl active:shadow-xl`}
            whileTap={{ scale: 0.85 }}
            animate={addedToCartId === product.id ? { scale: [1, 1.2, 1], backgroundColor: ['#dc2626', '#16a34a', '#16a34a'] } : {}}
            transition={{ duration: 0.4 }}
            onClick={handleAddToCart}
            type="button"
          >
            <AnimatePresence mode="wait">
              {addedToCartId === product.id ? (
                <motion.span key="check" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.2 }}>
                  <Check className="h-5 w-5 sm:h-6 sm:w-6" />
                </motion.span>
              ) : (
                <motion.span key="plus" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.2 }}>
                  <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
