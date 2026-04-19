"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useAuth } from '@sushimei/shared';
import { AlertCircle, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { Button } from '@/components/ui/button';
import { normalizePhoneInput, formatUzPhoneInput } from '@/lib/format';
import { UZ_PHONE_REGEX } from '@/lib/constants';

export default function CustomerLoginPage() {
  const router = useRouter();
  const { loginCustomer, isAuthenticated, isLoading, error, clearError } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromQuery = new URLSearchParams(window.location.search).get('phone');
    if (fromQuery) {
      setPhone(formatUzPhoneInput(fromQuery));
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    setLocalError(null);

    const normalizedPhone = normalizePhoneInput(phone);
    if (!UZ_PHONE_REGEX.test(normalizedPhone)) {
      const message = 'Enter a valid Uzbekistan phone number';
      setLocalError(message);
      toast.error(message);
      return;
    }

    const loadingToast = toast.loading('Signing in...', {
      description: 'Checking your phone and password.',
    });

    setIsSubmitting(true);
    const result = await loginCustomer(normalizedPhone, password);
    setIsSubmitting(false);
    toast.dismiss(loadingToast);

    if (result.success) {
      toast.success('Signed in', {
        description: 'Redirecting to your account.',
      });
      router.push('/');
      return;
    }

    toast.error(result.error || 'Failed to sign in', {
      description: result.errorDetail || 'Please check your credentials and try again.',
    });

    const detail = (result.errorDetail || '').toLowerCase();
    if (detail.includes('customer not found') || detail.includes('customer password not set')) {
      toast.error('Account not ready', {
        description: 'Redirecting you to registration.',
      });
      router.push(`/register?phone=${encodeURIComponent(normalizedPhone)}`);
    }
  };

  if (isLoading && !isSubmitting && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-8 md:p-10"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-black tracking-tight">Sign In</h2>
        <p className="text-sm text-stone-500 mt-1">Use your phone number and password</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {(localError || error) && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{localError || error}</p>
          </div>
        )}

        <PhoneInput value={phone} onChange={(v) => { setPhone(v); setLocalError(null); }} />

        <div className="space-y-2">
          <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="w-full rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-4 py-3.5 pl-11 pr-12 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors">
            Forgot Password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !UZ_PHONE_REGEX.test(normalizePhoneInput(phone)) || !password}
          isLoading={isSubmitting}
          className="w-full h-14 rounded-2xl text-sm shadow-lg shadow-red-600/20"
        >
          Sign In
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-stone-100 dark:border-stone-900 text-center">
        <p className="text-sm text-stone-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-bold text-red-600 hover:text-red-700 transition-colors">
            Register
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
