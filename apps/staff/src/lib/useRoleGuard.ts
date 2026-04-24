"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@sushimei/shared";

export function useRoleGuard(allowedRoles: string[]) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    const role = user?.role;
    if (!role || !allowedRoles.includes(role)) {
      router.replace('/');
    }
  }, [user, isAuthenticated, isLoading, router, allowedRoles]);

  const role = user?.role;
  const authorized = !isLoading && isAuthenticated && !!role && allowedRoles.includes(role);
  return { user, authorized, isLoading };
}
