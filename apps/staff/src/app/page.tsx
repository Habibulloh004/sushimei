"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@sushimei/shared";
import { StaffInterface } from "@/components/StaffInterface";
import { Loader2 } from "lucide-react";

export default function StaffPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto" />
          <p className="text-stone-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <StaffInterface />;
}
