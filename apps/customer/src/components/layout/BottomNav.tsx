"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Home, LayoutGrid, User } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/menu', icon: LayoutGrid, label: 'Menu' },
  { href: '/account', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-stone-950/90 backdrop-blur-2xl border-t border-stone-100 dark:border-stone-900/50 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around px-2 pt-3 pb-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-1 flex-col items-center gap-1 py-1 transition-all ${isActive(item.href) ? 'text-red-600' : 'text-stone-400'}`}
          >
            <item.icon className={`w-5 h-5 ${isActive(item.href) ? 'fill-red-600/10' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            {isActive(item.href) && (
              <motion.div
                layoutId="bottomNavIndicator"
                className="absolute -bottom-1 w-8 h-0.5 bg-red-600 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
