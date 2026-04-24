"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@sushimei/shared';
import { Eye, EyeOff, Loader2, AlertCircle, ChefHat, ShoppingBag, Bike } from 'lucide-react';

export default function StaffLoginPage() {
  const router = useRouter();
  const { loginEmployee, isAuthenticated, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);

    const result = await loginEmployee(email, password);
    setIsSubmitting(false);

    if (result.success) {
      router.push('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950">
        <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo — three role icons to signal multi-role portal */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-2 mb-5">
            <span className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-lg">
              <ShoppingBag className="w-6 h-6 text-emerald-400" />
            </span>
            <span className="w-14 h-14 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-center shadow-lg">
              <ChefHat className="w-6 h-6 text-amber-400" />
            </span>
            <span className="w-14 h-14 bg-sky-500/15 border border-sky-500/30 rounded-2xl flex items-center justify-center shadow-lg">
              <Bike className="w-6 h-6 text-sky-400" />
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            SUSHIMEI STAFF
          </h1>
          <p className="text-stone-400 mt-2 text-sm">
            Sotuvchi · Oshpaz · Kuryer uchun kirish
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-stone-900 rounded-3xl shadow-2xl p-8 border border-stone-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-800 rounded-xl text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-widest text-stone-500">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cashier@sushimei.jp"
                required
                autoComplete="email"
                className="w-full h-14 px-5 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-widest text-stone-500">
                Parol
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolni kiriting"
                  required
                  autoComplete="current-password"
                  className="w-full h-14 px-5 pr-14 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Kirilmoqda...
                </>
              ) : (
                'Smenani boshlash'
              )}
            </button>
          </form>
        </div>

        {/* Role quick-login hints */}
        <div className="mt-6 p-5 bg-stone-900/40 rounded-2xl border border-stone-800/60 space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2">
            Test login (dev)
          </p>
          <button
            type="button"
            onClick={() => { setEmail('cashier@sushimei.jp'); setPassword('admin123'); }}
            className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-emerald-500/10 transition group"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
              </span>
              <span className="text-sm font-bold text-stone-300">Sotuvchi</span>
            </span>
            <span className="font-mono text-[11px] text-stone-500 group-hover:text-emerald-400">cashier@sushimei.jp</span>
          </button>
          <button
            type="button"
            onClick={() => { setEmail('kitchen@sushimei.jp'); setPassword('admin123'); }}
            className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-amber-500/10 transition group"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <ChefHat className="w-3.5 h-3.5 text-amber-400" />
              </span>
              <span className="text-sm font-bold text-stone-300">Oshpaz</span>
            </span>
            <span className="font-mono text-[11px] text-stone-500 group-hover:text-amber-400">kitchen@sushimei.jp</span>
          </button>
          <button
            type="button"
            onClick={() => { setEmail('courier@sushimei.jp'); setPassword('admin123'); }}
            className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-sky-500/10 transition group"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-sky-500/15 flex items-center justify-center">
                <Bike className="w-3.5 h-3.5 text-sky-400" />
              </span>
              <span className="text-sm font-bold text-stone-300">Kuryer</span>
            </span>
            <span className="font-mono text-[11px] text-stone-500 group-hover:text-sky-400">courier@sushimei.jp</span>
          </button>
          <p className="text-[10px] text-stone-600 text-center pt-1">
            Barcha parol: <span className="font-mono text-stone-500">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
