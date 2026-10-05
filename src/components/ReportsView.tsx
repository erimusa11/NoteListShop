import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ColumnChart } from '@/components/charts/ColumnChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { PieChart } from '@/components/charts/PieChart';
import { ProgressRing } from '@/components/charts/ProgressRing';
import { EmptyState } from '@/components/EmptyState';
import { useBills } from '@/context/BillsContext';
import { useSupplies } from '@/context/SuppliesContext';
import { useTrips } from '@/context/TripsContext';
import { useWishlist } from '@/context/WishlistContext';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import { buildListSpend, buildSectionSpend, buildTopItems, CATEGORY_COLORS } from '@/utils/reports';
import { formatPrice } from '@/utils/totals';

interface ReportsViewProps {
  onOpenTrip: (id: string) => void;
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={[styles.card, shadow]}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

export function ReportsView({ onOpenTrip }: ReportsViewProps) {
  const { trips } = useTrips();
  const { bills } = useBills();
  const { supplies } = useSupplies();
  const { wishlist } = useWishlist();

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
  const sections = buildSectionSpend(trips, supplies, bills, wishlist);
  const topItems = buildTopItems(trips, 5);

  const totalSpent = sections.reduce((sum, s) => sum + s.spent, 0);
  const totalPlanned = sections.reduce((sum, s) => sum + s.planned, 0);
  const remaining = Math.max(0, totalPlanned - totalSpent);
  const allItems = lists.reduce((sum, l) => sum + l.itemCount, 0);
  const boughtItems = lists.reduce((sum, l) => sum + l.boughtCount, 0);
  const boughtRatio = allItems > 0 ? boughtItems / allItems : 0;

  const columns = lists.map((list) => {
    const over = list.budget != null && list.spent > list.budget;
    return {
      key: list.id,
      label: list.name,
      value: list.spent,
      color: over ? colors.danger : colors.primary,
      marker: list.budget,
      warning: over,
    };
  });
  const anyOver = columns.some((c) => c.warning);
  const extras = sections.filter((s) => s.key !== 'products');
  const extrasTotal = extras.reduce((sum, s) => sum + s.spent, 0);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.tiles}>
        <View style={[styles.tile, shadow]}>
          <Text style={styles.tileLabel}>Shpenzuar gjithsej</Text>
          <Text style={[styles.tileValue, { color: colors.success }]}>{formatPrice(totalSpent)}</Text>
        </View>
        <View style={[styles.tile, shadow]}>
          <Text style={styles.tileLabel}>Mbetet për t'u blerë</Text>
          <Text style={[styles.tileValue, { color: colors.primaryDark }]}>{formatPrice(remaining)}</Text>
        </View>
      </View>

      <Card title="Progresi i blerjeve" subtitle="Sa nga artikujt e tu i ke blerë">
        <View style={styles.ringRow}>
          <ProgressRing ratio={boughtRatio} />
          <View style={styles.ringText}>
            <Text style={styles.bigNumber}>
              {boughtItems}
              <Text style={styles.bigNumberMuted}> / {allItems}</Text>
            </Text>
            <Text style={styles.rowMeta}>artikuj të blerë</Text>
            <Text style={[styles.rowMeta, styles.ringMetaGap]}>
              {lists.length} {lists.length === 1 ? 'listë' : 'lista'}
            </Text>
          </View>
        </View>
      </Card>

      <Card title="Shpenzimet sipas listës" subtitle="Trokit një kolonë për të hapur listën">
        <ColumnChart data={columns} onPressColumn={onOpenTrip} />
        {anyOver && <Text style={styles.warnNote}>Kolona e kuqe: lista ka kaluar buxhetin.</Text>}
      </Card>

      <Card title="Ku shkojnë paratë" subtitle="Të shpenzuara sipas kategorisë">
        <DonutChart
          segments={sections.map((s) => ({
            key: s.key,
            label: s.label,
            value: s.spent,
            color: CATEGORY_COLORS[s.key],
          }))}
          centerValue={formatPrice(totalSpent)}
          centerLabel="shpenzuar"
        />
        <View style={styles.legend}>
          {sections.map((section) => (
            <View key={section.key} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[section.key] }]} />
              <Text style={styles.legendName}>{section.label}</Text>
              <Text style={styles.legendPercent}>
                {totalSpent > 0 ? `${Math.round((section.spent / totalSpent) * 100)}%` : '0%'}
              </Text>
              <Text style={styles.rowValue}>{formatPrice(section.spent)}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card title="Detergjente & Extra, fatura & dëshira" subtitle="Sa ke shpenzuar në secilën (pa produktet)">
        {extras.some((e) => e.spent > 0) ? (
          <>
            <PieChart
              slices={extras.map((e) => ({ key: e.key, value: e.spent, color: CATEGORY_COLORS[e.key] }))}
            />
            <View style={styles.legend}>
              {extras.map((section) => (
                <View key={section.key} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[section.key] }]} />
                  <Text style={styles.legendName}>{section.label}</Text>
                  <Text style={styles.legendPercent}>
                    {extrasTotal > 0 ? `${Math.round((section.spent / extrasTotal) * 100)}%` : '0%'}
                  </Text>
                  <Text style={styles.rowValue}>{formatPrice(section.spent)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.emptyNote}>Shëno si të blera detergjente & extra, fatura ose dëshira për të parë grafikun.</Text>
        )}
      </Card>

      <Card title="Artikujt më të shtrenjtë" subtitle="Top 5 të blerë">
        {topItems.length === 0 ? (
          <Text style={styles.emptyNote}>Asnjë artikull i blerë me çmim ende.</Text>
        ) : (
          topItems.map((item, index) => (
            <View key={item.id} style={styles.topRow}>
              <Text style={styles.rank}>{index + 1}</Text>
              <View style={styles.topText}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {item.listName}
                </Text>
              </View>
              <Text style={styles.rowValue}>{formatPrice(item.price)}</Text>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: radii.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md - 4 },
  tileLabel: { fontSize: 11, color: colors.textMuted },
  tileValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardBody: { marginTop: spacing.md, gap: spacing.md },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  ringText: { flex: 1 },
  bigNumber: { fontSize: 28, fontWeight: '700', color: colors.text },
  bigNumberMuted: { fontSize: 18, fontWeight: '600', color: colors.textMuted },
  ringMetaGap: { marginTop: spacing.xs },
  warnNote: { fontSize: 12, color: colors.danger },
  legend: { gap: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  legendPercent: { fontSize: 12, color: colors.textMuted, minWidth: 34, textAlign: 'right' },
  rowName: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  rowValue: { fontSize: 14, fontWeight: '700', color: colors.text, minWidth: 84, textAlign: 'right' },
  rowMeta: { fontSize: 12, color: colors.textMuted },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rank: { width: 22, fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  topText: { flex: 1 },
  emptyNote: { fontSize: 13, color: colors.textMuted },
});
