"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Gift, LogOut, MapPinHouse, Phone, ReceiptText, Settings2, Sparkles, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { AccountCenterProvider, useAccountCenter } from './account-center-context';
import { AccountOrderDialog } from './AccountOrderDialog';
import { formatDate } from '@/lib/format';
import { getAccountAvatarSrc } from './account-utils';
import { AccountGeneratedAvatar } from './AccountGeneratedAvatar';

const NAV_ITEMS = [
  { href: '/account', label: 'Overview', description: 'Main account center', icon: LayoutDashboard },
  { href: '/account/profile', label: 'Profile', description: 'Personal info and settings', icon: UserRound },
  { href: '/account/addresses', label: 'Addresses', description: 'Delivery locations', icon: MapPinHouse },
  { href: '/account/bonuses', label: 'Bonuses', description: 'Points and loyalty history', icon: Gift },
  { href: '/account/orders', label: 'Orders', description: 'Recent orders and statuses', icon: ReceiptText },
];

function AccountGuestState() {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-12 pb-32">
      <div className="rounded-[2.5rem] border border-stone-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-4xl font-black tracking-tighter">Your account</h2>
        <p className="mt-3 text-stone-500">Sign in to manage profile settings, addresses, loyalty balance, and orders.</p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Button className="h-14 rounded-2xl px-8" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button variant="outline" className="h-14 rounded-2xl px-8" asChild>
            <Link href="/register">Create Account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function AccountShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    isAuthenticated,
    logout,
    profile,
    profileLoading,
    customerDisplayName,
  } = useAccountCenter();

  const activeHref = NAV_ITEMS.find((item) => pathname === item.href)?.href ?? '/account';
  const avatarSeed = profile?.phone || profile?.email || customerDisplayName || 'customer';

  if (!isAuthenticated) {
    return <AccountGuestState />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-28 pt-4 sm:px-6 sm:pt-10">
      <section className="rounded-[1.75rem] border border-stone-100 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:rounded-[2.5rem] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <Avatar className="h-16 w-16 border-4 border-stone-100 bg-red-600 text-white shadow-lg dark:border-stone-800 sm:h-24 sm:w-24">
              <AvatarImage src={getAccountAvatarSrc(profile?.avatar_url)} alt={customerDisplayName} className="object-cover" />
              <AvatarFallback className="bg-white dark:bg-stone-900">
                <AccountGeneratedAvatar seed={avatarSeed} size={96} className="h-full w-full" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2.5 sm:space-y-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-600 sm:text-[11px] sm:tracking-[0.24em]">Account Center</p>
                <h1 className="mt-1.5 text-xl font-black tracking-tighter sm:mt-2 sm:text-3xl md:text-4xl">{customerDisplayName || 'Customer'}</h1>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500 sm:mt-2 sm:gap-3 sm:text-sm">
                  <span className="inline-flex items-center gap-1.5 sm:gap-2">
                    <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {profile?.phone}
                  </span>
                  {profile?.email ? <span className="truncate">{profile.email}</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Badge variant="success">{profile?.status || 'ACTIVE'}</Badge>
                <Badge variant="neutral">{profile?.language_code?.toUpperCase() || 'EN'}</Badge>
                <Badge variant="neutral">{profile?.marketing_opt_in ? 'Marketing On' : 'Marketing Off'}</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            <div className="rounded-2xl bg-red-600 px-3 py-3 text-white sm:rounded-3xl sm:px-4 sm:py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 sm:text-[10px] sm:tracking-[0.22em]">Bonus</p>
              <p className="mt-1 text-lg font-black tracking-tight sm:mt-2 sm:text-2xl">{profileLoading ? '...' : `${profile?.bonus_balance || 0} pts`}</p>
            </div>
            <div className="rounded-2xl bg-stone-100 px-3 py-3 dark:bg-stone-800 sm:rounded-3xl sm:px-4 sm:py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400 sm:text-[10px] sm:tracking-[0.22em]">Orders</p>
              <p className="mt-1 text-lg font-black tracking-tight sm:mt-2 sm:text-2xl">{profileLoading ? '...' : profile?.total_orders || 0}</p>
            </div>
            <div className="rounded-2xl bg-stone-100 px-3 py-3 dark:bg-stone-800 sm:rounded-3xl sm:px-4 sm:py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400 sm:text-[10px] sm:tracking-[0.22em]">Last Order</p>
              <p className="mt-1 text-xs font-black tracking-tight sm:mt-2 sm:text-sm">{profile?.last_order_at ? formatDate(profile.last_order_at) : 'No orders yet'}</p>
            </div>
            <div className="rounded-2xl bg-stone-100 px-3 py-3 dark:bg-stone-800 sm:rounded-3xl sm:px-4 sm:py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400 sm:text-[10px] sm:tracking-[0.22em]">Member Since</p>
              <p className="mt-1 text-xs font-black tracking-tight sm:mt-2 sm:text-sm">{profile?.created_at ? formatDate(profile.created_at) : '-'}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
          <Button size="sm" className="h-10 rounded-2xl sm:h-9" asChild>
            <Link href="/account/profile">
              <Settings2 className="h-4 w-4" />
              Edit Profile
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="h-10 rounded-2xl sm:h-9" asChild>
            <Link href="/account/addresses">
              <MapPinHouse className="h-4 w-4" />
              Manage Addresses
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="h-10 rounded-2xl sm:h-9" asChild>
            <Link href="/account/bonuses">
              <Sparkles className="h-4 w-4" />
              Loyalty & Bonuses
            </Link>
          </Button>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4">
          <div className="hidden lg:block rounded-[2rem] border border-stone-100 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="space-y-2">
              {NAV_ITEMS.map((item) => {
                const isActive = activeHref === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-start gap-3 rounded-[1.5rem] px-4 py-4 transition ${isActive ? 'bg-red-600 text-white shadow-[0_20px_40px_rgba(220,38,38,0.18)]' : 'bg-stone-50 text-stone-700 hover:bg-stone-100 dark:bg-stone-950 dark:text-stone-200 dark:hover:bg-stone-800'}`}
                  >
                    <item.icon className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-black tracking-tight">{item.label}</p>
                      <p className={`mt-1 text-xs ${isActive ? 'text-white/80' : 'text-stone-400'}`}>{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <Button variant="ghost" className="mt-4 h-12 w-full justify-start rounded-[1.5rem] px-4 text-red-600" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          <div className="lg:hidden -mx-1 overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2 px-1">
              {NAV_ITEMS.map((item) => {
                const isActive = activeHref === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${isActive ? 'bg-red-600 text-white' : 'bg-white text-stone-700 border border-stone-200 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200'}`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>

      <AccountOrderDialog />
    </div>
  );
}

export function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <AccountCenterProvider>
      <AccountShellInner>{children}</AccountShellInner>
    </AccountCenterProvider>
  );
}
