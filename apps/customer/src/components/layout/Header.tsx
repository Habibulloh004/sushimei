"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Search, Bell } from 'lucide-react';
import { Button } from '../ui/button';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/api';
import { useScrollDirection } from '@/hooks/use-scroll-direction';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/account', label: 'Account' },
];

interface HeaderProps {
  onSearchOpen: () => void;
}

export function Header({ onSearchOpen }: HeaderProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { cart, cartBounce, setIsCartOpen } = useCart();
  const headerVisible = useScrollDirection();
  const cartProductCount = cart.length;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Header */}
      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: headerVisible ? 0 : '-100%' }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="fixed top-0 left-0 right-0 z-50 hidden md:block bg-white/80 dark:bg-stone-950/80 backdrop-blur-xl border-b border-stone-200/50 dark:border-stone-900/50"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-24 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link href="/" className="text-2xl font-black tracking-tighter flex items-center gap-3">
              <img
                src="/brand/sushimei-logo.png"
                alt="Sushi Mei logo"
                className="w-11 h-11 object-contain rounded-full border border-stone-200/70 bg-white p-0.5"
              />
              SUSHI MEI
            </Link>
            <div className="hidden lg:flex items-center gap-10">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-black tracking-[0.14em] transition-all hover:text-red-600 ${isActive(item.href) ? 'text-red-600' : 'text-stone-500'}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={onSearchOpen}>
              <Search className="w-5 h-5" />
            </Button>
            <motion.div animate={cartBounce ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.4 }}>
              <Button variant="ghost" size="icon" className="relative rounded-full" onClick={() => setIsCartOpen(true)}>
                <ShoppingBag className="w-5 h-5" />
                <AnimatePresence>
                  {cartProductCount > 0 && (
                    <motion.span
                      key={cartProductCount}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-[9px] font-black text-white flex items-center justify-center rounded-full ring-4 ring-white dark:ring-stone-950"
                    >
                      {cartProductCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
            <Button variant="secondary" size="sm" className="hidden md:flex rounded-xl" asChild>
              <Link href={isAuthenticated ? '/account' : '/login'}>
                {isAuthenticated ? 'Account' : 'Sign In'}
              </Link>
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Desktop spacer */}
      <div className="hidden md:block h-24" />

      {/* Mobile Header */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: headerVisible ? 0 : '-100%' }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-20 bg-white/80 dark:bg-stone-950/80 backdrop-blur-xl border-b border-stone-100 dark:border-stone-900/50"
      >
        <Link href="/" className="text-xl font-black tracking-tighter flex items-center gap-2">
          <img
            src="/brand/sushimei-logo.png"
            alt="Sushi Mei logo"
            className="w-8 h-8 object-contain rounded-full border border-stone-200/70 bg-white p-0.5"
          />
          SUSHI MEI
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={onSearchOpen}>
            <Search className="w-5 h-5" />
          </Button>
          <motion.div animate={cartBounce ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.4 }}>
            <Button variant="ghost" size="icon" className="relative rounded-full h-10 w-10" onClick={() => setIsCartOpen(true)}>
              <ShoppingBag className="w-5 h-5" />
              <AnimatePresence>
                {cartProductCount > 0 && (
                  <motion.span
                    key={cartProductCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-[9px] font-black text-white flex items-center justify-center rounded-full ring-2 ring-white dark:ring-stone-950"
                  >
                    {cartProductCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" asChild>
            <Link href="/account">
              <Bell className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </motion.div>
      {/* Mobile spacer */}
      <div className="md:hidden h-20" />
    </>
  );
}
