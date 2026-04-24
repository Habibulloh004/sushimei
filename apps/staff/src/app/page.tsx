"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@sushimei/shared";
import { Loader2 } from "lucide-react";

export default function StaffEntryPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    const role = user?.role;
    switch (role) {
      case 'COURIER':
        router.replace('/courier');
        break;
      case 'KITCHEN':
        router.replace('/kitchen');
        break;
      case 'CASHIER':
      case 'SPOT_OPERATOR':
      case 'MANAGER':
      case 'ADMIN':
      case 'SUPER_ADMIN':
        router.replace('/cashier');
        break;
      default:
        router.replace('/login');
    }
  }, [user, isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto" />
        <p className="text-stone-400 font-medium">Loading...</p>
      </div>
    </div>
  );
}
