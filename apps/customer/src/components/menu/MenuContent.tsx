"use client";

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { Category, Product } from '@/lib/api';
import { getName, matchesDietaryOption } from '@/lib/helpers';
import { useScrollDirection } from '@/hooks/use-scroll-direction';
import { ProductCard } from './ProductCard';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '../ui/drawer';
import { Button } from '../ui/button';

interface MenuContentProps {
  categories: Category[];
  products: Product[];
  dietaryOptions: string[];
}

export function MenuContent({ categories, products, dietaryOptions }: MenuContentProps) {
  const searchParams = useSearchParams();
  const headerVisible = useScrollDirection();
  const initialCategory = searchParams.get('category') || 'all';

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<'recommended' | 'price_asc' | 'price_desc' | 'newest'>('recommended');

  const mobileStickyTopClass = headerVisible ? 'top-20' : 'top-0';
  const desktopStickyTopClass = headerVisible ? 'lg:top-32' : 'lg:top-8';

  const categoryList = useMemo(
    () => [
      { id: 'all', name: 'All Menu', slug: 'all' },
      ...categories.map((cat) => ({
        id: cat.id,
        name: getName(cat.name_i18n),
        slug: cat.slug,
      })),
    ],
    [categories],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };

    for (const product of products) {
      counts[product.category_id] = (counts[product.category_id] || 0) + 1;
    }

    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const categoryFiltered =
      selectedCategory === 'all'
        ? products
        : products.filter((product) => product.category_id === selectedCategory);

    const dietaryFiltered =
      selectedDietary.length === 0
        ? categoryFiltered
        : categoryFiltered.filter((product) =>
            selectedDietary.every((option) => matchesDietaryOption(product, option)),
          );

    const sorted = [...dietaryFiltered];

    switch (sortOption) {
      case 'price_asc':
        sorted.sort((a, b) => a.base_price - b.base_price);
        break;
      case 'price_desc':
        sorted.sort((a, b) => b.base_price - a.base_price);
        break;
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      default:
        sorted.sort((a, b) => a.sort_order - b.sort_order);
        break;
    }

    return sorted;
  }, [products, selectedCategory, selectedDietary, sortOption]);

  const toggleDietaryFilter = (option: string) => {
    setSelectedDietary((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  };

  const DietaryFilters = () => (
    <div className="space-y-3">
      {dietaryOptions.map((option) => {
        const checked = selectedDietary.includes(option);

        return (
          <label key={option} className="group flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggleDietaryFilter(option)}
              className="sr-only"
            />
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
                checked
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-stone-200 group-hover:border-red-500 dark:border-stone-800'
              }`}
            >
              {checked && <CheckCircle2 className="h-3 w-3" />}
            </div>
            <span
              className={`text-[11px] font-black uppercase tracking-widest transition-colors ${
                checked
                  ? 'text-red-600'
                  : 'text-stone-500 group-hover:text-stone-900 dark:group-hover:text-white'
              }`}
            >
              {option}
            </span>
          </label>
        );
      })}

      {selectedDietary.length > 0 && (
        <button
          type="button"
          onClick={() => setSelectedDietary([])}
          className="mt-2 text-[10px] font-black uppercase tracking-widest text-stone-400 transition-colors hover:text-red-600"
        >
          Clear Filters
        </button>
      )}
    </div>
  );

  const sortControl = (
    <div className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-2 dark:border-stone-800 dark:bg-stone-900">
      <span className="pl-3 text-[10px] font-black uppercase tracking-widest text-stone-400">Sort by</span>
      <select
        value={sortOption}
        onChange={(event) => setSortOption(event.target.value as typeof sortOption)}
        className="cursor-pointer bg-transparent text-[10px] font-black uppercase tracking-widest focus:outline-none"
      >
        <option value="recommended">Recommended</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="newest">Newest Arrivals</option>
      </select>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-6 pb-32 pt-8 md:px-12 md:pt-12">
      <div className={`sticky z-30 -mx-6 mb-8 border-b border-stone-200/70 bg-background/95 px-6 py-4 backdrop-blur-xl transition-[top] duration-300 dark:border-stone-800/70 lg:hidden ${mobileStickyTopClass}`}>
        <div className="space-y-3">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x scroll-smooth">
            {categoryList.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`snap-start flex-none rounded-2xl border px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedCategory === category.id
                    ? 'border-red-600 bg-red-600 text-white shadow-lg shadow-red-600/20'
                    : 'border-stone-100 bg-white text-stone-500 dark:border-stone-800 dark:bg-stone-900'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {dietaryOptions.length > 0 && (
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="outline" size="sm" className="shrink-0 gap-2 rounded-2xl">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {selectedDietary.length > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">
                        {selectedDietary.length}
                      </span>
                    )}
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle className="text-lg font-black">Dietary Filters</DrawerTitle>
                  </DrawerHeader>
                  <div className="px-6 pb-8">
                    <DietaryFilters />
                  </div>
                </DrawerContent>
              </Drawer>
            )}

            <div className="min-w-0 flex-1">{sortControl}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-12 lg:flex-row">
        <aside className={`hidden w-full self-start space-y-10 lg:sticky lg:block lg:w-72 lg:transition-[top] lg:duration-300 ${desktopStickyTopClass}`}>
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Categories</h4>
            <div className="flex flex-col gap-2">
              {categoryList.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center justify-between rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${
                    selectedCategory === category.id
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                      : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900'
                  }`}
                >
                  {category.name}
                  <span
                    className={`rounded-lg px-2 py-0.5 text-[10px] ${
                      selectedCategory === category.id ? 'bg-white/20' : 'bg-stone-100 dark:bg-stone-800'
                    }`}
                  >
                    {categoryCounts[category.id] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {dietaryOptions.length > 0 && (
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Dietary</h4>
              <DietaryFilters />
            </div>
          )}
        </aside>

        <div className="flex-1 space-y-10 md:space-y-12">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tighter capitalize md:text-4xl">
                {selectedCategory === 'all'
                  ? 'All Items'
                  : categoryList.find((category) => category.id === selectedCategory)?.name || 'Menu'}
              </h2>
              <p className="mt-1 text-sm font-medium text-stone-500">
                Showing {filteredProducts.length} artisanal creations
              </p>
            </div>
            <div className="hidden lg:flex">{sortControl}</div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-medium text-stone-500">
                {selectedDietary.length > 0
                  ? `No products match these filters: ${selectedDietary.join(', ')}.`
                  : 'No products found in this category.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-3 xl:gap-8">
              {filteredProducts.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
                >
                  <ProductCard product={item} variant="grid" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
