"use client";

import { AuthProvider } from '@sushimei/shared';
import { ReactNode } from 'react';
import { CartProvider } from '@/lib/cart-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider allowedRoles={['CUSTOMER']}>
      <CartProvider>
        {children}
      </CartProvider>
    </AuthProvider>
  );
}
