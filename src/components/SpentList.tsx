import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { LIST_TUNING } from '@/components/ItemList';
import { ItemRow } from '@/components/ItemRow';
import { useTripActions } from '@/context/TripsContext';
import { useRemoveItem } from '@/hooks/useRemoveItem';
import { colors, radii, spacing } from '@/theme/theme';
import type { ShoppingItem } from '@/types/models';
import { formatDateAlbanian } from '@/utils/dates';
import { boughtTime, type SpentEntry, type SpentGroup } from '@/utils/spent';
import { computeSpentTotal, formatPrice } from '@/utils/totals';

interface SpentListProps {
  tripId: string;
  groups: SpentGroup[];
  /** The same items in one list, the one checked last first. */
  latest: SpentEntry[];
  emptyText: string;
  /** The section of a category to scroll to and mark when the list opens (from the pie on the home page). */
  focusSection?: string;
}

type SpentView = 'categories' | 'latest';

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
const SpentByCategory = memo(function SpentByCategory({
  tripId,
  groups,
  emptyText,
  focusSection,
}: Omit<SpentListProps, 'latest'>) {
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

interface Day {
  key: string;
  label: string;
  total: number;
  data: SpentEntry[];
}

const dayKey = (at: Date) => `${at.getFullYear()}-${at.getMonth()}-${at.getDate()}`;

// "Sot", "Dje" or the date.
function dayLabel(at: Date, now: number): string {
  if (dayKey(at) === dayKey(new Date(now))) return 'Sot';
  if (dayKey(at) === dayKey(new Date(now - 24 * 60 * 60 * 1000))) return 'Dje';
  return formatDateAlbanian(at.getTime());
}

// The entries come newest first, so the ones of a day are next to each other.
function groupByDay(entries: SpentEntry[], now: number): Day[] {
  const days: Day[] = [];
  for (const entry of entries) {
    const at = new Date(boughtTime(entry.item));
    const key = dayKey(at);
    let day = days[days.length - 1];
    if (!day || day.key !== key) {
      day = { key, label: dayLabel(at, now), total: 0, data: [] };
      days.push(day);
    }
    day.data.push(entry);
  }
  for (const day of days) day.total = computeSpentTotal(day.data.map((entry) => entry.item));
  return days;
}

// The same checked items without the categories: the ones checked last first, a block for each day, and every row says which
// category it is in.
const SpentLatest = memo(function SpentLatest({
  tripId,
  entries,
  emptyText,
}: {
  tripId: string;
  entries: SpentEntry[];
  emptyText: string;
}) {
  const { toggleItem, updateItem, moveItem, toggleStar } = useTripActions();
  const removeItem = useRemoveItem();
  const days = useMemo(() => groupByDay(entries, Date.now()), [entries]);

  return (
    <SectionList<SpentEntry, Day>
      {...LIST_TUNING}
      sections={days}
      keyExtractor={({ category, item }) => `${category.key}:${item.id}`}
      style={styles.list}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <View style={styles.header}>
          <Ionicons name="time-outline" size={18} color={colors.textMuted} />
          <View style={styles.headerText}>
            <Text style={styles.dayTitle}>{section.label}</Text>
            <Text style={styles.headerCount}>
              {section.data.length === 1 ? '1 artikull' : `${section.data.length} artikuj`}
            </Text>
          </View>
          <Text style={styles.headerTotal}>{formatPrice(section.total)}</Text>
        </View>
      )}
      renderItem={({ item: { category, item } }) => (
        <ItemRow
          item={item}
          tag={{ label: category.label, color: category.color }}
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
      )}
      ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
});

const VIEWS: { value: SpentView; label: string; icon: 'grid-outline' | 'time-outline' }[] = [
  { value: 'latest', label: 'Të fundit', icon: 'time-outline' },
  { value: 'categories', label: 'Sipas kategorive', icon: 'grid-outline' },
];

// The way chosen last stays chosen: kept while the app runs (so every list opens on it) and on the phone (so it is there the next
// time too). The last checked first is where it starts.
const VIEW_KEY = 'spentView';
let rememberedView: SpentView = 'latest';
AsyncStorage.getItem(VIEW_KEY)
  .then((saved) => {
    if (saved === 'categories' || saved === 'latest') rememberedView = saved;
  })
  .catch(() => {});
function rememberView(view: SpentView) {
  rememberedView = view;
  AsyncStorage.setItem(VIEW_KEY, view).catch(() => {});
}

// The two ways to see what was spent: the items one after the other, the last checked first (where it starts), or by category
// (with what each took).
export const SpentList = memo(function SpentList({ tripId, groups, latest, emptyText, focusSection }: SpentListProps) {
  // The way chosen last, unless the tab was opened to see one category (from the pie on the home page): then the categories.
  const [view, setView] = useState<SpentView>(focusSection ? 'categories' : rememberedView);
  const chooseView = (next: SpentView) => {
    setView(next);
    rememberView(next);
  };
  return (
    <View style={styles.list}>
      <View style={styles.toggle} accessibilityRole="tablist">
        {VIEWS.map((entry) => {
          const selected = entry.value === view;
          return (
            <Pressable
              key={entry.value}
              onPress={() => chooseView(entry.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.toggleButton, selected && styles.toggleSelected]}
            >
              <Ionicons name={entry.icon} size={16} color={selected ? colors.success : colors.textMuted} />
              <Text style={[styles.toggleText, selected && styles.toggleTextSelected]} numberOfLines={1}>
                {entry.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {view === 'categories' ? (
        <SpentByCategory tripId={tripId} groups={groups} emptyText={emptyText} focusSection={focusSection} />
      ) : (
        <SpentLatest tripId={tripId} entries={latest} emptyText={emptyText} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  list: { flex: 1 },
  toggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  toggleSelected: { backgroundColor: colors.successLight, borderColor: colors.success },
  toggleText: { fontSize: 13, fontWeight: '600', color: colors.textMuted, flexShrink: 1 },
  toggleTextSelected: { color: colors.text, fontWeight: '800' },
  dayTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
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
