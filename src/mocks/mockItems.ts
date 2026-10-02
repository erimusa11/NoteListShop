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
    quantity: '12 copë',
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
    quantity: '1kg',
    price: null,
    bought: false,
    createdAt: Date.now() - 1000,
  },
];
