import type { ItemListKey, ShoppingItem, ShoppingTrip } from '@/types/models';
import type { Category } from '@/utils/categories';

export interface Suggestion {
  /** Tells suggestions apart: the normalized text, with the group in front of it when it has one. */
  key: string;
  /** The normalized `name`, which what is being typed is matched against. */
  search: string;
  /** What to add. In a category with groups (Drion, Kia Morning…) this is the description, written under `group`. */
  name: string;
  /** The group (Drion, Naftë…) that `name` was written under. Missing for an item that has a name of its own. */
  group?: string;
  /** Who it was last added for, in a category that asks (Drion, Alois). */
  person?: string;
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
type SuggestionSource = Pick<ShoppingItem, 'name' | 'quantity' | 'price' | 'createdAt'> & { note?: string; person?: string };

/** How a category with groups (`nameOptions`) turns its items into suggestions. */
export interface SuggestionGroups {
  /** The groups, e.g. Drion, Alois. */
  names: string[];
  /** The group alone is the whole item (Naftë, with a price), so an item without a description is suggested as well. */
  bare: boolean;
}

/** The groups of a category that has them, or undefined for one that does not. */
export function suggestionGroups(category: Category): SuggestionGroups | undefined {
  const names = category.nameOptions;
  if (!names || names.length === 0) return undefined;
  return { names, bare: !category.showNote && !category.otherOption };
}

interface Candidate {
  text: string;
  group?: string;
  person?: string;
  quantity: string;
  price: number | null;
  createdAt: number;
}

// In a category with groups many items share a name (every Drion), so what tells them apart, and what is worth
// suggesting, is the description under the name; an item whose name is none of the groups has that name to suggest.
function candidates(items: SuggestionSource[], groups?: SuggestionGroups): Candidate[] {
  const wanted = groups?.names.map(normalizeText) ?? [];
  const found: Candidate[] = [];
  for (const item of items) {
    const { quantity, price, createdAt } = item;
    const name = String(item.name ?? '').trim();
    const person = typeof item.person === 'string' && item.person.trim() ? item.person.trim() : undefined;
    const index = groups ? wanted.indexOf(normalizeText(name)) : -1;
    if (!groups || index === -1) {
      found.push({ text: name, person, quantity, price, createdAt });
      continue;
    }
    const note = typeof item.note === 'string' ? item.note.trim() : '';
    const group = groups.names[index];
    if (note) found.push({ text: note, group, person, quantity, price, createdAt });
    else if (groups.bare) found.push({ text: group, group, person, quantity, price, createdAt });
  }
  return found;
}

export function buildSuggestions(items: SuggestionSource[], groups?: SuggestionGroups): Suggestion[] {
  const byKey = new Map<string, Suggestion>();
  for (const { text, group, person, quantity, price, createdAt } of candidates(items, groups)) {
    const search = normalizeText(text);
    if (!search) continue;
    const key = group ? `${normalizeText(group)}|${search}` : search;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { key, search, name: text, group, person, quantity, price, count: 1, lastUsed: createdAt });
    } else {
      existing.count += 1;
      if (createdAt >= existing.lastUsed) {
        existing.lastUsed = createdAt;
        existing.name = text;
        existing.person = person ?? existing.person;
        existing.quantity = quantity;
        existing.price = price;
      }
    }
  }
  return [...byKey.values()];
}

// Suggestions for one kind of item in the current list, built from every list (including what was deleted from them),
// leaving out what it already has.
export function buildListSuggestions(
  trips: ShoppingTrip[],
  current: ShoppingTrip | undefined,
  key: ItemListKey,
  groups?: SuggestionGroups,
): Suggestion[] {
  const present = new Set(buildSuggestions(current?.[key] ?? [], groups).map((s) => s.key));
  const sources = trips.flatMap((trip): SuggestionSource[] => [
    ...(trip[key] ?? []),
    // `Array.isArray` because a list from damaged saved data may hold something else here.
    ...(Array.isArray(trip.removed) ? trip.removed : []).filter((removed) => removed && removed.list === key),
  ]);
  return buildSuggestions(sources, groups).filter((s) => !present.has(s.key));
}

export function pickSuggestions(all: Suggestion[], query: string, limit = 6): Suggestion[] {
  const q = normalizeText(query);
  const rank = (s: Suggestion) => (s.search.startsWith(q) ? 0 : 1);
  return all
    .filter((s) => (q ? s.search.includes(q) && s.search !== q : true))
    .sort((a, b) => rank(a) - rank(b) || b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, limit);
}
