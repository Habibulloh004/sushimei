"use client";

import { Loader2 } from "lucide-react";
import { KitchenPage } from "@/components/KitchenPage";
import { useRoleGuard } from "@/lib/useRoleGuard";

export default function KitchenRoute() {
  const { authorized, isLoading } = useRoleGuard(['KITCHEN', 'SPOT_OPERATOR', 'ADMIN', 'SUPER_ADMIN', 'MANAGER']);

  if (isLoading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950">
        <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
      </div>
    );
  }

  return <KitchenPage />;
}
