import { Product } from '@/lib/api';

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface SelectedVariant {
  id: string;
  name: string;
  priceDelta: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  variant: SelectedVariant | null;
  modifiers: SelectedModifier[];
}

export function getCartItemUnitPrice(item: CartItem): number {
  const base = item.product.base_price;
  const variantDelta = item.variant?.priceDelta ?? 0;
  const modifiersDelta = item.modifiers.reduce((sum, m) => sum + m.priceDelta, 0);
  return base + variantDelta + modifiersDelta;
}

export function getCartItemLineTotal(item: CartItem): number {
  return getCartItemUnitPrice(item) * item.quantity;
}

export function getCartItemKey(item: CartItem): string {
  const variantKey = item.variant?.id ?? 'no-variant';
  const modifierKeys = item.modifiers.map(m => m.optionId).sort().join(',');
  return `${item.product.id}::${variantKey}::${modifierKeys}`;
}
