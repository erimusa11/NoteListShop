import type { ShoppingItem, ShoppingTrip } from '@/types/models';
import { normalizePriority } from '@/utils/priority';

export function tripIncomeTotal(trip: ShoppingTrip): number {
  return (trip.incomes ?? []).reduce((sum, income) => sum + income.amount, 0);
}

// Unchecked items first, most urgent on top (same priority keeps its original order); checked items go last.
export function sortBoughtLast<T extends { bought: boolean; priority?: number }>(items: T[]): T[] {
  const open = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.bought)
    .sort((a, b) => normalizePriority(b.item.priority) - normalizePriority(a.item.priority) || a.index - b.index)
    .map(({ item }) => item);
  return [...open, ...items.filter((item) => item.bought)];
}

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
