export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  price: number | null;
  bought: boolean;
  createdAt: number;
}

export interface ShoppingTrip {
  id: string;
  name: string;
  createdAt: number;
  budget: number | null;
  items: ShoppingItem[];
}
