import { StyleSheet, Text, View } from 'react-native';

import { PieChart } from '@/components/charts/PieChart';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import { CATEGORY_COLORS, type SectionSpend } from '@/utils/reports';
import { formatPrice } from '@/utils/totals';

interface LatestListPieProps {
  listName: string;
  sections: SectionSpend[];
  income: number;
}

// More entries than this and the legend is laid out in two columns instead of one long list.
const TWO_COLUMNS_FROM = 4;

export function LatestListPie({ listName, sections, income }: LatestListPieProps) {
  const total = sections.reduce((sum, s) => sum + s.spent, 0);
  // Only the categories with spending, so all the categories do not make this card a long list of zeros.
  const spent = sections.filter((s) => s.spent > 0);
  const twoColumns = spent.length >= TWO_COLUMNS_FROM;

  return (
    <View style={[styles.card, shadow]}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {listName}
        </Text>
        <Text style={styles.total}>{formatPrice(total)}</Text>
      </View>
      {spent.length === 0 ? (
        <Text style={styles.none}>Asnjë shpenzim ende</Text>
      ) : (
        <>
          <PieChart
            size={176}
            slices={spent.map((s) => ({ key: s.key, value: s.spent, color: CATEGORY_COLORS[s.key] }))}
          />
          <View style={twoColumns ? styles.legendGrid : styles.legend}>
            {spent.map((section) => {
              const percent = total > 0 ? `${Math.round((section.spent / total) * 100)}%` : '0%';
              return twoColumns ? (
                <View key={section.key} style={styles.cell}>
                  <View style={[styles.dot, styles.cellDot, { backgroundColor: CATEGORY_COLORS[section.key] }]} />
                  <View style={styles.cellText}>
                    <Text style={styles.cellName} numberOfLines={1}>
                      {section.label}
                    </Text>
                    <Text style={styles.cellMeta} numberOfLines={1}>
                      {percent} · {formatPrice(section.spent)}
                    </Text>
                  </View>
                </View>
              ) : (
                <View key={section.key} style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[section.key] }]} />
                  <Text style={styles.name} numberOfLines={1}>
                    {section.label}
                  </Text>
                  <Text style={styles.percent}>{percent}</Text>
                  <Text style={styles.value}>{formatPrice(section.spent)}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
      <View style={styles.planned}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${income > 0 ? Math.min(1, total / income) * 100 : 0}%`,
                backgroundColor: income > 0 && total > income ? colors.danger : colors.primary,
              },
            ]}
          />
        </View>
        <View style={styles.plannedRow}>
          <Text style={styles.plannedLabel}>Të ardhurat</Text>
          <Text style={styles.plannedValue}>{formatPrice(income)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.textMuted },
  total: { fontSize: 13, fontWeight: '700', color: colors.text },
  legend: { gap: 6 },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cell: { width: '48%', flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  cellDot: { marginTop: 3 },
  cellText: { flex: 1 },
  cellName: { fontSize: 12, fontWeight: '600', color: colors.text },
  cellMeta: { fontSize: 11, color: colors.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.text },
  none: { fontSize: 12, color: colors.textMuted },
  percent: { fontSize: 11, color: colors.textMuted, minWidth: 28, textAlign: 'right' },
  value: { fontSize: 12, fontWeight: '700', color: colors.text, minWidth: 64, textAlign: 'right' },
  planned: { gap: 6 },
  track: { height: 5, borderRadius: radii.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary },
  plannedRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  plannedLabel: { fontSize: 12, color: colors.textMuted },
  plannedValue: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
});
