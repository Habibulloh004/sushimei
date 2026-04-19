import type { Metadata } from 'next';
import { AccountContent } from '@/components/account/AccountContent';

export const metadata: Metadata = {
  title: 'Account Overview',
  description: 'Open profile settings, addresses, bonuses, and orders from your account center.',
};

export default function AccountPage() {
  return <AccountContent />;
}
