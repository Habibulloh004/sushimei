"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Gift } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';

export function PromoBanner() {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative rounded-[3rem] overflow-hidden bg-stone-900 p-8 md:p-20 text-white flex flex-col md:flex-row items-center justify-between gap-12"
      >
        <div className="absolute inset-0 opacity-20">
          <ImageWithFallback src="https://images.unsplash.com/photo-1766415605422-06d022bd22bf" className="w-full h-full object-cover grayscale" />
        </div>
        <div className="relative z-10 space-y-6 max-w-xl text-center md:text-left">
          <Badge variant="error">Limited Time</Badge>
          <h3 className="text-4xl md:text-6xl font-black tracking-tighter">Get 20% off your first order</h3>
          <p className="text-stone-400 font-medium">Use code <span className="text-white font-black">WELCOME20</span> at checkout. Valid for delivery and pickup.</p>
          <Button size="lg" className="rounded-full h-14" asChild>
            <Link href="/menu">Explore Menu</Link>
          </Button>
        </div>
        <div className="relative z-10 hidden lg:block">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-80 h-80 rounded-full border-2 border-dashed border-stone-700 flex items-center justify-center p-8"
          >
            <div className="w-full h-full rounded-full bg-red-600 flex flex-col items-center justify-center text-center p-6 shadow-2xl shadow-red-600/40">
              <Gift className="w-12 h-12 mb-2" />
              <p className="text-sm font-black uppercase tracking-widest">Bonus Program</p>
              <p className="text-[10px] font-bold text-red-200 mt-2">Earn 5% cashback on every order</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
