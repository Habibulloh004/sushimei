import { Product } from '@/lib/api';

export const getName = (i18n: Record<string, string> | undefined, lang = 'en'): string => {
  if (!i18n) return '';
  return i18n[lang] || i18n['en'] || Object.values(i18n)[0] || '';
};

export const sanitizeUiText = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const profanityPatterns = [
    /\bfuck(?:er|ers|ing|ed)?\b/gi,
    /\bshit(?:ty|ting|ted)?\b/gi,
    /\bbitch(?:es)?\b/gi,
    /\basshole(?:s)?\b/gi,
  ];
  return profanityPatterns.reduce((text, pattern) => text.replace(pattern, '***'), normalized);
};

export const getSafeName = (i18n: Record<string, string> | undefined, lang = 'en'): string =>
  sanitizeUiText(getName(i18n, lang));

export const getSafeDescription = (i18n: Record<string, string> | undefined, lang = 'en'): string =>
  sanitizeUiText(getName(i18n, lang));

export const matchesDietaryOption = (product: Product, option: string): boolean => {
  const normalized = option.trim().toLowerCase();
  const productTags = (product.tags || []).map((tag) => tag.trim().toLowerCase());

  if (normalized.includes('vegan')) return product.is_vegan || productTags.includes('vegan');
  if (normalized.includes('halal')) return product.is_halal || productTags.includes('halal');
  if (normalized.includes('spicy')) return product.is_spicy || productTags.includes('spicy');
  if (normalized.includes('vegetarian')) return productTags.includes('vegetarian') || productTags.includes('vegan') || product.is_vegan;

  return productTags.includes(normalized);
};
