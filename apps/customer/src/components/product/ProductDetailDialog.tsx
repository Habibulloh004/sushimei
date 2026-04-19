"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { Plus, Minus, Check, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '../ui/sheet';
import { Drawer, DrawerContent, DrawerTitle } from '../ui/drawer';
import { Button } from '../ui/button';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useCart } from '@/lib/cart-context';
import { useIsMobile } from '@/hooks/use-media-query';
import { Product, ModifierGroup } from '@/lib/api';
import { SelectedModifier } from '@/lib/types';
import { getSafeName, getSafeDescription, getName } from '@/lib/helpers';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modifiers: ModifierGroup[];
}

export function ProductDetailDialog({ product, open, onOpenChange, modifiers }: ProductDetailDialogProps) {
  const { addToCart, cart } = useCart();
  const isMobile = useIsMobile();
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);

  React.useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedModifiers([]);
    }
  }, [product?.id]);

  const productModifiers = useMemo(() => {
    if (!product) return [];
    return modifiers;
  }, [product, modifiers]);

  const toggleModifier = useCallback((group: ModifierGroup, optionId: string) => {
    const option = group.options.find(o => o.id === optionId);
    if (!option) return;

    setSelectedModifiers(prev => {
      const existing = prev.find(m => m.optionId === optionId);
      if (existing) return prev.filter(m => m.optionId !== optionId);

      const groupModifiers = prev.filter(m => m.groupId === group.id);
      if (group.max_select && groupModifiers.length >= group.max_select) {
        const filtered = prev.filter(m => m.groupId !== group.id || m.optionId !== groupModifiers[0].optionId);
        return [...filtered, { groupId: group.id, groupName: getName(group.name_i18n), optionId: option.id, optionName: getName(option.name_i18n), priceDelta: option.price_delta }];
      }

      return [...prev, { groupId: group.id, groupName: getName(group.name_i18n), optionId: option.id, optionName: getName(option.name_i18n), priceDelta: option.price_delta }];
    });
  }, []);

  if (!product) return null;

  const basePrice = product.base_price + selectedModifiers.reduce((sum, m) => sum + m.priceDelta, 0);
  const lineTotal = basePrice * quantity;
  const cartCount = cart.filter(c => c.product.id === product.id).reduce((sum, c) => sum + c.quantity, 0);

  const handleAddToCart = () => {
    addToCart(product, quantity, null, selectedModifiers);
    onOpenChange(false);
    toast.success('Added to cart', { description: `${getSafeName(product.name_i18n)} x${quantity}` });
  };

  const content = (
    <motion.div
      key={product.id}
      initial={isMobile ? { opacity: 0, y: 24 } : { opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full min-h-0 flex-col"
    >
      {/* Image */}
      <div className="relative h-44 shrink-0 overflow-hidden bg-stone-950 sm:h-52 md:h-72">
        <ImageWithFallback src={product.image_url || ''} alt={getSafeName(product.name_i18n)} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent" />

        {!isMobile && (
          <button onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md hover:bg-black/70">
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="absolute left-4 right-14 top-4 flex flex-wrap gap-2 md:left-5 md:right-16 md:top-5">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-white backdrop-blur-md md:px-3 md:py-1.5 md:text-[10px]">{product.category_name}</span>
          {product.tags?.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-black/35 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md md:px-3 md:py-1.5 md:text-[10px]">{tag}</span>
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
          <div className="mb-2 flex flex-wrap gap-2">
            {product.is_spicy && <span className="rounded-full bg-red-600/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white">Spicy</span>}
            {product.is_vegan && <span className="rounded-full bg-emerald-500/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white">Vegan</span>}
            {product.is_halal && <span className="rounded-full bg-white/16 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">Halal</span>}
          </div>
          <h3 className="text-2xl md:text-3xl font-black leading-tight tracking-tight text-white">{getSafeName(product.name_i18n)}</h3>
        </div>
      </div>

      {/* Scrollable details */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-4 p-4 md:space-y-5 md:p-5">
          <p className="text-[13px] font-medium leading-relaxed text-stone-500 md:text-sm">
            {getSafeDescription(product.description_i18n) || 'Prepared to order with the same balance and finish as the rest of the chef selection.'}
          </p>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-400">Unit price</p>
              <p className="text-3xl font-black tracking-tight">{formatPrice(basePrice)}</p>
            </div>
            {cartCount > 0 && (
              <span className="px-3 py-1.5 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-full text-[10px] font-black uppercase tracking-wider">{cartCount} in cart</span>
            )}
          </div>

          {productModifiers.map(group => (
            <div key={group.id} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-black uppercase tracking-[0.22em] text-stone-400">{getName(group.name_i18n)}</h4>
                {group.required && <span className="text-[9px] font-black text-red-600 uppercase">Required</span>}
              </div>
              <div className="space-y-2">
                {group.options.map(option => {
                  const isSelected = selectedModifiers.some(m => m.optionId === option.id);
                  return (
                    <button key={option.id} onClick={() => toggleModifier(group, option.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all md:px-4 md:py-3 ${isSelected ? 'border-red-600 bg-red-50 text-red-600 dark:bg-red-950/20' : 'border-stone-200 hover:border-red-300 dark:border-stone-800'}`}
                      type="button">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-2 transition-colors md:h-5 md:w-5 ${isSelected ? 'border-red-600 bg-red-600' : 'border-stone-300 dark:border-stone-700'}`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className="text-[15px] font-bold leading-tight md:text-sm">{getName(option.name_i18n)}</span>
                      </div>
                      {option.price_delta > 0 && <span className="text-xs font-black text-stone-400">+{formatPrice(option.price_delta)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {product.allergens?.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-600 mb-1">Allergens</p>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Contains {product.allergens.join(', ')}.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 border-t border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950 md:p-5">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center rounded-2xl border border-stone-200 bg-stone-50 p-1 dark:border-stone-800 dark:bg-stone-900">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-stone-200 disabled:opacity-35 dark:hover:bg-stone-800 md:h-10 md:w-10"
              onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} type="button">
              <Minus className="h-4 w-4" />
            </button>
            <span className="flex h-9 min-w-[2.25rem] items-center justify-center text-base font-black tabular-nums md:h-10 md:min-w-[2.5rem]">{quantity}</span>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-stone-200 dark:hover:bg-stone-800 md:h-10 md:w-10"
              onClick={() => setQuantity(quantity + 1)} type="button">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button className="h-12 flex-1 rounded-2xl text-sm font-black shadow-xl shadow-red-600/20 md:h-14" onClick={handleAddToCart}>
            Add &middot; {formatPrice(lineTotal)}
          </Button>
        </div>
      </div>
    </motion.div>
  );

  // Mobile: fixed drawer around 80% viewport height
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex h-[82vh] max-h-[82vh] flex-col rounded-t-[2rem] border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
          <DrawerTitle className="sr-only">{getSafeName(product.name_i18n)}</DrawerTitle>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: right Sheet
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[480px] p-0 flex flex-col gap-0 border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 [&>button:first-of-type]:hidden">
        <SheetTitle className="sr-only">{getSafeName(product.name_i18n)}</SheetTitle>
        {content}
      </SheetContent>
    </Sheet>
  );
}
