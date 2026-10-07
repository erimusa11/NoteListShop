import type { ShoppingItem, ShoppingTrip } from '@/types/models';
import type { Category } from '@/utils/categories';
import { normalizePriority } from '@/utils/priority';

/** The tab right after Të ardhurat that gathers the items marked as more important than normal, from every category. */
export const IMPORTANT_SECTION = 'important';
export const IMPORTANT_COLOR = '#E20D3F';

export interface ImportantEntry {
  category: Category;
  item: ShoppingItem;
}

export interface ImportantItems {
  /** Still to buy: the most important first; the same level keeps the order of the tabs, then of the list. */
  open: ImportantEntry[];
  /** All of them, checked or not, for the totals and the progress on the tab. */
  all: ShoppingItem[];
}

// Checking an item here checks it in its own category, and it leaves this tab because only what is still to buy is
// shown; unchecking it there brings it back.
export function importantItems(trip: ShoppingTrip | undefined, categories: Category[]): ImportantItems {
  const open: ImportantEntry[] = [];
  const all: ShoppingItem[] = [];
  for (const category of categories) {
    for (const item of trip?.[category.key] ?? []) {
      if (normalizePriority(item.priority) <= 1) continue;
      all.push(item);
      if (!item.bought) open.push({ category, item });
    }
  }
  // `sort` keeps the order of equal entries, so a tie stays in tab order, then list order.
  open.sort((a, b) => normalizePriority(b.item.priority) - normalizePriority(a.item.priority));
  return { open, all };
}
