import type { NoteItem, NoteList, NoteListKind, NoteSection, QuantityUnit } from '@/types/models';
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

/** The parts of a shopping list, in the order of its tabs; the first is where everything without a part belongs. */
export const NOTE_SECTIONS: { value: NoteSection; label: string; icon: 'nutrition-outline' | 'sparkles-outline' }[] = [
  { value: 'ushqime', label: 'Ushqime', icon: 'nutrition-outline' },
  { value: 'detergjente', label: 'Detergjente', icon: 'sparkles-outline' },
];

export const DEFAULT_SECTION: NoteSection = NOTE_SECTIONS[0].value;

/** The part an item (or a suggestion) belongs to: Ushqime unless it says otherwise. */
export const sectionOf = (entry: { section?: NoteSection }): NoteSection =>
  entry.section === 'detergjente' ? 'detergjente' : DEFAULT_SECTION;

/** Only what is stored for the second part: Ushqime is the default and stays unwritten, like the kind of a list. */
const sectionField = (section: NoteSection | undefined) => (section === 'detergjente' ? { section } : {});

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
  /** The part of a shopping list the item goes in (new items only; an item keeps its part when edited). */
  section?: NoteSection;
  /** The text of the repeat field, only in a normal list: after that many days a checked item comes back unchecked. Empty or invalid means no repeat. */
  repeatDays?: string;
}

export const MAX_REPEAT_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The days typed in the repeat field: a whole number from 1 to a year, or undefined for nothing usable. */
export function parseRepeatDays(text: string | undefined): number | undefined {
  const value = parseInt((text ?? '').trim(), 10);
  return Number.isFinite(value) && value >= 1 ? Math.min(value, MAX_REPEAT_DAYS) : undefined;
}

/** How many days are left before a checked, repeating item comes back; undefined when it is not waiting to. */
export function daysUntilRepeat(item: NoteItem, now: number): number | undefined {
  if (!item.done || !item.repeatDays || item.doneAt === undefined) return undefined;
  return Math.max(1, Math.ceil((item.doneAt + item.repeatDays * DAY_MS - now) / DAY_MS));
}

/** Whether a checked, repeating item has waited its days and should come back unchecked. */
export const isRepeatDue = (item: NoteItem, now: number): boolean =>
  item.done && !!item.repeatDays && item.doneAt !== undefined && now - item.doneAt >= item.repeatDays * DAY_MS;

/** A checked item of a normal list that does not repeat is cleared after this many days, so the lists stay small. */
export const STALE_DONE_DAYS = 30;

/**
 * The normal list with its stale items cleared: checked, not repeating and checked at least `STALE_DONE_DAYS` ago. A checked item
 * that has no day yet (from before the days were noted) only gets today's, so nothing is cleared the moment this first runs.
 * Returns the same list when there is nothing to change.
 */
export function tidyNormalList(list: NoteList, now: number): NoteList {
  if (isProductList(list)) return list;
  const limit = STALE_DONE_DAYS * DAY_MS;
  let changed = false;
  const items = list.items.flatMap((item): NoteItem[] => {
    if (!item.done || item.repeatDays) return [item];
    if (item.doneAt === undefined) {
      changed = true;
      return [{ ...item, doneAt: now }];
    }
    if (now - item.doneAt < limit) return [item];
    changed = true;
    return [];
  });
  return changed ? { ...list, items } : list;
}

/** A checked product that was sent to a list, or moved to the checked ones, is only kept there, not among the products still to buy. */
export const isFinished = (item: NoteItem): boolean => item.done && (item.sentTo !== undefined || item.archived === true);

/** The price typed in a field: a number from zero up, or undefined for nothing usable. */
export function parseNotePrice(text: string | undefined): number | undefined {
  const value = parseFloat((text ?? '').replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export const isProductList = (list: Pick<NoteList, 'kind'>): boolean => list.kind === 'products';

/** What every item of the list costs together; items without a price add nothing. */
export function noteListTotal(list: Pick<NoteList, 'items'>): number {
  return list.items.reduce((sum, item) => sum + (item.price ?? 0), 0);
}

export function newNoteId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function createNoteList(name: string, kind: NoteListKind = 'work'): NoteList {
  return { id: newNoteId(), name: name.trim(), createdAt: Date.now(), items: [], ...(kind === 'products' ? { kind } : {}) };
}

export function createNoteItem({ name, quantity, unit, price, importance, section, repeatDays }: NoteItemFields): NoteItem {
  const cost = parseNotePrice(price);
  const repeat = parseRepeatDays(repeatDays);
  return {
    id: newNoteId(),
    name: name.trim(),
    quantity: parseQuantity(quantity),
    unit: isUnit(unit) ? unit : DEFAULT_UNIT,
    done: false,
    createdAt: Date.now(),
    ...(cost !== undefined ? { price: cost } : {}),
    ...(importance !== undefined ? { importance: normalizePriority(importance) } : {}),
    ...sectionField(section),
    ...(repeat !== undefined ? { repeatDays: repeat } : {}),
  };
}

export function editNoteItem(item: NoteItem, { name, quantity, unit, price, importance, repeatDays }: NoteItemFields): NoteItem {
  const { price: _before, importance: _level, repeatDays: _repeat, ...rest } = item;
  // Like the priority, the repeat field is only in a normal list; where it is not, the item keeps what it has.
  const repeat = repeatDays === undefined ? _repeat : parseRepeatDays(repeatDays);
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
    ...(repeat !== undefined ? { repeatDays: repeat } : {}),
    // An item that is checked already starts counting its days from now.
    ...(repeat !== undefined && item.done && item.doneAt === undefined ? { doneAt: Date.now() } : {}),
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
              ...sectionField(item.section as NoteSection | undefined),
              ...(typeof item.sentTo === 'string' && item.sentTo ? { sentTo: item.sentTo } : {}),
              ...(Number.isFinite(item.sentCount) && Number(item.sentCount) >= 1 ? { sentCount: Math.floor(Number(item.sentCount)) } : {}),
              ...(Number.isFinite(item.repeatDays) && Number(item.repeatDays) >= 1
                ? { repeatDays: Math.min(Math.floor(Number(item.repeatDays)), MAX_REPEAT_DAYS) }
                : {}),
              ...(Number.isFinite(item.doneAt) ? { doneAt: Number(item.doneAt) } : {}),
              ...(item.archived === true ? { archived: true } : {}),
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
  /** The part of a shopping list it was in; missing means Ushqime. */
  section?: NoteSection;
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
        ...sectionField(value.section as NoteSection | undefined),
      },
    ];
  });
}

/** The history with these items added: one entry per name, the latest amount and unit it was used with, the newest first. */
export function rememberNoteItems(history: NoteHistoryEntry[], items: NoteItem[]): NoteHistoryEntry[] {
  // The same name in the other part (a "Sapun" in Ushqime and in Detergjente) is a separate suggestion.
  const keyOf = (name: string, section: NoteSection | undefined) => `${sectionOf({ section })}:${normalizeText(name)}`;
  const byName = new Map(history.map((entry) => [keyOf(entry.name, entry.section), entry]));
  for (const { name, quantity, unit, createdAt, section } of items) {
    const key = keyOf(name, section);
    const known = byName.get(key);
    if (normalizeText(name) && (!known || createdAt >= known.createdAt)) {
      byName.set(key, { name, quantity, unit, createdAt, ...sectionField(section) });
    }
  }
  return [...byName.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, HISTORY_LIMIT);
}

/**
 * Both sets of groups together, for the first time a phone meets the account's lists: nothing from either side is lost.
 * A group (or an item) that is on both sides is taken as the account has it.
 */
export function mergeNoteLists(account: NoteList[], phone: NoteList[]): NoteList[] {
  const known = new Map(account.map((list) => [list.id, list]));
  const merged = account.map((list) => {
    const other = phone.find((entry) => entry.id === list.id);
    if (!other) return list;
    const ids = new Set(list.items.map((item) => item.id));
    return { ...list, items: [...list.items, ...other.items.filter((item) => !ids.has(item.id))] };
  });
  return [...merged, ...phone.filter((list) => !known.has(list.id))];
}

/** Both histories together: one entry per name, the newest use of it. */
export function mergeNoteHistory(account: NoteHistoryEntry[], phone: NoteHistoryEntry[]): NoteHistoryEntry[] {
  const byName = new Map<string, NoteHistoryEntry>();
  for (const entry of [...account, ...phone]) {
    const name = normalizeText(entry.name);
    const key = `${sectionOf(entry)}:${name}`;
    const known = byName.get(key);
    if (name && (!known || entry.createdAt > known.createdAt)) byName.set(key, entry);
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
// Only what was in the same part (Ushqime or Detergjente) is offered, so a detergent is not suggested in the food tab.
export function buildNoteSuggestions(
  lists: NoteList[],
  history: NoteHistoryEntry[],
  current: NoteItem[],
  section: NoteSection = DEFAULT_SECTION,
): NoteSuggestion[] {
  const present = new Set(current.map((item) => normalizeText(item.name)));
  const byKey = new Map<string, NoteSuggestion>();
  const add = ({ name, quantity, unit, createdAt, section: entrySection }: NoteHistoryEntry) => {
    const key = normalizeText(name);
    if (!key || present.has(key) || sectionOf({ section: entrySection }) !== section) return;
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
