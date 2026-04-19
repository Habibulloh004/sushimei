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

export default function CustomerRegisterPage() {
  const router = useRouter();
  const { registerCustomer, isAuthenticated, isLoading, error, clearError } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromQuery = new URLSearchParams(window.location.search).get('phone');
    if (fromQuery) setPhone(formatUzPhoneInput(fromQuery));
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isLoading) router.push('/');
  }, [isAuthenticated, isLoading, router]);

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
    if (password.length < 6) {
      const message = 'Password must be at least 6 characters';
      setLocalError(message);
      toast.error(message);
      return;
    }
    if (password !== confirmPassword) {
      const message = 'Passwords do not match';
      setLocalError(message);
      toast.error(message);
      return;
    }

    const loadingToast = toast.loading('Creating account...', {
      description: 'Saving your phone and password.',
    });

    setIsSubmitting(true);
    const result = await registerCustomer(normalizedPhone, password);
    setIsSubmitting(false);
    toast.dismiss(loadingToast);

    if (result.success) {
      toast.success('Account created', {
        description: 'You are now signed in.',
      });
      router.push('/');
      return;
    }

    toast.error(result.error || 'Failed to register', {
      description: result.errorDetail || 'Please try again.',
    });

    const detail = (result.errorDetail || '').toLowerCase();
    if (detail.includes('customer already exists')) {
      toast.error('Account already exists', {
        description: 'Redirecting you to sign in.',
      });
      router.push(`/login?phone=${encodeURIComponent(normalizedPhone)}`);
      return;
    }
    if (result.errorDetail) setLocalError(result.errorDetail);
  };

  if (isLoading && !isSubmitting && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-red-600" />
      </div>
    );
  }

  // Password strength indicator
  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColors = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500'];
  const strengthLabels = ['', 'Weak', 'Good', 'Strong'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-8 md:p-10"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-black tracking-tight">Create Account</h2>
        <p className="text-sm text-stone-500 mt-1">Register to place orders and track deliveries</p>
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
          <label htmlFor="password" className="block text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-4 py-3.5 pl-11 pr-12 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-stone-100 text-stone-400">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex gap-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= passwordStrength ? strengthColors[passwordStrength] : 'bg-stone-200'}`} />
                ))}
              </div>
              <span className="text-[10px] font-bold text-stone-400">{strengthLabels[passwordStrength]}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              required
              minLength={6}
              autoComplete="new-password"
              className={`w-full rounded-2xl border bg-white dark:bg-stone-950 px-4 py-3.5 pl-11 pr-12 text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                confirmPassword && confirmPassword !== password
                  ? 'border-red-300 focus:ring-red-100 focus:border-red-500'
                  : 'border-stone-200 dark:border-stone-800 focus:ring-red-100 focus:border-red-400'
              }`}
            />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-stone-100 text-stone-400">
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && confirmPassword !== password && (
            <p className="text-xs text-red-600 font-medium">Passwords do not match</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !UZ_PHONE_REGEX.test(normalizePhoneInput(phone)) || !password || !confirmPassword}
          isLoading={isSubmitting}
          className="w-full h-14 rounded-2xl text-sm shadow-lg shadow-red-600/20"
        >
          Register
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-stone-100 dark:border-stone-900 text-center">
        <p className="text-sm text-stone-500">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-red-600 hover:text-red-700 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
