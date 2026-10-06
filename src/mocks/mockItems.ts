import type { ShoppingItem } from '@/types/models';

export const mockItems: ShoppingItem[] = [
  {
    id: '1',
    name: 'Qumësht',
    quantity: '2',
    price: null,
    bought: false,
    createdAt: Date.now() - 5000,
  },
  {
    id: '2',
    name: 'Bukë',
    quantity: '1',
    price: 70,
    bought: true,
    createdAt: Date.now() - 4000,
  },
  {
    id: '3',
    name: 'Vezë',
    quantity: '12',
    price: null,
    bought: false,
    createdAt: Date.now() - 3000,
  },
  {
    id: '4',
    name: 'Kafe',
    quantity: '1',
    price: 550,
    bought: true,
    createdAt: Date.now() - 2000,
  },
  {
    id: '5',
    name: 'Mollë',
    quantity: '1',
    price: null,
    bought: false,
    createdAt: Date.now() - 1000,
  },
];

export const mockBills: ShoppingItem[] = [
  { id: 'b1', name: 'Qira', quantity: '', price: 25000, bought: false, createdAt: Date.now() - 3000, sharedId: 'b1' },
  { id: 'b2', name: 'Energji elektrike', quantity: '', price: 3500, bought: true, createdAt: Date.now() - 2000, sharedId: 'b2' },
  { id: 'b3', name: 'Internet', quantity: '', price: 1800, bought: false, createdAt: Date.now() - 1000, sharedId: 'b3' },
];

export const mockWishlist: ShoppingItem[] = [
  { id: 'w1', name: 'Këpucë sportive', quantity: '', price: 6000, bought: false, createdAt: Date.now() - 2000 },
  { id: 'w2', name: 'Kufje pa tel', quantity: '', price: 3500, bought: false, createdAt: Date.now() - 1000 },
];
