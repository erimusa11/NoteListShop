import type { ShoppingItem, ShoppingTrip } from '@/types/models';
import { computeSpentTotal, computeTotal } from '@/utils/totals';

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

export interface TopItem {
  id: string;
  name: string;
  listName: string;
  price: number;
}

export const CATEGORY_COLORS: Record<string, string> = {
  products: '#E06A00',
  supplies: '#1F9E89',
  bills: '#3B6FD4',
  wishlist: '#C93D7A',
};

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(value));
}

export function buildListSpend(trips: ShoppingTrip[]): ListSpend[] {
  return trips.map((trip) => ({
    id: trip.id,
    name: trip.name,
    spent: computeSpentTotal(trip.items),
    planned: computeTotal(trip.items),
    budget: trip.budget != null && trip.budget > 0 ? trip.budget : null,
    boughtCount: trip.items.filter((item) => item.bought).length,
    itemCount: trip.items.length,
  }));
}

export function buildSectionSpend(
  trips: ShoppingTrip[],
  supplies: ShoppingItem[],
  bills: ShoppingItem[],
  wishlist: ShoppingItem[],
): SectionSpend[] {
  const products = trips.flatMap((trip) => trip.items);
  return [
    { key: 'products', label: 'Produktet', spent: computeSpentTotal(products), planned: computeTotal(products) },
    { key: 'supplies', label: 'Detergjente & Extra', spent: computeSpentTotal(supplies), planned: computeTotal(supplies) },
    { key: 'bills', label: 'Faturat', spent: computeSpentTotal(bills), planned: computeTotal(bills) },
    { key: 'wishlist', label: 'Dëshirat', spent: computeSpentTotal(wishlist), planned: computeTotal(wishlist) },
  ].sort((a, b) => b.spent - a.spent);
}

export function buildTopItems(trips: ShoppingTrip[], limit: number): TopItem[] {
  return trips
    .flatMap((trip) =>
      trip.items
        .filter((item) => item.bought && item.price != null && item.price > 0)
        .map((item) => ({ id: `${trip.id}:${item.id}`, name: item.name, listName: trip.name, price: item.price as number })),
    )
    .sort((a, b) => b.price - a.price)
    .slice(0, limit);
}
