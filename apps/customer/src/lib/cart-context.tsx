"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Product } from '@/lib/api';
import { CartItem, SelectedVariant, SelectedModifier, getCartItemKey, getCartItemUnitPrice } from '@/lib/types';
import { CART_STORAGE_KEY } from '@/lib/constants';

interface CartContextValue {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, variant?: SelectedVariant | null, modifiers?: SelectedModifier[]) => void;
  updateQuantity: (key: string, nextQuantity: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  cartItemCount: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addedToCartId: string | null;
  cartBounce: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [addedToCartId, setAddedToCartId] = useState<string | null>(null);
  const [cartBounce, setCartBounce] = useState(false);
  const addedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => acc + getCartItemUnitPrice(item) * item.quantity, 0);

  const addToCart = useCallback((product: Product, quantity = 1, variant: SelectedVariant | null = null, modifiers: SelectedModifier[] = []) => {
    const normalizedQuantity = Math.max(1, quantity);
    const newItem: CartItem = { product, quantity: normalizedQuantity, variant, modifiers };
    const newKey = getCartItemKey(newItem);

    setCart((currentCart) => {
      const existingIndex = currentCart.findIndex(item => getCartItemKey(item) === newKey);
      if (existingIndex >= 0) {
        return currentCart.map((item, i) =>
          i === existingIndex ? { ...item, quantity: item.quantity + normalizedQuantity } : item
        );
      }
      return [...currentCart, newItem];
    });

    // Visual feedback
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    setAddedToCartId(product.id);
    setCartBounce(true);
    addedTimerRef.current = setTimeout(() => {
      setAddedToCartId(null);
      setCartBounce(false);
    }, 1200);
  }, []);

  const updateQuantity = useCallback((key: string, nextQuantity: number) => {
    setCart((currentCart) => {
      if (nextQuantity <= 0) {
        return currentCart.filter(item => getCartItemKey(item) !== key);
      }
      return currentCart.map(item =>
        getCartItemKey(item) === key ? { ...item, quantity: nextQuantity } : item
      );
    });
  }, []);

  const removeFromCart = useCallback((key: string) => {
    setCart((currentCart) => currentCart.filter(item => getCartItemKey(item) !== key));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      cartItemCount,
      totalPrice,
      isCartOpen,
      setIsCartOpen,
      addedToCartId,
      cartBounce,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
