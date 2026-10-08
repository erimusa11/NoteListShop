import type { ShoppingTrip } from '@/types/models';
import { incomeKindInfo } from '@/utils/incomes';
import { normalizeText } from '@/utils/suggestions';
import { itemTotal } from '@/utils/totals';

export interface QokaEntry {
  /** Tells entries apart across lists: the list and the item. */
  key: string;
  tripId: string;
  tripName: string;
  name: string;
  amount: number;
  /** What the filter looks in, already normalized: the name, and the name of the list it was given in. */
  search: string;
}

/** Every qokë that was checked (given), from every list: the newest list first, and the newest first within a list. */
export function buildQokat(trips: ShoppingTrip[]): QokaEntry[] {
  return [...trips]
    .sort((a, b) => b.createdAt - a.createdAt)
    .flatMap((trip) =>
      (trip.qoka ?? [])
        .filter((item) => item.bought)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((item): QokaEntry => {
          const name = String(item.name ?? '').trim();
          return {
            key: `${trip.id}:${item.id}`,
            tripId: trip.id,
            tripName: trip.name,
            name,
            amount: itemTotal(item),
            search: normalizeText(`${name} ${trip.name}`),
          };
        }),
    );
}

/** Every qokë given to us: the incomes of the Qoka kind (Të ardhurat), from every list, the newest list first. */
export function buildQokatForUs(trips: ShoppingTrip[]): QokaEntry[] {
  return [...trips]
    .sort((a, b) => b.createdAt - a.createdAt)
    .flatMap((trip) =>
      (trip.incomes ?? [])
        .filter((income) => incomeKindInfo(income).kind === 'qoka')
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((income): QokaEntry => {
          const name = String(income.name ?? '').trim();
          return {
            key: `${trip.id}:${income.id}`,
            tripId: trip.id,
            tripName: trip.name,
            name,
            amount: Number.isFinite(income.amount) ? income.amount : 0,
            search: normalizeText(`${name} ${trip.name}`),
          };
        }),
    );
}

/** The entries that match what was typed, ignoring case and accents. All of them, not just the ones on screen. */
export function filterQokat(entries: QokaEntry[], query: string): QokaEntry[] {
  const needle = normalizeText(query);
  return needle ? entries.filter((entry) => entry.search.includes(needle)) : entries;
}
