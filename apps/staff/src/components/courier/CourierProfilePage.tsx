"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  LogOut,
  Mail,
  Phone,
  Power,
  PowerOff,
  TrendingUp,
  Wallet,
  CreditCard,
  Package,
  Store,
} from 'lucide-react';
import { spotApi, useAuth, useOrderStream, type Employee } from '@/lib/api';
import { CourierBottomNav } from './CourierBottomNav';

function formatMoney(n: number): string {
  return new Intl.NumberFormat('uz-UZ').format(n);
}

interface Stats {
  delivered: number;
  cash: number;
  card: number;
}

export function CourierProfilePage() {
  const { logout } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [onDuty, setOnDuty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onDutyLoading, setOnDutyLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await spotApi.getMe();
      if (res.success && res.data) {
        setEmployee(res.data.employee);
        setOnDuty(!!res.data.on_duty);
        setError(null);
      } else {
        setError(res.error?.message || 'Profil yuklanmadi');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tarmoq xatosi');
    } finally {
      setLoading(false);
    }
  }, []);

  // Pulls today's delivered orders for this courier. Backend already scopes
  // the list endpoint to the signed-in courier so no extra filter needed.
  const fetchStats = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const res = await spotApi.getOrders({
      status: 'DELIVERED',
      date_from: today.toISOString().slice(0, 10),
      limit: 100,
    });
    if (res.success) {
      const list = res.data || [];
      let cash = 0;
      let card = 0;
      for (const o of list) {
        if (o.payment_type === 'CASH') cash += o.total_amount;
        else card += o.total_amount;
      }
      setStats({ delivered: list.length, cash, card });
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, [fetchProfile, fetchStats]);

  // Any delivery completion in real time → refresh stats without waiting.
  useOrderStream({
    onEvent: (ev) => {
      if (ev.type === 'order.status_changed' && ev.status === 'DELIVERED') {
        fetchStats();
      }
    },
  });

  const toggleOnDuty = async () => {
    const next = !onDuty;
    setOnDutyLoading(true);
    try {
      const res = await spotApi.setMyOnDutyStatus(next);
      if (!res.success) {
        setError(res.error?.message || "Holatni yangilab bo'lmadi");
        return;
      }
      setOnDuty(next);
    } finally {
      setOnDutyLoading(false);
    }
  };

  const fullName = [employee?.first_name, employee?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || employee?.email || 'Kuryer';
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col pb-20">
      <header className="sticky top-0 z-20 bg-stone-900/95 backdrop-blur border-b border-stone-800">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-sm font-black tracking-widest uppercase">Profil</h1>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            onDuty
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              : 'bg-stone-800 text-stone-400 border-stone-700'
          }`}>
            {onDuty ? 'Faol' : 'Smena yopiq'}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-5 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-900/30 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        ) : (
          <>
            {/* Identity card */}
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-linear-to-br from-emerald-500/10 to-sky-500/5 border border-stone-800">
              {employee?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={employee.avatar_url}
                  alt={fullName}
                  className="w-20 h-20 rounded-2xl object-cover border border-stone-700"
                />
              ) : (
                <span className="w-20 h-20 rounded-2xl bg-emerald-500 text-stone-950 flex items-center justify-center font-black text-3xl shrink-0">
                  {initial}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-lg font-black tracking-tight truncate">{fullName}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mt-0.5">
                  {employee?.role_title || 'Kuryer'}
                </p>
                {employee?.spot_name && (
                  <p className="text-[11px] text-stone-400 mt-1.5 flex items-center gap-1.5">
                    <Store className="w-3 h-3" /> {employee.spot_name}
                  </p>
                )}
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 px-1">Kontakt</p>
              {employee?.email && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-stone-900 border border-stone-800">
                  <Mail className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="text-sm truncate">{employee.email}</span>
                </div>
              )}
              {employee?.phone ? (
                <a
                  href={`tel:${employee.phone}`}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-stone-900 border border-stone-800 hover:border-emerald-500/40 transition active:scale-[0.99]"
                >
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm truncate">{employee.phone}</span>
                </a>
              ) : (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-500">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span className="text-sm italic">Telefon qo'shilmagan</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 px-1 mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" /> Bugungi natijalar
              </p>
              <div className="grid grid-cols-3 gap-2">
                <StatTile
                  label="Yetkazildi"
                  value={String(stats?.delivered ?? 0)}
                  icon={Package}
                  tint="emerald"
                />
                <StatTile
                  label="Naqd"
                  value={formatMoney(stats?.cash ?? 0)}
                  suffix="so'm"
                  icon={Wallet}
                  tint="amber"
                />
                <StatTile
                  label="Karta"
                  value={formatMoney(stats?.card ?? 0)}
                  suffix="so'm"
                  icon={CreditCard}
                  tint="sky"
                />
              </div>
            </div>

            {/* Shift */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 px-1 mb-2">Smena</p>
              <button
                disabled={onDutyLoading}
                onClick={toggleOnDuty}
                className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider disabled:opacity-60 transition shadow-lg ${
                  onDuty
                    ? 'bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700'
                    : 'bg-emerald-500 text-stone-950 shadow-emerald-500/30 hover:bg-emerald-400'
                }`}
              >
                {onDutyLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : onDuty ? (
                  <><PowerOff className="w-4 h-4" /> Smenani tugatish</>
                ) : (
                  <><Power className="w-4 h-4" /> Smenani boshlash</>
                )}
              </button>
              {onDuty && (
                <p className="text-[11px] text-stone-500 text-center mt-2">
                  Faol — yangi zakazlar avtomatik ko'rinadi
                </p>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="w-full h-12 rounded-xl flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-bold uppercase tracking-wider transition"
            >
              <LogOut className="w-4 h-4" /> Chiqish
            </button>
          </>
        )}
      </main>

      <CourierBottomNav />
    </div>
  );
}

function StatTile({
  label, value, suffix, icon: Icon, tint,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: 'emerald' | 'amber' | 'sky';
}) {
  const tints = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    sky: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
  };
  const iconTints = {
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    sky: 'text-sky-400',
  };
  return (
    <div className={`rounded-xl border p-3 ${tints[tint]}`}>
      <div className="flex items-center gap-1 mb-1">
        <Icon className={`w-3 h-3 ${iconTints[tint]}`} />
        <p className="text-[9px] font-black uppercase tracking-widest opacity-80">{label}</p>
      </div>
      <p className="text-base font-black tabular-nums truncate">{value}</p>
      {suffix && <p className="text-[9px] text-stone-500 font-bold mt-0.5">{suffix}</p>}
    </div>
  );
}

