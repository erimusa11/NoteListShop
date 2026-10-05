import type { ShoppingItem, ShoppingTrip } from '@/types/models';

export function tripIncomeTotal(trip: ShoppingTrip): number {
  return (trip.incomes ?? []).reduce((sum, income) => sum + income.amount, 0);
}

export function sortBoughtLast<T extends { bought: boolean }>(items: T[]): T[] {
  return [...items.filter((item) => !item.bought), ...items.filter((item) => item.bought)];
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
