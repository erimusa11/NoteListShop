import type { ShoppingItem, ShoppingTrip } from '@/types/models';
import { CATEGORIES, INCOME_COLOR, type Category } from '@/utils/categories';
import {
  type OptionChoices,
  optionChoices,
  optionColor,
  optionMatcher,
  personChoices,
  personColor,
} from '@/utils/options';
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

/** One choice of a category that has `nameOptions` (such as Naftë), with what it cost in each list. */
export interface OptionSpend {
  name: string;
  color: string;
  /** One column per list, oldest first. */
  columns: HistoryColumn[];
  total: number;
}

export interface OptionHistory {
  category: Category;
  /** The heading of the card. */
  title: string;
  options: OptionSpend[];
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

// The last `limit` lists, oldest first: the columns of every chart.
const recentTrips = (trips: ShoppingTrip[], limit: number) =>
  [...trips].sort((a, b) => a.createdAt - b.createdAt).slice(-limit);

// For every category, what was spent in each of the last `limit` lists (same lists in every category).
// Categories with spending come first, in the usual order; the empty ones follow.
export function buildCategoryHistory(trips: ShoppingTrip[], limit: number = HISTORY_LISTS): CategoryHistory[] {
  const recent = recentTrips(trips, limit);
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

// What each choice of a category (Naftë, Gaz, Benzinë; Drion, Alois…) was spent on, list by list, over the last
// `limit` lists. Items are matched by name, ignoring case and accents; one that is not a choice is counted under the
// category's "other" group ("Të tjera", or its own such as "Tjetër"), so the choices always add up to the category's total.
export function buildOptionHistory(
  trips: ShoppingTrip[],
  category: Category,
  limit: number = HISTORY_LISTS,
): OptionHistory | null {
  const choices = optionChoices(category);
  if (!choices) return null;
  const title = category.optionsReportTitle ?? category.label;
  return historyBy(trips, category, choices, title, (item) => item.name, optionColor, limit);
}

// The same, split by who the items are for (Drion, Alois), in a category that asks for it.
export function buildPersonHistory(
  trips: ShoppingTrip[],
  category: Category,
  limit: number = HISTORY_LISTS,
): OptionHistory | null {
  const choices = personChoices(category);
  if (!choices) return null;
  const title = category.personReportTitle ?? `${category.label} sipas personit`;
  return historyBy(trips, category, choices, title, (item) => item.person ?? '', personColor, limit);
}

function historyBy(
  trips: ShoppingTrip[],
  category: Category,
  { names, otherLabel, otherAlwaysShown }: OptionChoices,
  title: string,
  valueOf: (item: ShoppingItem) => string,
  colorOf: (index: number) => string,
  limit: number,
): OptionHistory {
  const recent = recentTrips(trips, limit);
  const labels = [...names, otherLabel];
  const choiceOf = optionMatcher(names);

  const all = labels.map((name, index): OptionSpend => {
    const columns = recent.map((trip) => ({
      id: trip.id,
      name: trip.name,
      createdAt: trip.createdAt,
      spent: computeSpentTotal((trip[category.key] ?? []).filter((item) => choiceOf(valueOf(item)) === index)),
    }));
    return {
      name,
      color: colorOf(index),
      columns,
      total: columns.reduce((sum, column) => sum + column.spent, 0),
    };
  });

  // The "other" group is listed when the category names it, or otherwise only once it has spending.
  const options = all.filter((option, index) => index < names.length || otherAlwaysShown || option.total > 0);
  return { category, title, options, total: options.reduce((sum, option) => sum + option.total, 0) };
}
