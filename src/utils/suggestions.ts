import type { ItemListKey, ShoppingItem, ShoppingTrip } from '@/types/models';

export interface Suggestion {
  key: string;
  name: string;
  quantity: string;
  price: number | null;
  count: number;
  lastUsed: number;
}

// `String()` because a name from damaged or older saved data may be missing; an empty text beats a crash.
export function normalizeText(value: string): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Anything with these fields can be suggested: an item in a list, or one that was deleted from it.
type SuggestionSource = Pick<ShoppingItem, 'name' | 'quantity' | 'price' | 'createdAt'>;

export function buildSuggestions(items: SuggestionSource[]): Suggestion[] {
  const byName = new Map<string, Suggestion>();
  for (const item of items) {
    const key = normalizeText(item.name);
    if (!key) continue;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, {
        key,
        name: String(item.name).trim(),
        quantity: item.quantity,
        price: item.price,
        count: 1,
        lastUsed: item.createdAt,
      });
    } else {
      existing.count += 1;
      if (item.createdAt >= existing.lastUsed) {
        existing.lastUsed = item.createdAt;
        existing.name = String(item.name).trim();
        existing.quantity = item.quantity;
        existing.price = item.price;
      }
    }
  }
  return [...byName.values()];
}

// Suggestions for one kind of item in the current list, built from every list (including what was deleted from them),
// leaving out what it already has.
export function buildListSuggestions(trips: ShoppingTrip[], current: ShoppingTrip | undefined, key: ItemListKey): Suggestion[] {
  const present = new Set((current?.[key] ?? []).map((item) => normalizeText(item.name)));
  const sources = trips.flatMap((trip): SuggestionSource[] => [
    ...(trip[key] ?? []),
    // `Array.isArray` because a list from damaged saved data may hold something else here.
    ...(Array.isArray(trip.removed) ? trip.removed : []).filter((removed) => removed && removed.list === key),
  ]);
  return buildSuggestions(sources).filter((s) => !present.has(s.key));
}

export function pickSuggestions(all: Suggestion[], query: string, limit = 6): Suggestion[] {
  const q = normalizeText(query);
  const rank = (s: Suggestion) => (s.key.startsWith(q) ? 0 : 1);
  return all
    .filter((s) => (q ? s.key.includes(q) && s.key !== q : true))
    .sort((a, b) => rank(a) - rank(b) || b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, limit);
}
