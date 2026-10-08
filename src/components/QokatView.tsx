import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { EmptyState } from '@/components/EmptyState';
import { useTrips } from '@/context/TripsContext';
import { useTabSwipe } from '@/hooks/useTabSwipe';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import { CATEGORIES } from '@/utils/categories';
import { buildQokat, buildQokatForUs, filterQokat, type QokaEntry } from '@/utils/qokat';
import { formatPrice } from '@/utils/totals';

interface QokatViewProps {
  onOpenTrip: (id: string) => void;
}

// Shows this many qokat at first and this many more each time "load more" is pressed.
const PAGE_SIZE = 15;
const QOKA_COLOR = CATEGORIES.find((category) => category.key === 'qoka')?.color ?? colors.primary;

type QokaTab = 'tona' | 'ne';

interface QokaTabInfo {
  value: QokaTab;
  label: string;
  /** All the qokat of this tab, from every list. */
  build: typeof buildQokat;
  /** The color of the amounts. */
  color: string;
  /** Above the count, while nothing is typed. */
  countLabel: string;
  emptyTitle: string;
  emptySubtitle: string;
}

const TABS: QokaTabInfo[] = [
  {
    // The category Qoka: the ones we gave, once they are checked.
    value: 'tona',
    label: 'Qoka tona',
    build: buildQokat,
    color: QOKA_COLOR,
    countLabel: 'Qoka të dhëna',
    emptyTitle: 'Asnjë qokë ende',
    emptySubtitle: 'Këtu shfaqen qokat që i shënon si të dhëna (✓) në një listë.',
  },
  {
    // Të ardhurat of the kind Qoka: the ones given to us.
    value: 'ne',
    label: 'Qoka për ne',
    build: buildQokatForUs,
    color: colors.success,
    countLabel: 'Qoka të marra',
    emptyTitle: 'Asnjë qokë për ne ende',
    emptySubtitle: 'Shtoji te Të ardhurat në një listë, me llojin Qoka.',
  },
];
const ORDER = TABS.map((tab) => tab.value);

// Every qokë, to look back at; nothing can be changed here. Qoka tona are the ones checked in the category Qoka, Qoka për
// ne the incomes of the kind Qoka; swipe sideways or tap to go from one to the other.
// Nothing is built until the Qokat menu is opened, and a tab only the first time it is opened, so the lists screen and
// the reports do not pay for it.
export function QokatView({ onOpenTrip }: QokatViewProps) {
  const [active, setActive] = useState<QokaTab>('tona');
  const [mounted, setMounted] = useState<QokaTab[]>(['tona']);
  const select = useCallback((next: QokaTab) => {
    setActive(next);
    setMounted((prev) => (prev.includes(next) ? prev : [...prev, next]));
  }, []);
  const { gesture, slideStyle } = useTabSwipe(ORDER, active, select);

  return (
    <View style={styles.flex}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const selected = tab.value === active;
          return (
            <Pressable
              key={tab.value}
              onPress={() => select(tab.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.tab, selected && styles.tabActive]}
            >
              <Text style={[styles.tabText, selected && styles.tabTextActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.flex, slideStyle]}>
          {TABS.map(
            (tab) =>
              mounted.includes(tab.value) && (
                // A tab that is not open stays built but parked off screen, so it keeps what was typed in it.
                <View
                  key={tab.value}
                  style={tab.value === active ? styles.flex : styles.parked}
                  aria-hidden={tab.value !== active}
                  importantForAccessibility={tab.value === active ? 'auto' : 'no-hide-descendants'}
                >
                  <QokaList tab={tab} onOpenTrip={onOpenTrip} />
                </View>
              ),
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// One tab. The typed filter looks in all of its qokat, and only the matches are cut into pages, so a qokë that is not on
// screen yet is still found.
function QokaList({ tab, onOpenTrip }: { tab: QokaTabInfo; onOpenTrip: (id: string) => void }) {
  const { trips } = useTrips();
  const [query, setQuery] = useState('');
  const [shownCount, setShownCount] = useState(PAGE_SIZE);

  const all = useMemo(() => tab.build(trips), [tab, trips]);
  const matches = useMemo(() => filterQokat(all, query), [all, query]);
  const shown = useMemo(() => matches.slice(0, shownCount), [matches, shownCount]);
  const total = useMemo(() => matches.reduce((sum, entry) => sum + entry.amount, 0), [matches]);
  const hiddenCount = matches.length - shown.length;
  const filtering = query.trim().length > 0;

  const changeQuery = (text: string) => {
    setQuery(text);
    setShownCount(PAGE_SIZE);
  };

  return (
    <FlatList
      data={shown}
      keyExtractor={(entry) => entry.key}
      style={styles.flex}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        all.length > 0 ? (
          <View style={styles.header}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={changeQuery}
                placeholder="Kërko qokën ose listën…"
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                autoCorrect={false}
                returnKeyType="search"
              />
              {filtering && (
                <Pressable onPress={() => changeQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Pastro kërkimin">
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
            <View style={[styles.summary, shadow]}>
              <View style={styles.summaryHalf}>
                <Text style={styles.summaryLabel}>{filtering ? 'Qoka të gjetura' : tab.countLabel}</Text>
                <Text style={styles.summaryCount}>{matches.length}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryHalf}>
                <Text style={styles.summaryLabel}>Gjithsej</Text>
                <Text style={[styles.summaryTotal, { color: tab.color }]}>{formatPrice(total)}</Text>
              </View>
            </View>
          </View>
        ) : null
      }
      renderItem={({ item }) => <QokaRow entry={item} color={tab.color} onPress={() => onOpenTrip(item.tripId)} />}
      ListFooterComponent={
        hiddenCount > 0 ? (
          <Pressable
            onPress={() => setShownCount((count) => count + PAGE_SIZE)}
            accessibilityRole="button"
            accessibilityLabel={`Shfaq edhe ${Math.min(PAGE_SIZE, hiddenCount)} qoka`}
            style={({ pressed }) => [styles.loadMore, pressed && styles.loadMorePressed]}
          >
            <Ionicons name="chevron-down" size={18} color={colors.primaryDark} />
            <Text style={styles.loadMoreText}>Shfaq edhe {Math.min(PAGE_SIZE, hiddenCount)} qoka</Text>
            <Text style={styles.loadMoreMeta}>
              {shown.length} nga {matches.length}
            </Text>
          </Pressable>
        ) : null
      }
      ListEmptyComponent={
        all.length === 0 ? (
          <EmptyState icon="cafe-outline" title={tab.emptyTitle} subtitle={tab.emptySubtitle} />
        ) : (
          <EmptyState icon="search-outline" title="Asnjë qokë nuk u gjet" subtitle={`Nuk ka qokë me "${query.trim()}"`} />
        )
      }
    />
  );
}

function QokaRow({ entry, color, onPress }: { entry: QokaEntry; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, ${formatPrice(entry.amount)}, ${entry.tripName}. Hap listën`}
      style={({ pressed }) => [styles.row, shadow, pressed && styles.rowPressed]}
    >
      <View style={[styles.iconCircle, { backgroundColor: color + '22' }]}>
        <Ionicons name="cafe" size={18} color={color} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={2}>
          {entry.name || 'Pa emër'}
        </Text>
        <Text style={styles.rowList} numberOfLines={1}>
          {entry.tripName}
        </Text>
      </View>
      <Text style={[styles.rowAmount, { color }]}>{formatPrice(entry.amount)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Far off to the side rather than invisible: nothing can overlap (or catch taps meant for) the open tab.
  parked: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, transform: [{ translateX: -20000 }] },
  tabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.pill },
  tabActive: { backgroundColor: colors.primaryLight },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primaryDark, fontWeight: '700' },
  listContent: { flexGrow: 1, paddingBottom: spacing.sm },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  searchBox: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 },
  summary: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radii.lg, overflow: 'hidden' },
  summaryHalf: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  summaryDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  summaryLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2, textAlign: 'center' },
  summaryCount: { fontSize: 22, fontWeight: '700', color: colors.text },
  summaryTotal: { fontSize: 22, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowPressed: { opacity: 0.85 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowList: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  rowAmount: { fontSize: 15, fontWeight: '700' },
  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    backgroundColor: colors.card,
    paddingVertical: spacing.sm + 4,
    marginTop: spacing.xs,
  },
  loadMorePressed: { backgroundColor: colors.primaryLight },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  loadMoreMeta: { fontSize: 12, color: colors.textMuted },
});
