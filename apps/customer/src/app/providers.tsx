"use client";

import { AuthProvider } from '@sushimei/shared';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider allowedRoles={['CUSTOMER']}>
      {children}
    </AuthProvider>
  );
}
