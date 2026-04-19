import type { Metadata } from 'next';
import { AccountOrdersContent } from '@/components/account/AccountOrdersContent';

export const metadata: Metadata = {
  title: 'Order History',
  description: 'Review recent orders and open detailed receipts.',
};

export default function AccountOrdersPage() {
  return <AccountOrdersContent />;
}
