"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { Button } from '@/components/ui/button';
import { normalizePhoneInput } from '@/lib/format';
import { UZ_PHONE_REGEX } from '@/lib/constants';
import { api, authApi } from '@/lib/api';

type Step = 'phone' | 'otp' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedPhone = normalizePhoneInput(phone);
    if (!UZ_PHONE_REGEX.test(normalizedPhone)) {
      const message = 'Enter a valid Uzbekistan phone number';
      setError(message);
      toast.error(message);
      return;
    }

    const loadingToast = toast.loading('Sending verification code...', {
      description: 'Checking your phone number.',
    });

    setIsSubmitting(true);
    try {
      const response = await authApi.requestCustomerOtp(normalizedPhone);
      toast.dismiss(loadingToast);

      if (response.success) {
        toast.success('Verification code sent', {
          description: 'Check your phone and enter the 6-digit code.',
        });
        setStep('otp');
      } else {
        const message = response.error?.message || response.error?.details || response.error?.detail || 'Failed to send OTP';
        setError(message);
        toast.error('Failed to send verification code', {
          description: message,
        });
      }
    } catch {
      toast.dismiss(loadingToast);
      const message = 'Failed to send verification code. Please try again.';
      setError(message);
      toast.error(message);
    }
    setIsSubmitting(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otpCode.length !== 6) {
      const message = 'Enter the 6-digit code';
      setError(message);
      toast.error(message);
      return;
    }

    const loadingToast = toast.loading('Verifying code...', {
      description: 'Signing you into your account.',
    });

    setIsSubmitting(true);
    try {
      const normalizedPhone = normalizePhoneInput(phone);
      const response = await authApi.verifyCustomerOtp(normalizedPhone, otpCode);
      toast.dismiss(loadingToast);

      if (response.success && response.data) {
        api.setAccessToken(response.data.access_token);
        if (typeof window !== 'undefined') {
          localStorage.setItem('refreshToken', response.data.refresh_token);
        }
        toast.success('Phone verified', {
          description: 'You are now signed in.',
        });
        setStep('success');
        setTimeout(() => router.push('/'), 2000);
      } else {
        const message = response.error?.message || response.error?.details || response.error?.detail || 'Invalid verification code';
        setError(message);
        toast.error('Verification failed', {
          description: message,
        });
      }
    } catch {
      toast.dismiss(loadingToast);
      const message = 'Verification failed. Please try again.';
      setError(message);
      toast.error(message);
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-8 md:p-10"
    >
      <AnimatePresence mode="wait">
        {step === 'phone' && (
          <motion.div key="phone" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="mb-8">
              <h2 className="text-2xl font-black tracking-tight">Forgot Password</h2>
              <p className="text-sm text-stone-500 mt-1">Enter your phone number to receive a verification code</p>
            </div>

            <form onSubmit={handleRequestOtp} className="space-y-5">
              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <PhoneInput value={phone} onChange={(v) => { setPhone(v); setError(null); }} />

              <Button
                type="submit"
                disabled={isSubmitting || !UZ_PHONE_REGEX.test(normalizePhoneInput(phone))}
                isLoading={isSubmitting}
                className="w-full h-14 rounded-2xl text-sm shadow-lg shadow-red-600/20"
              >
                Send Verification Code
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-stone-100 text-center">
              <Link href="/login" className="text-sm font-bold text-red-600 hover:text-red-700 transition-colors inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Link>
            </div>
          </motion.div>
        )}

        {step === 'otp' && (
          <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="mb-8">
              <h2 className="text-2xl font-black tracking-tight">Enter Code</h2>
              <p className="text-sm text-stone-500 mt-1">We sent a 6-digit code to your phone</p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Verification Code</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-4 text-center text-2xl font-black tracking-[0.5em] transition-all focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || otpCode.length !== 6}
                isLoading={isSubmitting}
                className="w-full h-14 rounded-2xl text-sm shadow-lg shadow-red-600/20"
              >
                Verify Code
              </Button>

              <button
                type="button"
                onClick={() => { setStep('phone'); setOtpCode(''); setError(null); }}
                className="w-full text-sm font-bold text-stone-400 hover:text-stone-600 transition-colors"
              >
                Use a different phone number
              </button>
            </form>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Verified!</h2>
              <p className="text-sm text-stone-500 mt-2">You&apos;re now signed in. Redirecting...</p>
            </div>
            <Loader2 className="w-5 h-5 animate-spin text-stone-400 mx-auto" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
