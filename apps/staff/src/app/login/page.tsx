"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@sushimei/shared';
import { Eye, EyeOff, Loader2, AlertCircle, ChefHat } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-900 to-stone-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <span className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <ChefHat className="w-8 h-8 text-white" />
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            KITCHEN PORTAL
          </h1>
          <p className="text-stone-400 mt-2 text-sm">Staff login for order management</p>
        </div>

        {/* Login Form */}
        <div className="bg-stone-900 rounded-[2rem] shadow-2xl p-8 border border-stone-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-800 rounded-xl text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-widest text-stone-500">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kitchen@sushimei.jp"
                required
                autoComplete="email"
                className="w-full h-14 px-5 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-widest text-stone-500">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
                  Signing in...
                </>
              ) : (
                'Start Shift'
              )}
            </button>
          </form>
        </div>

        {/* Test Credentials Info */}
        <div className="mt-8 p-6 bg-stone-800/50 rounded-2xl border border-stone-700/50">
          <h3 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-3">
            Test Credentials
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-stone-400">
              <span className="font-medium">Kitchen:</span>
              <span className="font-mono text-xs">kitchen@sushimei.jp / admin123</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span className="font-medium">Courier:</span>
              <span className="font-mono text-xs">courier@sushimei.jp / admin123</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span className="font-medium">Cashier:</span>
              <span className="font-mono text-xs">cashier@sushimei.jp / admin123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
