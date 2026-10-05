import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import type { ShoppingItem } from '@/types/models';

const initialBills: ShoppingItem[] = [
  { id: 'b1', name: 'Qira', quantity: '', price: 25000, bought: false, createdAt: Date.now() - 3000 },
  { id: 'b2', name: 'Energji elektrike', quantity: '', price: 3500, bought: true, createdAt: Date.now() - 2000 },
  { id: 'b3', name: 'Internet', quantity: '', price: 1800, bought: false, createdAt: Date.now() - 1000 },
];

interface BillsContextValue {
  bills: ShoppingItem[];
  addBill: (name: string, price: number | null, priority?: number) => void;
  toggleBill: (id: string, tripId?: string) => void;
  releaseTrip: (tripId: string) => void;
  updateBill: (id: string, patch: Partial<ShoppingItem>) => void;
  removeBill: (id: string) => void;
  hydrate: (items: ShoppingItem[]) => void;
}

const BillsContext = createContext<BillsContextValue | null>(null);

export function BillsProvider({ children }: { children: ReactNode }) {
  const [bills, setBills] = useState<ShoppingItem[]>(initialBills);

  const addBill = (name: string, price: number | null, priority = 1) => {
    setBills((prev) => [
      ...prev,
      { id: String(Date.now()), name, quantity: '', price, bought: false, createdAt: Date.now(), priority },
    ]);
  };

  const toggleBill = (id: string, tripId?: string) => {
    setBills((prev) =>
      prev.map((bill) =>
        bill.id === id ? { ...bill, bought: !bill.bought, boughtInTripId: bill.bought ? null : (tripId ?? null) } : bill,
      ),
    );
  };

  const releaseTrip = (tripId: string) => {
    setBills((prev) =>
      prev.map((bill) => (bill.boughtInTripId === tripId ? { ...bill, bought: false, boughtInTripId: null } : bill)),
    );
  };

  const updateBill = (id: string, patch: Partial<ShoppingItem>) => {
    setBills((prev) => prev.map((bill) => (bill.id === id ? { ...bill, ...patch } : bill)));
  };

  const removeBill = (id: string) => {
    setBills((prev) => prev.filter((bill) => bill.id !== id));
  };

  const hydrate = (items: ShoppingItem[]) => setBills(items);

  const value = useMemo<BillsContextValue>(
    () => ({ bills, addBill, toggleBill, releaseTrip, updateBill, removeBill, hydrate }),
    [bills],
  );

  return <BillsContext.Provider value={value}>{children}</BillsContext.Provider>;
}

export function useBills(): BillsContextValue {
  const ctx = useContext(BillsContext);
  if (!ctx) throw new Error('useBills must be used within a BillsProvider');
  return ctx;
}
