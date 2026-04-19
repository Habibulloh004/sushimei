import type { Metadata } from 'next';
import { AccountAddressesContent } from '@/components/account/AccountAddressesContent';

export const metadata: Metadata = {
  title: 'Saved Addresses',
  description: 'Manage your delivery addresses and default location.',
};

export default function AccountAddressesPage() {
  return <AccountAddressesContent />;
}
