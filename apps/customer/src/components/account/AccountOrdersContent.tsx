"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useAccountCenter } from './account-center-context';
import { formatDate, formatOrderStatus, formatPrice } from '@/lib/format';

export function AccountOrdersContent() {
  const { orders, handleViewOrder } = useAccountCenter();

  return (
    <section className="rounded-[2.25rem] border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-stone-400">Orders</p>
          <h2 className="mt-2 text-3xl font-black tracking-tighter">Recent activity</h2>
          <p className="mt-3 text-sm text-stone-500">Track order totals, statuses, and open detailed receipts when needed.</p>
        </div>
        <Button variant="outline" className="h-12 rounded-2xl px-6" asChild>
          <Link href="/menu">Start New Order</Link>
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {orders.map((order) => (
          <button
            key={order.id}
            className="rounded-[1.75rem] border border-stone-100 bg-stone-50 p-5 text-left transition hover:shadow-lg dark:border-stone-800 dark:bg-stone-950"
            onClick={() => handleViewOrder(order.id)}
            type="button"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{order.order_number}</p>
                <p className="mt-2 text-2xl font-black tracking-tight">{formatPrice(order.total_amount)}</p>
                <p className="mt-2 text-sm text-stone-500">{formatDate(order.created_at)}</p>
              </div>
              <Badge variant={order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'success' : order.status === 'CANCELLED' || order.status === 'REJECTED' ? 'error' : 'neutral'}>
                {formatOrderStatus(order.status)}
              </Badge>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-stone-500">{order.order_type} • {order.payment_type}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-stone-400">
                View details <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </button>
        ))}
        {orders.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-stone-200 p-8 text-center text-stone-500 xl:col-span-2 dark:border-stone-800">
            No orders yet. Build your first sushi order and your loyalty balance will start growing.
          </div>
        ) : null}
      </div>
    </section>
  );
}
