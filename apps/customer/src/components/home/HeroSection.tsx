"use client";

import React from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { ImageWithFallback } from '../figma/ImageWithFallback';

export function HeroSection() {
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 500], [0, 150]);
  const contentOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative -mt-20 h-screen md:-mt-24 flex items-center overflow-hidden">
      <motion.div className="absolute inset-0 z-0" style={{ y: imageY }}>
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1696454593555-6c5c1f3b8dcb"
          className="w-full h-full object-cover scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/20 to-transparent" />
      </motion.div>
      <motion.div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full" style={{ opacity: contentOpacity }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl space-y-8"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <div className="h-px w-12 bg-red-600" />
            <span className="text-xs font-black tracking-[0.4em] text-red-500 uppercase">Artisanal Dining</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.9]"
          >
            Pure Taste. <br />
            <span className="text-stone-400 italic font-serif font-light">Elevated.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-xl text-stone-300 leading-relaxed max-w-lg font-medium opacity-80"
          >
            Experience the precision of Tokyo&apos;s finest sushi, masterfully prepared with seasonal ingredients flown in daily.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-6 pt-4"
          >
            <Button size="lg" className="rounded-full shadow-2xl h-16" asChild>
              <Link href="/menu">
                Order Now <ArrowRight className="ml-3 w-5 h-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white hover:text-black rounded-full backdrop-blur-sm h-16" asChild>
              <Link href="/menu">Signature Menu</Link>
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
