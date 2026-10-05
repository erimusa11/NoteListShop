import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { mockItems } from '@/mocks/mockItems';
import type { IncomeEntry, ShoppingItem, ShoppingTrip } from '@/types/models';
import { formatDateAlbanian } from '@/utils/dates';

function buildTrip(name: string, items: ShoppingItem[]): ShoppingTrip {
  const now = Date.now();
  return {
    id: String(now),
    name: name.trim() || formatDateAlbanian(now),
    createdAt: now,
    budget: null,
    items,
    incomes: [],
  };
}

interface TripsContextValue {
  trips: ShoppingTrip[];
  createList: (name: string) => string;
  renameTrip: (tripId: string, name: string) => void;
  deleteTrip: (tripId: string) => void;
  addIncome: (tripId: string, name: string, amount: number) => void;
  updateIncome: (tripId: string, incomeId: string, patch: Partial<IncomeEntry>) => void;
  removeIncome: (tripId: string, incomeId: string) => void;
  addItem: (tripId: string, name: string, quantity: string, price: number | null, priority?: number) => void;
  toggleItem: (tripId: string, itemId: string) => void;
  updateItem: (tripId: string, itemId: string, patch: Partial<ShoppingItem>) => void;
  removeItem: (tripId: string, itemId: string) => void;
  hydrate: (trips: ShoppingTrip[]) => void;
}

const TripsContext = createContext<TripsContextValue | null>(null);

export function TripsProvider({ children }: { children: ReactNode }) {
  const [initialTrip] = useState(() => {
    const trip = buildTrip('', mockItems);
    return { ...trip, incomes: [{ id: 'i1', name: 'Rroga', amount: 2000, createdAt: trip.createdAt }] };
  });
  const [trips, setTrips] = useState<ShoppingTrip[]>([initialTrip]);

  const updateTripItems = (tripId: string, updater: (items: ShoppingItem[]) => ShoppingItem[]) => {
    setTrips((prev) => prev.map((trip) => (trip.id === tripId ? { ...trip, items: updater(trip.items) } : trip)));
  };

  const createList = (name: string): string => {
    const trip = buildTrip(name, []);
    setTrips((prev) => [...prev, trip]);
    return trip.id;
  };

  const renameTrip = (tripId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTrips((prev) => prev.map((trip) => (trip.id === tripId ? { ...trip, name: trimmed } : trip)));
  };

  const deleteTrip = (tripId: string) => {
    setTrips((prev) => prev.filter((trip) => trip.id !== tripId));
  };

  const updateTripIncomes = (tripId: string, updater: (incomes: IncomeEntry[]) => IncomeEntry[]) => {
    setTrips((prev) =>
      prev.map((trip) => (trip.id === tripId ? { ...trip, incomes: updater(trip.incomes ?? []) } : trip)),
    );
  };

  const addIncome = (tripId: string, name: string, amount: number) => {
    updateTripIncomes(tripId, (incomes) => [...incomes, { id: String(Date.now()), name, amount, createdAt: Date.now() }]);
  };

  const updateIncome = (tripId: string, incomeId: string, patch: Partial<IncomeEntry>) => {
    updateTripIncomes(tripId, (incomes) => incomes.map((i) => (i.id === incomeId ? { ...i, ...patch } : i)));
  };

  const removeIncome = (tripId: string, incomeId: string) => {
    updateTripIncomes(tripId, (incomes) => incomes.filter((i) => i.id !== incomeId));
  };

  const addItem = (tripId: string, name: string, quantity: string, price: number | null, priority = 1) => {
    updateTripItems(tripId, (items) => [
      ...items,
      { id: String(Date.now()), name, quantity, price, bought: false, createdAt: Date.now(), priority },
    ]);
  };

  const toggleItem = (tripId: string, itemId: string) => {
    updateTripItems(tripId, (items) =>
      items.map((item) => (item.id === itemId ? { ...item, bought: !item.bought } : item)),
    );
  };

  const updateItem = (tripId: string, itemId: string, patch: Partial<ShoppingItem>) => {
    updateTripItems(tripId, (items) => items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  };

  const removeItem = (tripId: string, itemId: string) => {
    updateTripItems(tripId, (items) => items.filter((item) => item.id !== itemId));
  };

  const hydrate = (next: ShoppingTrip[]) => setTrips(next);

  const value = useMemo<TripsContextValue>(
    () => ({
      trips,
      createList,
      renameTrip,
      deleteTrip,
      addIncome,
      updateIncome,
      removeIncome,
      addItem,
      toggleItem,
      updateItem,
      removeItem,
      hydrate,
    }),
    [trips],
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips(): TripsContextValue {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error('useTrips must be used within a TripsProvider');
  return ctx;
}
