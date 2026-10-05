import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { dealIn } from '@/theme/motion';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { ShoppingTrip } from '@/types/models';
import { computeSpentTotal, formatPrice } from '@/utils/totals';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TripCardProps {
  trip: ShoppingTrip;
  onPress: () => void;
  index?: number;
}

export function TripCard({ trip, onPress, index = 0 }: TripCardProps) {
  const reduced = useReducedMotion();
  const spentTotal = computeSpentTotal(trip.items);
  const boughtCount = trip.items.filter((item) => item.bought).length;
  const hasBudget = trip.budget != null && trip.budget > 0;
  const progress = hasBudget ? Math.min(1, spentTotal / (trip.budget as number)) : 0;
  const overBudget = hasBudget && spentTotal > (trip.budget as number);

  const entering = useMemo(() => dealIn(index), [index]);
  const pressed = useSharedValue(0);
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = reduced
      ? progress
      : withDelay(220 + Math.min(index, 6) * 45, withSpring(progress, { damping: 18, stiffness: 90 }));
  }, [progress]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.03 * pressed.value }, { rotate: `${0.25 * pressed.value}deg` }],
  }));

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }) as any);

  return (
    <Animated.View entering={entering} style={styles.wrap}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          pressed.value = withSpring(1, { damping: 18, stiffness: 500 });
        }}
        onPressOut={() => {
          pressed.value = withSpring(0, { damping: 9, stiffness: 320, mass: 0.7 });
        }}
        style={[styles.card, shadow, pressStyle]}
      >
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
              <Animated.View
                style={[styles.progressFill, { backgroundColor: overBudget ? colors.danger : colors.primary }, fillStyle]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {formatPrice(spentTotal)} / {formatPrice(trip.budget as number)}
            </Text>
          </View>
        ) : (
          <Text style={styles.spentOnly}>{formatPrice(spentTotal)} shpenzuar</Text>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
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
