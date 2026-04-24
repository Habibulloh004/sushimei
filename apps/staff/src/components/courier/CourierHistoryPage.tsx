"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  MapPin,
  Phone,
  Wallet,
  CreditCard,
  Package,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { spotApi, useOrderStream, type Order, type OrderDetail, type OrderStatus } from '@/lib/api';
import { CourierBottomNav } from './CourierBottomNav';

const TERMINAL: OrderStatus[] = ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'];

function formatMoney(n: number): string {
  return new Intl.NumberFormat('uz-UZ').format(n);
}

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// Group orders into buckets by calendar day so the list has natural section
// breaks without extra API calls.
function groupByDay(orders: Order[]): Array<{ day: string; items: Order[] }> {
  const map = new Map<string, Order[]>();
  for (const o of orders) {
    const d = new Date(o.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const arr = map.get(key) ?? [];
    arr.push(o);
    map.set(key, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, items]) => ({ day, items }));
}

function statusLabel(status: OrderStatus) {
  if (status === 'DELIVERED') return 'Yetkazildi';
  if (status === 'COMPLETED') return 'Yakunlandi';
  if (status === 'CANCELLED') return 'Bekor qilindi';
  if (status === 'REJECTED') return 'Rad etildi';
  return status;
}

export function CourierHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, OrderDetail>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandingId, setExpandingId] = useState<string | null>(null);

  // Courier sees only orders assigned to them (enforced server-side).
  // We pull terminal statuses so completed/cancelled deliveries show up.
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await spotApi.getOrders({ limit: 50, sort_by: 'created_at', sort_order: 'DESC' });
      if (!res.success) {
        setError(res.error?.message || 'Tarix yuklanmadi');
        return;
      }
      const list = (res.data || []).filter(o => TERMINAL.includes(o.status));
      setOrders(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tarmoq xatosi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // If a new DELIVERED arrives over the stream, pull it into the list.
  useOrderStream({
    onEvent: (ev) => {
      if (ev.type === 'order.status_changed' && ev.status && TERMINAL.includes(ev.status as OrderStatus)) {
        fetchHistory();
      }
    },
  });

  const groups = useMemo(() => groupByDay(orders), [orders]);

  const toggleExpand = async (o: Order) => {
    const next = !expanded[o.id];
    setExpanded(prev => ({ ...prev, [o.id]: next }));
    if (next && !detail[o.id]) {
      setExpandingId(o.id);
      const res = await spotApi.getOrder(o.id);
      if (res.success && res.data) {
        setDetail(prev => ({ ...prev, [o.id]: res.data as OrderDetail }));
      }
      setExpandingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col pb-20">
      <header className="sticky top-0 z-20 bg-stone-900/95 backdrop-blur border-b border-stone-800">
        <div className="max-w-xl mx-auto px-3 h-14 flex items-center gap-2">
          <Link
            href="/courier"
            className="h-10 w-10 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 flex items-center justify-center transition"
            aria-label="Orqaga"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-sm font-black tracking-widest uppercase">Tarix</h1>
            <p className="text-[10px] text-stone-500">Yetkazilgan va yopilgan zakazlar</p>
          </div>
          <span className="text-[11px] font-bold text-stone-400 tabular-nums">
            {orders.length}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto px-3 py-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-stone-500" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center mb-3">
              <Package className="w-7 h-7 text-stone-500" />
            </div>
            <p className="text-sm font-bold text-stone-300">Tarix bo'sh</p>
            <p className="text-xs mt-1 text-stone-500 max-w-xs">
              Yetkazib bergan zakazlaringiz shu yerda ro'yxatda qoladi
            </p>
          </div>
        ) : groups.map(group => (
          <section key={group.day} className="space-y-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-500 px-1">
              {group.day}
            </h2>
            {group.items.map(o => {
              const d = detail[o.id];
              const isOpen = !!expanded[o.id];
              const delivered = o.status === 'DELIVERED' || o.status === 'COMPLETED';
              const Icon = delivered ? CheckCircle2 : XCircle;
              return (
                <article
                  key={o.id}
                  className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(o)}
                    className="w-full flex items-center gap-3 p-3 active:scale-[0.99] transition text-left"
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      delivered ? 'bg-emerald-500/15 text-emerald-400' : 'bg-stone-800 text-stone-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 truncate">
                          #{o.order_number.slice(-6)}
                        </p>
                        <span className="text-[10px] text-stone-500">·</span>
                        <p className="text-[10px] text-stone-500 tabular-nums truncate">
                          {formatDateTime(o.created_at)}
                        </p>
                      </div>
                      <p className="text-sm font-bold mt-0.5 truncate">
                        {formatMoney(o.total_amount)} <span className="text-xs font-medium text-stone-400">so'm</span>
                        <span className="mx-1.5 text-stone-600">·</span>
                        <span className={`text-[11px] font-bold ${delivered ? 'text-emerald-400' : 'text-stone-400'}`}>
                          {statusLabel(o.status)}
                        </span>
                      </p>
                    </div>
                    {o.payment_type === 'CASH' ? (
                      <Wallet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <CreditCard className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    )}
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-stone-500 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-stone-500 shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-stone-800 p-3 space-y-2.5">
                      {expandingId === o.id && !d ? (
                        <div className="flex items-center gap-2 text-xs text-stone-500 py-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Yuklanmoqda...
                        </div>
                      ) : d ? (
                        <>
                          {o.customer_phone && (
                            <a
                              href={`tel:${o.customer_phone}`}
                              className="flex items-center gap-2 text-xs text-emerald-300 font-medium"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {o.customer_phone}
                            </a>
                          )}
                          {d.delivery_address && (
                            <div className="flex items-start gap-2 text-xs text-stone-300">
                              <MapPin className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
                              <span className="wrap-break-word">
                                {[
                                  (d.delivery_address as Record<string, unknown>).line1,
                                  (d.delivery_address as Record<string, unknown>).city,
                                  (d.delivery_address as Record<string, unknown>).street,
                                  (d.delivery_address as Record<string, unknown>).house,
                                ].filter(Boolean).map(String).join(', ') || '—'}
                              </span>
                            </div>
                          )}
                          <div className="space-y-1 border-t border-stone-800 pt-2.5">
                            {d.items.map(it => (
                              <div key={it.id} className="flex items-center justify-between text-xs">
                                <span className="text-stone-300 truncate flex-1">
                                  {it.product_name?.uz ||
                                    it.product_name?.ru ||
                                    it.product_name?.en ||
                                    Object.values(it.product_name || {})[0] ||
                                    '—'}
                                </span>
                                <span className="text-stone-500 font-bold tabular-nums">×{it.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        ))}
      </main>

      <CourierBottomNav />
    </div>
  );
}
