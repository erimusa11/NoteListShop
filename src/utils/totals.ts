import type { ShoppingItem } from '@/types/models';

export function computeSpentTotal(items: ShoppingItem[]): number {
  return items.filter((item) => item.bought).reduce((sum, item) => sum + (item.price ?? 0), 0);
}

export function computeTotal(items: ShoppingItem[]): number {
  return items.reduce((sum, item) => sum + (item.price ?? 0), 0);
}

const numberFormatter = new Intl.NumberFormat('sq-AL', { maximumFractionDigits: 2 });

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatPrice(value: number): string {
  return `${formatNumber(Math.round(value))} Lekë`;
}
