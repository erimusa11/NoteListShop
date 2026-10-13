import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { mockBills, mockItems, mockWishlist } from '@/mocks/mockItems';
import type { IncomeEntry, IncomeKind, ItemListKey, ShoppingItem, ShoppingTrip } from '@/types/models';
import { CATEGORIES } from '@/utils/categories';
import { formatDateAlbanian } from '@/utils/dates';
import { moveCalendarItems } from '@/utils/attendance';
import { isTrashExpired } from '@/utils/trash';
import { copyToTrip, deleteItem, moveToCategory, patchItem, starredItems, toggleStar } from '@/utils/tripLists';

// Only the starred items of the existing lists come along, unchecked and at normal priority.
function buildTrip(name: string, now: number, existing: ShoppingTrip[] = []): ShoppingTrip {
  const id = String(now);
  const lists = Object.fromEntries(
    CATEGORIES.map(({ key }) => [key, starredItems(existing, key).map((item) => copyToTrip(item, id))]),
  ) as Record<ItemListKey, ShoppingItem[]>;
  return {
    id,
    name: name.trim() || formatDateAlbanian(now),
    createdAt: now,
    budget: null,
    ...lists,
    incomes: [],
  };
}

function mapItems(
  trips: ShoppingTrip[],
  tripId: string,
  list: ItemListKey,
  updater: (items: ShoppingItem[]) => ShoppingItem[],
): ShoppingTrip[] {
  return trips.map((trip) => (trip.id === tripId ? { ...trip, [list]: updater(trip[list] ?? []) } : trip));
}

interface TripActions {
  addItem: (
    tripId: string,
    list: ItemListKey,
    name: string,
    quantity: string,
    price: number | null,
    priority?: number,
    note?: string,
    person?: string,
  ) => void;
  toggleItem: (tripId: string, list: ItemListKey, itemId: string) => void;
  updateItem: (tripId: string, list: ItemListKey, itemId: string, patch: Partial<ShoppingItem>) => void;
  removeItem: (tripId: string, list: ItemListKey, itemId: string) => void;
  /** Puts a deleted item back in its list, at the place its creation date gives it. */
  restoreItem: (tripId: string, list: ItemListKey, item: ShoppingItem) => void;
  /** Moves the item to another category (and into one of its groups, if it has them); a starred item takes its copies in every list with it. */
  moveItem: (tripId: string, list: ItemListKey, itemId: string, to: ItemListKey, group?: string) => void;
  toggleStar: (tripId: string, list: ItemListKey, itemId: string) => void;
}

interface TripsContextValue extends TripActions {
  /** The lists that are in use; deleted ones wait in `trashedTrips`. */
  trips: ShoppingTrip[];
  /** Deleted lists, newest deletion first. They can be restored until `TRASH_DAYS` have passed. */
  trashedTrips: ShoppingTrip[];
  /** Every list, the trash too: this is what is saved to the account. */
  allTrips: ShoppingTrip[];
  createList: (name: string) => string;
  renameTrip: (tripId: string, name: string) => void;
  /** Moves the list to the trash. */
  deleteTrip: (tripId: string) => void;
  restoreTrip: (tripId: string) => void;
  /** Deletes a list from the trash for good. */
  purgeTrip: (tripId: string) => void;
  addIncome: (tripId: string, name: string, amount: number, kind?: IncomeKind) => void;
  updateIncome: (tripId: string, incomeId: string, patch: Partial<IncomeEntry>) => void;
  removeIncome: (tripId: string, incomeId: string) => void;
  /** Replaces a list by what `change` makes of it, for edits that touch several parts of it at once (the days calendar). */
  changeTrip: (tripId: string, change: (trip: ShoppingTrip) => ShoppingTrip) => void;
  hydrate: (trips: ShoppingTrip[]) => void;
}

const TripsContext = createContext<TripsContextValue | null>(null);
// The item actions never change, so lists that only use them are not redrawn when the trips change.
const TripActionsContext = createContext<TripActions | null>(null);

export function TripsProvider({ children }: { children: ReactNode }) {
  const [initialTrip] = useState<ShoppingTrip>(() => {
    const trip = buildTrip('', Date.now());
    return {
      ...trip,
      items: mockItems,
      bills: mockBills,
      wishlist: mockWishlist,
      incomes: [{ id: 'i1', name: 'Rroga', amount: 2000, createdAt: trip.createdAt }],
    };
  });
  const [allTrips, setTrips] = useState<ShoppingTrip[]>([initialTrip]);
  const trips = useMemo(() => allTrips.filter((trip) => trip.deletedAt === undefined), [allTrips]);
  const trashedTrips = useMemo(
    () => allTrips.filter((trip) => trip.deletedAt !== undefined).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [allTrips],
  );

  const itemActions = useMemo<TripActions>(
    () => ({
      addItem: (tripId, list, name, quantity, price, priority = 1, note, person) =>
        setTrips((prev) =>
          mapItems(prev, tripId, list, (items) => [
            ...items,
            {
              id: String(Date.now()),
              name,
              quantity,
              price,
              bought: false,
              createdAt: Date.now(),
              priority,
              ...(note ? { note } : {}),
              ...(person ? { person } : {}),
            },
          ]),
        ),
      toggleItem: (tripId, list, itemId) =>
        setTrips((prev) =>
          mapItems(prev, tripId, list, (items) =>
            items.map((item) => (item.id === itemId ? { ...item, bought: !item.bought } : item)),
          ),
        ),
      updateItem: (tripId, list, itemId, patch) => setTrips((prev) => patchItem(prev, tripId, list, itemId, patch)),
      removeItem: (tripId, list, itemId) => setTrips((prev) => deleteItem(prev, tripId, list, itemId)),
      restoreItem: (tripId, list, item) =>
        setTrips((prev) =>
          mapItems(prev, tripId, list, (items) => {
            if (items.some((entry) => entry.id === item.id)) return items;
            const at = items.findIndex((entry) => entry.createdAt > item.createdAt);
            return at === -1 ? [...items, item] : [...items.slice(0, at), item, ...items.slice(at)];
          }),
        ),
      moveItem: (tripId, list, itemId, to, group) => setTrips((prev) => moveToCategory(prev, tripId, list, itemId, to, group)),
      toggleStar: (tripId, list, itemId) => setTrips((prev) => toggleStar(prev, tripId, list, itemId)),
    }),
    [],
  );

  const createList = (name: string): string => {
    const now = Date.now();
    setTrips((prev) => [...prev, buildTrip(name, now, prev.filter((trip) => trip.deletedAt === undefined))]);
    return String(now);
  };

  const renameTrip = (tripId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTrips((prev) => prev.map((trip) => (trip.id === tripId ? { ...trip, name: trimmed } : trip)));
  };

  const deleteTrip = (tripId: string) => {
    const now = Date.now();
    setTrips((prev) => prev.map((trip) => (trip.id === tripId ? { ...trip, deletedAt: now } : trip)));
  };

  const restoreTrip = (tripId: string) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        const { deletedAt: _deletedAt, ...restored } = trip;
        return restored;
      }),
    );
  };

  const purgeTrip = (tripId: string) => {
    setTrips((prev) => prev.filter((trip) => trip.id !== tripId));
  };

  const updateTripIncomes = (tripId: string, updater: (incomes: IncomeEntry[]) => IncomeEntry[]) => {
    setTrips((prev) =>
      prev.map((trip) => (trip.id === tripId ? { ...trip, incomes: updater(trip.incomes ?? []) } : trip)),
    );
  };

  const addIncome = (tripId: string, name: string, amount: number, kind: IncomeKind = 'rroga') => {
    updateTripIncomes(tripId, (incomes) => [
      ...incomes,
      { id: String(Date.now()), name, amount, createdAt: Date.now(), kind },
    ]);
  };

  const updateIncome = (tripId: string, incomeId: string, patch: Partial<IncomeEntry>) => {
    updateTripIncomes(tripId, (incomes) => incomes.map((i) => (i.id === incomeId ? { ...i, ...patch } : i)));
  };

  const removeIncome = (tripId: string, incomeId: string) => {
    updateTripIncomes(tripId, (incomes) => incomes.filter((i) => i.id !== incomeId));
  };

  const changeTrip = (tripId: string, change: (trip: ShoppingTrip) => ShoppingTrip) => {
    setTrips((prev) => prev.map((trip) => (trip.id === tripId ? change(trip) : trip)));
  };

  // Lists that have waited in the trash for the full time are dropped when the saved lists are loaded.
  const hydrate = (next: ShoppingTrip[]) => {
    const now = Date.now();
    setTrips(moveCalendarItems(next.filter((trip) => trip.deletedAt === undefined || !isTrashExpired(trip.deletedAt, now))));
  };

  const value = useMemo<TripsContextValue>(
    () => ({
      trips,
      trashedTrips,
      allTrips,
      createList,
      renameTrip,
      deleteTrip,
      restoreTrip,
      purgeTrip,
      addIncome,
      updateIncome,
      removeIncome,
      changeTrip,
      ...itemActions,
      hydrate,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the income helpers only call the stable setTrips
    [allTrips, trips, trashedTrips, itemActions],
  );

  return (
    <TripsContext.Provider value={value}>
      <TripActionsContext.Provider value={itemActions}>{children}</TripActionsContext.Provider>
    </TripsContext.Provider>
  );
}

export function useTrips(): TripsContextValue {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error('useTrips must be used within a TripsProvider');
  return ctx;
}

export function useTripActions(): TripActions {
  const ctx = useContext(TripActionsContext);
  if (!ctx) throw new Error('useTripActions must be used within a TripsProvider');
  return ctx;
}
