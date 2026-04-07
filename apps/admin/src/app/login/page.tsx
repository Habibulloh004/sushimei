"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@sushimei/shared';
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import styles from './page.module.css';

export default function AdminLoginPage() {
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
            <span className={styles.logoBadge}>匠</span>
            <div>
              <p className={styles.kicker}>SUSHIMEI ACCESS</p>
              <h1 className={styles.brandTitle}>SUSHIMEI ADMIN</h1>
            </div>
          </div>

          <p className={styles.brandSubtitle}>
            Manage orders, menu updates, and team operations from one secure control panel.
          </p>

          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <ShieldCheck className={styles.featureIcon} />
              <span>Role-based employee authentication</span>
            </div>
            <div className={styles.featureItem}>
              <Sparkles className={styles.featureIcon} />
              <span>Fast access to daily operations dashboard</span>
            </div>
          </div>
        </section>

        <section className={styles.formPanel}>
          <div className={styles.formHeader}>
            <h2>Sign In</h2>
            <p>Use your employee credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.errorBox}>
                <AlertCircle className={styles.errorIcon} />
                <p>{error}</p>
              </div>
            )}

            <label htmlFor="email" className={styles.field}>
              <span>Email Address</span>
              <div className={styles.inputWrap}>
                <Mail className={styles.inputIcon} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sushimei.jp"
                  required
                  autoComplete="email"
                  className={styles.input}
                />
              </div>
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
              disabled={isSubmitting || !email || !password}
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

          <div className={styles.credentialsCard}>
            <h3>Test Credentials</h3>
            <div className={styles.credentialRow}>
              <span>Admin</span>
              <code>admin@sushimei.jp / admin123</code>
            </div>
            <div className={styles.credentialRow}>
              <span>Manager</span>
              <code>manager@sushimei.jp / admin123</code>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
