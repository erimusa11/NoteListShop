import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { ShoppingTrip } from '@/types/models';
import { computeSpentTotal, formatPrice } from '@/utils/totals';

interface TripCardProps {
  trip: ShoppingTrip;
  onPress: () => void;
}

export function TripCard({ trip, onPress }: TripCardProps) {
  const spentTotal = computeSpentTotal(trip.items);
  const boughtCount = trip.items.filter((item) => item.bought).length;
  const hasBudget = trip.budget != null && trip.budget > 0;
  const progress = hasBudget ? Math.min(1, spentTotal / (trip.budget as number)) : 0;
  const overBudget = hasBudget && spentTotal > (trip.budget as number);

  return (
    <Pressable onPress={onPress} style={[styles.card, shadow]}>
      <View style={styles.topRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="cart-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {trip.name}
          </Text>
          <Text style={styles.meta}>
            {boughtCount}/{trip.items.length} artikuj të blerë
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>

      {hasBudget ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: overBudget ? colors.danger : colors.primary },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {formatPrice(spentTotal)} / {formatPrice(trip.budget as number)}
          </Text>
        </View>
      ) : (
        <Text style={styles.spentOnly}>{formatPrice(spentTotal)} shpenzuar</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  progressBlock: { gap: 4 },
  progressTrack: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radii.pill },
  progressLabel: { fontSize: 12, color: colors.textMuted, textAlign: 'right' },
  spentOnly: { fontSize: 13, color: colors.textMuted },
});
