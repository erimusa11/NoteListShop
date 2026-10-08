import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InlineEditableField } from '@/components/InlineEditableField';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { IncomeEntry } from '@/types/models';
import { incomeKindInfo, nextIncomeKind } from '@/utils/incomes';
import { formatNumber } from '@/utils/totals';

interface IncomeRowProps {
  income: IncomeEntry;
  onUpdate: (patch: Partial<IncomeEntry>) => void;
  onRemove: () => void;
}

export function IncomeRow({ income, onUpdate, onRemove }: IncomeRowProps) {
  const kind = incomeKindInfo(income);
  return (
    <View style={styles.wrapper}>
      <View style={[styles.card, shadow]}>
        <View style={styles.iconCircle}>
          <Ionicons name="arrow-down" size={18} color={colors.success} />
        </View>
        <View style={styles.middle}>
          <InlineEditableField
            value={income.name}
            placeholder="Emri i të ardhurës"
            onChange={(name) => {
              const trimmed = name.trim();
              if (trimmed) onUpdate({ name: trimmed });
            }}
            textStyle={styles.name}
          />
          <Pressable
            onPress={() => onUpdate({ kind: nextIncomeKind(income) })}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Lloji: ${kind.label}. Ndrysho`}
            style={[styles.kindTag, { backgroundColor: kind.color + '22' }]}
          >
            <Text style={[styles.kindText, { color: kind.color }]}>{kind.label}</Text>
          </Pressable>
        </View>
        <InlineEditableField
          value={String(income.amount)}
          displayValue={formatNumber(income.amount)}
          placeholder="Shuma"
          onChange={(text) => {
            const parsed = parseFloat(text.replace(',', '.'));
            if (Number.isFinite(parsed) && parsed > 0) onUpdate({ amount: parsed });
          }}
          keyboardType="numeric"
          suffix=" Lekë"
          align="right"
          chip
          textStyle={styles.amount}
        />
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Fshi ${income.name}`}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, gap: 2 },
  kindTag: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingVertical: 2, paddingHorizontal: 8 },
  kindText: { fontSize: 11, fontWeight: '700' },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  amount: { fontSize: 15, fontWeight: '700', color: colors.success },
  deleteButton: { padding: 2 },
});
