import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadow, spacing } from '@/theme/theme';
import { formatPrice } from '@/utils/totals';

interface BillsSummaryBarProps {
  totalAmount: number;
  paidAmount: number;
  totalLabel?: string;
}

export function BillsSummaryBar({ totalAmount, paidAmount, totalLabel = 'Gjithsej faturat' }: BillsSummaryBarProps) {
  return (
    <View style={[styles.container, shadow]}>
      <View style={styles.half}>
        <Text style={styles.label}>{totalLabel}</Text>
        <Text style={[styles.value, styles.total]}>{formatPrice(totalAmount)}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.half}>
        <Text style={styles.label}>Shpenzuar</Text>
        <Text style={[styles.value, styles.paid]}>{formatPrice(paidAmount)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  half: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: 2, textAlign: 'center' },
  value: { fontSize: 22, fontWeight: '700' },
  total: { color: colors.primaryDark },
  paid: { color: colors.success },
});
