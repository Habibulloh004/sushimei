"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, History, User } from 'lucide-react';

// Fixed bottom nav for the courier mobile UI — thumb-reachable, sits above
// iOS home indicator via env(safe-area-inset-bottom).
const TABS = [
  { href: '/courier', label: 'Zakazlar', icon: Package },
  { href: '/courier/history', label: 'Tarix', icon: History },
  { href: '/courier/profile', label: 'Profil', icon: User },
] as const;

export function CourierBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 bg-stone-900/95 backdrop-blur border-t border-stone-800 pb-[env(safe-area-inset-bottom)]"
      aria-label="Asosiy navigatsiya"
    >
      <div className="max-w-xl mx-auto flex">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = tab.href === '/courier'
            ? pathname === '/courier'
            : pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 h-14 flex flex-col items-center justify-center gap-0.5 transition ${
                active ? 'text-emerald-400' : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.4]' : ''}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {tab.label}
              </span>
              {active && <span className="absolute bottom-0 h-0.5 w-8 bg-emerald-400 rounded-t-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
