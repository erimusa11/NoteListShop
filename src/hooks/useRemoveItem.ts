import { useCallback } from 'react';

import { useTripActions } from '@/context/TripsContext';
import { useFamilyLabels } from '@/context/FamilyLabelsContext';
import { useUndo } from '@/context/UndoContext';
import type { ItemListKey, ShoppingItem } from '@/types/models';
import { CATEGORIES } from '@/utils/categories';

/** Deletes an item of a list and, for a few seconds, offers to put it back. */
export function useRemoveItem() {
  const { removeItem, restoreItem } = useTripActions();
  const { showUndo } = useUndo();
  const { label } = useFamilyLabels();

  return useCallback(
    (tripId: string, list: ItemListKey, item: ShoppingItem) => {
      removeItem(tripId, list, item.id);
      // In a category with choices the name can be one of the family names, which is shown by its label.
      const hasChoices = CATEGORIES.some((category) => category.key === list && category.nameOptions);
      showUndo(`"${hasChoices ? label(item.name) : item.name}" u fshi`, () => restoreItem(tripId, list, item));
    },
    [removeItem, restoreItem, showUndo, label],
  );
}
