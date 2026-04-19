"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Category } from '@/lib/api';
import { getName } from '@/lib/helpers';

interface CategoryScrollProps {
  categories: Category[];
}

export function CategoryScroll({ categories }: CategoryScrollProps) {
  const categoryList = [
    { id: 'all', name: 'All Menu', slug: 'all' },
    ...categories.map(cat => ({
      id: cat.id,
      name: getName(cat.name_i18n),
      slug: cat.slug,
    })),
  ];

  return (
    <section className="px-6 md:hidden">
      <h3 className="text-2xl font-black mb-6 tracking-tight">Browse Menu</h3>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6 scroll-smooth snap-x">
        {categoryList.map((cat, index) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="snap-start"
          >
            <Link
              href={`/menu?category=${cat.id}`}
              className="flex-none px-6 py-4 bg-white dark:bg-stone-900 rounded-3xl border border-stone-100 dark:border-stone-800 text-xs font-black uppercase tracking-widest shadow-sm hover:border-red-200 hover:shadow-md transition-all block whitespace-nowrap"
            >
              {cat.name}
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
