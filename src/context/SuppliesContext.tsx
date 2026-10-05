import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import type { ShoppingItem } from '@/types/models';

interface SuppliesContextValue {
  supplies: ShoppingItem[];
  addSupply: (name: string, price: number | null) => void;
  toggleSupply: (id: string, tripId?: string) => void;
  releaseTrip: (tripId: string) => void;
  updateSupply: (id: string, patch: Partial<ShoppingItem>) => void;
  removeSupply: (id: string) => void;
  hydrate: (items: ShoppingItem[]) => void;
}

const SuppliesContext = createContext<SuppliesContextValue | null>(null);

export function SuppliesProvider({ children }: { children: ReactNode }) {
  const [supplies, setSupplies] = useState<ShoppingItem[]>([]);

  const addSupply = (name: string, price: number | null) => {
    setSupplies((prev) => [
      ...prev,
      { id: String(Date.now()), name, quantity: '', price, bought: false, createdAt: Date.now() },
    ]);
  };

  const toggleSupply = (id: string, tripId?: string) => {
    setSupplies((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, bought: !s.bought, boughtInTripId: s.bought ? null : (tripId ?? null) } : s,
      ),
    );
  };

  const releaseTrip = (tripId: string) => {
    setSupplies((prev) =>
      prev.map((s) => (s.boughtInTripId === tripId ? { ...s, bought: false, boughtInTripId: null } : s)),
    );
  };

  const updateSupply = (id: string, patch: Partial<ShoppingItem>) => {
    setSupplies((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSupply = (id: string) => {
    setSupplies((prev) => prev.filter((s) => s.id !== id));
  };

  const hydrate = (items: ShoppingItem[]) => setSupplies(items);

  const value = useMemo<SuppliesContextValue>(
    () => ({ supplies, addSupply, toggleSupply, releaseTrip, updateSupply, removeSupply, hydrate }),
    [supplies],
  );

  return <SuppliesContext.Provider value={value}>{children}</SuppliesContext.Provider>;
}

export function useSupplies(): SuppliesContextValue {
  const ctx = useContext(SuppliesContext);
  if (!ctx) throw new Error('useSupplies must be used within a SuppliesProvider');
  return ctx;
}
