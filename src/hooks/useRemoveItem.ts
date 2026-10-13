import { useCallback } from 'react';

import { useTripActions } from '@/context/TripsContext';
import { useUndo } from '@/context/UndoContext';
import type { ItemListKey, ShoppingItem } from '@/types/models';

/** Deletes an item of a list and, for a few seconds, offers to put it back. */
export function useRemoveItem() {
  const { removeItem, restoreItem } = useTripActions();
  const { showUndo } = useUndo();

  return useCallback(
    (tripId: string, list: ItemListKey, item: ShoppingItem) => {
      removeItem(tripId, list, item.id);
      showUndo(`"${item.name}" u fshi`, () => restoreItem(tripId, list, item));
    },
    [removeItem, restoreItem, showUndo],
  );
}
