import type { ShoppingTrip } from '@/types/models';
import { CATEGORIES, INCOME_COLOR, type Category } from '@/utils/categories';
import { computeSpentTotal, computeTotal, tripAllItems, tripIncomeTotal } from '@/utils/totals';

export interface ListSpend {
  id: string;
  name: string;
  spent: number;
  planned: number;
  budget: number | null;
  boughtCount: number;
  itemCount: number;
}

export interface SectionSpend {
  key: string;
  label: string;
  spent: number;
  planned: number;
}

export interface HistoryColumn {
  id: string;
  name: string;
  createdAt: number;
  spent: number;
}

export interface CategoryHistory {
  category: Category;
  /** One column per list, oldest first. */
  columns: HistoryColumn[];
  total: number;
}

export const CATEGORY_COLORS: Record<string, string> = {
  income: INCOME_COLOR,
  ...Object.fromEntries(CATEGORIES.map(({ section, color }) => [section, color])),
};

// Short enough for a narrow chart column: 850, 1.2k, 13k, 1.2M.
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(value));
}

export function buildListSpend(trips: ShoppingTrip[]): ListSpend[] {
  return trips.map((trip) => {
    const items = tripAllItems(trip);
    return {
      id: trip.id,
      name: trip.name,
      spent: computeSpentTotal(items),
      planned: computeTotal(items),
      budget: tripIncomeTotal(trip) > 0 ? tripIncomeTotal(trip) : null,
      boughtCount: items.filter((item) => item.bought).length,
      itemCount: items.length,
    };
  });
}

export function buildSectionSpend(trips: ShoppingTrip[]): SectionSpend[] {
  return CATEGORIES.map(({ section, label, key: list }) => {
    const items = trips.flatMap((trip) => trip[list] ?? []);
    return { key: section, label, spent: computeSpentTotal(items), planned: computeTotal(items) };
  }).sort((a, b) => b.spent - a.spent);
}

export const HISTORY_LISTS = 12;

// For every category, what was spent in each of the last `limit` lists (same lists in every category).
// Categories with spending come first, in the usual order; the empty ones follow.
export function buildCategoryHistory(trips: ShoppingTrip[], limit: number = HISTORY_LISTS): CategoryHistory[] {
  const recent = [...trips].sort((a, b) => a.createdAt - b.createdAt).slice(-limit);
  const histories = CATEGORIES.map((category) => {
    const columns = recent.map((trip) => ({
      id: trip.id,
      name: trip.name,
      createdAt: trip.createdAt,
      spent: computeSpentTotal(trip[category.key] ?? []),
    }));
    return { category, columns, total: columns.reduce((sum, column) => sum + column.spent, 0) };
  });
  return [...histories.filter((h) => h.total > 0), ...histories.filter((h) => h.total === 0)];
}
