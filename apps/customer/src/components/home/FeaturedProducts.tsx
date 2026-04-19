"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { ProductCard } from '../menu/ProductCard';
import { Product } from '@/lib/api';

interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-12 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <div className="text-[10px] font-black tracking-[0.3em] text-red-600 uppercase">Seasonal Specials</div>
          <h3 className="text-4xl md:text-5xl font-black tracking-tighter">Chef&apos;s Selection</h3>
        </motion.div>
        <Button variant="ghost" className="group text-stone-400 hover:text-red-600 p-0" asChild>
          <Link href="/menu">
            View All Selections <ChevronRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 md:gap-12">
        {products.length === 0 && (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          </div>
        )}
        {products.slice(0, 8).map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <ProductCard product={item} variant="featured" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
