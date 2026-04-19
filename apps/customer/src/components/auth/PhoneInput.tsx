"use client";

import React from 'react';
import { Phone } from 'lucide-react';
import { formatUzPhoneInput } from '@/lib/format';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  id?: string;
}

export function PhoneInput({ value, onChange, error, id = 'phone' }: PhoneInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
        Phone Number
      </label>
      <div className="relative">
        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        <input
          id={id}
          type="tel"
          value={value}
          onChange={(e) => onChange(formatUzPhoneInput(e.target.value))}
          placeholder="+998 90 123 45 67"
          required
          inputMode="numeric"
          autoComplete="tel"
          className={`w-full rounded-2xl border bg-white dark:bg-stone-950 px-4 py-3.5 pl-11 text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-300 focus:ring-red-100 focus:border-red-500'
              : 'border-stone-200 dark:border-stone-800 focus:ring-red-100 dark:focus:ring-red-900/30 focus:border-red-400'
          }`}
        />
      </div>
      {error ? (
        <p className="text-xs text-red-600 font-medium">{error}</p>
      ) : (
        <p className="text-xs text-stone-400">Format: +998 90 123 45 67</p>
      )}
    </div>
  );
}
