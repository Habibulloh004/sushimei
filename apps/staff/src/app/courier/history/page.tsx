"use client";

import { Loader2 } from "lucide-react";
import { CourierHistoryPage } from "@/components/courier/CourierHistoryPage";
import { useRoleGuard } from "@/lib/useRoleGuard";

export default function CourierHistoryRoute() {
  const { authorized, isLoading } = useRoleGuard(['COURIER', 'SPOT_OPERATOR', 'ADMIN', 'SUPER_ADMIN', 'MANAGER']);

  if (isLoading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
      </div>
    );
  }

  return <CourierHistoryPage />;
}
