import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import { LIST_TUNING } from '@/components/ItemList';
import { ItemRow } from '@/components/ItemRow';
import { useTripActions } from '@/context/TripsContext';
import { useRemoveItem } from '@/hooks/useRemoveItem';
import { colors, radii, spacing } from '@/theme/theme';
import type { ShoppingItem } from '@/types/models';
import type { SpentGroup } from '@/utils/spent';
import { formatPrice } from '@/utils/totals';

interface SpentListProps {
  tripId: string;
  groups: SpentGroup[];
  emptyText: string;
  /** The section of a category to scroll to and mark when the list opens (from the pie on the home page). */
  focusSection?: string;
}

interface Block {
  group: SpentGroup;
  data: ShoppingItem[];
}

// The part of a category can be further down than the rows drawn so far; the scroll is tried again while they are measured.
const SCROLL_START_MS = 150;
const SCROLL_RETRY_MS = 120;
const SCROLL_TRIES = 6;

// Everything already checked off, one block per category: the category and what it took on top, then its items. Each
// row works on its own category's item, so unchecking one here unchecks it there (and it leaves this list).
export const SpentList = memo(function SpentList({ tripId, groups, emptyText, focusSection }: SpentListProps) {
  const { toggleItem, updateItem, moveItem, toggleStar } = useTripActions();
  const removeItem = useRemoveItem();
  const sections = useMemo<Block[]>(() => groups.map((group) => ({ group, data: group.items })), [groups]);
  const focusIndex = focusSection ? sections.findIndex(({ group }) => group.category.section === focusSection) : -1;

  const listRef = useRef<SectionList<ShoppingItem, Block>>(null);
  const tries = useRef(0);
  const done = useRef(false);

  // Item 0 of a section is its header, so this brings the whole part of the category to the top.
  const scrollToFocus = useCallback(() => {
    if (focusIndex < 0) return;
    listRef.current?.scrollToLocation({ sectionIndex: focusIndex, itemIndex: 0, viewPosition: 0, animated: true });
  }, [focusIndex]);

  // Once, when the rows first arrive.
  useEffect(() => {
    if (focusIndex < 0 || done.current) return;
    done.current = true;
    const timer = setTimeout(scrollToFocus, SCROLL_START_MS);
    return () => clearTimeout(timer);
  }, [focusIndex, scrollToFocus]);

  return (
    <SectionList
      {...LIST_TUNING}
      ref={listRef}
      sections={sections}
      keyExtractor={(item: ShoppingItem) => item.id}
      style={styles.list}
      stickySectionHeadersEnabled={false}
      onScrollToIndexFailed={({ averageItemLength, index }) => {
        // The rows that far down are not drawn yet: jump about that far, which draws them, and try again from there.
        if (++tries.current > SCROLL_TRIES) return;
        listRef.current?.getScrollResponder()?.scrollTo({ y: averageItemLength * index, animated: false });
        setTimeout(scrollToFocus, SCROLL_RETRY_MS);
      }}
      renderSectionHeader={({ section: { group } }) => {
        const { category, items, total } = group;
        const focused = category.section === focusSection;
        return (
          <View style={[styles.header, focused && { backgroundColor: category.color + '1F' }]}>
            <View style={[styles.iconBadge, { backgroundColor: category.color + '1F' }]}>
              <Ionicons name={category.activeIcon} size={18} color={category.color} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: category.color }]} numberOfLines={1}>
                {category.label}
              </Text>
              <Text style={styles.headerCount}>{items.length === 1 ? '1 artikull' : `${items.length} artikuj`}</Text>
            </View>
            <Text style={styles.headerTotal}>{formatPrice(total)}</Text>
          </View>
        );
      }}
      renderItem={({ item, section: { group } }) => {
        const { category } = group;
        return (
          <ItemRow
            item={item}
            onToggle={() => toggleItem(tripId, category.key, item.id)}
            onUpdate={(patch) => updateItem(tripId, category.key, item.id, patch)}
            onRemove={() => removeItem(tripId, category.key, item)}
            onToggleStar={() => toggleStar(tripId, category.key, item.id)}
            moveFrom={category.key}
            onMove={(to, groupName) => moveItem(tripId, category.key, item.id, to, groupName)}
            showQuantity={category.showQuantity}
            personOptions={category.personOptions}
            hasChoices={!!category.nameOptions}
          />
        );
      }}
      ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
});

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  headerCount: { fontSize: 12, color: colors.textMuted },
  headerTotal: { fontSize: 15, fontWeight: '700', color: colors.success },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
