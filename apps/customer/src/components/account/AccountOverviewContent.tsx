"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Gift, MapPinHouse, ReceiptText, Settings2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useAccountCenter } from './account-center-context';
import { formatDate, formatDateTime, formatOrderStatus, formatPrice } from '@/lib/format';
import { formatAddressLines } from './account-utils';

export function AccountOverviewContent() {
  const {
    profile,
    addresses,
    bonusHistory,
    orders,
    handleViewOrder,
  } = useAccountCenter();

  const defaultAddress = addresses.find((address) => address.is_default) || addresses[0];
  const latestBonus = bonusHistory[0];

  return (
    <div className="space-y-8">
      <section className="rounded-[2.25rem] border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-stone-400">Overview</p>
            <h2 className="mt-2 text-3xl font-black tracking-tighter">Everything in one place</h2>
            <p className="mt-3 max-w-2xl text-sm text-stone-500">Use the sections below to update personal info, manage delivery addresses, review loyalty points, and track orders.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link href="/account/profile" className="group rounded-[1.75rem] border border-stone-100 bg-stone-50 p-5 transition hover:shadow-lg dark:border-stone-800 dark:bg-stone-950">
            <div className="flex items-center justify-between gap-3">
              <Settings2 className="h-5 w-5 text-red-600" />
              <ChevronRight className="h-4 w-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-red-600" />
            </div>
            <p className="mt-5 text-lg font-black tracking-tight">Profile</p>
            <p className="mt-2 text-sm text-stone-500">{profile?.email || profile?.phone || 'Add your personal details'}</p>
          </Link>

          <Link href="/account/addresses" className="group rounded-[1.75rem] border border-stone-100 bg-stone-50 p-5 transition hover:shadow-lg dark:border-stone-800 dark:bg-stone-950">
            <div className="flex items-center justify-between gap-3">
              <MapPinHouse className="h-5 w-5 text-red-600" />
              <ChevronRight className="h-4 w-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-red-600" />
            </div>
            <p className="mt-5 text-lg font-black tracking-tight">Addresses</p>
            <p className="mt-2 text-sm text-stone-500">{addresses.length > 0 ? `${addresses.length} saved location${addresses.length > 1 ? 's' : ''}` : 'No delivery addresses yet'}</p>
          </Link>

          <Link href="/account/bonuses" className="group rounded-[1.75rem] border border-stone-100 bg-stone-50 p-5 transition hover:shadow-lg dark:border-stone-800 dark:bg-stone-950">
            <div className="flex items-center justify-between gap-3">
              <Gift className="h-5 w-5 text-red-600" />
              <ChevronRight className="h-4 w-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-red-600" />
            </div>
            <p className="mt-5 text-lg font-black tracking-tight">Bonuses</p>
            <p className="mt-2 text-sm text-stone-500">{profile?.bonus_balance || 0} pts available</p>
          </Link>

          <Link href="/account/orders" className="group rounded-[1.75rem] border border-stone-100 bg-stone-50 p-5 transition hover:shadow-lg dark:border-stone-800 dark:bg-stone-950">
            <div className="flex items-center justify-between gap-3">
              <ReceiptText className="h-5 w-5 text-red-600" />
              <ChevronRight className="h-4 w-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-red-600" />
            </div>
            <p className="mt-5 text-lg font-black tracking-tight">Orders</p>
            <p className="mt-2 text-sm text-stone-500">{orders.length > 0 ? `${orders.length} recent order${orders.length > 1 ? 's' : ''}` : 'No orders yet'}</p>
          </Link>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="rounded-[2.25rem] border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-stone-400">Default Address</p>
              <h3 className="mt-2 text-2xl font-black tracking-tighter">Delivery setup</h3>
            </div>
            <Button variant="outline" className="rounded-2xl" asChild>
              <Link href="/account/addresses">Manage</Link>
            </Button>
          </div>

          {defaultAddress ? (
            <div className="mt-6 rounded-[1.75rem] border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-950">
              <div className="flex items-center gap-3">
                <p className="text-lg font-black tracking-tight">{defaultAddress.label || 'Saved address'}</p>
                {defaultAddress.is_default ? <Badge variant="success">Default</Badge> : null}
              </div>
              <p className="mt-3 text-sm text-stone-500">{formatAddressLines(defaultAddress)}</p>
              {defaultAddress.delivery_notes ? <p className="mt-2 text-sm text-stone-400">{defaultAddress.delivery_notes}</p> : null}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.75rem] border border-dashed border-stone-200 p-6 text-sm text-stone-500 dark:border-stone-800">
              You have not saved any delivery addresses yet.
            </div>
          )}
        </section>

        <section className="rounded-[2.25rem] border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-stone-400">Loyalty Snapshot</p>
              <h3 className="mt-2 text-2xl font-black tracking-tighter">Points overview</h3>
            </div>
            <Button variant="outline" className="rounded-2xl" asChild>
              <Link href="/account/bonuses">Open</Link>
            </Button>
          </div>

          <div className="mt-6 rounded-[1.75rem] bg-red-600 p-5 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-80">Available Bonus</p>
            <p className="mt-2 text-3xl font-black tracking-tight">{profile?.bonus_balance || 0} pts</p>
            <p className="mt-2 text-sm text-white/80">Use points during checkout or keep collecting with every order.</p>
          </div>

          <div className="mt-4 rounded-[1.75rem] border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-950">
            {latestBonus ? (
              <>
                <p className="text-sm font-black tracking-tight">Latest activity</p>
                <p className="mt-2 text-sm text-stone-500">{latestBonus.reason || latestBonus.order_number || 'Balance update'}</p>
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">{formatDateTime(latestBonus.created_at)}</p>
              </>
            ) : (
              <p className="text-sm text-stone-500">No loyalty activity yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[2.25rem] border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-stone-400">Recent Orders</p>
            <h3 className="mt-2 text-2xl font-black tracking-tighter">Latest activity</h3>
          </div>
          <Button variant="outline" className="rounded-2xl" asChild>
            <Link href="/account/orders">See all orders</Link>
          </Button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {orders.slice(0, 3).map((order) => (
            <button
              key={order.id}
              className="rounded-[1.75rem] border border-stone-100 bg-stone-50 p-5 text-left transition hover:shadow-lg dark:border-stone-800 dark:bg-stone-950"
              onClick={() => handleViewOrder(order.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{order.order_number}</p>
                  <p className="mt-2 text-xl font-black tracking-tight">{formatPrice(order.total_amount)}</p>
                  <p className="mt-2 text-sm text-stone-500">{formatDate(order.created_at)}</p>
                </div>
                <Badge variant={order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'success' : order.status === 'CANCELLED' || order.status === 'REJECTED' ? 'error' : 'neutral'}>
                  {formatOrderStatus(order.status)}
                </Badge>
              </div>
            </button>
          ))}

          {orders.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-stone-200 p-8 text-center text-stone-500 lg:col-span-3 dark:border-stone-800">
              No orders yet. Your first sushi order will appear here.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
