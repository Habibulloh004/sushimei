import { CustomerAddress, CustomerBonusActivity } from '@/lib/api';

export const getAccountAvatarSrc = (avatarUrl?: string | null) => avatarUrl?.trim() || '';

export const getAccountAvatarSeed = (seedSource?: string | null) =>
  (seedSource?.trim() || 'sushimei-guest').replace(/\s+/g, '-').toLowerCase();

export const formatAddressLines = (address: CustomerAddress) => [
  address.street,
  address.house,
  address.apartment ? `apt. ${address.apartment}` : null,
  address.city,
].filter(Boolean).join(', ');

export const getBonusActivityCopy = (activity: CustomerBonusActivity) => {
  switch (activity.txn_type) {
    case 'EARN':
      return {
        title: 'Points earned',
        accent: 'text-emerald-600',
        badge: 'Earn',
      };
    case 'SPEND':
      return {
        title: 'Points spent',
        accent: 'text-red-600',
        badge: 'Spend',
      };
    case 'REFUND':
      return {
        title: 'Points refunded',
        accent: 'text-sky-600',
        badge: 'Refund',
      };
    case 'EXPIRE':
      return {
        title: 'Points expired',
        accent: 'text-stone-500',
        badge: 'Expired',
      };
    default:
      return {
        title: 'Balance updated',
        accent: 'text-stone-700 dark:text-stone-200',
        badge: 'Adjust',
      };
  }
};
