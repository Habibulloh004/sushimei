"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@sushimei/shared';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Phone } from 'lucide-react';
import styles from './page.module.css';

const UZ_PHONE_REGEX = /^\+998\d{9}$/;

function formatUzPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  const localDigits = (digits.startsWith('998') ? digits.slice(3) : digits).slice(0, 9);
  const part1 = localDigits.slice(0, 2);
  const part2 = localDigits.slice(2, 5);
  const part3 = localDigits.slice(5, 7);
  const part4 = localDigits.slice(7, 9);

  let formatted = '+998';
  if (part1) formatted += ` ${part1}`;
  if (part2) formatted += ` ${part2}`;
  if (part3) formatted += ` ${part3}`;
  if (part4) formatted += ` ${part4}`;

  return formatted;
}

function normalizePhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const normalizedDigits = digits.startsWith('998') ? digits : `998${digits}`;
  return `+${normalizedDigits.slice(0, 12)}`;
}

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
    if (typeof window === 'undefined') {
      return;
    }
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
      setLocalError('Enter a valid Uzbekistan phone number in format +998901234567');
      return;
    }

    setIsSubmitting(true);

    const result = await loginCustomer(normalizedPhone, password);
    setIsSubmitting(false);

    if (result.success) {
      router.push('/');
      return;
    }

    const detail = (result.errorDetail || '').toLowerCase();
    if (detail.includes('customer not found') || detail.includes('customer password not set')) {
      router.push(`/register?phone=${encodeURIComponent(normalizedPhone)}`);
    }
  };

  if (isLoading && !isSubmitting && !isAuthenticated) {
    return (
      <div className={styles.loadingScreen}>
        <Loader2 className={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgLayer} aria-hidden="true">
        <span className={`${styles.orb} ${styles.orbOne}`} />
        <span className={`${styles.orb} ${styles.orbTwo}`} />
        <span className={`${styles.orb} ${styles.orbThree}`} />
      </div>

      <main className={styles.shell}>
        <section className={styles.brandPanel}>
          <div className={styles.logoWrap}>
            <Image
              src="/brand/sushimei-logo.png"
              alt="Sushi Mei logo"
              width={62}
              height={62}
              className={styles.logoImage}
              priority
            />
            <div>
              <p className={styles.kicker}>SUSHIMEI ACCESS</p>
              <h1 className={styles.brandTitle}>CUSTOMER LOGIN</h1>
            </div>
          </div>

          <p className={styles.brandSubtitle}>
            Sign in fast to place orders, track deliveries, and keep your favorite sushi one tap away.
          </p>
        </section>

        <section className={styles.formPanel}>
          <div className={styles.formHeader}>
            <h2>Sign In</h2>
            <p>Use your phone number and password</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {(localError || error) && (
              <div className={styles.errorBox}>
                <AlertCircle className={styles.errorIcon} />
                <p>{localError || error}</p>
              </div>
            )}

            <label htmlFor="phone" className={styles.field}>
              <span>Phone Number</span>
              <div className={styles.inputWrap}>
                <Phone className={styles.inputIcon} />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatUzPhoneInput(e.target.value));
                    setLocalError(null);
                  }}
                  placeholder="+998 90 123 45 67"
                  required
                  inputMode="numeric"
                  autoComplete="tel"
                  className={styles.input}
                />
              </div>
              <small className={styles.helperText}>Format: +998 90 123 45 67</small>
            </label>

            <label htmlFor="password" className={styles.field}>
              <span>Password</span>
              <div className={styles.inputWrap}>
                <Lock className={styles.inputIcon} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className={styles.input}
              />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.togglePassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className={styles.toggleIcon} /> : <Eye className={styles.toggleIcon} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={isSubmitting || !UZ_PHONE_REGEX.test(normalizePhoneInput(phone)) || !password}
              className={styles.submitButton}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className={styles.buttonSpinner} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className={styles.registerCard}>
            <p>
              Don&apos;t have an account?{' '}
              <Link href="/register" className={styles.registerLink}>
                Register
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
