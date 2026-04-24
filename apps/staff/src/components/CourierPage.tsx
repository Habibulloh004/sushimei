"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Car,
  Loader2,
  RefreshCcw,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Package,
  CreditCard,
  Wallet,
  Power,
  PowerOff,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Timer,
  XCircle,
} from 'lucide-react';
import { CourierBottomNav } from './courier/CourierBottomNav';
import {
  spotApi,
  useAuth,
  useOrderStream,
  type CourierOffer,
  type Order,
  type OrderDetail,
  type OrderStatus,
} from '@/lib/api';

const ACTIVE_STATUSES: OrderStatus[] = ['READY', 'ON_THE_WAY'];
// Fallback polling cadence when WebSocket is disconnected.
const POLL_INTERVAL_MS = 60_000;
// Fallback SLA window if the settings fetch fails. Server value from
// `delivery.courier_target_minutes` takes precedence.
const DEFAULT_TARGET_MINUTES = 30;
// Delay bucket threshold that triggers the red "late" visual state.
const LATE_WARNING_MINUTES = 0;

function statusBadge(status: OrderStatus) {
  switch (status) {
    case 'READY':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'ON_THE_WAY':
      return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    case 'DELIVERED':
      return 'bg-stone-700 text-stone-300 border-stone-600';
    default:
      return 'bg-stone-700 text-stone-300 border-stone-600';
  }
}

function statusLabel(status: OrderStatus) {
  switch (status) {
    case 'READY':
      return 'TAYYOR';
    case 'ON_THE_WAY':
      return "YO'LDA";
    case 'DELIVERED':
      return 'YETKAZILDI';
    default:
      return status;
  }
}

function formatAddress(addr: Record<string, unknown> | null | undefined): string {
  if (!addr) return '—';
  const parts: string[] = [];
  const line1 = addr.line1 ? String(addr.line1) : '';
  if (line1) parts.push(line1);
  const city = addr.city ? String(addr.city) : '';
  const street = addr.street ? String(addr.street) : '';
  const house = addr.house ? String(addr.house) : '';
  const streetPart = [street, house].filter(Boolean).join(' ');
  if (!line1) {
    if (city) parts.push(city);
    if (streetPart) parts.push(streetPart);
  }
  const extras: string[] = [];
  if (addr.entrance) extras.push(`Kirish ${addr.entrance}`);
  if (addr.floor) extras.push(`${addr.floor}-qavat`);
  if (addr.apartment) extras.push(`kv. ${addr.apartment}`);
  if (extras.length) parts.push(extras.join(', '));
  if (addr.delivery_notes || addr.notes) {
    parts.push(String(addr.delivery_notes || addr.notes));
  }
  return parts.filter(Boolean).join(' · ') || '—';
}

function yandexMapsLink(lat: number | null | undefined, lng: number | null | undefined, fallbackText: string): string | null {
  if (lat != null && lng != null) {
    // rtext= routes from current position (user's GPS) to destination
    return `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`;
  }
  const q = fallbackText && fallbackText !== '—' ? encodeURIComponent(fallbackText) : '';
  if (!q) return null;
  return `https://yandex.uz/maps/?text=${q}`;
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('uz-UZ').format(n);
}

function minutesAgo(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.round((Date.now() - t) / 60_000));
}

// Short human-friendly wait formatter used on courier offer badges. Keeps
// sub-hour precision for the live countdown feel but bails out to an
// explicit hours:minutes stamp once an offer has been sitting too long.
function waitingAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
  if (mins < 60) return `${mins} daq kutmoqda`;
  if (mins < 120) {
    const m = mins % 60;
    return m === 0 ? `1 soat kutmoqda` : `1 soat ${m} daq kutmoqda`;
  }
  const sameDay = new Date().toDateString() === d.toDateString();
  const hm = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (sameDay) return `${hm} dan beri`;
  const date = d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
  return `${date} ${hm}`;
}

// Delivery timer counts down from the moment the courier ACCEPTED the offer
// (assigned_at). Before acceptance the order doesn't belong to any courier
// and the SLA hasn't started. Creation time is only a display fallback for
// orders that somehow have no assigned_at yet.
function deliveryTiming(assignedAtIso: string | null | undefined, createdAtIso: string, targetMinutes: number) {
  const baseIso = assignedAtIso || createdAtIso;
  const elapsed = minutesAgo(baseIso);
  const remaining = targetMinutes - elapsed;
  const isLate = remaining < LATE_WARNING_MINUTES;
  return {
    elapsed,
    remaining,
    isLate,
    lateBy: isLate ? Math.abs(remaining) : 0,
  };
}

export function CourierPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [onDuty, setOnDuty] = useState<boolean>(false);
  const [onDutyLoading, setOnDutyLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [offers, setOffers] = useState<CourierOffer[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'warning' | 'error'; message: string } | null>(null);
  const [targetMinutes, setTargetMinutes] = useState<number>(DEFAULT_TARGET_MINUTES);
  // Minute ticker so elapsed/remaining/late badges update without a new fetch.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Auto-dismiss toasts after 4s so they don't pile up visually.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    spotApi.getMyOnDutyStatus().then(res => {
      if (res.success && res.data) setOnDuty(!!res.data.on_duty);
    });
    spotApi.getCourierTargetMinutes().then(res => {
      if (res.success && res.data?.target_minutes) setTargetMinutes(res.data.target_minutes);
    });
  }, []);

  const toggleOnDuty = async () => {
    const next = !onDuty;
    setOnDutyLoading(true);
    try {
      const res = await spotApi.setMyOnDutyStatus(next);
      if (!res.success) {
        setError(res.error?.message || "Holatni yangilab bo'lmadi");
        return;
      }
      setOnDuty(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tarmoq xatosi');
    } finally {
      setOnDutyLoading(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    try {
      const res = await spotApi.getOrders({ limit: 50, sort_by: 'created_at', sort_order: 'ASC' });
      if (!res.success) {
        setError(res.error?.message || 'Buyurtmalarni yuklashda xatolik');
        return;
      }
      const active = (res.data || []).filter((o: Order) => ACTIVE_STATUSES.includes(o.status));
      const details = await Promise.all(
        active.map(async o => {
          const detail = await spotApi.getOrder(o.id);
          return detail.success ? (detail.data as OrderDetail) : null;
        }),
      );
      setOrders(details.filter((d): d is OrderDetail => d !== null));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Buyurtmalarni yuklashda xatolik';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOffers = useCallback(async () => {
    const res = await spotApi.listCourierOffers();
    if (res.success) setOffers(res.data || []);
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchOffers();
    const poll = setInterval(() => {
      fetchOrders();
      fetchOffers();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [fetchOrders, fetchOffers]);

  useOrderStream({
    onEvent: () => {
      fetchOrders();
      fetchOffers();
    },
  });

  // Off-duty couriers don't see the offer pool, so hide it client-side too
  // if the flag flips during the session (the server also filters server-side).
  useEffect(() => {
    if (!onDuty) setOffers([]);
    else fetchOffers();
  }, [onDuty, fetchOffers]);

  const handleAcceptOffer = async (offer: CourierOffer) => {
    setAcceptingId(offer.id);
    // Optimistically remove from the list so double-tap can't double-send.
    setOffers(prev => prev.filter(o => o.id !== offer.id));
    try {
      const res = await spotApi.acceptCourierOffer(offer.id);
      if (res.success) {
        setToast({ kind: 'success', message: 'Zakaz qabul qilindi' });
        await fetchOrders();
        return;
      }
      // The backend returns a 409 with "already claimed" in the error message
      // when another courier won the race. We surface that as a warning toast
      // rather than a hard error.
      const msg = `${res.error?.message || ''} ${res.error?.detail || ''}`.toLowerCase();
      if (msg.includes('already claimed') || msg.includes('conflict')) {
        setToast({ kind: 'warning', message: 'Bu zakaz allaqachon boshqa kuryer tomonidan qabul qilindi' });
      } else {
        setToast({ kind: 'error', message: res.error?.message || 'Qabul qilib bo\u2019lmadi' });
      }
      await fetchOffers();
    } catch (err) {
      setToast({ kind: 'error', message: err instanceof Error ? err.message : 'Tarmoq xatosi' });
      await fetchOffers();
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDeclineOffer = async (offer: CourierOffer) => {
    if (offer.offer_type !== 'DIRECT') return;
    setDecliningId(offer.id);
    try {
      const res = await spotApi.declineCourierOffer(offer.id, 'Courier declined offer');
      if (!res.success) {
        setToast({ kind: 'error', message: res.error?.message || 'Rad etib bo‘lmadi' });
        await fetchOffers();
        return;
      }
      setOffers(prev => prev.filter(o => o.id !== offer.id));
      setToast({ kind: 'warning', message: 'POS ga zakazni olmasligingiz yuborildi' });
    } catch (err) {
      setToast({ kind: 'error', message: err instanceof Error ? err.message : 'Tarmoq xatosi' });
      await fetchOffers();
    } finally {
      setDecliningId(null);
    }
  };

  const handleAdvance = async (order: OrderDetail) => {
    let next: OrderStatus | null = null;
    if (order.status === 'READY') next = 'ON_THE_WAY';
    else if (order.status === 'ON_THE_WAY') next = 'DELIVERED';
    if (!next) return;

    setUpdatingId(order.id);
    try {
      const res = await spotApi.updateOrderStatus(order.id, next);
      if (!res.success) {
        setError(res.error?.message || "Statusni yangilab bo'lmadi");
        return;
      }
      await fetchOrders();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Statusni yangilab bo'lmadi";
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const courierName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || 'Kuryer';
  const courierInitial = courierName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col pb-20">
      {/* Header — sticky, slim on mobile */}
      <header className="sticky top-0 z-20 bg-stone-900/95 backdrop-blur border-b border-stone-800">
        <div className="max-w-xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          {/* Tap target opens the dedicated profile page. Entire left slot
              is clickable so a thumb hitting the name anywhere still works. */}
          <Link
            href="/courier/profile"
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left active:scale-[0.99] transition"
            aria-label="Profil"
          >
            <span className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
              onDuty ? 'bg-emerald-500 text-stone-950' : 'bg-stone-800 text-stone-300 border border-stone-700'
            }`}>
              {courierInitial}
            </span>
            <div className="min-w-0">
              <h1 className="text-sm font-black tracking-tight truncate leading-tight">
                {courierName}
              </h1>
              <p className="text-[10px] text-stone-500 truncate flex items-center gap-1">
                <Car className={`w-3 h-3 ${onDuty ? 'text-emerald-400' : 'text-stone-500'}`} />
                {orders.length > 0 ? `${orders.length} faol zakaz` : onDuty ? "kutilmoqda" : "Smena yopiq"}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <button
              disabled={onDutyLoading}
              onClick={toggleOnDuty}
              className={`h-10 px-3 rounded-xl flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider disabled:opacity-60 min-w-24 justify-center ${
                onDuty
                  ? 'bg-stone-800 text-stone-300 border border-stone-700'
                  : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
              }`}
              aria-label={onDuty ? 'Smenani tugatish' : 'Smenani boshlash'}
            >
              {onDutyLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : onDuty ? (
                <><PowerOff className="w-3.5 h-3.5" /> Tugatish</>
              ) : (
                <><Power className="w-3.5 h-3.5" /> Faol</>
              )}
            </button>
            <button
              onClick={fetchOrders}
              className="h-10 w-10 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 flex items-center justify-center transition"
              aria-label="Yangilash"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
        {!onDuty && (
          <div className="max-w-xl mx-auto px-3 sm:px-4 py-2 border-t border-stone-800 bg-amber-500/5">
            <p className="text-[11px] text-amber-400 text-center leading-snug">
              Zakaz qabul qilish uchun <span className="font-black">Faol</span> tugmasini bosing
            </p>
          </div>
        )}

        {(() => {
          const late = orders.filter(o => deliveryTiming(o.assigned_at, o.created_at, targetMinutes).isLate);
          if (late.length === 0) return null;
          const worst = Math.max(...late.map(o => deliveryTiming(o.assigned_at, o.created_at, targetMinutes).lateBy));
          return (
            <div className="max-w-xl mx-auto px-3 sm:px-4 py-2 border-t border-red-500/40 bg-red-600/20 animate-pulse">
              <div className="flex items-center justify-center gap-2 text-red-200 text-[11px] font-black uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5" />
                {late.length} ta zakaz kechikdi · eng kech {worst} daq
              </div>
            </div>
          );
        })()}
      </header>

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[calc(100%-1.5rem)] px-3 pointer-events-none">
          <div
            className={`px-4 py-2.5 rounded-xl text-sm font-bold text-center shadow-2xl pointer-events-auto animate-in fade-in slide-in-from-top-2 ${
              toast.kind === 'success'
                ? 'bg-emerald-500 text-white'
                : toast.kind === 'warning'
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-red-500 text-white'
            }`}
            role="status"
          >
            {toast.message}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-xl w-full mx-auto px-3 sm:px-4 py-3 space-y-3 pb-[env(safe-area-inset-bottom)]">
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-300 text-sm flex items-start gap-2">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 font-bold shrink-0">×</button>
          </div>
        )}

        {onDuty && offers.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Yangi zakazlar · {offers.length}
            </h2>
            {offers.map(offer => {
              const addr = formatAddress(offer.delivery_address);
              const mapLink = yandexMapsLink(offer.delivery_latitude ?? null, offer.delivery_longitude ?? null, addr);
              const isCash = offer.payment_type === 'CASH';
              const waiting = waitingAgo(offer.created_at);
              const isDirect = offer.offer_type === 'DIRECT';
              const busy = acceptingId === offer.id || decliningId === offer.id;
              return (
                <article
                  key={offer.id}
                  className={`rounded-2xl overflow-hidden shadow-lg ${
                    isDirect
                      ? 'bg-amber-950/30 border-2 border-amber-500/60 shadow-amber-500/10'
                      : 'bg-emerald-950/30 border-2 border-emerald-500/50 shadow-emerald-500/10'
                  }`}
                >
                  <div className="px-3 pt-2.5 pb-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${
                        isDirect ? 'text-amber-300/90' : 'text-emerald-300/80'
                      }`}>
                        #{offer.order_number.slice(-6)} · {waiting}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">
                        {offer.item_count} ta mahsulot
                      </span>
                    </div>
                    {isDirect && (
                      <p className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                        Sizga biriktirildi. Qabul qilasizmi?
                      </p>
                    )}
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <p className="font-bold text-sm leading-snug wrap-break-word flex-1">{addr}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5">
                        {isCash
                          ? <Wallet className="w-3.5 h-3.5 text-amber-400" />
                          : <CreditCard className="w-3.5 h-3.5 text-sky-400" />}
                        <span className={`text-sm font-black tracking-tight ${isCash ? 'text-amber-300' : 'text-stone-100'}`}>
                          {formatMoney(offer.total_amount)}
                          <span className="text-[10px] font-bold text-stone-500 ml-0.5">so&apos;m</span>
                        </span>
                        {isCash && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/15 border border-amber-500/40 rounded px-1 py-0.5">
                            Naqd
                          </span>
                        )}
                      </span>
                      {mapLink && (
                        <a
                          href={mapLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-black uppercase tracking-widest text-sky-300 underline underline-offset-2"
                        >
                          Yo&apos;nalish
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="px-3 pb-3 pt-1">
                    <div className={`grid gap-2 ${isDirect ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      <button
                        disabled={busy}
                        onClick={() => handleAcceptOffer(offer)}
                        className={`w-full h-11 rounded-xl font-black text-[12px] uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition shadow-md ${
                          isDirect
                            ? 'bg-amber-400 hover:bg-amber-500 text-stone-950 shadow-amber-500/30'
                            : 'bg-emerald-500 hover:bg-emerald-600 text-stone-950 shadow-emerald-500/30'
                        }`}
                      >
                        {acceptingId === offer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Qabul qilish</>}
                      </button>
                      {isDirect && (
                        <button
                          disabled={busy}
                          onClick={() => handleDeclineOffer(offer)}
                          className="w-full h-11 rounded-xl font-black text-[12px] uppercase tracking-wider flex items-center justify-center gap-2 bg-stone-900 border border-rose-500/50 text-rose-300 hover:bg-rose-500/10 disabled:opacity-60 active:scale-[0.98] transition"
                        >
                          {decliningId === offer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Ola olmayman</>}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          </div>
        ) : orders.length === 0 && offers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center mb-4">
              <Package className="w-7 h-7 text-stone-500" />
            </div>
            <p className="text-base font-bold text-stone-300">Buyurtma yo'q</p>
            <p className="text-xs mt-1 text-stone-500 max-w-xs">
              {onDuty
                ? "Yangi zakaz paydo bo'lganda shu yerda ko'rinadi va sizga taklif etiladi"
                : 'Smenani boshlash uchun yuqoridagi "Faol" tugmasini bosing'}
            </p>
          </div>
        ) : orders.length === 0 ? null : (
          orders.map(order => {
            const addressText = formatAddress(order.delivery_address);
            const mapLink = yandexMapsLink(
              order.delivery_latitude ?? null,
              order.delivery_longitude ?? null,
              addressText,
            );
            const nextLabel = order.status === 'READY' ? "YO'LGA CHIQDIM" : 'YETKAZILDI';
            const NextIcon = order.status === 'READY' ? Navigation : CheckCircle2;
            const isOpen = expanded[order.id] ?? false;
            const timing = deliveryTiming(order.assigned_at, order.created_at, targetMinutes);
            const isCash = order.payment_type === 'CASH';

            return (
              <article
                key={order.id}
                className={`rounded-2xl overflow-hidden border transition ${
                  timing.isLate
                    ? 'bg-red-950/40 border-red-500 shadow-lg shadow-red-500/20 ring-1 ring-red-500/40 animate-pulse'
                    : 'bg-stone-900 border-stone-800'
                }`}
              >
                {/* Compact summary — tap to expand */}
                <button
                  type="button"
                  onClick={() => setExpanded(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                  className="w-full text-left px-3 pt-2.5 pb-2"
                >
                  {/* Row 1: id · status badge · chevron */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest truncate">
                      #{order.order_number.slice(-6)}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full border ${statusBadge(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                      {isOpen
                        ? <ChevronUp className="w-3.5 h-3.5 text-stone-500" />
                        : <ChevronDown className="w-3.5 h-3.5 text-stone-500" />}
                    </div>
                  </div>

                  {/* Row 2: address */}
                  <div className="flex items-start gap-1.5 mb-1.5">
                    <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <p className="font-bold text-sm leading-snug wrap-break-word flex-1">
                      {addressText}
                    </p>
                  </div>

                  {/* Row 3: ETA / delay · total */}
                  <div className="flex items-center justify-between gap-2">
                    {timing.isLate ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-red-300 uppercase tracking-wider">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {timing.lateBy} daq kechikdi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-400">
                        <Timer className="w-3.5 h-3.5" />
                        {timing.remaining} daq qoldi
                        <span className="text-stone-600 font-medium">· {timing.elapsed} daq</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      {isCash
                        ? <Wallet className="w-3.5 h-3.5 text-amber-400" />
                        : <CreditCard className="w-3.5 h-3.5 text-sky-400" />}
                      <span className={`text-sm font-black tracking-tight ${isCash ? 'text-amber-300' : 'text-stone-100'}`}>
                        {formatMoney(order.total_amount)}
                        <span className="text-[10px] font-bold text-stone-500 ml-0.5">so'm</span>
                      </span>
                      {isCash && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/15 border border-amber-500/40 rounded px-1 py-0.5">
                          Naqd
                        </span>
                      )}
                    </span>
                  </div>
                </button>

                {/* Expanded detail: Yandex nav + call + items */}
                {isOpen && (
                  <div className="px-3 pb-3 space-y-2 border-t border-stone-800/60 pt-2.5">
                    <div className={`grid gap-2 ${order.customer_phone && mapLink ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {mapLink && (
                        <a
                          href={mapLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 h-10 rounded-lg bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white font-black text-[11px] uppercase tracking-wider transition"
                        >
                          <Navigation className="w-4 h-4" />
                          Yo&apos;nalish
                        </a>
                      )}
                      {order.customer_phone && (
                        <a
                          href={`tel:${order.customer_phone}`}
                          onClick={e => e.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-black text-[11px] uppercase tracking-wider active:scale-[0.98] transition"
                        >
                          <Phone className="w-4 h-4" />
                          Qo&apos;ng&apos;iroq
                        </a>
                      )}
                    </div>

                    {order.customer_phone && (
                      <p className="text-[11px] text-stone-400 truncate">
                        <span className="text-stone-500">Mijoz: </span>
                        <span className="font-bold text-stone-200">{order.customer_phone}</span>
                        {order.customer_name && <span className="text-stone-500"> · {order.customer_name}</span>}
                      </p>
                    )}

                    <div className="pt-1.5 border-t border-stone-800/60 space-y-1 text-[12px]">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                        {order.items.length} ta mahsulot
                      </p>
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-start justify-between gap-2">
                          <span className="flex-1 min-w-0 truncate text-stone-300">
                            {item.product_name?.uz ||
                              item.product_name?.ru ||
                              item.product_name?.en ||
                              Object.values(item.product_name || {})[0] ||
                              '—'}
                          </span>
                          <span className="text-stone-500 font-bold shrink-0">×{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action — primary next-step button, always visible */}
                <div className="px-3 pb-3 pt-1">
                  <button
                    disabled={updatingId === order.id}
                    onClick={() => handleAdvance(order)}
                    className={`w-full h-11 rounded-xl font-black text-[12px] uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition ${
                      order.status === 'READY'
                        ? 'bg-sky-500 hover:bg-sky-600 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-stone-950'
                    }`}
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
              </article>
            );
          })
        )}
      </main>
      <CourierBottomNav />
    </div>
  );
}
