"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ShoppingBag,
  LogOut,
  Plus,
  Minus,
  Search,
  RefreshCcw,
  Loader2,
  X,
  UserPlus,
  CheckCircle2,
  ChefHat,
  Truck,
  Store,
  Edit3,
  Phone,
  MapPin,
  Wallet,
  CreditCard,
  ChevronRight,
  AlertCircle,
  Receipt,
  TrendingUp,
  Clock3,
  Utensils,
  PackageOpen,
  AlertTriangle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  spotApi,
  publicApi,
  useAuth,
  useOrderStream,
  type Order,
  type OrderDetail,
  type OrderStatus,
  type OrderDraft,
  type Product,
  type Spot,
  type Employee,
} from '@/lib/api';
import AddressMapPickerClient from './address/AddressMapPickerClient';

type Filter = 'active' | 'new' | 'preparing' | 'ready' | 'history';

type CreateMode = 'WALK_IN' | 'PICKUP' | 'DELIVERY';

interface CartLine {
  product_id: string;
  name: string;
  price: number;
  qty: number;
}

const TERMINAL: OrderStatus[] = ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'];

type CourierStateSource = Pick<
  OrderDetail,
  'assigned_courier_name' | 'offered_courier_name' | 'courier_offer_status' | 'courier_offer_decline_reason'
>;

function productName(p: Pick<Product, 'name_i18n' | 'sku'>): string {
  return (
    p.name_i18n?.uz ||
    p.name_i18n?.ru ||
    p.name_i18n?.en ||
    p.name_i18n?.ja ||
    p.sku ||
    '—'
  );
}

function productNameFromMap(m: Record<string, string>): string {
  return m?.uz || m?.ru || m?.en || m?.ja || Object.values(m || {})[0] || '—';
}

function statusChip(status: OrderStatus) {
  switch (status) {
    case 'RECEIVED':
    case 'CONFIRMED':
      return { label: 'Yangi', cls: 'bg-red-100 text-red-700 border-red-200' };
    case 'PREPARING':
      return { label: 'Tayyorlanmoqda', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'READY':
      return { label: 'Tayyor', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    case 'ON_THE_WAY':
      return { label: "Yo'lda", cls: 'bg-sky-100 text-sky-700 border-sky-200' };
    case 'DELIVERED':
      return { label: 'Yetkazildi', cls: 'bg-stone-100 text-stone-700 border-stone-200' };
    case 'COMPLETED':
      return { label: 'Yakunlandi', cls: 'bg-stone-100 text-stone-700 border-stone-200' };
    case 'CANCELLED':
      return { label: 'Bekor qilindi', cls: 'bg-stone-100 text-stone-500 border-stone-200' };
    case 'REJECTED':
      return { label: 'Rad etildi', cls: 'bg-stone-100 text-stone-500 border-stone-200' };
    default:
      return { label: status, cls: 'bg-stone-100 text-stone-600 border-stone-200' };
  }
}

function typeLabel(type: string) {
  if (type === 'DELIVERY') return { label: 'Dostavka', icon: Truck, cls: 'text-sky-600' };
  if (type === 'PICKUP') return { label: 'Olib ketish', icon: Store, cls: 'text-emerald-600' };
  return { label: 'Joyda', icon: ShoppingBag, cls: 'text-stone-600' };
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount);
}

function getCourierState(order: CourierStateSource) {
  if (order.assigned_courier_name) {
    return {
      text: `Qabul qildi: ${order.assigned_courier_name}`,
      className: 'text-sky-600',
      title: order.assigned_courier_name,
    };
  }
  if (order.courier_offer_status === 'PENDING' && order.offered_courier_name) {
    return {
      text: `Javob kutilmoqda: ${order.offered_courier_name}`,
      className: 'text-amber-600',
      title: order.offered_courier_name,
    };
  }
  if (order.courier_offer_status === 'DECLINED' && order.offered_courier_name) {
    const reason = order.courier_offer_decline_reason?.trim();
    return {
      text: `${order.offered_courier_name} olmadi`,
      className: 'text-rose-600',
      title: reason ? `${order.offered_courier_name}: ${reason}` : order.offered_courier_name,
    };
  }
  return null;
}

function escapeHTML(s: string): string {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// Renders a printable 58mm-friendly receipt for the POS. Kept inline so
// cashiers can ship from any browser without installing a printer driver
// frontend — the browser handles formatting.
function renderReceiptHTML(o: OrderDetail): string {
  const items = o.items.map(it => {
    const name = escapeHTML(productNameFromMap(it.product_name));
    return `
      <tr>
        <td style="padding:4px 0;">${name}</td>
        <td style="text-align:center;white-space:nowrap;padding:4px 8px;">${it.quantity}×</td>
        <td style="text-align:right;white-space:nowrap;padding:4px 0;">${formatMoney(it.line_total)}</td>
      </tr>`;
  }).join('');

  const addrParts: string[] = [];
  if (o.order_type === 'DELIVERY' && o.delivery_address) {
    const a = o.delivery_address as Record<string, unknown>;
    if (a.line1) addrParts.push(String(a.line1));
    if (a.city) addrParts.push(String(a.city));
    if (a.street || a.house) addrParts.push([a.street, a.house].filter(Boolean).join(' '));
  }

  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>Chek ${escapeHTML(o.order_number)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  body { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: #000; margin: 0; padding: 8px; }
  h1 { font-size: 15px; margin: 0 0 4px; text-align: center; }
  .muted { color: #555; font-size: 11px; }
  .hr { border-top: 1px dashed #000; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  .total { font-size: 14px; font-weight: 700; }
  .center { text-align: center; }
  .right { text-align: right; }
</style>
</head><body>
  <h1>SUSHIMEI</h1>
  <div class="center muted">${escapeHTML(o.spot_name || '')}</div>
  <div class="hr"></div>
  <div>Chek: <strong>#${escapeHTML(o.order_number)}</strong></div>
  <div class="muted">${new Date(o.created_at).toLocaleString('uz-UZ')}</div>
  <div class="muted">Tur: ${o.order_type === 'DELIVERY' ? 'Dostavka' : o.order_type === 'PICKUP' ? 'Olib ketish' : 'Joyda'} · To'lov: ${o.payment_type === 'CASH' ? 'Naqd' : 'Karta'}</div>
  ${o.customer_name ? `<div class="muted">Mijoz: ${escapeHTML(o.customer_name)}</div>` : ''}
  ${o.customer_phone ? `<div class="muted">Tel: ${escapeHTML(o.customer_phone)}</div>` : ''}
  ${addrParts.length ? `<div class="muted">Manzil: ${escapeHTML(addrParts.join(', '))}</div>` : ''}
  <div class="hr"></div>
  <table>
    <thead><tr><th style="text-align:left;padding-bottom:4px;">Mahsulot</th><th style="padding-bottom:4px;">Soni</th><th class="right" style="padding-bottom:4px;">Narx</th></tr></thead>
    <tbody>${items}</tbody>
  </table>
  <div class="hr"></div>
  <table>
    <tr><td>Jami</td><td class="right total">${formatMoney(o.total_amount)} so'm</td></tr>
  </table>
  <div class="hr"></div>
  <div class="center muted">Rahmat! Yana tashrif buyuring.</div>
</body></html>`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

// Absolute timestamp in a stable, locale-agnostic form that matches the
// hover tooltip — "YYYY-MM-DD HH:MM" (or just "HH:MM" when it's today).
// Avoids the confusing "M04 14, 23:58" that Intl.DateTimeFormat produces
// for Uzbek locale short-month names.
function absoluteStamp(d: Date): string {
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const sameDay = new Date().toDateString() === d.toDateString();
  if (sameDay) return hm;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${hm}`;
}

// Human-friendly order age display. Live countdown for fresh orders, but
// long-running rows collapse to an absolute timestamp so "13007 daq" never
// ends up on screen. Thresholds:
//   <  60 min → "X daq"
//   < 120 min → "1 s 45 daq"
//   ≥   2 h  → "HH:MM" (today) or "YYYY-MM-DD HH:MM" (older)
function timeAgoOrStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
  if (mins < 60) return `${mins} daq`;
  if (mins < 120) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h} s` : `${h} s ${m} daq`;
  }
  return absoluteStamp(d);
}

// Full-precision timestamp used for the hover tooltip — "YYYY-MM-DD HH:MM:SS".
function fullStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function CashierPOSPage() {
  const { user, logout } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [detailMap, setDetailMap] = useState<Record<string, OrderDetail>>({});
  // `null` distinguishes "not yet loaded" from "loaded but empty". The modals
  // render a loading spinner for null and an empty-state for [].
  const [products, setProducts] = useState<Product[] | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [couriers, setCouriers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');
  const [, setTick] = useState(0);

  const [detailOrder, setDetailOrder] = useState<string | null>(null);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [editCart, setEditCart] = useState<CartLine[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  // Holds the order whose completion is pending cashier confirmation via
  // AlertDialog; null when the dialog is closed.
  const [forceOrder, setForceOrder] = useState<Order | null>(null);
  // Lazy loader: history orders aren't prefetched, so we fetch on demand
  // when the cashier opens their drawer.
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  // Ref mirror of detailMap so fetchOrders stays a stable useCallback while
  // still reading the latest cache without retriggering dependents.
  const detailMapRef = useRef<Record<string, OrderDetail>>({});
  useEffect(() => { detailMapRef.current = detailMap; }, [detailMap]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await spotApi.getOrders({ limit: 100, sort_by: 'created_at', sort_order: 'DESC' });
      if (!res.success) {
        setError(res.error?.message || 'Buyurtmalar yuklanmadi');
        return;
      }
      const list = res.data || [];
      setOrders(list);
      setError(null);

      // Only fetch details we don't already have. Existing orders whose
      // status flipped (visible via the list view) keep their cached items
      // — status/courier assignment arrives on the list row itself.
      const missing = list
        .filter(o => !TERMINAL.includes(o.status))
        .filter(o => !detailMapRef.current[o.id])
        .slice(0, 20);
      if (missing.length === 0) return;

      const fetched = await Promise.all(
        missing.map(async o => {
          const r = await spotApi.getOrder(o.id);
          return r.success && r.data ? (r.data as OrderDetail) : null;
        }),
      );
      setDetailMap(prev => {
        const next = { ...prev };
        fetched.forEach(d => { if (d) next[d.id] = d; });
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tarmoq xatosi');
    } finally {
      setLoading(false);
    }
  }, []);

  // Backend caps `limit` at 100; 100 comfortably covers a spot's active menu.
  const fetchProducts = useCallback(async () => {
    try {
      const r = await publicApi.getProducts({ limit: 100 });
      if (r.success) {
        setProducts(r.data || []);
        setProductsError(null);
      } else {
        setProductsError(r.error?.message || 'Mahsulotlar yuklanmadi');
        setProducts([]);
      }
    } catch (err) {
      setProductsError(err instanceof Error ? err.message : 'Tarmoq xatosi');
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    publicApi.getSpots().then(r => {
      if (r.success) setSpots(r.data || []);
    });
  }, [fetchOrders, fetchProducts]);

  // Real-time — refresh on every server event for this spot.
  useOrderStream({ onEvent: () => { fetchOrders(); } });

  // Clock tick for "Xm oldin" freshness.
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // On-duty couriers for the assign modal.
  useEffect(() => {
    const refresh = () => {
      spotApi.getCouriers(true).then(r => {
        if (r.success) setCouriers(r.data || []);
      });
    };
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      if (filter === 'new' && !(o.status === 'RECEIVED' || o.status === 'CONFIRMED')) return false;
      if (filter === 'preparing' && o.status !== 'PREPARING') return false;
      if (filter === 'ready' && !(o.status === 'READY' || o.status === 'ON_THE_WAY')) return false;
      if (filter === 'active' && TERMINAL.includes(o.status)) return false;
      if (filter === 'history' && !TERMINAL.includes(o.status)) return false;
      if (q) {
        const hay = `${o.order_number} ${o.customer_name} ${o.customer_phone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, filter, search]);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let revenue = 0;
    let active = 0;
    let readyDelivery = 0;
    let readyPickup = 0;
    for (const o of orders) {
      const d = new Date(o.created_at);
      if (d >= today && !['CANCELLED', 'REJECTED'].includes(o.status)) revenue += o.total_amount;
      if (!TERMINAL.includes(o.status)) active += 1;
      if (o.status === 'READY' && o.order_type === 'DELIVERY') readyDelivery += 1;
      if (o.status === 'READY' && o.order_type !== 'DELIVERY') readyPickup += 1;
    }
    return { revenue, active, readyDelivery, readyPickup };
  }, [orders]);

  const advance = async (o: Order) => {
    const next: OrderStatus | null = (() => {
      if (o.status === 'RECEIVED' || o.status === 'CONFIRMED') return 'PREPARING';
      if (o.status === 'PREPARING') return 'READY';
      if (o.status === 'READY' && o.order_type !== 'DELIVERY') return 'COMPLETED';
      return null;
    })();
    if (!next) return;
    setBusyAction(o.id);
    try {
      const res = await spotApi.updateOrderStatus(o.id, next);
      if (!res.success) {
        setError(res.error?.message || "Status o'zgartirilmadi");
      } else {
        await fetchOrders();
      }
    } finally {
      setBusyAction(null);
    }
  };

  // Force a delivery order to DELIVERED even if courier never marked it.
  // Two-step: open the AlertDialog first, run the transition only if the
  // cashier confirms — makes it hard to trigger by accident.
  const requestForceDeliver = (o: Order) => setForceOrder(o);

  const confirmForceDeliver = async () => {
    const o = forceOrder;
    if (!o) return;
    setForceOrder(null);
    setBusyAction(o.id);
    try {
      // READY → DELIVERED isn't a valid transition; go via ON_THE_WAY first.
      if (o.status === 'READY') {
        const r1 = await spotApi.updateOrderStatus(o.id, 'ON_THE_WAY', 'Force dispatch by cashier');
        if (!r1.success) {
          setError(r1.error?.message || "Statusni o'zgartirib bo'lmadi");
          return;
        }
      }
      const r2 = await spotApi.updateOrderStatus(o.id, 'DELIVERED', 'Force complete by cashier');
      if (!r2.success) {
        setError(r2.error?.message || "Statusni o'zgartirib bo'lmadi");
      } else {
        await fetchOrders();
      }
    } finally {
      setBusyAction(null);
    }
  };

  // Open the detail drawer for any order — fetches the detail on demand
  // when it's not in the cache yet (typical for history / terminal orders).
  const openDetail = async (orderId: string) => {
    if (detailOrder === orderId) { setDetailOrder(null); return; }
    if (detailMap[orderId]) { setDetailOrder(orderId); return; }
    setDetailLoadingId(orderId);
    try {
      const r = await spotApi.getOrder(orderId);
      if (r.success && r.data) {
        setDetailMap(prev => ({ ...prev, [orderId]: r.data as OrderDetail }));
        setDetailOrder(orderId);
      } else {
        setError(r.error?.message || 'Zakaz ma\'lumotlarini yuklab bo\'lmadi');
      }
    } finally {
      setDetailLoadingId(null);
    }
  };

  // Lazy receipt — ensures detail is loaded before opening the print window.
  const printOrderReceipt = async (orderId: string) => {
    let detail = detailMap[orderId];
    if (!detail) {
      const r = await spotApi.getOrder(orderId);
      if (!r.success || !r.data) {
        setError(r.error?.message || "Chekni tayyorlab bo'lmadi");
        return;
      }
      detail = r.data as OrderDetail;
      setDetailMap(prev => ({ ...prev, [orderId]: detail }));
    }
    printReceipt(detail);
  };

  const printReceipt = (detail: OrderDetail) => {
    // Use a blob URL instead of the deprecated document.write — Chrome
    // warns loudly about the latter and it breaks on stricter CSP setups.
    const html = renderReceiptHTML(detail);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank', 'width=420,height=640');
    if (!w) {
      URL.revokeObjectURL(url);
      setError("Brauzer yangi oynani blokladi. Popup ruxsatini bering.");
      return;
    }
    w.focus();
    w.addEventListener('load', () => {
      try { w.print(); } catch { /* ignore */ }
      // Give the print dialog time to grab the HTML before we release the URL.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    });
  };

  const openEdit = (o: Order) => {
    const detail = detailMap[o.id];
    if (!detail) return;
    setEditCart(
      detail.items.map(it => ({
        product_id: it.product_id,
        name: productNameFromMap(it.product_name),
        price: it.unit_price,
        qty: it.quantity,
      })),
    );
    setEditOrderId(o.id);
    setEditError(null);
  };

  const addToEditCart = (product: Product) => {
    setEditCart(prev => {
      const existing = prev.find(l => l.product_id === product.id);
      if (existing) {
        return prev.map(l => l.product_id === product.id ? { ...l, qty: l.qty + 1 } : l);
      }
      return [...prev, { product_id: product.id, name: productName(product), price: product.base_price, qty: 1 }];
    });
  };

  const saveEdit = async () => {
    if (!editOrderId || editCart.length === 0) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await spotApi.updateOrderItems(
        editOrderId,
        editCart.map(l => ({ product_id: l.product_id, quantity: l.qty })),
      );
      if (!res.success) {
        setEditError(res.error?.detail || res.error?.message || 'Saqlab bo‘lmadi');
        return;
      }
      // Invalidate the cached detail so the drawer/list preview picks up
      // the new item list on the next fetch.
      setDetailMap(prev => {
        const next = { ...prev };
        delete next[editOrderId];
        return next;
      });
      setEditOrderId(null);
      await fetchOrders();
    } finally {
      setEditSaving(false);
    }
  };

  const doAssignCourier = async (courierId: string) => {
    if (!assignOrderId) return;
    setAssigning(true);
    setAssignError(null);
    try {
      const res = await spotApi.assignCourier(assignOrderId, courierId);
      if (!res.success) {
        setAssignError(res.error?.message || 'Taklif yuborilmadi');
        return;
      }
      setAssignOrderId(null);
      await fetchOrders();
    } finally {
      setAssigning(false);
    }
  };

  const spotName = spots[0]?.name ?? '';

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col">
      {/* Top Bar */}
      <header className="h-16 border-b border-stone-200 px-4 md:px-6 flex items-center justify-between bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src="/brand/sushimei-logo.png"
            alt="Sushi Mei"
            className="w-10 h-10 object-contain rounded-xl border border-stone-200 bg-white p-0.5 shadow-sm"
          />
          <div>
            <h1 className="text-sm font-black tracking-tight leading-none uppercase">SUSHI MEI</h1>
            <p className="text-[10px] text-stone-500 mt-1 flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              POS · {spotName || 'Live'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow"
          >
            <Plus className="w-4 h-4" /> Yangi zakaz
          </button>
          <button
            onClick={fetchOrders}
            className="h-10 w-10 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center"
            aria-label="Yangilash"
          >
            <RefreshCcw className="w-4 h-4 text-stone-600" />
          </button>
          <div className="h-6 w-px bg-stone-200 mx-1 hidden md:block" />
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-stone-900">
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'Staff'}
            </p>
            <p className="text-[10px] text-stone-500 uppercase tracking-wider">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="h-10 w-10 rounded-lg bg-stone-100 hover:bg-red-600 hover:text-white text-stone-700 flex items-center justify-center"
            aria-label="Chiqish"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Stats Row */}
      <div className="px-4 md:px-6 pt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Bugungi savdo" value={`${formatMoney(stats.revenue)} so'm`} tint="emerald" />
        <StatCard icon={Clock3} label="Faol zakazlar" value={stats.active.toString()} tint="amber" />
        <StatCard icon={Truck} label="Kuryer kutmoqda" value={stats.readyDelivery.toString()} tint="sky" />
        <StatCard icon={Receipt} label="Mijoz kutmoqda" value={stats.readyPickup.toString()} tint="stone" />
      </div>

      {/* Filters + Search */}
      <div className="px-4 md:px-6 py-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-1 bg-white rounded-xl border border-stone-200 p-1 shadow-sm">
          {([
            ['active', 'Faol'],
            ['new', 'Yangi'],
            ['preparing', 'Tayyorlanmoqda'],
            ['ready', 'Tayyor'],
            ['history', 'Tarix'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition ${
                filter === key ? 'bg-emerald-600 text-white shadow' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Zakaz raqami, ism, telefon..."
            className="w-full h-10 pl-10 pr-3 rounded-xl bg-white border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      {/* Main table */}
      <main className="flex-1 px-4 md:px-6 pb-4 overflow-hidden">
        {error && (
          <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-[10px] uppercase tracking-widest text-stone-500 border-b border-stone-200 bg-stone-50/50">
                  <th className="px-3 py-3 font-bold">#</th>
                  <th className="px-3 py-3 font-bold">Vaqt</th>
                  <th className="px-3 py-3 font-bold">Tur</th>
                  <th className="px-3 py-3 font-bold">Mijoz</th>
                  <th className="px-3 py-3 font-bold text-right">Jami</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-3 py-3 font-bold text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500 inline" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-stone-500 text-sm">
                      Zakaz topilmadi
                    </td>
                  </tr>
                ) : filtered.map(o => {
                  const chip = statusChip(o.status);
                  const type = typeLabel(o.order_type);
                  const detail = detailMap[o.id];
                  const TypeIcon = type.icon;
                  const courierState = getCourierState(o);
                  const canAccept = o.status === 'RECEIVED' || o.status === 'CONFIRMED';
                  const canReady = o.status === 'PREPARING';
                  const canHandOver = o.status === 'READY' && o.order_type !== 'DELIVERY';
                  const hasPendingCourierOffer =
                    o.order_type === 'DELIVERY' &&
                    o.status === 'READY' &&
                    !o.assigned_courier_id &&
                    o.courier_offer_status === 'PENDING' &&
                    !!o.offered_courier_id;
                  const canAssign =
                    o.status === 'READY' &&
                    o.order_type === 'DELIVERY' &&
                    !o.assigned_courier_id &&
                    !hasPendingCourierOffer;
                  const assignLabel = o.courier_offer_status === 'DECLINED' ? 'Qayta' : 'Kuryer';
                  const canEdit = o.status === 'RECEIVED' && !!detail;
                  // Staff can force-complete a delivery that's stuck (courier
                  // never picked up or didn't mark delivered). We gate with a
                  // confirm dialog in the onClick handler.
                  const canForceDeliver = o.order_type === 'DELIVERY' &&
                    (o.status === 'READY' || o.status === 'ON_THE_WAY');
                  // Chek tugmasi har doim bor — detail bo'lmasa on-demand yuklanadi.
                  const canPrint = true;
                  return (
                    <tr
                      key={o.id}
                      className={`hover:bg-emerald-50/40 cursor-pointer transition ${
                        detailOrder === o.id ? 'bg-emerald-50' : ''
                      }`}
                      onClick={() => openDetail(o.id)}
                    >
                      <td className="px-3 py-3">
                        <span className="font-mono text-[11px] font-bold text-emerald-700">{o.order_number.slice(-6)}</span>
                      </td>
                      <td
                        className="px-3 py-3 text-xs text-stone-600 whitespace-nowrap"
                        title={fullStamp(o.created_at)}
                      >
                        {timeAgoOrStamp(o.created_at)}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold ${type.cls}`}>
                          <TypeIcon className="w-3.5 h-3.5" /> {type.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs font-bold text-stone-900 truncate max-w-40">
                          {o.customer_name || '—'}
                        </div>
                        <div className="text-[10px] text-stone-500 truncate">{o.customer_phone || ''}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-sm whitespace-nowrap">{formatMoney(o.total_amount)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${chip.cls}`}>
                          {chip.label}
                        </span>
                        {courierState && (
                          <div
                            className={`text-[10px] mt-1 font-medium truncate ${courierState.className}`}
                            title={courierState.title}
                          >
                            → {courierState.text}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          {canEdit && (
                            <ActionBtn
                              label="Tahrirlash"
                              icon={Edit3}
                              tint="stone"
                              disabled={busyAction === o.id}
                              onClick={(e) => { e.stopPropagation(); openEdit(o); }}
                            />
                          )}
                          {canAccept && (
                            <ActionBtn
                              label="Qabul"
                              icon={ChefHat}
                              tint="amber"
                              disabled={busyAction === o.id}
                              onClick={(e) => { e.stopPropagation(); advance(o); }}
                            />
                          )}
                          {canReady && (
                            <ActionBtn
                              label="Tayyor"
                              icon={CheckCircle2}
                              tint="emerald"
                              disabled={busyAction === o.id}
                              onClick={(e) => { e.stopPropagation(); advance(o); }}
                            />
                          )}
                          {canHandOver && (
                            <ActionBtn
                              label="Berildi"
                              icon={CheckCircle2}
                              tint="emerald"
                              disabled={busyAction === o.id}
                              onClick={(e) => { e.stopPropagation(); advance(o); }}
                            />
                          )}
                          {canAssign && (
                            <ActionBtn
                              label={assignLabel}
                              icon={UserPlus}
                              tint="sky"
                              disabled={busyAction === o.id}
                              onClick={(e) => { e.stopPropagation(); setAssignError(null); setAssignOrderId(o.id); }}
                            />
                          )}
                          {canForceDeliver && (
                            <ActionBtn
                              label="Yakunlash"
                              icon={CheckCircle2}
                              tint="rose"
                              disabled={busyAction === o.id}
                              onClick={(e) => { e.stopPropagation(); requestForceDeliver(o); }}
                            />
                          )}
                          {canPrint && (
                            <ActionBtn
                              label="Chek"
                              icon={Receipt}
                              tint="stone"
                              onClick={(e) => { e.stopPropagation(); printOrderReceipt(o.id); }}
                            />
                          )}
                          <button
                            type="button"
                            disabled={detailLoadingId === o.id}
                            onClick={(e) => { e.stopPropagation(); openDetail(o.id); }}
                            className="h-8 w-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-50 flex items-center justify-center transition"
                            aria-label="Batafsil"
                          >
                            {detailLoadingId === o.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Detail drawer */}
      {detailOrder && detailMap[detailOrder] && (
        <DetailDrawer
          detail={detailMap[detailOrder]}
          onClose={() => setDetailOrder(null)}
        />
      )}

      {/* Assign courier modal */}
      {assignOrderId && (
        <AssignCourierModal
          couriers={couriers}
          assigning={assigning}
          error={assignError}
          onPick={doAssignCourier}
          onClose={() => !assigning && setAssignOrderId(null)}
        />
      )}

      {/* Edit items modal */}
      {editOrderId && (
        <EditItemsModal
          detail={detailMap[editOrderId] || null}
          products={products}
          productsError={productsError}
          onRefetchProducts={fetchProducts}
          cart={editCart}
          setCart={setEditCart}
          saving={editSaving}
          error={editError}
          onSave={saveEdit}
          onClose={() => !editSaving && setEditOrderId(null)}
          onAddProduct={addToEditCart}
        />
      )}

      {/* Create order modal */}
      {createOpen && (
        <CreateOrderModal
          products={products}
          productsError={productsError}
          onRefetchProducts={fetchProducts}
          spots={spots}
          onClose={() => setCreateOpen(false)}
          onCreated={async () => { setCreateOpen(false); await fetchOrders(); }}
        />
      )}

      {/* Force-complete confirmation */}
      <AlertDialog
        open={forceOrder !== null}
        onOpenChange={(open) => { if (!open) setForceOrder(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <AlertDialogTitle>Majburiy yakunlash</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              {forceOrder && (
                <>
                  <span className="block font-bold text-stone-900 mb-1">
                    #{forceOrder.order_number}
                  </span>
                  {forceOrder.status === 'READY'
                    ? "Kuryer hali zakazni qabul qilmagan. Davom etsangiz, zakaz bevosita \"Yetkazildi\" holatiga o'tadi va mijozning lentasida ham shunday ko'rinadi."
                    : "Kuryer \"Yo'lda\" holatida. Davom etsangiz, zakaz bevosita \"Yetkazildi\" holatiga o'tadi."}
                  <span className="block mt-2 text-[11px] text-stone-500">
                    Bu amalni qaytarib bo'lmaydi.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmForceDeliver}
              className="bg-rose-600 hover:bg-rose-700 text-white border-none shadow-lg shadow-rose-600/20"
            >
              Ha, yakunlash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============ Subcomponents ============

function CatalogGrid({
  products, filtered, productsError, onRetry, onPick, getQty,
}: {
  products: Product[] | null;
  filtered: Product[];
  productsError: string | null;
  onRetry: () => void;
  onPick: (p: Product) => void;
  getQty?: (productId: string) => number;
}) {
  if (productsError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-xs">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-sm font-bold text-red-700">{productsError}</p>
          <button
            onClick={onRetry}
            className="px-4 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider"
          >
            Qaytadan urinish
          </button>
        </div>
      </div>
    );
  }

  if (products === null) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <PackageOpen className="w-10 h-10 text-stone-300 mx-auto" />
          <p className="text-sm font-bold text-stone-500">
            {products.length === 0 ? "Mahsulotlar topilmadi" : "Qidiruv bo'yicha natija yo'q"}
          </p>
          {products.length === 0 && (
            <button
              onClick={onRetry}
              className="mt-2 px-4 h-9 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-bold uppercase tracking-wider"
            >
              Qayta yuklash
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 content-start">
      {filtered.slice(0, 80).map(p => {
        const qty = getQty ? getQty(p.id) : 0;
        const inCart = qty > 0;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            aria-label={`${productName(p)} qo'shish`}
            className={`group relative bg-white border rounded-2xl overflow-hidden transition flex flex-col text-left active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
              inCart
                ? 'border-emerald-500 shadow-md shadow-emerald-500/10'
                : 'border-stone-200 hover:border-emerald-400 hover:shadow-md'
            }`}
          >
            <div className="relative aspect-square w-full bg-stone-100 overflow-hidden">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image_url}
                  alt={productName(p)}
                  loading="lazy"
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.04]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Utensils className="w-10 h-10 text-stone-300" />
                </div>
              )}
              {p.category_name && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/85 backdrop-blur-sm text-[9px] font-black uppercase tracking-wider text-stone-600 shadow-sm">
                  {p.category_name}
                </span>
              )}
              {inCart && (
                <span className="absolute top-2 right-2 min-w-7 h-7 px-1.5 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shadow-md ring-2 ring-white">
                  {qty}
                </span>
              )}
            </div>

            <div className="px-3 pt-2.5 pb-3 flex-1 flex flex-col gap-1.5">
              <p className="text-[13px] font-bold leading-snug line-clamp-2 text-stone-900">
                {productName(p)}
              </p>
              <p className="text-sm font-black text-emerald-700 tabular-nums mt-auto">
                {formatMoney(p.base_price)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tint }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string;
  tint: 'emerald' | 'amber' | 'sky' | 'stone';
}) {
  const tints = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
    stone: 'bg-stone-50 text-stone-700 border-stone-200',
  };
  return (
    <div className={`${tints[tint]} border rounded-xl p-3 flex items-center gap-3`}>
      <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
        <p className="text-lg font-black tracking-tight truncate">{value}</p>
      </div>
    </div>
  );
}

function ActionBtn({
  label,
  icon: Icon,
  tint,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: 'emerald' | 'amber' | 'sky' | 'stone' | 'rose';
  disabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const tints = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    amber: 'bg-amber-500 hover:bg-amber-600 text-white',
    sky: 'bg-sky-600 hover:bg-sky-700 text-white',
    stone: 'bg-stone-100 hover:bg-stone-200 text-stone-700',
    rose: 'bg-rose-600 hover:bg-rose-700 text-white',
  };
  return (
    <button
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`h-8 px-2.5 rounded-lg ${tints[tint]} disabled:opacity-50 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition whitespace-nowrap`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
    </button>
  );
}

function DetailDrawer({ detail, onClose }: { detail: OrderDetail; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Zakaz</p>
            <h3 className="text-lg font-black tracking-tight">#{detail.order_number}</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Status" value={statusChip(detail.status).label} />
            <DetailField label="Tur" value={typeLabel(detail.order_type).label} />
            <DetailField label="To'lov" value={detail.payment_type === 'CASH' ? 'Naqd' : 'Karta'} />
            <DetailField label="Jami" value={`${formatMoney(detail.total_amount)} so'm`} />
          </div>

          {detail.customer_name || detail.customer_phone ? (
            <div className="rounded-xl border border-stone-200 p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Mijoz</p>
              {detail.customer_name && <p className="text-sm font-bold">{detail.customer_name}</p>}
              {detail.customer_phone && (
                <a href={`tel:${detail.customer_phone}`} className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
                  <Phone className="w-3.5 h-3.5" /> {detail.customer_phone}
                </a>
              )}
            </div>
          ) : null}

          {detail.order_type === 'DELIVERY' && detail.delivery_address && (
            <div className="rounded-xl border border-stone-200 p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Manzil</p>
              <div className="flex items-start gap-1.5 text-sm">
                <MapPin className="w-3.5 h-3.5 text-sky-600 mt-0.5 shrink-0" />
                <p className="text-stone-700">
                  {[
                    detail.delivery_address.line1,
                    detail.delivery_address.city,
                    detail.delivery_address.street,
                    detail.delivery_address.house,
                    detail.delivery_address.entrance && `Kirish ${detail.delivery_address.entrance}`,
                    detail.delivery_address.floor && `${detail.delivery_address.floor}-qavat`,
                    detail.delivery_address.apartment && `kv. ${detail.delivery_address.apartment}`,
                  ].filter(Boolean).map(String).join(', ') || '—'}
                </p>
              </div>
              {detail.assigned_courier_name && (
                <p className="text-[11px] text-sky-700 font-medium">Qabul qilgan kuryer: {detail.assigned_courier_name}</p>
              )}
              {!detail.assigned_courier_name && detail.courier_offer_status === 'PENDING' && detail.offered_courier_name && (
                <p className="text-[11px] text-amber-700 font-medium">
                  Taklif yuborildi: {detail.offered_courier_name}. Javob kutilmoqda.
                </p>
              )}
              {!detail.assigned_courier_name && detail.courier_offer_status === 'DECLINED' && detail.offered_courier_name && (
                <p className="text-[11px] text-rose-700 font-medium">
                  {detail.offered_courier_name} zakazni olmadi{detail.courier_offer_decline_reason ? `: ${detail.courier_offer_decline_reason}` : '.'}
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-stone-200">
            <div className="px-3 py-2 border-b border-stone-200 bg-stone-50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Mahsulotlar ({detail.items.length})</p>
            </div>
            <div className="divide-y divide-stone-100">
              {detail.items.map(item => (
                <div key={item.id} className="px-3 py-2 flex items-center justify-between gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{productNameFromMap(item.product_name)}</p>
                    <p className="text-[11px] text-stone-500">
                      {formatMoney(item.unit_price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-bold text-sm">{formatMoney(item.line_total)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 p-2.5">
      <p className="text-[9px] font-bold uppercase tracking-widest text-stone-500 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-stone-900 truncate">{value}</p>
    </div>
  );
}

function AssignCourierModal({
  couriers, assigning, error, onPick, onClose,
}: {
  couriers: Employee[]; assigning: boolean; error: string | null;
  onPick: (id: string) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <h3 className="text-lg font-black tracking-tight">Kuryerga taklif yuborish</h3>
          <button onClick={onClose} disabled={assigning} className="h-9 w-9 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto space-y-2">
          {couriers.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-stone-500">Hozirda smenadagi kuryer yo'q.</p>
              <p className="text-[11px] text-stone-400 mt-1">Kuryer app'ida "Faol" tugmasini bosish kerak.</p>
            </div>
          ) : couriers.map(c => {
            const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email;
            return (
              <button
                key={c.id}
                disabled={assigning}
                onClick={() => onPick(c.id)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-stone-200 hover:border-sky-500 hover:bg-sky-50 disabled:opacity-50 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-bold truncate">{name}</p>
                    {c.phone && <p className="text-[11px] text-stone-500 truncate">{c.phone}</p>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>
            );
          })}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
          {assigning && (
            <div className="flex items-center justify-center gap-2 text-sm text-stone-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Taklif yuborilmoqda...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditItemsModal({
  detail, products, productsError, onRefetchProducts, cart, setCart, saving, error, onSave, onClose, onAddProduct,
}: {
  detail: OrderDetail | null;
  products: Product[] | null;
  productsError: string | null;
  onRefetchProducts: () => void;
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
  onAddProduct: (p: Product) => void;
}) {
  const [q, setQ] = useState('');

  useEffect(() => {
    if (products === null) onRefetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    const qq = q.trim().toLowerCase();
    return products.filter(p => p.is_active && (!qq || productName(p).toLowerCase().includes(qq)));
  }, [products, q]);

  const total = cart.reduce((a, l) => a + l.price * l.qty, 0);

  // Type + payment + customer + address come from the order and can't be
  // changed in edit (cashier should cancel and recreate if those must
  // change). We show them read-only so the cashier has context while
  // tweaking items.
  const typeInfo = detail ? typeLabel(detail.order_type) : null;
  const addrText = detail?.delivery_address
    ? [
        (detail.delivery_address as Record<string, unknown>).line1,
        (detail.delivery_address as Record<string, unknown>).city,
        (detail.delivery_address as Record<string, unknown>).street,
        (detail.delivery_address as Record<string, unknown>).house,
      ].filter(Boolean).map(String).join(', ')
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl h-full md:h-[92vh] bg-white md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="flex-1 flex flex-col border-r border-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-black tracking-tight truncate">
                Tahrirlash {detail ? `· #${detail.order_number}` : ''}
              </h3>
            </div>
            <div className="relative flex-1 max-w-xs ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Mahsulot qidirish..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <button onClick={onClose} disabled={saving} className="h-9 w-9 rounded-lg bg-stone-100 hover:bg-stone-200 md:hidden flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          <CatalogGrid
            products={products}
            filtered={filtered}
            productsError={productsError}
            onRetry={onRefetchProducts}
            onPick={onAddProduct}
            getQty={(id) => cart.find(l => l.product_id === id)?.qty ?? 0}
          />
        </div>
        <div className="w-full md:w-96 flex flex-col bg-stone-50 overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <h4 className="text-sm font-black uppercase tracking-widest">Zakaz</h4>
            <button onClick={onClose} disabled={saving} className="h-8 w-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 hidden md:flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Cart lines */}
            {cart.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-3">Savat bo'sh</p>
            ) : cart.map(line => (
              <div key={line.product_id} className="bg-white rounded-lg border border-stone-200 p-2.5 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{line.name}</p>
                  <p className="text-[11px] text-stone-500">{formatMoney(line.price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCart(prev => prev.flatMap(l =>
                      l.product_id === line.product_id ? (l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : []) : [l]
                    ))}
                    className="w-7 h-7 rounded-md bg-stone-100 hover:bg-stone-200 flex items-center justify-center"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{line.qty}</span>
                  <button
                    onClick={() => setCart(prev => prev.map(l => l.product_id === line.product_id ? { ...l, qty: l.qty + 1 } : l))}
                    className="w-7 h-7 rounded-md bg-stone-100 hover:bg-stone-200 flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Read-only order context */}
            {detail && (
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <div className="grid grid-cols-2 gap-2">
                  <ReadOnlyField
                    label="Tur"
                    value={typeInfo?.label || ''}
                  />
                  <ReadOnlyField
                    label="To'lov"
                    value={detail.payment_type === 'CASH' ? 'Naqd' : 'Karta'}
                  />
                </div>
                {(detail.customer_name || detail.customer_phone) && (
                  <ReadOnlyField
                    label="Mijoz"
                    value={[detail.customer_name, detail.customer_phone].filter(Boolean).join(' · ') || '—'}
                  />
                )}
                {detail.order_type === 'DELIVERY' && addrText && (
                  <ReadOnlyField label="Manzil" value={addrText} />
                )}
                <p className="text-[10px] text-amber-600">
                  Tur, to'lov, mijoz va manzilni o'zgartirib bo'lmaydi. Faqat mahsulotlar va miqdor.
                </p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-stone-200 bg-white space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-bold text-stone-600">Jami</span>
              <span className="font-black text-lg text-emerald-700">{formatMoney(total)} so'm</span>
            </div>
            {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</div>}
            <button
              disabled={cart.length === 0 || saving}
              onClick={onSave}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saqlanmoqda...</> : 'Saqlash'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white border border-stone-200 px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-widest text-stone-500 mb-0.5">{label}</p>
      <p className="text-xs font-bold text-stone-900 wrap-break-word">{value || '—'}</p>
    </div>
  );
}

function CreateOrderModal({
  products, productsError, onRefetchProducts, spots, onClose, onCreated,
}: {
  products: Product[] | null;
  productsError: string | null;
  onRefetchProducts: () => void;
  spots: Spot[];
  onClose: () => void; onCreated: () => void;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [mode, setMode] = useState<CreateMode>('WALK_IN');
  const [payment, setPayment] = useState<'CASH' | 'CARD'>('CASH');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [addrLine, setAddrLine] = useState('');
  const [addrNotes, setAddrNotes] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [house, setHouse] = useState('');
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [search, setSearch] = useState('');
  const [spotId, setSpotId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const errRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (products === null) onRefetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    return products.filter(p => p.is_active && (!q || productName(p).toLowerCase().includes(q)));
  }, [products, search]);

  const total = cart.reduce((a, l) => a + l.price * l.qty, 0);

  const addProduct = (p: Product) => {
    setCart(prev => {
      const ex = prev.find(l => l.product_id === p.id);
      if (ex) return prev.map(l => l.product_id === p.id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { product_id: p.id, name: productName(p), price: p.base_price, qty: 1 }];
    });
  };

  const submit = async () => {
    if (cart.length === 0) { setErr('Savat bo\'sh'); return; }
    if (mode === 'DELIVERY') {
      if (!customerPhone.trim()) { setErr('Telefon kerak'); return; }
      if (!addrLine.trim() && (lat == null || lng == null)) { setErr('Manzil kerak'); return; }
    }
    setSubmitting(true);
    setErr(null);
    try {
      const activeSpot = spots.find(s => s.is_active);
      const draft: OrderDraft = {
        spot_id: spotId || activeSpot?.id || '',
        order_type: mode,
        payment_type: payment,
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        delivery_address: mode === 'DELIVERY'
          ? {
              line1: addrLine.trim(),
              ...(addrNotes.trim() ? { delivery_notes: addrNotes.trim() } : {}),
              ...(lat != null && lng != null ? { latitude: lat, longitude: lng } : {}),
              ...(city ? { city } : {}),
              ...(street ? { street } : {}),
              ...(house ? { house } : {}),
              ...(entrance ? { entrance } : {}),
              ...(floor ? { floor } : {}),
              ...(apartment ? { apartment } : {}),
            }
          : undefined,
        items: cart.map(l => ({ product_id: l.product_id, quantity: l.qty })),
      };
      const res = await spotApi.createOrder(draft);
      if (!res.success) {
        const msg = res.error?.detail || res.error?.message || 'Zakaz yaratilmadi';
        setErr(msg);
        errRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={() => !submitting && onClose()} />
      <div className="relative w-full max-w-6xl h-full md:h-[92vh] bg-white md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Catalog */}
        <div className="flex-1 flex flex-col border-r border-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center gap-3">
            <h3 className="text-base font-black tracking-tight">Yangi zakaz</h3>
            <div className="relative flex-1 max-w-xs ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Mahsulot qidirish..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-stone-50 border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <button onClick={onClose} disabled={submitting} className="h-9 w-9 rounded-lg bg-stone-100 hover:bg-stone-200 md:hidden flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          <CatalogGrid
            products={products}
            filtered={filtered}
            productsError={productsError}
            onRetry={onRefetchProducts}
            onPick={addProduct}
            getQty={(id) => cart.find(l => l.product_id === id)?.qty ?? 0}
          />
        </div>
        {/* Cart + details */}
        <div className="w-full md:w-96 flex flex-col bg-stone-50 overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <h4 className="text-sm font-black uppercase tracking-widest">Zakaz</h4>
            <button onClick={onClose} disabled={submitting} className="h-8 w-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 hidden md:flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* cart */}
            {cart.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-3">Savat bo'sh</p>
            ) : cart.map(line => (
              <div key={line.product_id} className="bg-white rounded-lg border border-stone-200 p-2.5 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{line.name}</p>
                  <p className="text-[11px] text-stone-500">{formatMoney(line.price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCart(prev => prev.flatMap(l => l.product_id === line.product_id ? (l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : []) : [l]))}
                    className="w-7 h-7 rounded-md bg-stone-100 hover:bg-stone-200 flex items-center justify-center"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{line.qty}</span>
                  <button
                    onClick={() => setCart(prev => prev.map(l => l.product_id === line.product_id ? { ...l, qty: l.qty + 1 } : l))}
                    className="w-7 h-7 rounded-md bg-stone-100 hover:bg-stone-200 flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Type */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5">Tur</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(['WALK_IN', 'PICKUP', 'DELIVERY'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                      mode === m ? 'bg-emerald-600 text-white shadow' : 'bg-white border border-stone-200 text-stone-600'
                    }`}
                  >
                    {m === 'WALK_IN' ? 'Joyda' : m === 'PICKUP' ? 'Olib ketish' : 'Dostavka'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5">To'lov</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setPayment('CASH')}
                  className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
                    payment === 'CASH' ? 'bg-amber-500 text-white shadow' : 'bg-white border border-stone-200 text-stone-600'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" /> Naqd
                </button>
                <button
                  onClick={() => setPayment('CARD')}
                  className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
                    payment === 'CARD' ? 'bg-sky-500 text-white shadow' : 'bg-white border border-stone-200 text-stone-600'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" /> Karta
                </button>
              </div>
            </div>

            {mode !== 'WALK_IN' && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Mijoz</p>
                <input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Ism"
                  className="w-full h-9 px-3 rounded-lg bg-white border border-stone-200 text-sm"
                />
                <input
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="+998 ..."
                  type="tel"
                  className="w-full h-9 px-3 rounded-lg bg-white border border-stone-200 text-sm"
                />
              </div>
            )}

            {mode === 'DELIVERY' && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Manzil</p>
                <div className="h-48 w-full">
                  <AddressMapPickerClient
                    latitude={lat}
                    longitude={lng}
                    onChange={(la, ln, g) => {
                      setLat(la); setLng(ln);
                      if (g) {
                        if (g.city && !city) setCity(g.city);
                        if (g.street && !street) setStreet(g.street);
                        if (g.house && !house) setHouse(g.house);
                      }
                      const parts = [g?.city || city, [(g?.street || street), (g?.house || house)].filter(Boolean).join(' ')].filter(Boolean);
                      if (parts.length) setAddrLine(parts.join(', '));
                    }}
                  />
                </div>
                <textarea
                  value={addrLine}
                  onChange={e => setAddrLine(e.target.value)}
                  rows={2}
                  placeholder="Ko'cha, uy, kvartira"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-stone-200 text-sm resize-none"
                />
                <div className="grid grid-cols-3 gap-1.5">
                  <input value={entrance} onChange={e => setEntrance(e.target.value)} placeholder="Kirish" className="h-9 px-2 rounded-lg bg-white border border-stone-200 text-xs" />
                  <input value={floor} onChange={e => setFloor(e.target.value)} placeholder="Qavat" className="h-9 px-2 rounded-lg bg-white border border-stone-200 text-xs" />
                  <input value={apartment} onChange={e => setApartment(e.target.value)} placeholder="Kv." className="h-9 px-2 rounded-lg bg-white border border-stone-200 text-xs" />
                </div>
                <input
                  value={addrNotes}
                  onChange={e => setAddrNotes(e.target.value)}
                  placeholder="Qo'shimcha izoh"
                  className="w-full h-9 px-3 rounded-lg bg-white border border-stone-200 text-sm"
                />
              </div>
            )}

            {spots.length > 1 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5">Filial</p>
                <select
                  value={spotId}
                  onChange={e => setSpotId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-white border border-stone-200 text-sm"
                >
                  <option value="">Avto (profil bo'yicha)</option>
                  {spots.filter(s => s.is_active).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div ref={errRef} />
            {err && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">{err}</div>}
          </div>

          <div className="p-4 border-t border-stone-200 bg-white space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-bold text-stone-600">Jami</span>
              <span className="font-black text-lg text-emerald-700">{formatMoney(total)} so'm</span>
            </div>
            <button
              disabled={submitting || cart.length === 0}
              onClick={submit}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Yaratilmoqda...</> : 'Zakazni yaratish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
