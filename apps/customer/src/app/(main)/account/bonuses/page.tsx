import type { Metadata } from 'next';
import { AccountBonusesContent } from '@/components/account/AccountBonusesContent';

export const metadata: Metadata = {
  title: 'Bonuses & Loyalty',
  description: 'Track your bonus points, loyalty activity, and referral rewards.',
};

export default function AccountBonusesPage() {
  return <AccountBonusesContent />;
}
