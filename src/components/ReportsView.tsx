import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { ColumnChart } from '@/components/charts/ColumnChart';
import { MiniColumns } from '@/components/charts/MiniColumns';
import { PieChart } from '@/components/charts/PieChart';
import { CompareLists } from '@/components/CompareLists';
import { EmptyState } from '@/components/EmptyState';
import { useFamilyLabels } from '@/context/FamilyLabelsContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useTrips } from '@/context/TripsContext';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import { CATEGORIES } from '@/utils/categories';
import { formatDayMonthShort } from '@/utils/dates';
import {
  buildCategoryHistory,
  buildOptionHistory,
  buildListSpend,
  buildPersonHistory,
  type CategoryHistory,
  type OptionHistory,
} from '@/utils/reports';

interface ReportsViewProps {
  onOpenTrip: (id: string) => void;
}

// The report is built when the tab is opened, and only the first charts are drawn right away;
// the rest are drawn in small batches as they come into view, so opening it never freezes the app.
const LIST_TUNING = { initialNumToRender: 2, maxToRenderPerBatch: 2, updateCellsBatchingPeriod: 80, windowSize: 5 } as const;

function listsLabel(count: number): string {
  return count === 1 ? 'Lista e fundit' : `${count} listat e fundit`;
}

const CategoryCard = memo(function CategoryCard({
  history,
  onOpenTrip,
}: {
  history: CategoryHistory;
  onOpenTrip: (id: string) => void;
}) {
  const { category, columns, total } = history;
  const { price } = usePrivacy();
  const hasSpend = total > 0;
  const data = columns.map((column) => ({
    key: column.id,
    label: formatDayMonthShort(column.createdAt),
    description: `${column.name}, ${price(column.spent)} në ${category.label}`,
    value: column.spent,
  }));

  return (
    <View style={[styles.card, shadow]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: category.color + '22' }]}>
          <Ionicons name={category.activeIcon} size={18} color={category.color} />
        </View>
        <View style={styles.cardTitles}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {category.label}
          </Text>
          <Text style={styles.cardSubtitle}>{hasSpend ? listsLabel(columns.length) : 'Asnjë shpenzim ende'}</Text>
        </View>
        <Text style={[styles.cardTotal, !hasSpend && { color: colors.textMuted }]}>{price(total)}</Text>
      </View>
      {hasSpend && <ColumnChart data={data} color={category.color} onPressColumn={onOpenTrip} />}
    </View>
  );
});

// A category with a choice (Karburant: Naftë, Gaz, Benzinë) split by that choice: what each one cost in every list.
const OptionCard = memo(function OptionCard({
  history,
  onOpenTrip,
}: {
  history: OptionHistory;
  onOpenTrip: (id: string) => void;
}) {
  const { category, total } = history;
  const { label } = useFamilyLabels();
  const { price } = usePrivacy();
  const hasSpend = total > 0;
  const listCount = history.options[0]?.columns.length ?? 0;
  // Only the choices that cost something: the ones at zero would just be lines of zeros.
  const options = history.options.filter((option) => option.total > 0);

  return (
    <View style={[styles.card, shadow]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: category.color + '22' }]}>
          <Ionicons name={category.activeIcon} size={18} color={category.color} />
        </View>
        <View style={styles.cardTitles}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {history.title}
          </Text>
          <Text style={styles.cardSubtitle}>{hasSpend ? listsLabel(listCount) : 'Asnjë shpenzim ende'}</Text>
        </View>
        <Text style={[styles.cardTotal, !hasSpend && { color: colors.textMuted }]}>{price(total)}</Text>
      </View>
      {hasSpend &&
        options.map((option) => (
          <View key={option.name} style={styles.optionBlock}>
            <View style={styles.totalRow}>
              <View style={[styles.dot, { backgroundColor: option.color }]} />
              <Text style={styles.totalName} numberOfLines={1}>
                {label(option.name)}
              </Text>
              <Text style={styles.totalPercent}>
                {Math.round((option.total / total) * 100)}%
              </Text>
              <Text style={styles.totalValue}>{price(option.total)}</Text>
            </View>
            <ColumnChart
              data={option.columns.map((column) => ({
                key: column.id,
                label: formatDayMonthShort(column.createdAt),
                description: `${column.name}, ${price(column.spent)} për ${label(option.name)}`,
                value: column.spent,
              }))}
              color={option.color}
              height={72}
              onPressColumn={onOpenTrip}
            />
          </View>
        ))}
    </View>
  );
});

// What each category cost over the same lists the charts show, all of them together, and how that splits up.
function TotalsCard({ histories }: { histories: CategoryHistory[] }) {
  const { price } = usePrivacy();
  const grandTotal = histories.reduce((sum, h) => sum + h.total, 0);
  const listCount = histories[0]?.columns.length ?? 0;
  // Only the categories that cost something, the biggest first.
  const spent = histories.filter((h) => h.total > 0).sort((a, b) => b.total - a.total);

  return (
    <View style={[styles.card, shadow]}>
      <View>
        <Text style={styles.totalsTitle}>Totali sipas kategorisë</Text>
        <Text style={styles.cardSubtitle}>{listsLabel(listCount)}</Text>
      </View>
      {spent.length === 0 ? (
        <Text style={styles.cardSubtitle}>Asnjë shpenzim ende</Text>
      ) : (
        <View style={styles.totalsList}>
          {spent.map(({ category, total }) => (
            <View key={category.section} style={styles.totalRow}>
              <View style={[styles.dot, { backgroundColor: category.color }]} />
              <Text style={styles.totalName} numberOfLines={2}>
                {category.label}
              </Text>
              <Text style={styles.totalPercent}>{Math.round((total / grandTotal) * 100)}%</Text>
              <Text style={styles.totalValue}>{price(total)}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.grandRow}>
        <Text style={styles.grandLabel}>Gjithsej</Text>
        <Text style={styles.grandValue}>{price(grandTotal)}</Text>
      </View>
      {grandTotal > 0 && (
        <PieChart slices={spent.map(({ category, total }) => ({ key: category.section, value: total, color: category.color }))} />
      )}
    </View>
  );
}

type ReportRow =
  | { kind: 'category'; key: string; history: CategoryHistory }
  | { kind: 'options'; key: string; history: OptionHistory }
  | { kind: 'totals'; key: string };

export function ReportsView({ onOpenTrip }: ReportsViewProps) {
  const { trips } = useTrips();
  const histories = useMemo(() => buildCategoryHistory(trips), [trips]);
  // What each of the last lists spent, as small columns at the top (the card that used to be on the home page).
  const recent = useMemo(
    () =>
      buildListSpend(trips)
        .slice(-12)
        .map((list) => ({
          key: list.id,
          label: list.name,
          value: list.spent,
          over: list.budget != null && list.spent > list.budget,
        })),
    [trips],
  );
  // A category with a choice gets its split-by-choice card straight after its own card, and one that also asks who it
  // is for (Kopesht & Shkolle) gets a split by person after that.
  const rows = useMemo<ReportRow[]>(() => {
    const splits = new Map(
      CATEGORIES.map((category) => [
        category.section,
        [buildOptionHistory(trips, category), buildPersonHistory(trips, category)] as const,
      ]),
    );
    // The totals come first. A category (or a split) that cost nothing has no chart.
    return [
      { kind: 'totals', key: 'totals' },
      ...histories.flatMap((history): ReportRow[] => {
        const { section } = history.category;
        const [options, people] = splits.get(section) ?? [null, null];
        const cards: ReportRow[] = [
          { kind: 'category', key: section, history },
          ...(options ? [{ kind: 'options' as const, key: `${section}-options`, history: options }] : []),
          ...(people ? [{ kind: 'options' as const, key: `${section}-people`, history: people }] : []),
        ];
        return cards.filter((row) => row.kind === 'totals' || row.history.total > 0);
      }),
    ];
  }, [histories, trips]);

  if (trips.length === 0) {
    return (
      <EmptyState
        icon="stats-chart-outline"
        title="Nuk ka raporte ende"
        subtitle="Krijo një listë dhe shto artikuj për të parë raportet."
      />
    );
  }

  return (
    <FlatList
      {...LIST_TUNING}
      data={rows}
      keyExtractor={(row) => row.key}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        if (item.kind === 'totals') return <TotalsCard histories={histories} />;
        return (
          <View style={styles.cardGap}>
            {item.kind === 'options' ? (
              <OptionCard history={item.history} onOpenTrip={onOpenTrip} />
            ) : (
              <CategoryCard history={item.history} onOpenTrip={onOpenTrip} />
            )}
          </View>
        );
      }}
      ListHeaderComponent={
        <View style={styles.header}>
          <MiniColumns data={recent} onPressColumn={onOpenTrip} />
          <CompareLists trips={trips} onOpenTrip={onOpenTrip} />
          <Text style={styles.intro}>Shpenzimet e secilës kategori, listë pas liste. Trokit një kolonë për të hapur listën.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: spacing.xl },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  intro: { fontSize: 12, color: colors.textMuted },
  cardGap: { marginBottom: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.md, gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  cardTitles: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardSubtitle: { fontSize: 12, color: colors.textMuted },
  cardTotal: { fontSize: 14, fontWeight: '700', color: colors.text },
  totalsTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  totalsList: { gap: spacing.sm + 2 },
  optionBlock: { gap: spacing.sm },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  totalName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  totalPercent: { fontSize: 12, color: colors.textMuted, minWidth: 34, textAlign: 'right' },
  totalValue: { fontSize: 14, fontWeight: '700', color: colors.text, minWidth: 92, textAlign: 'right' },
  muted: { color: colors.textMuted, fontWeight: '500' },
  grandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm + 2,
  },
  grandLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  grandValue: { fontSize: 18, fontWeight: '700', color: colors.primaryDark },
});
