"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, authApi, AuthTokens, CustomerRegisterResponse } from '../api';

// Types
export type UserRole = 'CUSTOMER' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'KITCHEN' | 'COURIER' | 'SPOT_OPERATOR' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  // Customer auth
  requestOtp: (phone: string) => Promise<{ success: boolean; message?: string; otpCode?: string }>;
  verifyOtp: (phone: string, otpCode: string) => Promise<{ success: boolean; error?: string }>;
  loginCustomer: (phone: string, password: string) => Promise<{ success: boolean; error?: string; errorDetail?: string }>;
  registerCustomer: (phone: string, password: string) => Promise<{ success: boolean; error?: string; errorDetail?: string }>;

  // Employee auth
  loginEmployee: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;

  // Common
  logout: () => void;
  refreshAuth: () => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to decode JWT payload (without verification)
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Helper to check if token is expired
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return Date.now() >= payload.exp * 1000;
}

// Helper to extract user from token
function extractUserFromToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  return {
    id: payload.sub as string || payload.user_id as string || '',
    email: payload.email as string | undefined,
    phone: payload.phone as string | undefined,
    firstName: payload.first_name as string | undefined,
    lastName: payload.last_name as string | undefined,
    role: (payload.role as UserRole) || 'CUSTOMER',
  };
}

interface AuthProviderProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function AuthProvider({ children, allowedRoles }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = api.getAccessToken();
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

      if (accessToken && !isTokenExpired(accessToken)) {
        const user = extractUserFromToken(accessToken);
        if (user && (!allowedRoles || allowedRoles.includes(user.role))) {
          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return;
        }
      }

      // Try to refresh if we have a refresh token
      if (refreshToken) {
        const success = await refreshAuthInternal(refreshToken);
        if (success) return;
      }

      // Not authenticated
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    };

    initAuth();
  }, [allowedRoles]);

  const refreshAuthInternal = async (refreshToken: string): Promise<boolean> => {
    try {
      const response = await authApi.refreshToken(refreshToken);
      if (response.success && response.data) {
        handleAuthSuccess(response.data);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    return false;
  };

  const handleAuthSuccess = useCallback((tokens: AuthTokens) => {
    api.setAccessToken(tokens.access_token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('refreshToken', tokens.refresh_token);
    }

    const user = extractUserFromToken(tokens.access_token);
    if (user && (!allowedRoles || allowedRoles.includes(user.role))) {
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } else {
      api.setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('refreshToken');
      }
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: allowedRoles ? 'Access denied. Insufficient permissions.' : null,
      });
    }
  }, [allowedRoles]);

  const requestOtp = useCallback(async (phone: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authApi.requestCustomerOtp(phone);
      setState(prev => ({ ...prev, isLoading: false }));

      if (response.success) {
        const otpCode = response.data?.otp_code || response.data?.debug?.otp;
        return {
          success: true,
          message: response.data?.message,
          otpCode, // Only in dev mode
        };
      }

      const errorMsg = response.error?.message || 'Failed to send OTP';
      setState(prev => ({ ...prev, error: errorMsg }));
      return { success: false, message: errorMsg };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setState(prev => ({ ...prev, isLoading: false, error: errorMsg }));
      return { success: false, message: errorMsg };
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, otpCode: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authApi.verifyCustomerOtp(phone, otpCode);

      if (response.success && response.data) {
        handleAuthSuccess(response.data);
        return { success: true };
      }

      const errorMsg = response.error?.message || 'Invalid OTP code';
      setState(prev => ({ ...prev, isLoading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setState(prev => ({ ...prev, isLoading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [handleAuthSuccess]);

  const loginCustomer = useCallback(async (phone: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authApi.customerLogin(phone, password);

      if (response.success && response.data) {
        handleAuthSuccess(response.data);
        return { success: true };
      }

      const errorMsg = response.error?.message || 'Invalid credentials';
      const errorDetail = response.error?.detail || response.error?.details;
      setState(prev => ({ ...prev, isLoading: false, error: errorMsg }));
      return { success: false, error: errorMsg, errorDetail };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setState(prev => ({ ...prev, isLoading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [handleAuthSuccess]);

  const registerCustomer = useCallback(async (phone: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authApi.customerRegister(phone, password);

      if (response.success && response.data) {
        const registerData = response.data as CustomerRegisterResponse;

        if (registerData.exists) {
          setState(prev => ({ ...prev, isLoading: false }));
          return { success: false, error: 'Customer already exists', errorDetail: 'customer already exists' };
        }

        if (registerData.access_token && registerData.refresh_token) {
          handleAuthSuccess(registerData as AuthTokens);
          return { success: true };
        }

        setState(prev => ({ ...prev, isLoading: false, error: 'Failed to register' }));
        return { success: false, error: 'Failed to register' };
      }

      const errorMsg = response.error?.message || 'Failed to register';
      const errorDetail = response.error?.detail || response.error?.details;
      setState(prev => ({ ...prev, isLoading: false, error: errorMsg }));
      return { success: false, error: errorMsg, errorDetail };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setState(prev => ({ ...prev, isLoading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [handleAuthSuccess]);

  const loginEmployee = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authApi.employeeLogin(email, password);

      if (response.success && response.data) {
        handleAuthSuccess(response.data);
        return { success: true };
      }

      const errorMsg = response.error?.message || 'Invalid credentials';
      setState(prev => ({ ...prev, isLoading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      setState(prev => ({ ...prev, isLoading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [handleAuthSuccess]);

  const logout = useCallback(() => {
    api.setAccessToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refreshToken');
    }
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  const refreshAuth = useCallback(async () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    if (!refreshToken) return false;
    return refreshAuthInternal(refreshToken);
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextType = {
    ...state,
    requestOtp,
    verifyOtp,
    loginCustomer,
    registerCustomer,
    loginEmployee,
    logout,
    refreshAuth,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protected pages
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles?: UserRole[]
) {
  return function WithAuthComponent(props: P) {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // Will be redirected by the page
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
            <p className="text-stone-500 mt-2">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}
