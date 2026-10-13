import type { ShoppingItem, ShoppingTrip } from '@/types/models';
import type { Category } from '@/utils/categories';
import { computeSpentTotal } from '@/utils/totals';

/** The tab right after Më të rëndësishmet that gathers everything already checked off, split by its category. */
export const SPENT_SECTION = 'spent';
export const SPENT_COLOR = '#2FA96B';

export interface SpentGroup {
  category: Category;
  /** The checked items of this category, in the order of its list. */
  items: ShoppingItem[];
  /** What they add up to. */
  total: number;
}

export interface SpentItems {
  /** One group per category that has something checked, the one that took the most money first. */
  groups: SpentGroup[];
  /** How many items are checked in all. */
  count: number;
}

// Unchecking an item here unchecks it in its own category, and it leaves this tab; checking it there brings it back.
export function spentItems(trip: ShoppingTrip | undefined, categories: Category[]): SpentItems {
  const groups: SpentGroup[] = [];
  let count = 0;
  for (const category of categories) {
    const items = (trip?.[category.key] ?? []).filter((item) => item.bought);
    if (items.length === 0) continue;
    count += items.length;
    groups.push({ category, items, total: computeSpentTotal(items) });
  }
  // `sort` keeps the order of equal groups, so a tie stays in tab order.
  groups.sort((a, b) => b.total - a.total);
  return { groups, count };
}
