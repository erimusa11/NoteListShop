import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { ColumnChart } from '@/components/charts/ColumnChart';
import { PieChart } from '@/components/charts/PieChart';
import { EmptyState } from '@/components/EmptyState';
import { useTrips } from '@/context/TripsContext';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import { formatDayMonthShort } from '@/utils/dates';
import { buildCategoryHistory, buildListSpend, type CategoryHistory } from '@/utils/reports';
import { formatPrice } from '@/utils/totals';

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
  const hasSpend = total > 0;
  const data = columns.map((column) => ({
    key: column.id,
    label: formatDayMonthShort(column.createdAt),
    description: `${column.name}, ${formatPrice(column.spent)} në ${category.label}`,
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
        <Text style={[styles.cardTotal, !hasSpend && { color: colors.textMuted }]}>{formatPrice(total)}</Text>
      </View>
      {hasSpend && <ColumnChart data={data} color={category.color} onPressColumn={onOpenTrip} />}
    </View>
  );
});

// What each category cost over the same lists the charts show, all of them together, and how that splits up.
function TotalsCard({ histories }: { histories: CategoryHistory[] }) {
  const grandTotal = histories.reduce((sum, h) => sum + h.total, 0);
  const listCount = histories[0]?.columns.length ?? 0;

  return (
    <View style={[styles.card, shadow]}>
      <View>
        <Text style={styles.totalsTitle}>Totali sipas kategorisë</Text>
        <Text style={styles.cardSubtitle}>{listsLabel(listCount)}</Text>
      </View>
      <View style={styles.totalsList}>
        {histories.map(({ category, total }) => (
          <View key={category.section} style={styles.totalRow}>
            <View style={[styles.dot, { backgroundColor: category.color }]} />
            <Text style={[styles.totalName, total === 0 && styles.muted]} numberOfLines={1}>
              {category.label}
            </Text>
            <Text style={[styles.totalPercent, total === 0 && styles.muted]}>
              {grandTotal > 0 ? `${Math.round((total / grandTotal) * 100)}%` : '0%'}
            </Text>
            <Text style={[styles.totalValue, total === 0 && styles.muted]}>{formatPrice(total)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.grandRow}>
        <Text style={styles.grandLabel}>Gjithsej</Text>
        <Text style={styles.grandValue}>{formatPrice(grandTotal)}</Text>
      </View>
      {grandTotal > 0 && (
        <PieChart slices={histories.map(({ category, total }) => ({ key: category.section, value: total, color: category.color }))} />
      )}
    </View>
  );
}

type ReportRow = CategoryHistory | 'totals';

export function ReportsView({ onOpenTrip }: ReportsViewProps) {
  const { trips } = useTrips();
  const histories = useMemo(() => buildCategoryHistory(trips), [trips]);
  const rows = useMemo<ReportRow[]>(() => [...histories, 'totals'], [histories]);

  if (trips.length === 0) {
    return (
      <EmptyState
        icon="stats-chart-outline"
        title="Nuk ka raporte ende"
        subtitle="Krijo një listë dhe shto artikuj për të parë raportet."
      />
    );
  }

  const lists = buildListSpend(trips);
  const totalSpent = lists.reduce((sum, l) => sum + l.spent, 0);
  const totalPlanned = lists.reduce((sum, l) => sum + l.planned, 0);
  const remaining = Math.max(0, totalPlanned - totalSpent);

  return (
    <FlatList
      {...LIST_TUNING}
      data={rows}
      keyExtractor={(row) => (row === 'totals' ? 'totals' : row.category.section)}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) =>
        item === 'totals' ? (
          <TotalsCard histories={histories} />
        ) : (
          <View style={styles.cardGap}>
            <CategoryCard history={item} onOpenTrip={onOpenTrip} />
          </View>
        )
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.tiles}>
            <View style={[styles.tile, shadow]}>
              <Text style={styles.tileLabel}>Shpenzuar gjithsej</Text>
              <Text style={[styles.tileValue, { color: colors.success }]}>{formatPrice(totalSpent)}</Text>
            </View>
            <View style={[styles.tile, shadow]}>
              <Text style={styles.tileLabel}>Mbetet për t&apos;u blerë</Text>
              <Text style={[styles.tileValue, { color: colors.primaryDark }]}>{formatPrice(remaining)}</Text>
            </View>
          </View>
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
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: radii.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md - 4 },
  tileLabel: { fontSize: 11, color: colors.textMuted },
  tileValue: { fontSize: 15, fontWeight: '700', color: colors.text },
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
