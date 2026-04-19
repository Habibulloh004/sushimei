"use client";

import React from 'react';
import { Gift, History, Star } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useAccountCenter } from './account-center-context';
import { formatDate, formatDateTime } from '@/lib/format';
import { getBonusActivityCopy } from './account-utils';

export function AccountBonusesContent() {
  const {
    profile,
    bonusHistory,
    inviteCopied,
    handleCopyInvite,
    goToBonusInCart,
  } = useAccountCenter();

  return (
    <div className="space-y-8">
      <section className="rounded-[2.25rem] border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-stone-400">Loyalty Overview</p>
        <h2 className="mt-2 text-3xl font-black tracking-tighter">Bonus points & rewards</h2>
        <p className="mt-3 text-sm text-stone-500">Track your points, recent loyalty events, and referral perks from one place.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.75rem] bg-red-600 p-5 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-80">Available Bonus</p>
            <p className="mt-2 text-3xl font-black tracking-tight">{profile?.bonus_balance || 0} pts</p>
          </div>
          <div className="rounded-[1.75rem] border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-950">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Last Login</p>
            <p className="mt-2 text-sm font-black tracking-tight">{profile?.last_login_at ? formatDateTime(profile.last_login_at) : 'No login activity yet'}</p>
          </div>
          <div className="rounded-[1.75rem] border border-stone-100 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-950">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Member Tier</p>
            <p className="mt-2 text-sm font-black tracking-tight">{(profile?.bonus_balance || 0) >= 2000 ? 'Gold' : (profile?.bonus_balance || 0) >= 500 ? 'Silver' : 'Starter'}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2.25rem] border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-stone-400">Bonus Activity</p>
            <h3 className="mt-2 text-2xl font-black tracking-tighter">Recent loyalty history</h3>
          </div>
          <History className="h-5 w-5 text-red-600" />
        </div>

        <div className="mt-6 space-y-3">
          {bonusHistory.length > 0 ? bonusHistory.map((activity) => {
            const copy = getBonusActivityCopy(activity);
            return (
              <div key={activity.id} className="rounded-[1.5rem] border border-stone-100 bg-stone-50 px-5 py-4 dark:border-stone-800 dark:bg-stone-950">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black tracking-tight">{copy.title}</p>
                      <Badge variant="neutral">{copy.badge}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-stone-500">
                      {activity.reason || (activity.order_number ? `Order ${activity.order_number}` : 'Balance adjustment')}
                    </p>
                    <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-400">
                      {formatDateTime(activity.created_at)}
                      {activity.expires_at ? ` • Expires ${formatDate(activity.expires_at)}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-black tracking-tight ${copy.accent}`}>
                      {activity.txn_type === 'SPEND' || activity.txn_type === 'EXPIRE' ? '-' : '+'}
                      {activity.points} pts
                    </p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                      Balance {activity.balance_after}
                    </p>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="rounded-[1.5rem] border border-dashed border-stone-200 px-5 py-6 text-sm text-stone-500 dark:border-stone-800">
              No bonus activity yet. Your points history will appear here after you place orders or use bonuses in checkout.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[2.25rem] border border-stone-100 bg-stone-900 p-6 text-white shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <Star className="mt-1 h-6 w-6 text-red-400" />
          <div>
            <h3 className="text-2xl font-black tracking-tighter">Invite friends</h3>
            <p className="mt-2 text-stone-400">Both of you get 500 bonus points on their first order.</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button className="h-14 rounded-2xl px-8" onClick={handleCopyInvite}>
            {inviteCopied ? 'Copied!' : 'Copy Invite Link'}
          </Button>
          <Button variant="outline" className="h-14 rounded-2xl border-white/20 bg-transparent px-8 text-white hover:bg-white/10" onClick={goToBonusInCart}>
            <Gift className="h-4 w-4" />
            Use bonus in cart
          </Button>
        </div>
      </section>
    </div>
  );
}
