"use client";

import React, { createContext, useContext } from 'react';
import { Product } from '@/lib/api';

interface ProductDialogContextValue {
  selectedProduct: Product | null;
  openProduct: (product: Product) => void;
  closeProduct: () => void;
}

const ProductDialogContext = createContext<ProductDialogContextValue | null>(null);

interface ProductDialogProviderProps extends ProductDialogContextValue {
  children: React.ReactNode;
}

export function ProductDialogProvider({
  children,
  selectedProduct,
  openProduct,
  closeProduct,
}: ProductDialogProviderProps) {
  return (
    <ProductDialogContext.Provider value={{ selectedProduct, openProduct, closeProduct }}>
      {children}
    </ProductDialogContext.Provider>
  );
}

export function useOptionalProductDialog() {
  return useContext(ProductDialogContext);
}

export function useProductDialog() {
  const ctx = useContext(ProductDialogContext);
  if (!ctx) throw new Error('useProductDialog must be used within ProductDialogProvider');
  return ctx;
}
