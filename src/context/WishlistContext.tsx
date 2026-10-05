import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import type { ShoppingItem } from '@/types/models';

const initialWishlist: ShoppingItem[] = [
  { id: 'w1', name: 'Këpucë sportive', quantity: '', price: 6000, bought: false, createdAt: Date.now() - 2000 },
  { id: 'w2', name: 'Kufje pa tel', quantity: '', price: 3500, bought: false, createdAt: Date.now() - 1000 },
];

interface WishlistContextValue {
  wishlist: ShoppingItem[];
  addWish: (name: string, price: number | null) => void;
  toggleWish: (id: string) => void;
  updateWish: (id: string, patch: Partial<ShoppingItem>) => void;
  removeWish: (id: string) => void;
  hydrate: (items: ShoppingItem[]) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<ShoppingItem[]>(initialWishlist);

  const addWish = (name: string, price: number | null) => {
    setWishlist((prev) => [
      ...prev,
      { id: String(Date.now()), name, quantity: '', price, bought: false, createdAt: Date.now() },
    ]);
  };

  const toggleWish = (id: string) => {
    setWishlist((prev) => prev.map((wish) => (wish.id === id ? { ...wish, bought: !wish.bought } : wish)));
  };

  const updateWish = (id: string, patch: Partial<ShoppingItem>) => {
    setWishlist((prev) => prev.map((wish) => (wish.id === id ? { ...wish, ...patch } : wish)));
  };

  const removeWish = (id: string) => {
    setWishlist((prev) => prev.filter((wish) => wish.id !== id));
  };

  const hydrate = (items: ShoppingItem[]) => setWishlist(items);

  const value = useMemo<WishlistContextValue>(
    () => ({ wishlist, addWish, toggleWish, updateWish, removeWish, hydrate }),
    [wishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
}
