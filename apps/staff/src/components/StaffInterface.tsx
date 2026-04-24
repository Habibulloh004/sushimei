"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check, Clock, ChefHat, ArrowRight, AlertCircle, X, Printer,
  Bell, Utensils, Search, Plus, Minus, History, PlusCircle,
  ArrowLeft, ShoppingCart, User, CheckCircle2, ChevronRight,
  Filter, SlidersHorizontal, RefreshCcw, Loader2, XCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Pagination } from './ui/pagination';
import {
  spotApi,
  publicApi,
  useAuth,
  useOrderStream,
  type Order,
  type Product,
  type Spot,
  type OrderStatus,
  type OrderDraft,
  type OrderDetail,
  type OrderDetailItem,
  type Employee,
} from '@/lib/api';
import AddressMapPickerClient from './address/AddressMapPickerClient';

// Queue order type for display
interface QueueOrder {
  id: string;
  order_number: string;
  type: string;
  customer: string;
  customer_phone: string;
  items: OrderDetailItem[];
  time: string;
  status: OrderStatus;
  priority: boolean;
  total_amount: number;
  created_at: string;
}

// Manual cart item
interface CartItem {
  id: string;
  name: string;
  price: number;
  category: string;
  qty: number;
}

export const StaffInterface = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('incoming');
  const [selectedOrder, setSelectedOrder] = useState<QueueOrder | null>(null);
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [manualCart, setManualCart] = useState<CartItem[]>([]);

  // API data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string>('');
  const [orderDetailsCache, setOrderDetailsCache] = useState<Record<string, OrderDetailItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersMeta, setOrdersMeta] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [manualError, setManualError] = useState<string | null>(null);
  const [couriers, setCouriers] = useState<Employee[]>([]);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [assigningCourier, setAssigningCourier] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [orderDetailMap, setOrderDetailMap] = useState<Record<string, OrderDetail>>({});
  // Manual order extended fields
  const [manualOrderType, setManualOrderType] = useState<'WALK_IN' | 'PICKUP' | 'DELIVERY'>('WALK_IN');
  const [manualPaymentType, setManualPaymentType] = useState<'CASH' | 'CARD'>('CASH');
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerPhone, setManualCustomerPhone] = useState('');
  const [manualAddressLine, setManualAddressLine] = useState('');
  const [manualAddressNotes, setManualAddressNotes] = useState('');
  const [manualLat, setManualLat] = useState<number | null>(null);
  const [manualLng, setManualLng] = useState<number | null>(null);
  const [manualAddrCity, setManualAddrCity] = useState('');
  const [manualAddrStreet, setManualAddrStreet] = useState('');
  const [manualAddrHouse, setManualAddrHouse] = useState('');
  const [manualAddrEntrance, setManualAddrEntrance] = useState('');
  const [manualAddrFloor, setManualAddrFloor] = useState('');
  const [manualAddrApartment, setManualAddrApartment] = useState('');
  const lastClickRef = useRef<{ id: string; time: number } | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Role-based feature flags
  const role = user?.role || 'KITCHEN';
  const canCreateOrders = role !== 'COURIER';
  const canDispatch = role === 'COURIER' || role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER' || role === 'SPOT_OPERATOR';
  const canCook = role === 'KITCHEN' || role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER' || role === 'SPOT_OPERATOR';
  const canHandover = role === 'KITCHEN' || role === 'CASHIER' || role === 'SPOT_OPERATOR' || role === 'COURIER' || role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER';
  const canManageAll = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER';
  const canAssignCourier = role === 'CASHIER' || role === 'SPOT_OPERATOR' || canManageAll;

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch spots once on mount
  useEffect(() => {
    publicApi.getSpots().then(res => {
      if (res.success) setSpots(res.data || []);
    });
  }, []);

  // Fetch on-duty couriers when this user can assign them
  useEffect(() => {
    if (!canAssignCourier) return;
    const refresh = () => {
      spotApi.getCouriers(true).then(res => {
        if (res.success) setCouriers(res.data || []);
      });
    };
    refresh();
    const timer = setInterval(refresh, 30_000);
    return () => clearInterval(timer);
  }, [canAssignCourier]);

  // Fetch order details (items) for active orders
  const fetchOrderDetails = async (activeOrders: Order[]) => {
    const toFetch = activeOrders.filter(o =>
      !['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(o.status) &&
      !orderDetailsCache[o.id]
    );
    if (toFetch.length === 0) return;

    const results = await Promise.allSettled(
      toFetch.map(o => spotApi.getOrder(o.id))
    );

    const newCache: Record<string, OrderDetailItem[]> = {};
    const newDetailMap: Record<string, OrderDetail> = {};
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value.success && result.value.data) {
        newCache[toFetch[idx].id] = result.value.data.items || [];
        newDetailMap[toFetch[idx].id] = result.value.data;
      }
    });

    if (Object.keys(newCache).length > 0) {
      setOrderDetailsCache(prev => ({ ...prev, ...newCache }));
    }
    if (Object.keys(newDetailMap).length > 0) {
      setOrderDetailMap(prev => ({ ...prev, ...newDetailMap }));
    }
  };

  const handleAssignCourier = async (courierId: string) => {
    if (!assignOrderId) return;
    setAssigningCourier(true);
    setAssignError(null);
    try {
      const res = await spotApi.assignCourier(assignOrderId, courierId);
      if (!res.success) {
        setAssignError(res.error?.message || 'Kuryer biriktirib bo‘lmadi');
        return;
      }
      // Refresh order detail
      const detail = await spotApi.getOrder(assignOrderId);
      if (detail.success && detail.data) {
        setOrderDetailMap(prev => ({ ...prev, [assignOrderId]: detail.data as OrderDetail }));
      }
      setAssignOrderId(null);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Tarmoq xatosi');
    } finally {
      setAssigningCourier(false);
    }
  };

  // Fetch data — exposed via ref so the realtime stream can trigger refresh.
  const fetchData = useCallback(async () => {
    setError(null);

    try {
      const [ordersRes, productsRes] = await Promise.all([
        spotApi.getOrders({ limit: 50, page: historyPage }),
        publicApi.getProducts({ limit: 100 }),
      ]);

      if (ordersRes.success) {
        const newOrders = ordersRes.data || [];
        setOrders(newOrders);
        if (ordersRes.meta) setOrdersMeta(ordersRes.meta);

        // Fetch order items for active orders
        fetchOrderDetails(newOrders);

        // Keep selectedOrder in sync with latest data
        setSelectedOrder(prev => {
          if (!prev) return null;
          const updated = newOrders.find(o => o.id === prev.id);
          if (!updated) return isTerminalStatus(prev.status) ? prev : null;
          return {
            ...prev,
            customer: updated.customer_name,
            customer_phone: updated.customer_phone,
            type: updated.order_type,
            status: updated.status,
            time: getTimeAgo(updated.created_at),
            total_amount: updated.total_amount,
            created_at: updated.created_at,
          };
        });
      }
      if (productsRes.success) {
        setProducts(productsRes.data || []);
      }
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error('Staff data fetch error:', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPage]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    // Fallback polling when the WebSocket drops — realtime events still do
    // most of the work.
    const pollInterval = setInterval(fetchData, 60_000);
    return () => clearInterval(pollInterval);
  }, [fetchData]);

  // Realtime: refresh orders on any server event for this spot.
  useOrderStream({
    onEvent: () => {
      fetchData();
    },
  });

  // Helper functions
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100);
  };

  const getStatusForQueue = (status: OrderStatus): 'pending' | 'cooking' | 'ready' => {
    if (status === 'RECEIVED' || status === 'CONFIRMED') return 'pending';
    if (status === 'PREPARING') return 'cooking';
    return 'ready';
  };

  const isTerminalStatus = (status: OrderStatus) => {
    return ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(status);
  };

  const formatOrderType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\bWalk In\b/, 'Walk-in');
  };

  // Transform orders to queue format
  const queueOrders: QueueOrder[] = orders
    .filter(o => !isTerminalStatus(o.status))
    .map(o => ({
      id: o.id,
      order_number: o.order_number,
      type: o.order_type,
      customer: o.customer_name,
      customer_phone: o.customer_phone,
      items: orderDetailsCache[o.id] || [],
      time: getTimeAgo(o.created_at),
      status: o.status,
      priority: o.status === 'RECEIVED',
      total_amount: o.total_amount,
      created_at: o.created_at,
    }));

  const pastOrders = orders.filter(o => isTerminalStatus(o.status));

  // Status update handler
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await spotApi.updateOrderStatus(orderId, newStatus);
      if (res.success) {
        setOrders(currentOrders => currentOrders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        setSelectedOrder(currentOrder => currentOrder?.id === orderId ? { ...currentOrder, status: newStatus } : currentOrder);
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  const handleFulfillmentAction = (order: Pick<QueueOrder, 'id' | 'type'>) => {
    const nextStatus: OrderStatus = order.type === 'DELIVERY' ? 'ON_THE_WAY' : 'COMPLETED';
    if (nextStatus === 'COMPLETED') {
      const confirmed = window.confirm('Mark this takeaway order as handed over to the customer? It will move out of the live queue.');
      if (!confirmed) return;
    }
    updateOrderStatus(order.id, nextStatus);
  };

  const getNextStatus = (current: OrderStatus, type: string): OrderStatus | null => {
    const isDelivery = type === 'DELIVERY';
    switch (current) {
      case 'RECEIVED': return 'CONFIRMED';
      case 'CONFIRMED': return 'PREPARING';
      case 'PREPARING': return 'READY';
      case 'READY': return isDelivery ? 'ON_THE_WAY' : 'COMPLETED';
      case 'ON_THE_WAY': return 'DELIVERED';
      default: return null;
    }
  };

  const canAdvanceTo = (next: OrderStatus): boolean => {
    if (next === 'CONFIRMED' || next === 'PREPARING' || next === 'READY') return canCook || canManageAll;
    if (next === 'ON_THE_WAY' || next === 'DELIVERED') return canDispatch || canManageAll;
    if (next === 'COMPLETED') return canHandover || canManageAll;
    return false;
  };

  const handleCardClick = (order: QueueOrder) => {
    const now = Date.now();
    const last = lastClickRef.current;
    if (last && last.id === order.id && now - last.time < 320) {
      lastClickRef.current = null;
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      const next = getNextStatus(order.status, order.type);
      if (next && canAdvanceTo(next)) {
        updateOrderStatus(order.id, next);
      }
      return;
    }
    lastClickRef.current = { id: order.id, time: now };
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      setSelectedOrder(order);
      clickTimerRef.current = null;
    }, 260);
  };

  const addToManualCart = (product: Product) => {
    const existing = manualCart.find(i => i.id === product.id);
    if (existing) {
      setManualCart(manualCart.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setManualCart([...manualCart, {
        id: product.id,
        name: product.name_i18n['en'] || product.name_i18n['ja'] || product.sku || 'Unknown',
        price: product.base_price,
        category: product.category_name,
        qty: 1,
      }]);
    }
  };

  const removeFromManualCart = (id: string) => {
    const existing = manualCart.find(i => i.id === id);
    if (existing && existing.qty > 1) {
      setManualCart(manualCart.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i));
    } else {
      setManualCart(manualCart.filter(i => i.id !== id));
    }
  };

  const increaseCartItem = (id: string) => {
    setManualCart(manualCart.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i));
  };

  const submitWalkInOrder = async () => {
    if (manualCart.length === 0) return;
    setManualError(null);

    if (manualOrderType === 'DELIVERY') {
      if (!manualCustomerPhone.trim()) {
        setManualError("Telefon raqami kerak (yetkazib berish uchun)");
        return;
      }
      if (!manualAddressLine.trim()) {
        setManualError("Manzil kerak (yetkazib berish uchun)");
        return;
      }
    }

    const activeSpots = spots.filter(s => s.is_active);
    const fallbackSpotId = selectedSpotId || activeSpots[0]?.id || '';

    setSubmittingOrder(true);
    try {
      const deliveryAddressPayload: Record<string, unknown> | undefined =
        manualOrderType === 'DELIVERY'
          ? {
              line1: manualAddressLine.trim(),
              ...(manualAddressNotes.trim() ? { delivery_notes: manualAddressNotes.trim() } : {}),
              ...(manualLat != null && manualLng != null
                ? { latitude: manualLat, longitude: manualLng }
                : {}),
              ...(manualAddrCity ? { city: manualAddrCity } : {}),
              ...(manualAddrStreet ? { street: manualAddrStreet } : {}),
              ...(manualAddrHouse ? { house: manualAddrHouse } : {}),
              ...(manualAddrEntrance ? { entrance: manualAddrEntrance } : {}),
              ...(manualAddrFloor ? { floor: manualAddrFloor } : {}),
              ...(manualAddrApartment ? { apartment: manualAddrApartment } : {}),
            }
          : undefined;

      const orderDraft: OrderDraft = {
        spot_id: fallbackSpotId,
        order_type: manualOrderType,
        payment_type: manualPaymentType,
        customer_name: manualCustomerName.trim() || undefined,
        customer_phone: manualCustomerPhone.trim() || undefined,
        delivery_address: deliveryAddressPayload,
        items: manualCart.map(item => ({ product_id: item.id, quantity: item.qty })),
      };
      const res = await spotApi.createOrder(orderDraft);
      if (res.success) {
        setIsManualOrderOpen(false);
        setManualCart([]);
        setSelectedSpotId('');
        setManualOrderType('WALK_IN');
        setManualPaymentType('CASH');
        setManualCustomerName('');
        setManualCustomerPhone('');
        setManualAddressLine('');
        setManualAddressNotes('');
        setManualLat(null);
        setManualLng(null);
        setManualAddrCity('');
        setManualAddrStreet('');
        setManualAddrHouse('');
        setManualAddrEntrance('');
        setManualAddrFloor('');
        setManualAddrApartment('');
        const ordersRes = await spotApi.getOrders({ limit: 50 });
        if (ordersRes.success) {
          const newOrders = ordersRes.data || [];
          setOrders(newOrders);
          if (ordersRes.meta) setOrdersMeta(ordersRes.meta);
          fetchOrderDetails(newOrders);
        }
      } else {
        const msg = res.error?.message || 'Failed to create order';
        const detail = (res.error as { detail?: string } | undefined)?.detail;
        setManualError(detail && detail !== msg ? `${msg} — ${detail}` : msg);
      }
    } catch (err) {
      console.error('Failed to create walk-in order:', err);
      setManualError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const manualTotal = manualCart.reduce((acc, i) => acc + (i.price * i.qty), 0);

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const renderQueue = () => {
    const gridCols = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6';
    return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-black tracking-tight uppercase text-white drop-shadow">Queue</h2>
          <div className="px-2.5 py-0.5 bg-white border border-stone-200 rounded-full text-[10px] font-bold text-stone-600 uppercase tracking-wider">
            {queueOrders.length} Active
          </div>
        </div>
        <p className="hidden sm:block text-[10px] font-bold text-white/80 uppercase tracking-wider">Tap = details · Double-tap = next status</p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pr-1">
        <div className={`grid ${gridCols} gap-2.5`}>
          {queueOrders.map((order) => {
            const queueStatus = getStatusForQueue(order.status);
            const statusBarColor = queueStatus === 'pending' ? 'bg-red-500' : queueStatus === 'cooking' ? 'bg-amber-500' : 'bg-emerald-500';
            const cardTint = queueStatus === 'pending'
              ? 'bg-red-50 border-red-200 hover:border-red-300'
              : queueStatus === 'cooking'
                ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                : 'bg-emerald-50 border-emerald-200 hover:border-emerald-300';
            return (
              <motion.div
                key={order.id}
                layoutId={`order-${order.id}`}
                onClick={() => handleCardClick(order)}
                className={`p-3 pt-4 rounded-xl border cursor-pointer transition-all duration-200 group relative overflow-hidden shadow-sm hover:shadow ${cardTint} ${selectedOrder?.id === order.id ? 'ring-2 ring-[#5775FF]' : ''}`}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 ${statusBarColor} ${order.priority ? 'animate-pulse' : ''}`} />

                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">{formatOrderType(order.type)}</span>
                    <h3 className="text-xs font-bold mt-0.5 tracking-tight truncate">#{order.order_number}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <Badge variant={queueStatus === 'pending' ? 'error' : queueStatus === 'cooking' ? 'warning' : 'success'}>
                      {queueStatus === 'pending' ? 'NEW' : queueStatus === 'cooking' ? 'COOKING' : 'READY'}
                    </Badge>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                      <Clock className="w-2.5 h-2.5" /> {order.time}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-600">
                    <User className="w-3 h-3 shrink-0" />
                    <span className="font-semibold text-[11px] truncate">{order.customer || '—'}</span>
                  </div>
                  {order.items.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {order.items.slice(0, 2).map(item => (
                        <div key={item.id} className="flex justify-between text-[10px] text-stone-700">
                          <span className="truncate pr-2">{item.quantity}× {item.product_name['en'] || item.product_name['ja'] || 'Item'}</span>
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <div className="text-[10px] text-stone-500 font-semibold">+{order.items.length - 2} more</div>
                      )}
                    </div>
                  )}
                  <div className="text-[#5775FF] font-bold text-xs mt-1">{formatPrice(order.total_amount)}</div>
                </div>

                <div className="mt-2.5 flex gap-1.5">
                  {queueStatus === 'pending' && (canCook || canManageAll) ? (
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 border-none h-8 rounded-md text-[10px] font-bold uppercase tracking-wider"
                      onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'PREPARING'); }}
                    >
                      Accept
                    </Button>
                  ) : queueStatus === 'cooking' && (canCook || canManageAll) ? (
                    <Button
                      className="w-full bg-amber-600 hover:bg-amber-700 border-none h-8 rounded-md text-[10px] font-bold uppercase tracking-wider"
                      onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'READY'); }}
                    >
                      Mark Ready
                    </Button>
                  ) : queueStatus === 'ready' && (order.type === 'DELIVERY' ? (canDispatch || canManageAll) : (canHandover || canManageAll)) ? (
                    <Button
                      className="w-full bg-[#5775FF] text-white hover:bg-[#3f5de0] border-none h-8 rounded-md text-[10px] font-bold uppercase tracking-wider"
                      onClick={(e) => { e.stopPropagation(); handleFulfillmentAction(order); }}
                    >
                      {order.type === 'DELIVERY' ? 'Dispatch' : 'Hand Over'}
                    </Button>
                  ) : (
                    <div className="w-full h-8 rounded-md border border-stone-200 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-white/60">
                      {queueStatus === 'pending'
                        ? 'Awaiting Kitchen'
                        : queueStatus === 'cooking'
                          ? 'Cooking…'
                          : order.type === 'DELIVERY' ? 'Awaiting Courier' : 'Awaiting Pickup'}
                    </div>
                  )}
                  {queueStatus === 'ready' && order.type === 'DELIVERY' && !canDispatch && canManageAll && (
                    <Button
                      className="shrink-0 bg-stone-200 hover:bg-stone-300 text-stone-700 border-none h-8 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider"
                      title="Force complete (admin)"
                      onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'DELIVERED'); }}
                    >
                      Force
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
          {queueOrders.length === 0 && (
            <div className="col-span-full p-10 rounded-2xl border-2 border-dashed border-stone-200 text-center bg-white/60">
              <Utensils className="w-10 h-10 mx-auto text-stone-300 mb-3" />
              <p className="text-stone-500 font-bold uppercase tracking-wider text-xs">No active orders</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );};

  const renderDetailDrawer = () => (
    <AnimatePresence>
      {selectedOrder && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-90 flex justify-end"
        >
          <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <motion.aside
            key={selectedOrder.id}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="relative w-[50vw] min-w-120 max-w-225 h-full bg-white shadow-2xl flex flex-col"
          >
            <div className="p-5 border-b border-stone-200 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex gap-2 mb-2">
                  {selectedOrder.priority && <Badge variant="info">Priority</Badge>}
                  <Badge variant="neutral">{formatOrderType(selectedOrder.type)}</Badge>
                  <Badge variant={getStatusForQueue(selectedOrder.status) === 'pending' ? 'error' : getStatusForQueue(selectedOrder.status) === 'cooking' ? 'warning' : 'success'}>
                    {selectedOrder.status}
                  </Badge>
                </div>
                <h2 className="text-xl font-black tracking-tight uppercase leading-none mb-2">#{selectedOrder.order_number}</h2>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-stone-500">
                  <span><span className="font-bold uppercase tracking-wider text-stone-400">Customer:</span> <span className="text-stone-900 font-semibold">{selectedOrder.customer || '—'}</span></span>
                  <span><span className="font-bold uppercase tracking-wider text-stone-400">Phone:</span> <span className="text-stone-900 font-semibold">{selectedOrder.customer_phone || '—'}</span></span>
                  <span><span className="font-bold uppercase tracking-wider text-stone-400">Elapsed:</span> <span className="text-stone-900 font-semibold">{selectedOrder.time}</span></span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" className="border-stone-200 rounded-lg h-9 px-3 text-[11px] font-bold uppercase tracking-wider">Modify</Button>
                <Button variant="outline" className="border-stone-200 rounded-lg h-9 w-9 p-0"><Printer className="w-4 h-4" /></Button>
                <Button variant="outline" className="border-stone-200 rounded-lg h-9 w-9 p-0" onClick={() => setSelectedOrder(null)}><X className="w-4 h-4" /></Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-3 gap-4 scrollbar-hide">
              <div className="lg:col-span-2 space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Order Items ({selectedOrder.items.length})</h4>
                {selectedOrder.items.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.items.map(item => {
                      const product = products.find(p => p.id === item.product_id);
                      const imageUrl = product?.image_url;
                      const productName = item.product_name['en'] || item.product_name['ja'] || product?.name_i18n['en'] || 'Item';
                      return (
                        <div key={item.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-3">
                          <div className="relative w-16 h-16 rounded-lg bg-white border border-stone-200 overflow-hidden shrink-0">
                            {imageUrl ? (
                              <img src={imageUrl} alt={productName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-300">
                                <Utensils className="w-6 h-6" />
                              </div>
                            )}
                            <span className="absolute -top-1 -right-1 min-w-6 h-6 px-1.5 rounded-full bg-[#5775FF] text-white text-[11px] font-bold flex items-center justify-center shadow border-2 border-white">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold tracking-tight truncate">{productName}</p>
                            {product?.category_name && (
                              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mt-0.5">{product.category_name}</p>
                            )}
                            {item.note && (
                              <p className="text-[11px] text-amber-700 mt-1 italic truncate">Note: {item.note}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-stone-500">
                              <span>{formatPrice(item.unit_price)} × {item.quantity}</span>
                            </div>
                          </div>
                          <p className="text-sm font-black text-stone-900 shrink-0">{formatPrice(item.line_total)}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 rounded-lg border border-dashed border-stone-200 text-center text-stone-400 text-xs font-bold uppercase tracking-wider">No items</div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Summary</h4>
                <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Total</p>
                  <p className="text-2xl font-black text-[#5775FF]">{formatPrice(selectedOrder.total_amount)}</p>
                </div>
                {selectedOrder.type === 'DELIVERY' && (() => {
                  const detail = orderDetailMap[selectedOrder.id];
                  const courierName = detail?.assigned_courier_name;
                  return (
                    <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Kuryer</p>
                      {courierName ? (
                        <p className="text-sm font-bold text-stone-900">{courierName}</p>
                      ) : (
                        <p className="text-[11px] text-stone-500">Hali biriktirilmagan</p>
                      )}
                      {canAssignCourier && !isTerminalStatus(selectedOrder.status) && (
                        <Button
                          className="w-full h-9 rounded-lg bg-[#5775FF] hover:bg-[#3f5de0] text-white text-[11px] font-bold uppercase tracking-wider"
                          onClick={() => { setAssignError(null); setAssignOrderId(selectedOrder.id); }}
                        >
                          {courierName ? 'Kuryerni almashtirish' : 'Kuryer biriktirish'}
                        </Button>
                      )}
                      {detail?.delivery_address && (
                        <div className="pt-2 border-t border-stone-200">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Manzil</p>
                          <p className="text-[11px] text-stone-700 whitespace-pre-wrap wrap-break-word">
                            {(() => {
                              const addr = detail.delivery_address as Record<string, unknown>;
                              const parts: string[] = [];
                              if (addr.line1) parts.push(String(addr.line1));
                              if (addr.city) parts.push(String(addr.city));
                              if (addr.street) parts.push(String(addr.street));
                              if (addr.house) parts.push(String(addr.house));
                              if (addr.entrance) parts.push(`Kirish ${addr.entrance}`);
                              if (addr.floor) parts.push(`${addr.floor}-qavat`);
                              if (addr.apartment) parts.push(`kv. ${addr.apartment}`);
                              return parts.filter(Boolean).join(', ') || '—';
                            })()}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {isTerminalStatus(selectedOrder.status) && (
                  <div className="rounded-lg border border-stone-200 bg-stone-100 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Archived</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-stone-700">No longer in live queue.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-between items-center gap-2">
              <div className="text-[11px] text-stone-500">
                {getStatusForQueue(selectedOrder.status) === 'ready' && selectedOrder.type === 'DELIVERY' && !canDispatch && !canManageAll && (
                  <span className="font-semibold text-amber-700">Awaiting courier to dispatch this delivery.</span>
                )}
                {getStatusForQueue(selectedOrder.status) === 'ready' && selectedOrder.type !== 'DELIVERY' && !canHandover && !canManageAll && (
                  <span className="font-semibold text-amber-700">Awaiting staff to hand over.</span>
                )}
              </div>
              <div className="flex gap-2">
                {getStatusForQueue(selectedOrder.status) === 'pending' && (canCook || canManageAll) && (
                  <Button className="h-11 px-6 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-emerald-600 hover:bg-emerald-700 shadow shadow-emerald-600/20" onClick={() => updateOrderStatus(selectedOrder.id, 'PREPARING')}>
                    Begin Cooking <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                )}
                {getStatusForQueue(selectedOrder.status) === 'cooking' && (canCook || canManageAll) && (
                  <Button className="h-11 px-6 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-amber-600 hover:bg-amber-700 shadow shadow-amber-600/20" onClick={() => updateOrderStatus(selectedOrder.id, 'READY')}>
                    Mark Ready <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                )}
                {getStatusForQueue(selectedOrder.status) === 'ready' && (selectedOrder.type === 'DELIVERY' ? (canDispatch || canManageAll) : (canHandover || canManageAll)) && (
                  <Button className="h-11 px-6 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-[#5775FF] hover:bg-[#3f5de0] shadow shadow-[#5775FF]/20" onClick={() => handleFulfillmentAction(selectedOrder)}>
                    {selectedOrder.type === 'DELIVERY' ? 'Dispatch' : 'Hand to Customer'} <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                )}
                {canManageAll && getStatusForQueue(selectedOrder.status) === 'ready' && selectedOrder.type === 'DELIVERY' && !canDispatch && (
                  <Button className="h-11 px-6 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-stone-900 hover:bg-stone-800 text-white" onClick={() => updateOrderStatus(selectedOrder.id, 'DELIVERED')}>
                    Force Complete
                  </Button>
                )}
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderHistory = () => (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden animate-in slide-in-from-right-4 duration-500">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black tracking-tight uppercase text-white drop-shadow">Order History</h2>
            <div className="px-2.5 py-0.5 bg-white border border-stone-200 rounded-full text-[10px] font-bold text-stone-600 uppercase tracking-wider">{pastOrders.length}</div>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" className="h-10 rounded-lg px-4 text-xs font-bold uppercase tracking-wider gap-2 bg-white border-stone-200 text-stone-700 hover:bg-stone-50">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
             </Button>
             <Button variant="outline" className="h-10 rounded-lg px-4 text-xs font-bold uppercase tracking-wider gap-2 bg-white border-stone-200 text-stone-700 hover:bg-stone-50" onClick={() => window.location.reload()}>
                <RefreshCcw className="w-3.5 h-3.5" /> Refresh
             </Button>
          </div>
       </div>

       <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col shadow-sm">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="text-[11px] uppercase tracking-wider text-stone-500 bg-[#5775FF]/5 border-b border-stone-200">
                      <th className="px-4 py-3 font-bold">Ref</th>
                      <th className="px-4 py-3 font-bold">Customer</th>
                      <th className="px-4 py-3 font-bold">Type</th>
                      <th className="px-4 py-3 font-bold">Total</th>
                      <th className="px-4 py-3 font-bold">Date</th>
                      <th className="px-4 py-3 font-bold text-right">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                   {pastOrders.map(order => (
                      <tr key={order.id} className="hover:bg-[#5775FF]/5 transition-colors">
                         <td className="px-4 py-3 font-mono text-[11px] text-[#5775FF] font-bold tracking-tight">#{order.order_number}</td>
                         <td className="px-4 py-3">
                            <div className="text-xs font-bold text-stone-900 truncate max-w-45">{order.customer_name || '—'}</div>
                            <div className="text-[10px] text-stone-400 font-semibold mt-0.5 truncate">{order.customer_phone || ''}</div>
                         </td>
                         <td className="px-4 py-3 text-xs font-semibold text-stone-600">{formatOrderType(order.order_type)}</td>
                         <td className="px-4 py-3 text-xs font-bold text-stone-900">{formatPrice(order.total_amount)}</td>
                         <td className="px-4 py-3 text-[11px] text-stone-500 font-semibold">{getTimeAgo(order.created_at)} ago</td>
                         <td className="px-4 py-3 text-right">
                            <Badge variant={order.status === 'COMPLETED' || order.status === 'DELIVERED' ? 'success' : 'error'}>{order.status}</Badge>
                         </td>
                      </tr>
                   ))}
                   {pastOrders.length === 0 && (
                      <tr>
                         <td colSpan={6} className="px-4 py-12 text-center">
                            <History className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                            <p className="text-stone-500 font-bold uppercase tracking-wider text-xs">No completed orders yet</p>
                         </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
          <div className="mt-auto border-t border-stone-200 p-4 bg-stone-50">
             <Pagination currentPage={ordersMeta.page} totalPages={ordersMeta.total_pages} totalItems={ordersMeta.total} pageSize={ordersMeta.limit} onPageChange={(page) => setHistoryPage(page)} />
          </div>
       </div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-stone-600 mx-auto" />
          <p className="text-stone-600 font-medium">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#69AFFF] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-black text-stone-900">Connection Error</h2>
          <p className="text-stone-600">{error}</p>
          <Button onClick={() => window.location.reload()} className="rounded-2xl bg-[#5775FF] hover:bg-[#3f5de0]">
            <RefreshCcw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  // Role-specific branding — colour palette and label swap with the role so
  // cashier/kitchen/admin views feel distinct even when sharing this component.
  const brand = (() => {
    if (role === 'CASHIER') {
      return { title: 'Sushimei POS', subtitle: 'Sotuvchi', bg: 'bg-emerald-50', logoBg: 'bg-emerald-600', logoShadow: 'shadow-emerald-600/40', accent: 'emerald' as const };
    }
    if (role === 'COURIER') {
      return { title: 'Sushimei Dispatch', subtitle: 'Kuryer', bg: 'bg-sky-50', logoBg: 'bg-sky-600', logoShadow: 'shadow-sky-600/40', accent: 'sky' as const };
    }
    if (role === 'KITCHEN') {
      return { title: 'Sushimei Kitchen', subtitle: 'Oshpaz', bg: 'bg-amber-50', logoBg: 'bg-amber-600', logoShadow: 'shadow-amber-600/40', accent: 'amber' as const };
    }
    return { title: 'Sushimei Staff', subtitle: 'Admin', bg: 'bg-stone-100', logoBg: 'bg-[#5775FF]', logoShadow: 'shadow-[#5775FF]/40', accent: 'sky' as const };
  })();

  return (
    <div className={`min-h-screen ${brand.bg} text-stone-900 flex flex-col font-sans selection:bg-red-100`}>
      {/* Top Bar */}
      <header className="h-16 border-b border-stone-200 px-6 flex items-center justify-between bg-white backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <img
               src="/brand/sushimei-logo.png"
               alt="Sushi Mei"
               className="w-10 h-10 object-contain rounded-xl border border-stone-200 bg-white p-0.5 shadow-sm"
             />
             <div>
                <h1 className="text-sm font-black tracking-tight leading-none uppercase">SUSHI MEI</h1>
                <p className="text-[10px] text-stone-500 mt-1 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" /> {brand.subtitle} · Live
                </p>
             </div>
          </div>

          <nav className="flex gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
            {['incoming', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all relative ${
                  activeTab === tab ? 'bg-sky-600 text-white shadow-sm' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {tab === 'incoming' ? 'Live Queue' : 'History'}
                {tab === 'incoming' && queueOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#5775FF] text-white text-[10px] flex items-center justify-center rounded-full shadow border-2 border-white">{queueOrders.length}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {canCreateOrders && (
            <Button
              className={`h-10 px-4 rounded-lg text-white text-xs font-bold uppercase tracking-wider gap-2 ${
                role === 'CASHIER'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-[#5775FF] hover:bg-[#3f5de0]'
              }`}
              onClick={() => setIsManualOrderOpen(true)}
            >
               <PlusCircle className="w-4 h-4" /> {role === 'CASHIER' ? 'Yangi zakaz' : 'Walk-in'}
            </Button>
          )}
          <div className="h-6 w-px bg-stone-200" />
          <div className="text-right flex flex-col items-end">
            <p className="text-base font-bold tracking-tight leading-none">{formatTime()}</p>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mt-0.5">{formatDate()}</p>
          </div>
          <div className="h-6 w-px bg-stone-200" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-stone-900">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'Staff'}
              </p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">{user?.role || 'KITCHEN'}</p>
            </div>
            <button
              onClick={logout}
              className="h-10 w-10 rounded-lg bg-stone-100 hover:bg-red-600 hover:text-white text-stone-700 flex items-center justify-center transition-colors"
              title="Sign out"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 p-4 overflow-hidden flex gap-4 w-full">
         {activeTab === 'incoming' ? renderQueue() : renderHistory()}
      </main>

      {renderDetailDrawer()}

      {/* Manual Order Modal */}
      <AnimatePresence>
         {isManualOrderOpen && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-100 flex items-center justify-center"
            >
               <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={() => setIsManualOrderOpen(false)} />
               <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="relative w-full max-w-7xl h-[90vh] bg-white rounded-2xl border border-stone-200 overflow-hidden flex shadow-xl"
               >
                  <div className="flex-1 flex flex-col border-r border-stone-200">
                     <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg bg-stone-100" onClick={() => setIsManualOrderOpen(false)}>
                              <ArrowLeft className="w-4 h-4" />
                           </Button>
                           <h3 className="text-xl font-black tracking-tight uppercase">Manual Order</h3>
                        </div>
                        <div className="relative w-72">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                           <input type="text" placeholder="Search menu..." className="w-full bg-stone-100 text-stone-900 placeholder:text-stone-400 border-none rounded-lg pl-10 pr-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-[#5775FF]/30" />
                        </div>
                     </div>
                     <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 scrollbar-hide bg-stone-50">
                        {products.filter(p => p.is_active).map(product => {
                          const productName = product.name_i18n['en'] || product.name_i18n['ja'] || product.sku || 'Unknown';
                          return (
                            <div key={product.id} className="p-3 bg-white rounded-xl border border-stone-200 flex flex-col justify-between hover:border-[#5775FF] hover:shadow-md transition-all cursor-pointer group" onClick={() => addToManualCart(product)}>
                               <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">{product.category_name}</p>
                                  <h4 className="text-sm font-bold tracking-tight">{productName}</h4>
                                  {(product.is_spicy || product.is_vegan) && (
                                    <div className="flex gap-1.5 mt-1.5">
                                      {product.is_spicy && <span className="text-[9px] px-1.5 py-0.5 bg-red-600/20 text-red-600 rounded">Spicy</span>}
                                      {product.is_vegan && <span className="text-[9px] px-1.5 py-0.5 bg-green-600/20 text-green-600 rounded">Vegan</span>}
                                    </div>
                                  )}
                               </div>
                               <div className="flex items-center justify-between mt-3">
                                  <span className="text-base font-bold tracking-tight">{formatPrice(product.base_price)}</span>
                                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center group-hover:bg-[#5775FF] group-hover:text-white transition-colors">
                                     <Plus className="w-4 h-4" />
                                  </div>
                               </div>
                            </div>
                          );
                        })}
                        {products.length === 0 && (
                          <div className="col-span-full text-center py-20 text-stone-500">
                            No products available
                          </div>
                        )}
                     </div>
                  </div>
                  <div className="w-80 flex flex-col bg-stone-50">
                     <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                        <h4 className="text-base font-black tracking-tight uppercase">Ticket Summary</h4>
                        <Badge variant="neutral">{manualCart.length} Items</Badge>
                     </div>
                     <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-hide">
                        {manualCart.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-stone-400 gap-3">
                              <ShoppingCart className="w-10 h-10 opacity-40" />
                              <p className="text-[11px] font-bold uppercase tracking-wider">Cart is empty</p>
                           </div>
                        ) : (
                           manualCart.map(item => (
                              <div key={item.id} className="flex items-center justify-between animate-in slide-in-from-right-2">
                                 <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 bg-stone-100 text-stone-900 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">{item.qty}</div>
                                    <div className="min-w-0">
                                       <p className="text-xs font-bold tracking-tight truncate">{item.name}</p>
                                       <p className="text-[10px] font-semibold text-stone-500">{formatPrice(item.price * item.qty)}</p>
                                    </div>
                                 </div>
                                 <div className="flex gap-1 shrink-0">
                                    <button className="p-1.5 hover:text-red-600 transition-colors" onClick={() => removeFromManualCart(item.id)}><Minus className="w-3.5 h-3.5" /></button>
                                    <button className="p-1.5 hover:text-red-600 transition-colors" onClick={() => increaseCartItem(item.id)}><Plus className="w-3.5 h-3.5" /></button>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                     <div className="p-4 border-t border-stone-200 bg-white space-y-4 max-h-115 overflow-y-auto">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Order Type</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['WALK_IN', 'PICKUP', 'DELIVERY'] as const).map(t => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setManualOrderType(t)}
                                className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition ${
                                  manualOrderType === t
                                    ? 'bg-[#5775FF] text-white shadow'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                              >
                                {t === 'WALK_IN' ? 'Joyda' : t === 'PICKUP' ? 'Olib ketish' : 'Dostavka'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Payment</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(['CASH', 'CARD'] as const).map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setManualPaymentType(p)}
                                className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition ${
                                  manualPaymentType === p
                                    ? 'bg-emerald-600 text-white shadow'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                              >
                                {p === 'CASH' ? 'Naqd' : 'Karta'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {manualOrderType !== 'WALK_IN' && (
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                              Mijoz {manualOrderType === 'DELIVERY' && <span className="text-red-600">*</span>}
                            </label>
                            <input
                              type="text"
                              value={manualCustomerName}
                              onChange={(e) => setManualCustomerName(e.target.value)}
                              placeholder="Ism"
                              className="w-full bg-white border border-stone-200 text-stone-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5775FF]/40"
                            />
                            <input
                              type="tel"
                              value={manualCustomerPhone}
                              onChange={(e) => setManualCustomerPhone(e.target.value)}
                              placeholder="+998 ..."
                              className="w-full bg-white border border-stone-200 text-stone-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5775FF]/40"
                            />
                          </div>
                        )}

                        {manualOrderType === 'DELIVERY' && (
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                              Manzil <span className="text-red-600">*</span>
                            </label>

                            <div className="h-52 w-full">
                              <AddressMapPickerClient
                                latitude={manualLat}
                                longitude={manualLng}
                                onChange={(lat, lng, geocoded) => {
                                  setManualLat(lat);
                                  setManualLng(lng);
                                  if (geocoded) {
                                    if (geocoded.city && !manualAddrCity) setManualAddrCity(geocoded.city);
                                    if (geocoded.street && !manualAddrStreet) setManualAddrStreet(geocoded.street);
                                    if (geocoded.house && !manualAddrHouse) setManualAddrHouse(geocoded.house);
                                  }
                                  // Auto-sync line1 if the cashier hasn't typed something custom
                                  const parts = [geocoded?.city || manualAddrCity, [geocoded?.street || manualAddrStreet, geocoded?.house || manualAddrHouse].filter(Boolean).join(' ')].filter(Boolean);
                                  const synthetic = parts.join(', ');
                                  if (synthetic) setManualAddressLine(synthetic);
                                }}
                              />
                            </div>

                            <textarea
                              value={manualAddressLine}
                              onChange={(e) => setManualAddressLine(e.target.value)}
                              placeholder="Ko‘cha, uy, kvartira"
                              rows={2}
                              className="w-full bg-white border border-stone-200 text-stone-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5775FF]/40 resize-none"
                            />

                            <div className="grid grid-cols-3 gap-1.5">
                              <input
                                type="text"
                                value={manualAddrEntrance}
                                onChange={(e) => setManualAddrEntrance(e.target.value)}
                                placeholder="Kirish"
                                className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
                              />
                              <input
                                type="text"
                                value={manualAddrFloor}
                                onChange={(e) => setManualAddrFloor(e.target.value)}
                                placeholder="Qavat"
                                className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
                              />
                              <input
                                type="text"
                                value={manualAddrApartment}
                                onChange={(e) => setManualAddrApartment(e.target.value)}
                                placeholder="Kvartira"
                                className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs"
                              />
                            </div>

                            <input
                              type="text"
                              value={manualAddressNotes}
                              onChange={(e) => setManualAddressNotes(e.target.value)}
                              placeholder="Qo‘shimcha izoh (mo‘ljal, kirish kodi)"
                              className="w-full bg-white border border-stone-200 text-stone-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5775FF]/40"
                            />

                            {manualLat != null && manualLng != null ? (
                              <p className="text-[10px] text-emerald-600 font-medium">
                                ✓ Koordinata: {manualLat.toFixed(5)}, {manualLng.toFixed(5)} — kuryer marshrutni ko‘radi.
                              </p>
                            ) : (
                              <p className="text-[10px] text-amber-600 font-medium">
                                Xaritadan aniq joyni bosing — kuryer Yandex Maps orqali yetib boradi.
                              </p>
                            )}
                          </div>
                        )}

                        {spots.length > 0 && (
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Location</label>
                            <select
                              value={selectedSpotId}
                              onChange={(e) => setSelectedSpotId(e.target.value)}
                              className="w-full bg-white border border-stone-200 text-stone-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5775FF]/40"
                            >
                              <option value="">Auto (from profile)</option>
                              {spots.filter(s => s.is_active).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="space-y-2">
                           <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-stone-400">
                              <span>Subtotal</span>
                              <span className="text-stone-900">{formatPrice(manualTotal)}</span>
                           </div>
                           <div className="flex justify-between text-lg font-black tracking-tight uppercase border-t border-stone-200 pt-2">
                              <span>Total</span>
                              <span className="text-[#5775FF]">{formatPrice(manualTotal)}</span>
                           </div>
                        </div>
                        {manualError && (
                          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-red-700">Order Failed</p>
                              <p className="text-xs text-red-600 mt-0.5 wrap-break-word">{manualError}</p>
                              {manualError.toLowerCase().includes('spot') && spots.length > 0 && (
                                <p className="text-[11px] text-red-500 mt-1">Please select a location above.</p>
                              )}
                            </div>
                          </div>
                        )}
                        <Button
                           className="w-full h-12 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#5775FF] hover:bg-[#3f5de0] shadow-lg shadow-[#5775FF]/25"
                           disabled={manualCart.length === 0 || submittingOrder}
                           onClick={submitWalkInOrder}
                        >
                           {submittingOrder ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</> : <>Send to Kitchen <ArrowRight className="ml-2 w-4 h-4" /></>}
                        </Button>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Assign Courier Modal */}
      <AnimatePresence>
        {assignOrderId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={() => !assigningCourier && setAssignOrderId(null)} />
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col shadow-xl"
            >
              <div className="p-5 border-b border-stone-200 flex items-center justify-between">
                <h3 className="text-lg font-black tracking-tight uppercase">Kuryer biriktirish</h3>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => !assigningCourier && setAssignOrderId(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-5 max-h-96 overflow-y-auto space-y-2">
                {couriers.length === 0 ? (
                  <div className="text-center py-6 space-y-1">
                    <p className="text-sm text-stone-500">
                      Hozirda smena'da faol kuryer yo‘q.
                    </p>
                    <p className="text-[11px] text-stone-400">
                      Kuryer o‘z appida "Faol" tugmasini bossa paydo bo‘ladi.
                    </p>
                  </div>
                ) : (
                  couriers.map(courier => {
                    const name = [courier.first_name, courier.last_name].filter(Boolean).join(' ') || courier.email;
                    return (
                      <button
                        key={courier.id}
                        disabled={assigningCourier}
                        onClick={() => handleAssignCourier(courier.id)}
                        className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-stone-200 hover:border-[#5775FF] hover:bg-[#5775FF]/5 transition disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[#5775FF]/15 text-[#5775FF] flex items-center justify-center font-bold text-sm shrink-0">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-bold tracking-tight truncate">{name}</p>
                            {courier.phone && <p className="text-[11px] text-stone-500 truncate">{courier.phone}</p>}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                      </button>
                    );
                  })
                )}
                {assignError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {assignError}
                  </div>
                )}
                {assigningCourier && (
                  <div className="flex items-center justify-center gap-2 text-sm text-stone-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Biriktirilmoqda...
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Stats Footer */}
      <footer className="h-10 bg-white border-t border-stone-200 px-4 flex items-center justify-between text-[10px] font-bold text-stone-500 tracking-wider uppercase">
         <div className="flex gap-6">
            <span className="flex items-center gap-2"><Utensils className="w-3.5 h-3.5" /> Active: {queueOrders.length}</span>
            <span className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Completed: {pastOrders.filter(o => o.status === 'COMPLETED' || o.status === 'DELIVERED').length}</span>
         </div>
         <div className="flex items-center gap-4">
            <span className="text-red-600">Urgent: {queueOrders.filter(o => o.priority).length}</span>
            <span>SUSHIMEI STAFF OS · {brand.subtitle.toUpperCase()} · v.1.0</span>
         </div>
      </footer>
    </div>
  );
};
