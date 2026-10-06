export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  price: number | null;
  bought: boolean;
  createdAt: number;
  /** 1 = normal … 5 = urgent. Missing means 1. */
  priority?: number;
  /** Set when the item is starred. Its copies in other lists carry the same id and follow its name. */
  sharedId?: string;
}

export interface IncomeEntry {
  id: string;
  name: string;
  amount: number;
  createdAt: number;
}

/** The item lists every shopping list owns. Each list has its own copy, so checking one off only affects that list. */
export type ItemListKey =
  | 'items'
  | 'supplies'
  | 'bills'
  | 'wishlist'
  | 'clothes'
  | 'fuel'
  | 'online'
  | 'outings'
  | 'kitchen'
  | 'playstation';

// Besides `items` (Produktet), a list may not have every category yet (lists saved before it was added).
// The categories and their names are in utils/categories.ts.
export interface ShoppingTrip extends Partial<Record<Exclude<ItemListKey, 'items'>, ShoppingItem[]>> {
  id: string;
  name: string;
  createdAt: number;
  budget: number | null;
  /** Produktet */
  items: ShoppingItem[];
  incomes?: IncomeEntry[];
}
