"use client";

import React from 'react';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { useAccountCenter } from './account-center-context';
import { formatDateTime, formatOrderStatus, formatPrice } from '@/lib/format';
import { getName } from '@/lib/helpers';

export function AccountOrderDialog() {
  const {
    selectedOrder,
    orderDetailLoading,
    setSelectedOrder,
    setOrderDetailLoading,
  } = useAccountCenter();

  return (
    <Dialog
      open={!!selectedOrder || orderDetailLoading}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedOrder(null);
          setOrderDetailLoading(false);
        }
      }}
    >
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-2xl max-h-[85vh] flex flex-col dark:border-stone-800 dark:bg-stone-950">
        <DialogTitle className="sr-only">Order Details</DialogTitle>
        <div className="p-8 border-b border-stone-100 dark:border-stone-900/50 flex items-center justify-between shrink-0">
          <h3 className="text-2xl font-black tracking-tighter">Order Details</h3>
        </div>
        {orderDetailLoading && !selectedOrder ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : selectedOrder ? (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{selectedOrder.order_number}</p>
                <p className="text-sm text-stone-500 mt-1">{formatDateTime(selectedOrder.created_at)}</p>
              </div>
              <Badge variant={selectedOrder.status === 'DELIVERED' || selectedOrder.status === 'COMPLETED' ? 'success' : selectedOrder.status === 'CANCELLED' || selectedOrder.status === 'REJECTED' ? 'error' : 'neutral'}>
                {formatOrderStatus(selectedOrder.status)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Type</p>
                <p className="text-sm font-black mt-1">{formatOrderStatus(selectedOrder.order_type)}</p>
              </div>
              <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Payment</p>
                <p className="text-sm font-black mt-1">{selectedOrder.payment_type}</p>
              </div>
              <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Branch</p>
                <p className="text-sm font-black mt-1">{selectedOrder.spot_name}</p>
              </div>
              <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Total</p>
                <p className="text-sm font-black mt-1">{formatPrice(selectedOrder.total_amount)}</p>
              </div>
            </div>
            {selectedOrder.notes && (
              <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-xl">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1">Notes</p>
                <p className="text-sm text-stone-600 dark:text-stone-300">{selectedOrder.notes}</p>
              </div>
            )}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Items</h4>
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-100 dark:border-stone-800">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm tracking-tight truncate">{getName(item.product_name)}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{formatPrice(item.unit_price)} x {item.quantity}</p>
                  </div>
                  <span className="font-black text-sm tracking-tight shrink-0">{formatPrice(item.line_total)}</span>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex justify-between items-end">
              <span className="text-xs font-black uppercase tracking-widest">Total Amount</span>
              <span className="text-2xl font-black tracking-tighter">{formatPrice(selectedOrder.total_amount)}</span>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
