"use client";

import React, { useState, useEffect } from 'react';
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
  type Order,
  type Product,
  type Spot,
  type OrderStatus,
  type OrderDraft,
  type OrderDetail,
  type OrderDetailItem,
} from '@/lib/api';

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

  // Role-based feature flags
  const role = user?.role || 'KITCHEN';
  const canCreateOrders = role !== 'COURIER';
  const canDispatch = role === 'COURIER' || role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER';
  const canCook = role === 'KITCHEN' || role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER' || role === 'SPOT_OPERATOR';
  const canManageAll = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER';

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
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value.success && result.value.data) {
        newCache[toFetch[idx].id] = result.value.data.items || [];
      }
    });

    if (Object.keys(newCache).length > 0) {
      setOrderDetailsCache(prev => ({ ...prev, ...newCache }));
    }
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
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
            if (!updated || ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(updated.status)) return null;
            return {
              ...prev,
              status: updated.status,
              time: getTimeAgo(updated.created_at),
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
    };

    fetchData();
    // Poll for new orders every 30 seconds
    const pollInterval = setInterval(fetchData, 30000);
    return () => clearInterval(pollInterval);
  }, [historyPage]);

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

  const formatOrderType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\bWalk In\b/, 'Walk-in');
  };

  // Transform orders to queue format
  const queueOrders: QueueOrder[] = orders
    .filter(o => !['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(o.status))
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

  const pastOrders = orders.filter(o => ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(o.status));

  // Status update handler
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await spotApi.updateOrderStatus(orderId, newStatus);
      if (res.success) {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
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
    setSubmittingOrder(true);
    try {
      const orderDraft: OrderDraft = {
        spot_id: selectedSpotId, // Use selected spot; backend overrides with JWT spot_id if available
        order_type: 'WALK_IN',
        payment_type: 'CASH',
        items: manualCart.map(item => ({ product_id: item.id, quantity: item.qty })),
      };
      const res = await spotApi.createOrder(orderDraft);
      if (res.success) {
        setIsManualOrderOpen(false);
        setManualCart([]);
        // Re-fetch orders to show the new one
        const ordersRes = await spotApi.getOrders({ limit: 50 });
        if (ordersRes.success) {
          const newOrders = ordersRes.data || [];
          setOrders(newOrders);
          if (ordersRes.meta) setOrdersMeta(ordersRes.meta);
          fetchOrderDetails(newOrders);
        }
      } else {
        setError(res.error?.message || 'Failed to create order');
      }
    } catch (err) {
      console.error('Failed to create walk-in order:', err);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const manualTotal = manualCart.reduce((acc, i) => acc + (i.price * i.qty), 0);

  // Format time display
  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const renderQueue = () => {
    return (
    <div className="flex-1 flex gap-12 overflow-hidden animate-in fade-in duration-500">
      {/* Orders Column */}
      <div className="w-full lg:w-[480px] flex flex-col gap-8 overflow-y-auto pr-4 scrollbar-hide shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black tracking-tighter uppercase">Queue</h2>
          <div className="px-4 py-1.5 bg-stone-900/50 border border-stone-800/50 rounded-full text-[10px] font-black text-stone-400 uppercase tracking-widest">
            {queueOrders.length} ACTIVE ORDERS
          </div>
        </div>

        <div className="space-y-6">
          {queueOrders.map((order) => {
            const queueStatus = getStatusForQueue(order.status);
            return (
              <motion.div
                key={order.id}
                layoutId={`order-${order.id}`}
                onClick={() => setSelectedOrder(order)}
                className={`p-8 rounded-[40px] border-2 cursor-pointer transition-all duration-500 group relative overflow-hidden ${
                  selectedOrder?.id === order.id
                    ? 'bg-stone-900 border-red-600 shadow-[0_20px_60px_rgba(220,38,38,0.15)] scale-[1.02]'
                    : 'bg-stone-900/30 border-stone-800/50 hover:border-stone-700 hover:bg-stone-900/50'
                }`}
              >
                {order.priority && (
                  <div className="absolute top-0 left-0 h-full w-1.5 bg-red-600 animate-pulse" />
                )}

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">{formatOrderType(order.type)}</span>
                    <h3 className="text-3xl font-black mt-2 tracking-tighter">ORDER #{order.order_number}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <Badge variant={queueStatus === 'pending' ? 'error' : queueStatus === 'cooking' ? 'warning' : 'success'}>
                      {queueStatus === 'pending' ? 'NEW TICKET' : order.status}
                    </Badge>
                    <div className="flex items-center gap-2 text-[10px] font-black text-stone-500 uppercase tracking-widest">
                      <Clock className="w-3.5 h-3.5" /> {order.time} AGO
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-stone-400">
                    <User className="w-4 h-4" />
                    <span className="font-bold">{order.customer}</span>
                  </div>
                  <div className="text-stone-500 text-xs">{order.customer_phone}</div>
                  {order.items.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {order.items.slice(0, 4).map(item => (
                        <div key={item.id} className="flex justify-between text-xs text-stone-400">
                          <span>{item.quantity}x {item.product_name['en'] || item.product_name['ja'] || 'Item'}</span>
                          <span className="text-stone-500">{formatPrice(item.line_total)}</span>
                        </div>
                      ))}
                      {order.items.length > 4 && (
                        <div className="text-[10px] text-stone-600 font-bold">+{order.items.length - 4} more items</div>
                      )}
                    </div>
                  )}
                  <div className="text-red-500 font-black text-lg mt-2">{formatPrice(order.total_amount)}</div>
                </div>

                <div className="mt-10 flex gap-3">
                  {queueStatus === 'pending' && (canCook || canManageAll) ? (
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 border-none h-16 rounded-[20px] text-[10px] font-black uppercase tracking-widest"
                      onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'PREPARING'); }}
                    >
                      Accept Ticket
                    </Button>
                  ) : queueStatus === 'cooking' && (canCook || canManageAll) ? (
                    <Button
                      className="w-full bg-amber-600 hover:bg-amber-700 border-none h-16 rounded-[20px] text-[10px] font-black uppercase tracking-widest"
                      onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'READY'); }}
                    >
                      Mark as Ready
                    </Button>
                  ) : queueStatus === 'ready' && (canDispatch || canManageAll) ? (
                    <Button
                      className="w-full bg-white text-black hover:bg-stone-200 border-none h-16 rounded-[20px] text-[10px] font-black uppercase tracking-widest"
                      onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, order.type === 'DELIVERY' ? 'ON_THE_WAY' : 'COMPLETED'); }}
                    >
                      {order.type === 'DELIVERY' ? 'Dispatch Order' : 'Complete Order'}
                    </Button>
                  ) : (
                    <div className="flex-1 h-16 rounded-[20px] border border-stone-800/50 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-stone-600">
                      {queueStatus === 'pending' ? 'Awaiting Kitchen' : queueStatus === 'cooking' ? 'In Progress' : 'Awaiting Dispatch'}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          {queueOrders.length === 0 && (
            <div className="p-12 rounded-[40px] border-2 border-dashed border-stone-800/50 text-center">
              <Utensils className="w-12 h-12 mx-auto text-stone-700 mb-4" />
              <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">No active orders</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="flex-1 hidden lg:flex flex-col">
        <AnimatePresence mode="wait">
          {selectedOrder ? (
            <motion.div
              key={selectedOrder.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-stone-900/50 h-full rounded-[60px] border border-stone-800/50 overflow-hidden flex flex-col shadow-3xl"
            >
              <div className="p-14 border-b border-stone-800/50 flex justify-between items-start bg-stone-900/50">
                <div className="space-y-6">
                  <div className="flex gap-3">
                     {selectedOrder.priority && <Badge variant="info">Priority</Badge>}
                     <Badge variant="neutral">{formatOrderType(selectedOrder.type)}</Badge>
                  </div>
                  <h2 className="text-6xl font-black tracking-tighter uppercase leading-[0.8]">Order #{selectedOrder.order_number}</h2>
                  <p className="text-stone-500 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em]">
                    <span>Customer: <span className="text-white ml-2">{selectedOrder.customer}</span></span>
                    <span className="w-1.5 h-1.5 bg-stone-700 rounded-full" />
                    <span>Phone: <span className="text-white ml-2">{selectedOrder.customer_phone}</span></span>
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" className="border-stone-800 rounded-3xl h-20 px-10 text-[10px] font-black uppercase tracking-widest">
                     Modify
                  </Button>
                  <Button variant="outline" className="border-stone-800 rounded-3xl h-20 w-20 p-0">
                     <Printer className="w-8 h-8" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-14 overflow-y-auto space-y-12 scrollbar-hide">
                {/* Order Items */}
                {selectedOrder.items.length > 0 && (
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-600">Order Items</h4>
                    <div className="space-y-3">
                      {selectedOrder.items.map(item => (
                        <div key={item.id} className="p-6 bg-black/40 rounded-3xl border border-stone-800/50 flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-stone-900 rounded-2xl flex items-center justify-center text-xl font-black border border-stone-800">
                              {item.quantity}
                            </div>
                            <div>
                              <p className="text-lg font-black tracking-tight">{item.product_name['en'] || item.product_name['ja'] || 'Item'}</p>
                              {item.note && <p className="text-xs text-stone-500 mt-1">{item.note}</p>}
                            </div>
                          </div>
                          <p className="text-lg font-black text-stone-300">{formatPrice(item.line_total)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-600">Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-black/40 rounded-3xl border border-stone-800/50">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-600 mb-2">Total</p>
                      <p className="text-2xl font-black text-red-500">{formatPrice(selectedOrder.total_amount)}</p>
                    </div>
                    <div className="p-6 bg-black/40 rounded-3xl border border-stone-800/50">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-600 mb-2">Status</p>
                      <Badge variant={getStatusForQueue(selectedOrder.status) === 'pending' ? 'error' : getStatusForQueue(selectedOrder.status) === 'cooking' ? 'warning' : 'success'}>
                        {selectedOrder.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-14 bg-black/80 backdrop-blur-xl border-t border-stone-800/50 flex gap-10 items-center">
                 <div className="flex-1 space-y-1">
                    <p className="text-stone-600 text-[10px] font-black uppercase tracking-[0.3em]">Kitchen Latency</p>
                    <p className="text-4xl font-black tracking-tighter">{selectedOrder.time} <span className="text-base text-stone-700 font-bold uppercase ml-1">Elapsed</span></p>
                 </div>
                 {getStatusForQueue(selectedOrder.status) === 'pending' && (canCook || canManageAll) && (
                   <Button
                     className="h-28 px-16 text-xs font-black uppercase tracking-[0.4em] rounded-[40px] bg-emerald-600 hover:bg-emerald-700 flex-none shadow-3xl shadow-emerald-600/30"
                     onClick={() => updateOrderStatus(selectedOrder.id, 'PREPARING')}
                   >
                     Begin Cooking Ticket <ArrowRight className="ml-6 w-10 h-10" />
                   </Button>
                 )}
                 {getStatusForQueue(selectedOrder.status) === 'cooking' && (canCook || canManageAll) && (
                   <Button
                     className="h-28 px-16 text-xs font-black uppercase tracking-[0.4em] rounded-[40px] bg-amber-600 hover:bg-amber-700 flex-none shadow-3xl shadow-amber-600/30"
                     onClick={() => updateOrderStatus(selectedOrder.id, 'READY')}
                   >
                     Mark as Ready <ArrowRight className="ml-6 w-10 h-10" />
                   </Button>
                 )}
                 {getStatusForQueue(selectedOrder.status) === 'ready' && (canDispatch || canManageAll) && (
                   <Button
                     className="h-28 px-16 text-xs font-black uppercase tracking-[0.4em] rounded-[40px] bg-red-600 hover:bg-red-700 flex-none shadow-3xl shadow-red-600/30"
                     onClick={() => updateOrderStatus(selectedOrder.id, selectedOrder.type === 'DELIVERY' ? 'ON_THE_WAY' : 'COMPLETED')}
                   >
                     {selectedOrder.type === 'DELIVERY' ? 'Dispatch' : 'Complete'} <ArrowRight className="ml-6 w-10 h-10" />
                   </Button>
                 )}
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 border-2 border-dashed border-stone-800/50 rounded-[60px] flex flex-col items-center justify-center text-stone-700 space-y-6">
              <div className="w-32 h-32 rounded-full bg-stone-900/30 flex items-center justify-center border border-stone-800/50">
                 <Utensils className="w-16 h-16 opacity-10" />
              </div>
              <div className="text-center space-y-2">
                 <p className="text-xl font-black uppercase tracking-widest text-stone-600">Kitchen Standby</p>
                 <p className="text-xs font-bold text-stone-700 uppercase tracking-widest">Select an order from the queue to start</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );};

  const renderHistory = () => (
    <div className="flex-1 flex flex-col gap-8 overflow-hidden animate-in slide-in-from-right-4 duration-500">
       <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black tracking-tighter uppercase">Order History</h2>
          <div className="flex gap-3">
             <Button variant="outline" className="h-12 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest gap-2">
                <SlidersHorizontal className="w-4 h-4" /> Filters
             </Button>
             <Button variant="outline" className="h-12 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest gap-2" onClick={() => window.location.reload()}>
                <RefreshCcw className="w-4 h-4" /> Refresh
             </Button>
          </div>
       </div>

       <div className="bg-stone-900/30 rounded-[3rem] border border-stone-800/50 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="text-[10px] uppercase tracking-[0.3em] text-stone-600 bg-black/40 border-b border-stone-800/50">
                      <th className="px-10 py-6 font-black">Ref</th>
                      <th className="px-10 py-6 font-black">Customer</th>
                      <th className="px-10 py-6 font-black">Type</th>
                      <th className="px-10 py-6 font-black">Total</th>
                      <th className="px-10 py-6 font-black text-right">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/50">
                   {pastOrders.map(order => (
                      <tr key={order.id} className="hover:bg-stone-900 transition-colors">
                         <td className="px-10 py-8 font-mono text-xs text-red-600 font-black tracking-tighter">#{order.order_number}</td>
                         <td className="px-10 py-8">
                            <div className="text-sm font-black uppercase">{order.customer_name}</div>
                            <div className="text-[10px] text-stone-600 font-black mt-1 uppercase tracking-widest">{getTimeAgo(order.created_at)} ago</div>
                         </td>
                         <td className="px-10 py-8 text-sm font-bold text-stone-400">{formatOrderType(order.order_type)}</td>
                         <td className="px-10 py-8 text-sm font-black">{formatPrice(order.total_amount)}</td>
                         <td className="px-10 py-8 text-right">
                            <Badge variant={order.status === 'COMPLETED' || order.status === 'DELIVERED' ? 'success' : 'error'}>{order.status}</Badge>
                         </td>
                      </tr>
                   ))}
                   {pastOrders.length === 0 && (
                      <tr>
                         <td colSpan={5} className="px-10 py-12 text-center text-stone-600">No completed orders yet</td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
          <div className="mt-auto border-t border-stone-800/50 p-6 bg-black/20">
             <Pagination currentPage={ordersMeta.page} totalPages={ordersMeta.total_pages} totalItems={ordersMeta.total} pageSize={ordersMeta.limit} onPageChange={(page) => setHistoryPage(page)} />
          </div>
       </div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto" />
          <p className="text-stone-500 font-medium">Loading kitchen system...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-black text-white">Connection Error</h2>
          <p className="text-stone-500">{error}</p>
          <Button onClick={() => window.location.reload()} className="rounded-2xl bg-red-600 hover:bg-red-700">
            <RefreshCcw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-red-600/30">
      {/* Top Bar */}
      <header className="h-28 border-b border-stone-800/50 px-12 flex items-center justify-between bg-black/50 backdrop-blur-2xl sticky top-0 z-50">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-5">
             <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-2xl shadow-red-600/40">匠</div>
             <div>
                <h1 className="text-xl font-black tracking-tight leading-none uppercase">Sushimei Kitchen</h1>
                <p className="text-[10px] text-stone-500 mt-2 flex items-center gap-1.5 font-black uppercase tracking-[0.2em]">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" /> {role === 'COURIER' ? 'Dispatch' : role === 'CASHIER' ? 'Counter' : 'Kitchen'} System Live
                </p>
             </div>
          </div>

          <nav className="flex gap-2 bg-stone-900/50 p-1.5 rounded-[20px] border border-stone-800/50">
            {['incoming', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
                  activeTab === tab ? 'bg-stone-800 text-white shadow-xl' : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                {tab === 'incoming' ? 'Live Queue' : 'History Log'}
                {tab === 'incoming' && queueOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-[10px] flex items-center justify-center rounded-full shadow-lg border-2 border-black">{queueOrders.length}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-8">
          {canCreateOrders && (
            <Button
              className="h-16 px-8 rounded-2xl bg-stone-100 text-black hover:bg-stone-200 text-[10px] font-black uppercase tracking-widest gap-3"
              onClick={() => setIsManualOrderOpen(true)}
            >
               <PlusCircle className="w-5 h-5" /> Walk-in Order
            </Button>
          )}
          <div className="h-10 w-px bg-stone-800/50" />
          <div className="text-right flex flex-col items-end">
            <p className="text-2xl font-black tracking-tighter">{formatTime()}</p>
            <p className="text-[9px] text-stone-500 font-black uppercase tracking-[0.3em] mt-1">{formatDate()}</p>
          </div>
          <div className="h-10 w-px bg-stone-800/50" />
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-white">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'Staff'}
              </p>
              <p className="text-[9px] text-stone-500 uppercase tracking-widest">{user?.role || 'KITCHEN'}</p>
            </div>
            <button
              onClick={logout}
              className="h-12 w-12 rounded-xl bg-stone-800 hover:bg-red-600 flex items-center justify-center transition-colors"
              title="Sign out"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 p-12 overflow-hidden flex gap-12 max-w-[1800px] mx-auto w-full">
         {activeTab === 'incoming' ? renderQueue() : renderHistory()}
      </main>

      {/* Manual Order Modal */}
      <AnimatePresence>
         {isManualOrderOpen && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100] flex items-center justify-center"
            >
               <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsManualOrderOpen(false)} />
               <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="relative w-full max-w-7xl h-[90vh] bg-stone-900 rounded-[3rem] border border-stone-800 overflow-hidden flex"
               >
                  <div className="flex-1 flex flex-col border-r border-stone-800">
                     <div className="p-10 border-b border-stone-800 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                           <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-stone-800" onClick={() => setIsManualOrderOpen(false)}>
                              <ArrowLeft className="w-6 h-6" />
                           </Button>
                           <h3 className="text-3xl font-black tracking-tighter uppercase">Manual Order</h3>
                        </div>
                        <div className="relative w-80">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                           <input type="text" placeholder="Search menu..." className="w-full bg-stone-950 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-red-500/20" />
                        </div>
                     </div>
                     <div className="flex-1 p-10 overflow-y-auto grid grid-cols-2 xl:grid-cols-3 gap-6 scrollbar-hide">
                        {products.filter(p => p.is_active).map(product => {
                          const productName = product.name_i18n['en'] || product.name_i18n['ja'] || product.sku || 'Unknown';
                          return (
                            <div key={product.id} className="p-6 bg-stone-950 rounded-3xl border border-stone-800 flex flex-col justify-between hover:border-red-600 transition-all cursor-pointer group" onClick={() => addToManualCart(product)}>
                               <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-600 mb-1">{product.category_name}</p>
                                  <h4 className="text-lg font-black tracking-tight">{productName}</h4>
                                  {(product.is_spicy || product.is_vegan) && (
                                    <div className="flex gap-2 mt-2">
                                      {product.is_spicy && <span className="text-[8px] px-2 py-0.5 bg-red-600/20 text-red-500 rounded">Spicy</span>}
                                      {product.is_vegan && <span className="text-[8px] px-2 py-0.5 bg-green-600/20 text-green-500 rounded">Vegan</span>}
                                    </div>
                                  )}
                               </div>
                               <div className="flex items-center justify-between mt-6">
                                  <span className="text-xl font-black tracking-tight">{formatPrice(product.base_price)}</span>
                                  <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center group-hover:bg-red-600 transition-colors">
                                     <Plus className="w-5 h-5" />
                                  </div>
                               </div>
                            </div>
                          );
                        })}
                        {products.length === 0 && (
                          <div className="col-span-3 text-center py-20 text-stone-600">
                            No products available
                          </div>
                        )}
                     </div>
                  </div>
                  <div className="w-[450px] flex flex-col bg-black/40">
                     <div className="p-10 border-b border-stone-800 flex items-center justify-between">
                        <h4 className="text-xl font-black tracking-tighter uppercase">Ticket Summary</h4>
                        <Badge variant="neutral">{manualCart.length} Items</Badge>
                     </div>
                     <div className="flex-1 p-10 overflow-y-auto space-y-6 scrollbar-hide">
                        {manualCart.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-stone-700 gap-4">
                              <ShoppingCart className="w-12 h-12 opacity-10" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Cart is empty</p>
                           </div>
                        ) : (
                           manualCart.map(item => (
                              <div key={item.id} className="flex items-center justify-between animate-in slide-in-from-right-2">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center font-black">{item.qty}</div>
                                    <div>
                                       <p className="text-sm font-black tracking-tight">{item.name}</p>
                                       <p className="text-[10px] font-bold text-stone-500">{formatPrice(item.price * item.qty)}</p>
                                    </div>
                                 </div>
                                 <div className="flex gap-2">
                                    <button className="p-2 hover:text-red-600 transition-colors" onClick={() => removeFromManualCart(item.id)}><Minus className="w-4 h-4" /></button>
                                    <button className="p-2 hover:text-red-600 transition-colors" onClick={() => increaseCartItem(item.id)}><Plus className="w-4 h-4" /></button>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                     <div className="p-10 border-t border-stone-800 bg-stone-950/50 space-y-8">
                        {/* Spot selector for staff without assigned spot */}
                        {spots.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-600">Location</label>
                            <select
                              value={selectedSpotId}
                              onChange={(e) => setSelectedSpotId(e.target.value)}
                              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                            >
                              <option value="">Auto (from profile)</option>
                              {spots.filter(s => s.is_active).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="space-y-4">
                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-stone-600">
                              <span>Subtotal</span>
                              <span className="text-white">{formatPrice(manualTotal)}</span>
                           </div>
                           <div className="flex justify-between text-2xl font-black tracking-tighter uppercase border-t border-stone-800/50 pt-4">
                              <span>Total</span>
                              <span className="text-red-600">{formatPrice(manualTotal)}</span>
                           </div>
                        </div>
                        <Button
                           className="w-full h-20 rounded-3xl text-xs font-black uppercase tracking-[0.3em] bg-red-600 hover:bg-red-700 shadow-2xl shadow-red-600/20"
                           disabled={manualCart.length === 0 || submittingOrder}
                           onClick={submitWalkInOrder}
                        >
                           {submittingOrder ? <><Loader2 className="w-6 h-6 animate-spin mr-4" /> Creating Order...</> : <>Send to Kitchen <ArrowRight className="ml-4 w-6 h-6" /></>}
                        </Button>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Quick Stats Footer */}
      <footer className="h-16 bg-stone-900 border-t border-stone-800 px-12 flex items-center justify-between text-[9px] font-black text-stone-600 tracking-[0.3em] uppercase">
         <div className="flex gap-12">
            <span className="flex items-center gap-3"><Utensils className="w-4 h-4" /> Active: {queueOrders.length}</span>
            <span className="flex items-center gap-3 text-emerald-500/50"><CheckCircle2 className="w-4 h-4" /> Completed: {pastOrders.filter(o => o.status === 'COMPLETED' || o.status === 'DELIVERED').length}</span>
         </div>
         <div className="flex items-center gap-6">
            <span className="text-red-600/50">Urgent Tickets: {queueOrders.filter(o => o.priority).length}</span>
            <span>SUSHIMEI KITCHEN OS v.1.0</span>
         </div>
      </footer>
    </div>
  );
};
