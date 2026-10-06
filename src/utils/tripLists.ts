import type { ItemListKey, ShoppingItem, ShoppingTrip } from '@/types/models';
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

// Stars an item: every other list gets a copy (or links the item it already has with the same name).
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

  const starred: ShoppingItem = { ...item, sharedId: `${tripId}:${item.id}` };
  const name = normalizeText(item.name);
  return trips.map((trip) => {
    const items = trip[key] ?? [];
    if (trip.id === tripId) return { ...trip, [key]: items.map((i) => (i.id === itemId ? starred : i)) };
    const copy = copyToTrip(starred, trip.id);
    // The copy made by an earlier star is still there after unstarring (even if renamed since): link it again
    // instead of adding a second item with the same id.
    const twin = items.find((i) => !i.sharedId && (i.id === copy.id || normalizeText(i.name) === name));
    if (twin) return { ...trip, [key]: items.map((i) => (i === twin ? { ...i, sharedId: starred.sharedId } : i)) };
    return { ...trip, [key]: [...items, copy] };
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
