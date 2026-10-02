import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { mockItems } from '@/mocks/mockItems';
import type { ShoppingItem, ShoppingTrip } from '@/types/models';
import { formatDateAlbanian } from '@/utils/dates';

function buildTrip(name: string, items: ShoppingItem[]): ShoppingTrip {
  const now = Date.now();
  return { id: String(now), name: name.trim() || formatDateAlbanian(now), createdAt: now, budget: null, items };
}

interface TripsContextValue {
  trips: ShoppingTrip[];
  createList: (name: string) => string;
  renameTrip: (tripId: string, name: string) => void;
  deleteTrip: (tripId: string) => void;
  setBudget: (tripId: string, budget: number | null) => void;
  addItem: (tripId: string, name: string, quantity: string, price: number | null) => void;
  toggleItem: (tripId: string, itemId: string) => void;
  updateItem: (tripId: string, itemId: string, patch: Partial<ShoppingItem>) => void;
  removeItem: (tripId: string, itemId: string) => void;
}

const TripsContext = createContext<TripsContextValue | null>(null);

export function TripsProvider({ children }: { children: ReactNode }) {
  const [initialTrip] = useState(() => ({ ...buildTrip('', mockItems), budget: 2000 }));
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

  const setBudget = (tripId: string, budget: number | null) => {
    setTrips((prev) => prev.map((trip) => (trip.id === tripId ? { ...trip, budget } : trip)));
  };

  const addItem = (tripId: string, name: string, quantity: string, price: number | null) => {
    updateTripItems(tripId, (items) => [
      ...items,
      { id: String(Date.now()), name, quantity, price, bought: false, createdAt: Date.now() },
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

  const value = useMemo<TripsContextValue>(
    () => ({ trips, createList, renameTrip, deleteTrip, setBudget, addItem, toggleItem, updateItem, removeItem }),
    [trips],
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips(): TripsContextValue {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error('useTrips must be used within a TripsProvider');
  return ctx;
}
