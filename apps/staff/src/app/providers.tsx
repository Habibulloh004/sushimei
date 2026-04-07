"use client";

import { AuthProvider } from '@sushimei/shared';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider allowedRoles={['KITCHEN', 'CASHIER', 'COURIER', 'SPOT_OPERATOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN']}>
      {children}
    </AuthProvider>
  );
}
