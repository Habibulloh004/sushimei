"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { customerApi, OrderDraft, OrderPricing, Spot, ModifierGroup, useAuth } from '@/lib/api';
import { useCart } from '@/lib/cart-context';
import { getCartItemKey, getCartItemUnitPrice } from '@/lib/types';
import { formatPrice } from '@/lib/format';

interface CheckoutContextValue {
  deliveryType: 'delivery' | 'pickup';
  setDeliveryType: (type: 'delivery' | 'pickup') => void;
  paymentType: 'CASH' | 'CARD';
  setPaymentType: (type: 'CASH' | 'CARD') => void;
  selectedSpotId: string;
  setSelectedSpotId: (id: string) => void;
  promoCodeInput: string;
  setPromoCodeInput: (code: string) => void;
  bonusPointsInput: string;
  setBonusPointsInput: (points: string) => void;
  deliveryAddress: string;
  setDeliveryAddress: (address: string) => void;
  checkoutPreview: OrderPricing | null;
  checkoutError: string | null;
  checkoutSuccess: string | null;
  checkoutLoading: boolean;
  placingOrder: boolean;
  handlePlaceOrder: () => Promise<void>;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

interface CheckoutProviderProps {
  children: React.ReactNode;
  spots: Spot[];
}

export function CheckoutProvider({ children, spots }: CheckoutProviderProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { cart, totalPrice, clearCart, setIsCartOpen } = useCart();

  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentType, setPaymentType] = useState<'CASH' | 'CARD'>('CASH');
  const [selectedSpotId, setSelectedSpotId] = useState(() => {
    const active = spots.find(s => s.is_active);
    return active?.id ?? '';
  });
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [bonusPointsInput, setBonusPointsInput] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [checkoutPreview, setCheckoutPreview] = useState<OrderPricing | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  const buildOrderDraft = useCallback((): OrderDraft | null => {
    if (cart.length === 0 || !selectedSpotId) return null;

    const parsedBonusPoints = bonusPointsInput.trim() === '' ? undefined : Number.parseInt(bonusPointsInput.trim(), 10);

    return {
      spot_id: selectedSpotId,
      order_type: deliveryType === 'delivery' ? 'DELIVERY' : 'PICKUP',
      payment_type: paymentType,
      customer_name: undefined,
      customer_phone: user?.phone || undefined,
      delivery_address: deliveryType === 'delivery' && deliveryAddress.trim()
        ? { line1: deliveryAddress.trim() }
        : undefined,
      promo_code: promoCodeInput.trim() ? promoCodeInput.trim().toUpperCase() : undefined,
      bonus_points_to_spend: Number.isInteger(parsedBonusPoints) && parsedBonusPoints && parsedBonusPoints > 0 ? parsedBonusPoints : undefined,
      items: cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        variant_id: item.variant?.id,
        modifier_option_ids: item.modifiers.map(m => m.optionId),
      })),
    };
  }, [cart, selectedSpotId, deliveryType, paymentType, bonusPointsInput, deliveryAddress, promoCodeInput, user?.phone]);

  // Debounced preview
  useEffect(() => {
    if (!isAuthenticated) {
      setCheckoutPreview(null);
      setCheckoutError(null);
      return;
    }

    const draft = buildOrderDraft();
    if (!draft) {
      setCheckoutPreview(null);
      setCheckoutError(null);
      return;
    }

    const parsedBonusPoints = bonusPointsInput.trim() === '' ? 0 : Number.parseInt(bonusPointsInput.trim(), 10);
    if (bonusPointsInput.trim() !== '' && (!Number.isInteger(parsedBonusPoints) || parsedBonusPoints < 0)) {
      setCheckoutPreview(null);
      setCheckoutError('Bonus points must be a valid non-negative number');
      return;
    }

    if (draft.order_type === 'DELIVERY' && !deliveryAddress.trim()) {
      setCheckoutPreview(null);
      setCheckoutError('Delivery address is required for delivery orders');
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setCheckoutLoading(true);
      setCheckoutError(null);

      const response = await customerApi.previewOrder(draft);
      if (response.success && response.data) {
        setCheckoutPreview(response.data);
      } else {
        setCheckoutPreview(null);
        setCheckoutError(response.error?.details || response.error?.detail || response.error?.message || 'Failed to preview order');
      }

      setCheckoutLoading(false);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [isAuthenticated, cart, selectedSpotId, deliveryType, paymentType, promoCodeInput, bonusPointsInput, deliveryAddress, buildOrderDraft]);

  const handlePlaceOrder = useCallback(async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const draft = buildOrderDraft();
    if (!draft) {
      setCheckoutError('Add products to the cart before placing an order');
      return;
    }
    if (draft.order_type === 'DELIVERY' && !deliveryAddress.trim()) {
      setCheckoutError('Delivery address is required for delivery orders');
      return;
    }

    setPlacingOrder(true);
    setCheckoutError(null);
    setCheckoutSuccess(null);

    const response = await customerApi.createOrder(draft);
    setPlacingOrder(false);

    if (!response.success || !response.data) {
      setCheckoutError(response.error?.details || response.error?.detail || response.error?.message || 'Failed to place order');
      return;
    }

    setCheckoutPreview(response.data.pricing);
    setCheckoutSuccess(`Order ${response.data.order_number} created successfully`);
    clearCart();
    setPromoCodeInput('');
    setBonusPointsInput('');
    setDeliveryAddress('');
    setIsCartOpen(false);
    router.push('/account');
  }, [isAuthenticated, buildOrderDraft, deliveryAddress, router, clearCart, setIsCartOpen]);

  // Reset on auth change
  useEffect(() => {
    if (!isAuthenticated) {
      setBonusPointsInput('');
      setCheckoutPreview(null);
      setCheckoutError(null);
    }
  }, [isAuthenticated]);

  return (
    <CheckoutContext.Provider value={{
      deliveryType, setDeliveryType,
      paymentType, setPaymentType,
      selectedSpotId, setSelectedSpotId,
      promoCodeInput, setPromoCodeInput,
      bonusPointsInput, setBonusPointsInput,
      deliveryAddress, setDeliveryAddress,
      checkoutPreview,
      checkoutError,
      checkoutSuccess,
      checkoutLoading,
      placingOrder,
      handlePlaceOrder,
    }}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckout must be used within CheckoutProvider');
  return ctx;
}
