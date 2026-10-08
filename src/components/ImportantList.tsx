import { memo } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';

import { LIST_TUNING } from '@/components/ItemList';
import { ItemRow } from '@/components/ItemRow';
import { useTripActions } from '@/context/TripsContext';
import { colors, spacing } from '@/theme/theme';
import type { ImportantEntry } from '@/utils/important';

interface ImportantListProps {
  tripId: string;
  entries: ImportantEntry[];
  emptyText: string;
}

// The items marked more important than normal, from every category together. Each row works on its own category's
// item, so checking one here checks it there (and it leaves this list, which only shows what is still to buy).
export const ImportantList = memo(function ImportantList({ tripId, entries, emptyText }: ImportantListProps) {
  const { toggleItem, updateItem, removeItem, moveItem, toggleStar } = useTripActions();

  return (
    <FlatList
      {...LIST_TUNING}
      data={entries}
      keyExtractor={({ category, item }) => `${category.key}:${item.id}`}
      style={styles.list}
      renderItem={({ item: { category, item } }) => (
        <ItemRow
          item={item}
          tag={{ label: category.label, color: category.color }}
          onToggle={() => toggleItem(tripId, category.key, item.id)}
          onUpdate={(patch) => updateItem(tripId, category.key, item.id, patch)}
          onRemove={() => removeItem(tripId, category.key, item.id)}
          onToggleStar={() => toggleStar(tripId, category.key, item.id)}
          moveFrom={category.key}
          onMove={(to, group) => moveItem(tripId, category.key, item.id, to, group)}
          showQuantity={category.showQuantity}
          personOptions={category.personOptions}
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
