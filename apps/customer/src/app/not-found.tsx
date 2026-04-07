"use client";

import Link from 'next/link';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-[2rem] shadow-lg mb-6">
            <Search className="w-12 h-12 text-stone-300" />
          </div>
          <h1 className="text-8xl font-black text-red-100 tracking-tighter">404</h1>
        </div>

        <h2 className="text-2xl font-black text-stone-900 mb-3">Page Not Found</h2>
        <p className="text-stone-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-14 px-8 bg-gradient-to-r from-red-500 to-red-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:from-red-600 hover:to-red-700 transition-colors shadow-lg shadow-red-500/20"
          >
            <Home className="w-5 h-5" />
            View Menu
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 h-14 px-8 bg-white text-stone-700 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-stone-50 transition-colors shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
