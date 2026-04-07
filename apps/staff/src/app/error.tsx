"use client";

import { useEffect } from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 p-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-red-900/30 rounded-[2rem] mb-6">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <h2 className="text-2xl font-black text-white mb-3">Something went wrong</h2>
        <p className="text-stone-400 mb-4">
          An unexpected error occurred. Please try again.
        </p>

        {error.digest && (
          <p className="text-xs text-stone-600 font-mono mb-8">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 h-14 px-8 bg-amber-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-14 px-8 bg-stone-800 text-stone-300 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-stone-700 transition-colors"
          >
            <Home className="w-5 h-5" />
            Kitchen Home
          </Link>
        </div>
      </div>
    </div>
  );
}
