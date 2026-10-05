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

export function LatestListPie({ listName, sections, income }: LatestListPieProps) {
  const total = sections.reduce((sum, s) => sum + s.spent, 0);

  return (
    <View style={[styles.card, shadow]}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {listName}
        </Text>
        <Text style={styles.total}>{formatPrice(total)}</Text>
      </View>
      <View style={styles.body}>
        <PieChart
          size={88}
          showLabels={false}
          slices={sections.map((s) => ({ key: s.key, value: s.spent, color: CATEGORY_COLORS[s.key] }))}
        />
        <View style={styles.legend}>
          {sections.map((section) => (
            <View key={section.key} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[section.key] }]} />
              <Text style={styles.name} numberOfLines={1}>
                {section.label}
              </Text>
              <Text style={styles.percent}>
                {total > 0 ? `${Math.round((section.spent / total) * 100)}%` : '0%'}
              </Text>
              <Text style={styles.value}>{formatPrice(section.spent)}</Text>
            </View>
          ))}
        </View>
      </View>
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
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  legend: { flex: 1, gap: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.text },
  percent: { fontSize: 11, color: colors.textMuted, minWidth: 28, textAlign: 'right' },
  value: { fontSize: 12, fontWeight: '700', color: colors.text, minWidth: 64, textAlign: 'right' },
  planned: { gap: 6 },
  track: { height: 5, borderRadius: radii.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary },
  plannedRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  plannedLabel: { fontSize: 12, color: colors.textMuted },
  plannedValue: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
});
