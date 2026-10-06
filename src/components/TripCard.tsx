import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { ms, spring } from '@/theme/motion';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { ShoppingTrip } from '@/types/models';
import { formatDateTimeAlbanian } from '@/utils/dates';
import { computeSpentTotal, formatPrice, tripAllItems, tripIncomeTotal } from '@/utils/totals';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TripCardProps {
  trip: ShoppingTrip;
  onPress: () => void;
  index?: number;
}

export function TripCard({ trip, onPress, index = 0 }: TripCardProps) {
  const reduced = useReducedMotion();
  const allItems = tripAllItems(trip);
  const spentTotal = computeSpentTotal(allItems);
  const boughtCount = allItems.filter((item) => item.bought).length;
  const income = tripIncomeTotal(trip);
  const hasBudget = income > 0;
  const progress = hasBudget ? Math.min(1, spentTotal / income) : 0;
  const overBudget = hasBudget && spentTotal > income;

  const enter = useSharedValue(reduced ? 1 : 0);
  const pressed = useSharedValue(0);
  const fill = useSharedValue(0);

  useEffect(() => {
    if (!reduced) enter.value = withDelay(ms(Math.min(index, 4) * 25), withSpring(1, spring({ damping: 16, stiffness: 280 })));
  }, [index, reduced, enter]);

  useEffect(() => {
    fill.value = reduced
      ? progress
      : withDelay(ms(120 + Math.min(index, 4) * 25), withSpring(progress, spring({ damping: 20, stiffness: 170 })));
  }, [progress]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (1 - enter.value) * 14 },
      { scale: 0.97 + 0.03 * enter.value - 0.03 * pressed.value },
      { rotate: `${0.25 * pressed.value}deg` },
    ],
  }));

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }) as any);

  return (
    <View style={styles.wrap}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          pressed.value = withSpring(1, spring({ damping: 18, stiffness: 500 }));
        }}
        onPressOut={() => {
          pressed.value = withSpring(0, spring({ damping: 9, stiffness: 320, mass: 0.7 }));
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
              {boughtCount}/{allItems.length} artikuj të blerë
            </Text>
            <Text style={styles.created}>Krijuar më {formatDateTimeAlbanian(trip.createdAt)}</Text>
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
              {formatPrice(spentTotal)} / {formatPrice(income)}
            </Text>
          </View>
        ) : (
          <Text style={styles.spentOnly}>{formatPrice(spentTotal)} shpenzuar</Text>
        )}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm, width: '100%', alignSelf: 'stretch' },
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
  created: { fontSize: 11, color: colors.textMuted, marginTop: 1, opacity: 0.8 },
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
