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
  /** What it was for (e.g. "Servis"), in a category that asks for it; shown under the name. */
  note?: string;
}

export interface IncomeEntry {
  id: string;
  name: string;
  amount: number;
  createdAt: number;
}

/** What a deleted item leaves behind in its list: just enough to suggest it again when adding one. */
export interface RemovedItem extends Pick<ShoppingItem, 'name' | 'quantity' | 'price' | 'createdAt' | 'note'> {
  list: ItemListKey;
}

/** The item lists every shopping list owns. Each list has its own copy, so checking one off only affects that list. */
export type ItemListKey =
  | 'items'
  | 'supplies'
  | 'bills'
  | 'wishlist'
  | 'clothes'
  | 'fuel'
  | 'refuel'
  | 'online'
  | 'outings'
  | 'kitchen'
  | 'playstation'
  | 'health'
  | 'bathroom'
  | 'home';

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
  /** Items deleted from this list, one per name and category. Only used for suggestions; they are not shown anywhere else. */
  removed?: RemovedItem[];
}
