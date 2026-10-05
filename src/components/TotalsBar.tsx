import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadow, spacing } from '@/theme/theme';
import { formatPrice } from '@/utils/totals';

interface TotalsBarProps {
  incomeTotal: number;
  spentTotal: number;
  onPressIncome?: () => void;
}

export function TotalsBar({ incomeTotal, spentTotal, onPressIncome }: TotalsBarProps) {
  return (
    <View style={[styles.container, shadow]}>
      <Pressable
        onPress={onPressIncome}
        disabled={!onPressIncome}
        accessibilityRole={onPressIncome ? 'button' : undefined}
        accessibilityLabel={`Të ardhurat, ${formatPrice(incomeTotal)}`}
        style={styles.half}
      >
        <Text style={styles.label}>Të ardhurat</Text>
        <Text style={[styles.value, styles.income]}>{formatPrice(incomeTotal)}</Text>
      </Pressable>
      <View style={styles.divider} />
      <View style={styles.half}>
        <Text style={styles.label}>Shpenzuar</Text>
        <Text style={[styles.value, styles.spent]}>{formatPrice(spentTotal)}</Text>
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
  income: { color: colors.primaryDark },
  spent: { color: colors.success },
});
