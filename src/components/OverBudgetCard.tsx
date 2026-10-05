import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/theme/theme';
import { formatPrice } from '@/utils/totals';

interface OverBudgetCardProps {
  amount: number;
}

export function OverBudgetCard({ amount }: OverBudgetCardProps) {
  return (
    <View style={styles.card} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={22} color={colors.danger} />
      <View style={styles.text}>
        <Text style={styles.label}>Ke tejkaluar të ardhurat</Text>
        <Text style={styles.amount}>{formatPrice(amount)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FDECEA',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#F5C2BD',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
  },
  text: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: { fontSize: 13, fontWeight: '600', color: colors.danger },
  amount: { fontSize: 17, fontWeight: '800', color: colors.danger },
});
