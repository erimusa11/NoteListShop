import { StyleSheet, Text, View } from 'react-native';

import { InlineEditableField } from '@/components/InlineEditableField';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import { formatNumber, formatPrice } from '@/utils/totals';

interface TotalsBarProps {
  budget: number | null;
  spentTotal: number;
  onChangeBudget: (value: number | null) => void;
}

export function TotalsBar({ budget, spentTotal, onChangeBudget }: TotalsBarProps) {
  return (
    <View style={[styles.container, shadow]}>
      <View style={styles.half}>
        <Text style={styles.label}>Sa ke menduar të shpenzosh</Text>
        <InlineEditableField
          value={budget != null ? String(budget) : ''}
          displayValue={budget != null ? formatNumber(budget) : undefined}
          placeholder="Shto"
          onChange={(text) => {
            const parsed = parseFloat(text.replace(',', '.'));
            onChangeBudget(Number.isFinite(parsed) ? parsed : null);
          }}
          keyboardType="numeric"
          suffix={budget != null ? ' Lekë' : undefined}
          chip
          textStyle={[styles.value, styles.estimated]}
        />
      </View>
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
  estimated: { color: colors.primaryDark },
  spent: { color: colors.success },
});
