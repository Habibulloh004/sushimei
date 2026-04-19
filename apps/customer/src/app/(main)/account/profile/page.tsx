import type { Metadata } from 'next';
import { AccountProfileContent } from '@/components/account/AccountProfileContent';

export const metadata: Metadata = {
  title: 'Profile Settings',
  description: 'Update your personal information and account preferences.',
};

export default function AccountProfilePage() {
  return <AccountProfileContent />;
}
