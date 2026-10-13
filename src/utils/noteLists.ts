import type { NoteItem, NoteList, NoteListKind, QuantityUnit } from '@/types/models';
import { normalizePriority } from '@/utils/priority';
import { parseQuantity } from '@/utils/quantity';
import { normalizeText } from '@/utils/suggestions';
import { formatNumber } from '@/utils/totals';

export interface UnitInfo {
  value: QuantityUnit;
  /** On the choice while adding. */
  label: string;
  /** After the number on a row. */
  short: string;
}

/** The ways an amount can be counted; the first is the default. */
export const UNITS: UnitInfo[] = [
  { value: 'pcs', label: 'Copë', short: 'copë' },
  { value: 'kg', label: 'kg', short: 'kg' },
  { value: 'gr', label: 'gr', short: 'gr' },
  { value: 'l', label: 'Litër', short: 'l' },
];

export const DEFAULT_UNIT: QuantityUnit = 'pcs';

const isUnit = (value: unknown): value is QuantityUnit => UNITS.some((unit) => unit.value === value);

/** "2 kg", "500 gr", "1,5 l", "3 copë". */
export function formatQuantity(quantity: number, unit: QuantityUnit): string {
  const info = UNITS.find((entry) => entry.value === unit) ?? UNITS[0];
  return `${formatNumber(quantity)} ${info.short}`;
}

/** What the add / edit form hands back. `quantity` is the text of the field: an empty or invalid one means 1. */
export interface NoteItemFields {
  name: string;
  quantity: string;
  unit: QuantityUnit;
  /** The text of the price field, only in a list of products. Empty or invalid means no price. */
  price?: string;
  /** The priority (1 to 5), only in a normal list. */
  importance?: number;
}

/** The price typed in a field: a number from zero up, or undefined for nothing usable. */
export function parseNotePrice(text: string | undefined): number | undefined {
  const value = parseFloat((text ?? '').replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export const isProductList = (list: Pick<NoteList, 'kind'>): boolean => list.kind === 'products';

/** What every item of the list costs together; items without a price add nothing. */
export function noteListTotal(list: NoteList): number {
  return list.items.reduce((sum, item) => sum + (item.price ?? 0), 0);
}

export function newNoteId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function createNoteList(name: string, kind: NoteListKind = 'work'): NoteList {
  return { id: newNoteId(), name: name.trim(), createdAt: Date.now(), items: [], ...(kind === 'products' ? { kind } : {}) };
}

export function createNoteItem({ name, quantity, unit, price, importance }: NoteItemFields): NoteItem {
  const cost = parseNotePrice(price);
  return {
    id: newNoteId(),
    name: name.trim(),
    quantity: parseQuantity(quantity),
    unit: isUnit(unit) ? unit : DEFAULT_UNIT,
    done: false,
    createdAt: Date.now(),
    ...(cost !== undefined ? { price: cost } : {}),
    ...(importance !== undefined ? { importance: normalizePriority(importance) } : {}),
  };
}

export function editNoteItem(item: NoteItem, { name, quantity, unit, price, importance }: NoteItemFields): NoteItem {
  const { price: _before, importance: _level, ...rest } = item;
  // The price field is only there in a list of products and the priority only in a normal list; where one is not, the item keeps what it has.
  const cost = price === undefined ? _before : parseNotePrice(price);
  const level = importance === undefined ? _level : normalizePriority(importance);
  return {
    ...rest,
    name: name.trim(),
    quantity: parseQuantity(quantity),
    unit: isUnit(unit) ? unit : DEFAULT_UNIT,
    ...(cost !== undefined ? { price: cost } : {}),
    ...(level !== undefined ? { importance: level } : {}),
  };
}

/** What was saved on the phone may be damaged or from an older version: keep only what is a real list with real items. */
export function normalizeNoteLists(raw: unknown): NoteList[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): NoteList[] => {
    if (entry === null || typeof entry !== 'object') return [];
    const list = entry as Partial<Record<keyof NoteList, unknown>>;
    const name = typeof list.name === 'string' ? list.name.trim() : '';
    if (typeof list.id !== 'string' || !name) return [];
    const items = Array.isArray(list.items) ? list.items : [];
    return [
      {
        id: list.id,
        name,
        createdAt: Number.isFinite(list.createdAt) ? Number(list.createdAt) : 0,
        ...(Number.isFinite(list.deletedAt) ? { deletedAt: Number(list.deletedAt) } : {}),
        ...(list.kind === 'products' ? { kind: 'products' as const } : {}),
        items: items.flatMap((value): NoteItem[] => {
          if (value === null || typeof value !== 'object') return [];
          const item = value as Partial<Record<keyof NoteItem, unknown>>;
          const itemName = typeof item.name === 'string' ? item.name.trim() : '';
          if (typeof item.id !== 'string' || !itemName) return [];
          return [
            {
              id: item.id,
              name: itemName,
              quantity: parseQuantity(String(item.quantity ?? '')),
              unit: isUnit(item.unit) ? item.unit : DEFAULT_UNIT,
              done: item.done === true,
              createdAt: Number.isFinite(item.createdAt) ? Number(item.createdAt) : 0,
              ...(Number.isFinite(item.price) && Number(item.price) >= 0 ? { price: Number(item.price) } : {}),
              ...(Number.isFinite(item.importance) ? { importance: normalizePriority(Number(item.importance)) } : {}),
            },
          ];
        }),
      },
    ];
  });
}

/** What a deleted item leaves behind: just enough to suggest it again when adding one. */
export interface NoteHistoryEntry {
  name: string;
  quantity: number;
  unit: QuantityUnit;
  createdAt: number;
}

// Plenty for a lifetime of shopping notes, and keeps the copy on the phone small.
const HISTORY_LIMIT = 300;

export function normalizeNoteHistory(raw: unknown): NoteHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): NoteHistoryEntry[] => {
    if (entry === null || typeof entry !== 'object') return [];
    const value = entry as Partial<Record<keyof NoteHistoryEntry, unknown>>;
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    if (!name) return [];
    return [
      {
        name,
        quantity: parseQuantity(String(value.quantity ?? '')),
        unit: isUnit(value.unit) ? value.unit : DEFAULT_UNIT,
        createdAt: Number.isFinite(value.createdAt) ? Number(value.createdAt) : 0,
      },
    ];
  });
}

/** The history with these items added: one entry per name, the latest amount and unit it was used with, the newest first. */
export function rememberNoteItems(history: NoteHistoryEntry[], items: NoteItem[]): NoteHistoryEntry[] {
  const byName = new Map(history.map((entry) => [normalizeText(entry.name), entry]));
  for (const { name, quantity, unit, createdAt } of items) {
    const key = normalizeText(name);
    const known = byName.get(key);
    if (key && (!known || createdAt >= known.createdAt)) byName.set(key, { name, quantity, unit, createdAt });
  }
  return [...byName.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, HISTORY_LIMIT);
}

export interface NoteSuggestion {
  /** The normalized name. */
  key: string;
  name: string;
  /** The amount and unit it was last used with. */
  quantity: number;
  unit: QuantityUnit;
  /** In how many places it was used. */
  count: number;
  lastUsed: number;
}

// What was added before, in any group (and what was deleted from them), leaving out what the open group already has.
export function buildNoteSuggestions(
  lists: NoteList[],
  history: NoteHistoryEntry[],
  current: NoteItem[],
): NoteSuggestion[] {
  const present = new Set(current.map((item) => normalizeText(item.name)));
  const byKey = new Map<string, NoteSuggestion>();
  const add = ({ name, quantity, unit, createdAt }: NoteHistoryEntry) => {
    const key = normalizeText(name);
    if (!key || present.has(key)) return;
    const known = byKey.get(key);
    if (!known) {
      byKey.set(key, { key, name, quantity, unit, count: 1, lastUsed: createdAt });
      return;
    }
    known.count += 1;
    if (createdAt >= known.lastUsed) Object.assign(known, { name, quantity, unit, lastUsed: createdAt });
  };
  for (const list of lists) list.items.forEach(add);
  history.forEach(add);
  return [...byKey.values()];
}

/** What matches what is typed (even the whole name, since the amount may differ), names that start with it first; the most used when nothing is typed. */
export function pickNoteSuggestions(all: NoteSuggestion[], query: string, limit = 6): NoteSuggestion[] {
  const q = normalizeText(query);
  const rank = (s: NoteSuggestion) => (s.key.startsWith(q) ? 0 : 1);
  return all
    .filter((s) => !q || s.key.includes(q))
    .sort((a, b) => rank(a) - rank(b) || b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, limit);
}

/** The lists whose name contains what was typed, ignoring case and accents. */
export function filterNoteLists(lists: NoteList[], query: string): NoteList[] {
  const needle = normalizeText(query);
  return needle ? lists.filter((list) => normalizeText(list.name).includes(needle)) : lists;
}

/** Newest list first. */
export function newestFirst(lists: NoteList[]): NoteList[] {
  return [...lists].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Still to do first, the checked ones last. In a shopping list the open ones keep the order they were added in; in a normal
 * list (no `kind`) the most important is on top and among equals the one added first.
 */
export function sortNoteItems(items: NoteItem[], kind?: NoteListKind): NoteItem[] {
  const open = items.filter((item) => !item.done);
  if (kind !== 'products') {
    open.sort((a, b) => normalizePriority(b.importance) - normalizePriority(a.importance) || a.createdAt - b.createdAt);
  }
  return [...open, ...items.filter((item) => item.done)];
}
