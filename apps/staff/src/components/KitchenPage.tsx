"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChefHat, LogOut, Loader2, RefreshCcw, Clock, CheckCircle2, Utensils } from 'lucide-react';
import {
  spotApi,
  useAuth,
  useOrderStream,
  type Order,
  type OrderDetail,
  type OrderDetailItem,
  type OrderStatus,
} from '@/lib/api';

const ACTIVE_STATUSES: OrderStatus[] = ['RECEIVED', 'CONFIRMED', 'PREPARING'];
// Fallback polling cadence when the WebSocket is disconnected.
const POLL_INTERVAL_MS = 60_000;

type OrderWithDetail = Order & { items?: OrderDetailItem[] };

function statusBadge(status: OrderStatus) {
  switch (status) {
    case 'RECEIVED':
    case 'CONFIRMED':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'PREPARING':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    default:
      return 'bg-stone-700 text-stone-300 border-stone-600';
  }
}

function statusLabel(status: OrderStatus) {
  switch (status) {
    case 'RECEIVED':
      return 'YANGI';
    case 'CONFIRMED':
      return 'TASDIQLANDI';
    case 'PREPARING':
      return 'TAYYORLANMOQDA';
    case 'READY':
      return 'TAYYOR';
    default:
      return status;
  }
}

function elapsedMinutes(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.round((Date.now() - created) / 60000));
}

// Same human-friendly formatting used on the POS. Kept inline so the
// Kitchen page doesn't depend on the cashier bundle.
function timeAgoOrStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
  if (mins < 60) return `${mins} daq oldin`;
  if (mins < 120) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h} soat oldin` : `${h} soat ${m} daq oldin`;
  }
  const sameDay = new Date().toDateString() === d.toDateString();
  const hm = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (sameDay) return `bugun ${hm}`;
  const date = d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
  return `${date}, ${hm}`;
}

export function KitchenPage() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const previousIdsRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await spotApi.getOrders({ limit: 50, sort_by: 'created_at', sort_order: 'ASC' });
      if (!res.success) {
        setError(res.error?.message || 'Buyurtmalarni yuklashda xatolik');
        return;
      }
      const active = (res.data || []).filter(o => ACTIVE_STATUSES.includes(o.status));
      const detailed = await Promise.all(
        active.map(async (order): Promise<OrderWithDetail> => {
          try {
            const detailRes = await spotApi.getOrder(order.id);
            if (detailRes.success && detailRes.data) {
              return { ...order, items: (detailRes.data as OrderDetail).items };
            }
          } catch {
            // ignore per-order failures
          }
          return order;
        }),
      );

      setOrders(detailed);
      setError(null);

      const currentIds = new Set(detailed.map(o => o.id));
      if (!firstLoadRef.current) {
        const hasNew = detailed.some(o => !previousIdsRef.current.has(o.id));
        if (hasNew) {
          playNotificationSound();
        }
      }
      previousIdsRef.current = currentIds;
      firstLoadRef.current = false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Buyurtmalarni yuklashda xatolik';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const poll = setInterval(fetchOrders, POLL_INTERVAL_MS);
    const clock = setInterval(() => setTick(t => t + 1), 30_000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [fetchOrders]);

  // Realtime refresh on any order event for this spot.
  useOrderStream({
    onEvent: () => {
      fetchOrders();
    },
  });

  const handleAdvance = async (order: OrderWithDetail) => {
    let next: OrderStatus | null = null;
    if (order.status === 'RECEIVED' || order.status === 'CONFIRMED') next = 'PREPARING';
    else if (order.status === 'PREPARING') next = 'READY';
    if (!next) return;

    setUpdatingId(order.id);
    try {
      const res = await spotApi.updateOrderStatus(order.id, next);
      if (!res.success) {
        setError(res.error?.message || 'Statusni yangilab bo‘lmadi');
        return;
      }
      await fetchOrders();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Statusni yangilab bo‘lmadi';
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const sortedOrders = useMemo(() => {
    void tick; // force recalc when tick changes
    return [...orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [orders, tick]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="sticky top-0 z-10 bg-stone-900/95 backdrop-blur border-b border-stone-800">
        <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/brand/sushimei-logo.png"
              alt="Sushi Mei"
              className="w-9 h-9 object-contain rounded-full border border-stone-700/60 bg-white p-0.5 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-sm font-black tracking-tight leading-none">SUSHI MEI</h1>
              <p className="text-[10px] text-stone-500 mt-0.5 uppercase tracking-wider truncate flex items-center gap-1">
                <ChefHat className="w-3 h-3 text-amber-400" />
                Oshxona · {sortedOrders.length} faol
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchOrders}
              className="h-9 w-9 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center"
              aria-label="Yangilash"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="h-9 w-9 rounded-lg bg-stone-800 hover:bg-red-600 flex items-center justify-center"
              aria-label="Chiqish"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-3 py-3">
        {error && (
          <div className="mb-3 p-2.5 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
          </div>
        ) : sortedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-500">
            <Utensils className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm font-medium">Hozircha tayyorlash kerak bo‘lgan buyurtma yo‘q</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {sortedOrders.map(order => {
              const mins = elapsedMinutes(order.created_at);
              const isUrgent = mins >= 15;
              const nextLabel =
                order.status === 'PREPARING' ? 'TAYYOR' : 'QABUL';
              const NextIcon = order.status === 'PREPARING' ? CheckCircle2 : ChefHat;
              return (
                <div
                  key={order.id}
                  className={`bg-stone-900 border rounded-xl p-2.5 flex flex-col gap-2 ${
                    isUrgent ? 'border-red-700/60' : 'border-stone-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-stone-400 font-bold truncate">#{order.order_number.slice(-6)}</p>
                      <p className="text-[10px] text-stone-500 leading-tight">
                        {order.order_type === 'DELIVERY'
                          ? 'Yetkazib berish'
                          : order.order_type === 'PICKUP'
                          ? 'Olib ketish'
                          : 'Joyda'}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border shrink-0 ${statusBadge(order.status)}`}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px]" title={new Date(order.created_at).toLocaleString('uz-UZ')}>
                    <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-red-400' : 'text-stone-500'}`} />
                    <span className={isUrgent ? 'text-red-400 font-bold' : 'text-stone-400'}>
                      {timeAgoOrStamp(order.created_at)}
                    </span>
                  </div>

                  <div className="border-t border-stone-800 pt-2 space-y-1">
                    {order.items && order.items.length > 0 ? (
                      order.items.map(item => (
                        <div key={item.id} className="flex items-start justify-between gap-2 text-[12px]">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate leading-tight">
                              {item.product_name?.uz ||
                                item.product_name?.ru ||
                                item.product_name?.en ||
                                Object.values(item.product_name || {})[0] ||
                                '—'}
                            </p>
                            {item.note && (
                              <p className="text-[10px] text-amber-400 leading-tight">izoh: {item.note}</p>
                            )}
                          </div>
                          <span className="text-[12px] font-bold text-amber-400 shrink-0">×{item.quantity}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-stone-500">Yuklanmoqda...</p>
                    )}
                  </div>

                  <button
                    disabled={updatingId === order.id}
                    onClick={() => handleAdvance(order)}
                    className="mt-1 h-9 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-stone-950 font-black text-[12px] uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    {updatingId === order.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <NextIcon className="w-4 h-4" />
                        {nextLabel}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function playNotificationSound() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    setTimeout(() => ctx.close().catch(() => {}), 500);
  } catch {
    // ignore audio failures (user gesture, autoplay restrictions)
  }
}
