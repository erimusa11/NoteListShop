import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
// This scroller takes the sideways swipe over it, so the swipe between the pages of the app does not steal it.
import { ScrollView } from 'react-native-gesture-handler';

import { usePrivacy } from '@/context/PrivacyContext';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { ShoppingTrip } from '@/types/models';
import { CATEGORIES } from '@/utils/categories';
import { formatDayMonthShort } from '@/utils/dates';
import { buildSectionSpend, CATEGORY_COLORS } from '@/utils/reports';
import { computeSpentTotal, tripAllItems } from '@/utils/totals';

/** How many lists can be put side by side. */
export const MAX_COMPARED = 6;

const LABELS = new Map<string, string>(CATEGORIES.map(({ section, label }) => [section, label]));

// One color for each place of the six, so a list keeps its color while the others are picked and dropped.
const LIST_COLORS = ['#3B6FD4', '#E0731C', '#2FA96B', '#8E5BD0', '#D94F70', '#2A9FB5'];

interface CompareListsProps {
  trips: ShoppingTrip[];
  /** A list of the charts was tapped. */
  onOpenTrip: (id: string) => void;
}

interface Compared {
  trip: ShoppingTrip;
  color: string;
  spent: number;
  sections: Map<string, number>;
}

// Pick up to six lists and see them next to each other: what each one spent in all, and then category by category.
export const CompareLists = memo(function CompareLists({ trips, onOpenTrip }: CompareListsProps) {
  const { price, hidden } = usePrivacy();
  const newestFirst = useMemo(() => [...trips].sort((a, b) => b.createdAt - a.createdAt), [trips]);
  // A list picked earlier and since deleted keeps its slot and color reserved forever otherwise, which can silently stop a
  // later pick from finding a free one even while the count on screen shows room for more.
  const tripIds = useMemo(() => new Set(trips.map((trip) => trip.id)), [trips]);

  // The place (0 to 5) each picked list holds; the two newest lists are there to begin with, so there is something to see.
  const [slots, setSlots] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      [...trips]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 2)
        .map((trip, index) => [trip.id, index]),
    ),
  );

  const picked = useMemo<Compared[]>(
    () =>
      newestFirst
        .filter((trip) => slots[trip.id] !== undefined)
        // Oldest first, so the lists read left to right in time.
        .reverse()
        .map((trip) => ({
          trip,
          color: LIST_COLORS[slots[trip.id]],
          spent: computeSpentTotal(tripAllItems(trip)),
          sections: new Map(buildSectionSpend([trip]).map((section) => [section.key, section.spent])),
        })),
    [newestFirst, slots],
  );
  const full = picked.length >= MAX_COMPARED;

  const toggle = (id: string) =>
    setSlots((prev) => {
      if (prev[id] !== undefined) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      const used = new Set(Object.entries(prev).filter(([tripId]) => tripIds.has(tripId)).map(([, color]) => color));
      const free = LIST_COLORS.findIndex((_, index) => !used.has(index));
      return free < 0 ? prev : { ...prev, [id]: free };
    });

  const maxSpent = Math.max(...picked.map((entry) => entry.spent), 0);
  // The categories with spending in at least one picked list, the biggest first.
  const categories = useMemo(() => {
    const totals = new Map<string, number>();
    for (const entry of picked) {
      for (const [key, spent] of entry.sections) totals.set(key, (totals.get(key) ?? 0) + spent);
    }
    return [...totals].filter(([, spent]) => spent > 0).sort((a, b) => b[1] - a[1]);
  }, [picked]);

  if (trips.length < 2) return null;

  return (
    <View style={[styles.card, shadow]}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={styles.title}>Krahaso listat</Text>
          <Text style={styles.subtitle}>Zgjidh deri në {MAX_COMPARED} lista për t&apos;i parë krah për krah</Text>
        </View>
        <Text style={[styles.count, full && styles.countFull]}>
          {picked.length}/{MAX_COMPARED}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {newestFirst.map((trip) => {
          const slot = slots[trip.id];
          const on = slot !== undefined;
          const disabled = !on && full;
          const color = on ? LIST_COLORS[slot] : colors.border;
          return (
            <Pressable
              key={trip.id}
              onPress={() => toggle(trip.id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled }}
              accessibilityLabel={`${trip.name}, ${formatDayMonthShort(trip.createdAt)}`}
              accessibilityHint={on ? 'Hiqe nga krahasimi' : 'Shtoje te krahasimi'}
              style={[styles.chip, on && { backgroundColor: color + '22', borderColor: color }, disabled && styles.chipDisabled]}
            >
              <View style={[styles.chipDot, { backgroundColor: color }]}>
                {on && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
              </View>
              <View>
                <Text style={[styles.chipName, on && styles.chipNameOn]} numberOfLines={1}>
                  {trip.name}
                </Text>
                <Text style={styles.chipDate}>{formatDayMonthShort(trip.createdAt)}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {picked.length === 0 ? (
        <Text style={styles.empty}>Zgjidh të paktën një listë për të parë grafikët.</Text>
      ) : (
        <>
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Shpenzimet gjithsej</Text>
            {picked.map(({ trip, color, spent }) => (
              <Pressable
                key={trip.id}
                onPress={() => onOpenTrip(trip.id)}
                accessibilityRole="button"
                accessibilityLabel={`${trip.name}, ${price(spent)}. Hap listën`}
                style={({ pressed }) => [styles.totalRow, pressed && styles.pressed]}
              >
                <View style={styles.totalLine}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={styles.totalName} numberOfLines={1}>
                    {trip.name}
                  </Text>
                  <Text style={styles.totalValue}>{price(spent)}</Text>
                </View>
                <Bar value={spent} max={maxSpent} color={color} height={10} />
              </Pressable>
            ))}
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Sipas kategorisë</Text>
            <View style={styles.legend}>
              {picked.map(({ trip, color }) => (
                <View key={trip.id} style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={styles.legendText} numberOfLines={1}>
                    {trip.name}
                  </Text>
                </View>
              ))}
            </View>
            {categories.length === 0 ? (
              <Text style={styles.empty}>Asnjë shpenzim në listat e zgjedhura.</Text>
            ) : (
              categories.map(([key]) => {
                const max = Math.max(...picked.map((entry) => entry.sections.get(key) ?? 0), 0);
                return (
                  <View key={key} style={styles.category}>
                    <View style={styles.categoryHead}>
                      <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[key] }]} />
                      <Text style={styles.categoryName} numberOfLines={1}>
                        {LABELS.get(key) ?? key}
                      </Text>
                    </View>
                    {picked.map(({ trip, color, sections }) => {
                      const spent = sections.get(key) ?? 0;
                      return (
                        <View
                          key={trip.id}
                          style={styles.barLine}
                          accessible
                          accessibilityLabel={`${trip.name}, ${LABELS.get(key) ?? key}, ${price(spent)}`}
                        >
                          <View style={styles.barFlex}>
                            <Bar value={spent} max={max} color={color} height={8} />
                          </View>
                          <Text style={[styles.barValue, spent === 0 && styles.barValueZero]} numberOfLines={1}>
                            {spent === 0 && !hidden ? '—' : price(spent)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })
            )}
          </View>
        </>
      )}
    </View>
  );
});

// A bar as long as `value` is of `max`; a value above zero always shows a little.
function Bar({ value, max, color, height }: { value: number; max: number; color: string; height: number }) {
  const share = max > 0 ? value / max : 0;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      {value > 0 && (
        <View style={{ width: `${Math.max(3, share * 100)}%`, height, borderRadius: height / 2, backgroundColor: color }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.md, gap: spacing.md, marginBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titles: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  count: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm + 2,
    overflow: 'hidden',
  },
  countFull: { color: '#FFFFFF', backgroundColor: colors.primary },
  chips: { gap: spacing.sm, paddingRight: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    maxWidth: 170,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: 5,
    paddingLeft: 7,
    paddingRight: 12,
  },
  chipDisabled: { opacity: 0.4 },
  chipDot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  chipName: { fontSize: 12, fontWeight: '600', color: colors.text, maxWidth: 120 },
  chipNameOn: { fontWeight: '700' },
  chipDate: { fontSize: 10, color: colors.textMuted },
  empty: { fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.sm },
  block: { gap: spacing.sm },
  blockTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  pressed: { opacity: 0.6 },
  totalRow: { gap: 4 },
  totalLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  totalValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  dot: { width: 8, height: 8, borderRadius: 4 },
  track: { width: '100%', backgroundColor: colors.background, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '48%' },
  legendText: { flexShrink: 1, fontSize: 11, color: colors.textMuted },
  category: { gap: 3, paddingTop: spacing.xs },
  categoryHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryName: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.text },
  barLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barFlex: { flex: 1 },
  barValue: { minWidth: 78, fontSize: 11, fontWeight: '600', color: colors.text, textAlign: 'right' },
  barValueZero: { color: colors.textMuted, fontWeight: '400' },
});
