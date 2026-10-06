import { memo, useMemo } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';

import { ItemRow } from '@/components/ItemRow';
import { useTripActions } from '@/context/TripsContext';
import { colors, spacing } from '@/theme/theme';
import type { ItemListKey, ShoppingItem } from '@/types/models';
import { sortBoughtLast } from '@/utils/totals';

interface ItemListProps {
  tripId: string;
  list: ItemListKey;
  items: ShoppingItem[];
  emptyText: string;
  showQuantity?: boolean;
  /** Draw only this many rows (a tab that was prepared in the background but not opened yet). */
  limit?: number;
}

// Every row is heavy (animations, swipe), so draw only what is on screen first and fill in the rest in small batches.
// A small window keeps few rows alive at once, which also keeps closing the list quick.
const LIST_TUNING = { initialNumToRender: 7, maxToRenderPerBatch: 3, updateCellsBatchingPeriod: 60, windowSize: 5 } as const;

// Redrawn only when its own items change, not when another tab is opened or another list is edited.
export const ItemList = memo(function ItemList({ tripId, list, items, emptyText, showQuantity = true, limit }: ItemListProps) {
  const { toggleItem, updateItem, removeItem, toggleStar } = useTripActions();
  const data = useMemo(() => {
    const sorted = sortBoughtLast(items);
    return limit === undefined ? sorted : sorted.slice(0, limit);
  }, [items, limit]);

  return (
    <FlatList
      {...LIST_TUNING}
      data={data}
      keyExtractor={(item) => item.id}
      style={styles.list}
      renderItem={({ item }) => (
        <ItemRow
          item={item}
          onToggle={() => toggleItem(tripId, list, item.id)}
          onUpdate={(patch) => updateItem(tripId, list, item.id, patch)}
          onRemove={() => removeItem(tripId, list, item.id)}
          onToggleStar={() => toggleStar(tripId, list, item.id)}
          showQuantity={showQuantity}
        />
      )}
      ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
});

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.sm },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
