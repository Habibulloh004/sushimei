"use client";

import { Loader2 } from "lucide-react";
import { CashierPOSPage } from "@/components/CashierPOSPage";
import { useRoleGuard } from "@/lib/useRoleGuard";

export default function CashierRoute() {
  const { authorized, isLoading } = useRoleGuard(['CASHIER', 'SPOT_OPERATOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN']);

  if (isLoading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
      </div>
    );
  }

  return <CashierPOSPage />;
}
