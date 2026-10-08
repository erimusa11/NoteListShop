import type { ItemListKey, RemovedItem, ShoppingItem, ShoppingTrip } from '@/types/models';
import { CATEGORIES } from '@/utils/categories';
import { withOption } from '@/utils/options';
import { DEFAULT_PRIORITY } from '@/utils/priority';
import { normalizeText } from '@/utils/suggestions';

// The copy of a starred item that goes into another list: unchecked and back at normal priority.
// Name, quantity and price are taken as they are; from then on the price (and the rest) belongs to that list alone.
export function copyToTrip(item: ShoppingItem, tripId: string): ShoppingItem {
  return { ...item, id: `${tripId}:${item.sharedId}`, bought: false, priority: DEFAULT_PRIORITY };
}

// One entry per starred item, taken from the newest list that has it.
export function starredItems(trips: ShoppingTrip[], key: ItemListKey): ShoppingItem[] {
  const found = new Map<string, ShoppingItem>();
  for (const trip of [...trips].sort((a, b) => b.createdAt - a.createdAt)) {
    for (const item of trip[key] ?? []) {
      if (item.sharedId && !found.has(item.sharedId)) found.set(item.sharedId, item);
    }
  }
  return [...found.values()];
}

function withoutSharedId({ sharedId: _sharedId, ...item }: ShoppingItem): ShoppingItem {
  return item;
}

// `id`, or `id` with a counter when another item of `items` already has it. Ids only have to be unique within one list
// (an item is found by its id there), and they can meet: a copy moved into a category that holds an older item that
// came from the same star.
function freeId(items: ShoppingItem[], id: string): string {
  if (!items.some((i) => i.id === id)) return id;
  let n = 2;
  while (items.some((i) => i.id === `${id}~${n}`)) n++;
  return `${id}~${n}`;
}

// Stars an item: every other list gets a copy (or links the item it already has with the same name and text).
// Tapping the star again unlinks it everywhere; each list keeps its own item as an ordinary one.
export function toggleStar(trips: ShoppingTrip[], tripId: string, key: ItemListKey, itemId: string): ShoppingTrip[] {
  const item = trips.find((trip) => trip.id === tripId)?.[key]?.find((i) => i.id === itemId);
  if (!item) return trips;

  if (item.sharedId) {
    const { sharedId } = item;
    return trips.map((trip) =>
      trip[key]?.some((i) => i.sharedId === sharedId)
        ? { ...trip, [key]: (trip[key] ?? []).map((i) => (i.sharedId === sharedId ? withoutSharedId(i) : i)) }
        : trip,
    );
  }

  // The category is part of the star's id: an item id is only unique within its list, and two lists of one trip can hold
  // the same id (after a move), which would give both the same star.
  const starred: ShoppingItem = { ...item, sharedId: `${tripId}:${key}:${item.id}` };
  const name = normalizeText(item.name);
  const note = normalizeText(item.note ?? '');
  const person = normalizeText(item.person ?? '');
  return trips.map((trip) => {
    const items = trip[key] ?? [];
    if (trip.id === tripId) return { ...trip, [key]: items.map((i) => (i.id === itemId ? starred : i)) };
    const copy = copyToTrip(starred, trip.id);
    // The copy made by an earlier star is still there after unstarring (even if renamed since): link it again
    // instead of adding a second item with the same id. The text counts as well as the name: in a category with groups
    // (Drion, Kia Morning…) many unrelated items share a name, and linking one of them would make a delete or a move of
    // this item reach it too. Who it is for (Drion, Alois) tells two such items apart as well.
    const twin = items.find(
      (i) =>
        !i.sharedId &&
        (i.id === copy.id ||
          (normalizeText(i.name) === name &&
            normalizeText(i.note ?? '') === note &&
            normalizeText(i.person ?? '') === person)),
    );
    if (twin) return { ...trip, [key]: items.map((i) => (i === twin ? { ...i, sharedId: starred.sharedId } : i)) };
    return { ...trip, [key]: [...items, { ...copy, id: freeId(items, copy.id) }] };
  });
}

// How many deleted items one list remembers (the newest). Everything lives in ONE cloud document with a size limit, and
// a name that was deleted long ago is rarely wanted back.
const MAX_REMOVED = 60;

// The trip's record of deleted items with this one added, replacing an earlier record of the same name (and the same
// description, in a category where many items share a name: Drion, Kia Morning…) in the same category.
function remembered(trip: ShoppingTrip, key: ItemListKey, item: ShoppingItem): RemovedItem[] {
  const name = normalizeText(item.name);
  const note = normalizeText(item.note ?? '');
  const earlier = (Array.isArray(trip.removed) ? trip.removed : []).filter(
    (removed) =>
      removed &&
      typeof removed === 'object' &&
      !(removed.list === key && normalizeText(removed.name) === name && normalizeText(removed.note ?? '') === note),
  );
  // Every field gets a value, never undefined: the cloud save throws on a document that holds one (an item from old or
  // damaged data may lack a field), and that would stop everything from being saved. Only the description is left out
  // when there is none, which is every item outside the categories that ask for it.
  const text = typeof item.note === 'string' ? item.note.trim() : '';
  const person = typeof item.person === 'string' ? item.person.trim() : '';
  const record: RemovedItem = {
    list: key,
    name: String(item.name ?? ''),
    quantity: String(item.quantity ?? ''),
    price: item.price ?? null,
    createdAt: item.createdAt ?? 0,
    ...(text ? { note: text } : {}),
    ...(person ? { person } : {}),
  };
  return [...earlier, record].slice(-MAX_REMOVED);
}

// Deletes an item. A starred item goes from the other lists too, except where it is checked: that stays as a record of
// what was spent, but as an ordinary item, so it is not copied into new lists. The name is kept for suggestions.
export function deleteItem(trips: ShoppingTrip[], tripId: string, key: ItemListKey, itemId: string): ShoppingTrip[] {
  const item = trips.find((trip) => trip.id === tripId)?.[key]?.find((i) => i.id === itemId);
  if (!item) return trips;

  const { sharedId } = item;
  return trips.map((trip) => {
    const items = trip[key] ?? [];
    if (trip.id === tripId) return { ...trip, [key]: items.filter((i) => i.id !== itemId), removed: remembered(trip, key, item) };
    if (!sharedId || !items.some((i) => i.sharedId === sharedId)) return trip;
    return {
      ...trip,
      [key]: items.flatMap((i) => (i.sharedId !== sharedId ? [i] : i.bought ? [withoutSharedId(i)] : [])),
    };
  });
}

// Moves an item to another category, and into one of its groups (Drion, Naftë…) when that category has them. A starred
// item takes all its copies with it, in every list (the checked ones in earlier lists too), so the history follows it;
// an ordinary item moves alone. Everything else about it stays as it was.
// With the same category and a `group`, the item stays where it is and only changes group.
export function moveToCategory(
  trips: ShoppingTrip[],
  tripId: string,
  from: ItemListKey,
  itemId: string,
  to: ItemListKey,
  group?: string,
): ShoppingTrip[] {
  const category = CATEGORIES.find((c) => c.key === to);
  if (from === to && (!group || !category)) return trips;
  const item = trips.find((trip) => trip.id === tripId)?.[from]?.find((i) => i.id === itemId);
  if (!item) return trips;

  const { sharedId } = item;
  const inGroup = (i: ShoppingItem) => (group && category ? withOption(i, category, group) : i);
  return trips.map((trip) => {
    const source = trip[from] ?? [];
    const isMoving = (i: ShoppingItem) => (sharedId ? i.sharedId === sharedId : trip.id === tripId && i.id === itemId);
    if (!source.some(isMoving)) return trip;
    if (from === to) return { ...trip, [from]: source.map((i) => (isMoving(i) ? inGroup(i) : i)) };
    // An item that arrives where an item with its id already is gets a new id, so the two stay apart.
    const target = trip[to] ?? [];
    const arrived: ShoppingItem[] = [];
    for (const i of source.filter(isMoving)) {
      const moved = inGroup(i);
      arrived.push({ ...moved, id: freeId([...target, ...arrived], moved.id) });
    }
    return { ...trip, [from]: source.filter((i) => !isMoving(i)), [to]: [...target, ...arrived] };
  });
}

// Applies the change to one item. A new name also goes to every other copy of a starred item; anything else
// (price, quantity, priority, checked) stays in that list.
export function patchItem(
  trips: ShoppingTrip[],
  tripId: string,
  key: ItemListKey,
  itemId: string,
  patch: Partial<ShoppingItem>,
): ShoppingTrip[] {
  const sharedId = trips.find((trip) => trip.id === tripId)?.[key]?.find((i) => i.id === itemId)?.sharedId;
  const { name } = patch;
  return trips.map((trip) => {
    const items = trip[key] ?? [];
    if (trip.id === tripId) return { ...trip, [key]: items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) };
    if (sharedId && name !== undefined && items.some((i) => i.sharedId === sharedId)) {
      return { ...trip, [key]: items.map((i) => (i.sharedId === sharedId ? { ...i, name } : i)) };
    }
    return trip;
  });
}

export function latestTrip(trips: ShoppingTrip[]): ShoppingTrip | undefined {
  return trips.reduce<ShoppingTrip | undefined>((latest, trip) => (!latest || trip.createdAt >= latest.createdAt ? trip : latest), undefined);
}

// Before every list had its own supplies, bills and wishlist, they were three lists shared by all trips, saved beside them.
// `boughtInTripId` said which list a checked item was bought in.
type LegacyItem = ShoppingItem & { boughtInTripId?: string | null };

export interface StoredData {
  trips: ShoppingTrip[];
  bills: LegacyItem[];
  supplies: LegacyItem[];
  wishlist: LegacyItem[];
}

// Gives each trip that has no copy of its own a copy of the old shared items. They stay starred (they were shared
// before) and are checked only in the list where they were bought.
export function upgradeLegacyTrips({ trips, bills, supplies, wishlist }: StoredData): ShoppingTrip[] {
  // Items checked before `boughtInTripId` existed belong to the newest list.
  const fallbackId = latestTrip(trips)?.id;
  const copyFor = (legacy: LegacyItem[], trip: ShoppingTrip): ShoppingItem[] =>
    legacy.map(({ boughtInTripId, ...item }) => ({
      ...item,
      sharedId: item.id,
      bought: item.bought && (boughtInTripId ?? fallbackId) === trip.id,
    }));

  return trips.map((trip) => ({
    ...trip,
    supplies: trip.supplies ?? copyFor(supplies, trip),
    bills: trip.bills ?? copyFor(bills, trip),
    wishlist: trip.wishlist ?? copyFor(wishlist, trip),
  }));
}
