"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@sushimei/shared";
import { AdminInterface } from "@/components/AdminInterface";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto" />
          <p className="text-stone-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AdminInterface />;
}
