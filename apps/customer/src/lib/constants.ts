export const UZ_PHONE_REGEX = /^\+998\d{9}$/;

export const REVALIDATE = {
  publicData: 300,
  staticPages: 3600,
} as const;

export const BRAND = {
  red: '#d9232f',
  redStrong: '#b31822',
  gold: '#c3912e',
  black: '#0d0d0d',
  light: '#f1efeb',
} as const;

export const CART_STORAGE_KEY = 'sushimei-cart';

export const PRODUCTS_PAGE_LIMIT = 100;

export const PRODUCT_CARD_ADD_BUTTON_CLASS_NAME =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-xl shadow-red-600/40 sm:h-12 sm:w-12 sm:rounded-2xl';
