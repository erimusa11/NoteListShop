import type { ShoppingItem, ShoppingTrip } from '@/types/models';
import { CATEGORIES, type Category } from '@/utils/categories';
import { normalizePriority } from '@/utils/priority';
import { parseQuantity } from '@/utils/quantity';

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

// What the row costs: the price of one times the quantity.
export function itemTotal(item: ShoppingItem): number {
  const total = (item.price ?? 0) * parseQuantity(item.quantity);
  // A huge price times a quantity can overflow; Infinity would reach the charts as NaN.
  return Number.isFinite(total) ? total : 0;
}

export function computeSpentTotal(items: ShoppingItem[]): number {
  return items.filter((item) => item.bought).reduce((sum, item) => sum + itemTotal(item), 0);
}

export function computeTotal(items: ShoppingItem[]): number {
  return items.reduce((sum, item) => sum + itemTotal(item), 0);
}

const numberFormatter = new Intl.NumberFormat('sq-AL', { maximumFractionDigits: 2 });

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatPrice(value: number): string {
  return `${formatNumber(Math.round(value))} Lekë`;
}

// The items of every category of one list.
export function tripAllItems(trip: ShoppingTrip): ShoppingItem[] {
  return CATEGORIES.flatMap(({ key }) => trip[key] ?? []);
}

// The categories of one list in the order its tabs are shown: by the number on the tab, which is how many items are
// still to buy, the biggest first. A tie goes to the category with more items in all, then to the bigger total, then to
// the usual order. Categories with nothing left to buy (all bought, then empty ones) come last.
export function categoriesByOpenItems(trip: ShoppingTrip | undefined): Category[] {
  if (!trip) return CATEGORIES;
  return CATEGORIES.map((category, index) => {
    const items = trip[category.key] ?? [];
    return {
      category,
      index,
      open: items.filter((item) => !item.bought).length,
      count: items.length,
      total: computeTotal(items),
    };
  })
    .sort((a, b) => b.open - a.open || b.count - a.count || b.total - a.total || a.index - b.index)
    .map(({ category }) => category);
}
