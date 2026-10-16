import { StyleSheet, Text, View } from 'react-native';

import { usePrivacy } from '@/context/PrivacyContext';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import { formatPrice } from '@/utils/totals';

interface BillsSummaryBarProps {
  totalAmount: number;
  paidAmount: number;
  totalLabel?: string;
  /** What is left of the total after the spending; shown on its own line under the two numbers, only when above zero. */
  remainingAmount?: number;
  /** Shows the amounts even in private mode: for the tabs of a category, where only the totals of the whole list are private. */
  alwaysShow?: boolean;
}

export function BillsSummaryBar({
  totalAmount,
  paidAmount,
  totalLabel = 'Gjithsej faturat',
  remainingAmount,
  alwaysShow = false,
}: BillsSummaryBarProps) {
  const { price: privatePrice } = usePrivacy();
  const price = alwaysShow ? formatPrice : privatePrice;
  return (
    <View style={[styles.container, shadow]}>
      <View style={styles.top}>
        <View style={styles.half}>
          <Text style={styles.label}>{totalLabel}</Text>
          <Text style={[styles.value, styles.total]}>{price(totalAmount)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.half}>
          <Text style={styles.label}>Shpenzuar</Text>
          <Text style={[styles.value, styles.paid]}>{price(paidAmount)}</Text>
        </View>
      </View>
      {remainingAmount !== undefined && remainingAmount > 0 && (
        <View style={styles.remaining}>
          <Text style={styles.remainingLabel}>Të ardhurat e mbetura</Text>
          <Text style={styles.remainingValue}>{price(remainingAmount)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  top: { flexDirection: 'row' },
  half: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: 2, textAlign: 'center' },
  value: { fontSize: 22, fontWeight: '700' },
  total: { color: colors.primaryDark },
  paid: { color: colors.success },
  remaining: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.successLight,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  remainingLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  remainingValue: { fontSize: 17, fontWeight: '700', color: colors.success },
});
