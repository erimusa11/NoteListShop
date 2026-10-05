export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  price: number | null;
  bought: boolean;
  createdAt: number;
  boughtInTripId?: string | null;
  /** 1 = normal … 5 = urgent. Missing means 1. */
  priority?: number;
}

export interface IncomeEntry {
  id: string;
  name: string;
  amount: number;
  createdAt: number;
}

export interface ShoppingTrip {
  id: string;
  name: string;
  createdAt: number;
  budget: number | null;
  items: ShoppingItem[];
  incomes?: IncomeEntry[];
}
