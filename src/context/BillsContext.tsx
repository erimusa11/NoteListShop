import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import type { ShoppingItem } from '@/types/models';

const initialBills: ShoppingItem[] = [
  { id: 'b1', name: 'Qira', quantity: '', price: 25000, bought: false, createdAt: Date.now() - 3000 },
  { id: 'b2', name: 'Energji elektrike', quantity: '', price: 3500, bought: true, createdAt: Date.now() - 2000 },
  { id: 'b3', name: 'Internet', quantity: '', price: 1800, bought: false, createdAt: Date.now() - 1000 },
];

interface BillsContextValue {
  bills: ShoppingItem[];
  addBill: (name: string, price: number | null) => void;
  toggleBill: (id: string) => void;
  updateBill: (id: string, patch: Partial<ShoppingItem>) => void;
  removeBill: (id: string) => void;
}

const BillsContext = createContext<BillsContextValue | null>(null);

export function BillsProvider({ children }: { children: ReactNode }) {
  const [bills, setBills] = useState<ShoppingItem[]>(initialBills);

  const addBill = (name: string, price: number | null) => {
    setBills((prev) => [
      ...prev,
      { id: String(Date.now()), name, quantity: '', price, bought: false, createdAt: Date.now() },
    ]);
  };

  const toggleBill = (id: string) => {
    setBills((prev) => prev.map((bill) => (bill.id === id ? { ...bill, bought: !bill.bought } : bill)));
  };

  const updateBill = (id: string, patch: Partial<ShoppingItem>) => {
    setBills((prev) => prev.map((bill) => (bill.id === id ? { ...bill, ...patch } : bill)));
  };

  const removeBill = (id: string) => {
    setBills((prev) => prev.filter((bill) => bill.id !== id));
  };

  const value = useMemo<BillsContextValue>(
    () => ({ bills, addBill, toggleBill, updateBill, removeBill }),
    [bills],
  );

  return <BillsContext.Provider value={value}>{children}</BillsContext.Provider>;
}

export function useBills(): BillsContextValue {
  const ctx = useContext(BillsContext);
  if (!ctx) throw new Error('useBills must be used within a BillsProvider');
  return ctx;
}
