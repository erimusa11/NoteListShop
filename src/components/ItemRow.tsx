import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { InlineEditableField } from '@/components/InlineEditableField';
import { makeSlap, STAMP_MS, SUCK, TEAR } from '@/theme/motion';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { ShoppingItem } from '@/types/models';
import { formatNumber } from '@/utils/totals';

interface ItemRowProps {
  item: ShoppingItem;
  onToggle: () => void;
  onUpdate: (patch: Partial<ShoppingItem>) => void;
  onRemove: () => void;
  showQuantity?: boolean;
}

const ARM_AT = 72;
const CLAMP = Extrapolation.CLAMP;

function DeleteAction({
  translation,
  swipe,
  armed,
}: {
  translation: SharedValue<number>;
  swipe: SharedValue<number>;
  armed: SharedValue<number>;
}) {
  const rattle = useSharedValue(0);

  useAnimatedReaction(
    () => Math.min(1, Math.max(0, -translation.value / ARM_AT)),
    (v) => {
      swipe.value = v;
    },
  );

  useAnimatedReaction(
    () => translation.value <= -ARM_AT,
    (isArmed, prev) => {
      if (isArmed !== prev) {
        armed.value = withSpring(isArmed ? 1 : 0, { damping: 7, stiffness: 300 });
        if (isArmed) {
          rattle.value = withSequence(
            withTiming(-14, { duration: 40 }),
            withRepeat(withTiming(14, { duration: 80 }), 4, true),
            withTiming(0, { duration: 40 }),
          );
        }
      }
    },
  );

  const stripStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(swipe.value, [0, 0.7, 1], ['#F8CFCA', colors.danger, colors.danger]),
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(swipe.value, [0, 0.4, 1], [0, 0.6, 1], CLAMP),
    transform: [{ scale: 0.6 + 0.7 * armed.value }, { rotate: `${rattle.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.deleteAction, stripStyle]}>
      <View style={styles.perforation} pointerEvents="none">
        {[0, 1, 2, 3, 4].map((n) => (
          <View key={n} style={styles.perfDot} />
        ))}
      </View>
      <Animated.View style={iconStyle}>
        <Ionicons name="trash" size={24} color="#FFFFFF" />
      </Animated.View>
    </Animated.View>
  );
}

export function ItemRow({ item, onToggle, onUpdate, onRemove, showQuantity = true }: ItemRowProps) {
  const reduced = useReducedMotion();

  const stamp = useSharedValue(item.bought ? 1 : 0);
  const strike = useSharedValue(item.bought ? 1 : 0);
  const thud = useSharedValue(0);
  const ring = useSharedValue(1);
  const slap = useMemo(() => makeSlap(), []);
  const nameW = useSharedValue(0);
  const editing = useSharedValue(0);

  const swipe = useSharedValue(0);
  const armed = useSharedValue(0);
  const kind = useSharedValue(0);
  const fly = useSharedValue(0);
  const windup = useSharedValue(0);
  const collapse = useSharedValue(0);
  const fullH = useSharedValue(0);
  const cardW = useSharedValue(320);

  const dismissingRef = useRef(false);
  const onRemoveRef = useRef(onRemove);
  useEffect(() => {
    onRemoveRef.current = onRemove;
  }, [onRemove]);
  const finish = useCallback(() => onRemoveRef.current(), []);

  const shown = useRef(item.bought);
  const play = (bought: boolean) => {
    if (shown.current === bought) return;
    shown.current = bought;
    if (reduced) {
      stamp.value = bought ? 1 : 0;
      strike.value = bought ? 1 : 0;
      return;
    }
    if (bought) {
      stamp.value = withTiming(1, { duration: STAMP_MS, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) {
          thud.value = withSequence(
            withTiming(1, { duration: 40 }),
            withSpring(0, { damping: 10, stiffness: 420, mass: 0.5 }),
          );
          ring.value = 0;
          ring.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
        }
      });
      strike.value = withDelay(50, withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }));
    } else {
      stamp.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.quad) });
      strike.value = withTiming(0, { duration: 140 });
    }
  };

  useEffect(() => {
    play(item.bought);
  }, [item.bought]);

  const handleToggle = () => {
    if (dismissingRef.current) return;
    play(!item.bought);
    onToggle();
  };

  const dismiss = (kindArg: 'tear' | 'suck') => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    if (reduced) {
      onRemoveRef.current();
      return;
    }
    const isSuck = kindArg === 'suck';
    kind.value = isSuck ? 1 : 0;
    const T = isSuck ? SUCK : TEAR;
    if (isSuck) {
      windup.value = withSequence(withTiming(1, { duration: SUCK.windup }), withTiming(0, { duration: 0 }));
    }
    fly.value = withDelay(
      isSuck ? SUCK.windup : 0,
      withTiming(1, {
        duration: T.fly,
        easing: isSuck ? Easing.in(Easing.back(1.4)) : Easing.in(Easing.cubic),
      }),
    );
    collapse.value = withDelay(
      T.collapseDelay,
      withTiming(1, { duration: T.collapse, easing: Easing.inOut(Easing.quad) }, (done) => {
        if (done) scheduleOnRN(finish);
      }),
    );
  };

  const slotStyle = useAnimatedStyle(() =>
    collapse.value === 0
      ? {}
      : {
          height: fullH.value * (1 - collapse.value),
          opacity: interpolate(collapse.value, [0, 0.5, 1], [1, 1, 0]),
          overflow: 'hidden',
        },
  );

  const cardStyle = useAnimatedStyle(() => {
    const k = kind.value;
    const f = fly.value;
    const tilt = 2 * swipe.value;
    const shrink = k === 1 ? Math.max(0.001, 1 - f) : 1;
    return {
      opacity: interpolate(f, [0, 0.8, 1], [1, 1, 0]),
      transform: [
        { translateX: k === 0 ? -f * cardW.value : 0 },
        { rotate: `${k === 0 ? tilt + 8 * f : -8 * f}deg` },
        { scaleX: (1 + 0.012 * thud.value - 0.03 * windup.value) * shrink },
        { scaleY: (1 - 0.035 * thud.value + 0.06 * windup.value) * shrink },
        { translateY: 1.5 * thud.value },
      ],
    };
  });

  const outlineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stamp.value, [0.6, 1], [1, 0], CLAMP),
  }));

  const stampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stamp.value, [0, 0.4, 1], [0, 1, 1], CLAMP),
    transform: [
      { scale: interpolate(stamp.value, [0, 1], [2.4, 1]) },
      { rotate: `${interpolate(stamp.value, [0, 1], [-24, 0]) + thud.value * 3}deg` },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 1], [0.45, 0], CLAMP),
    transform: [{ scale: interpolate(ring.value, [0, 1], [1, 1.9]) }],
  }));

  const strikeStyle = useAnimatedStyle(() => ({
    width: Math.max(0, nameW.value - 8) * strike.value,
    opacity: strike.value > 0 && editing.value === 0 ? 1 : 0,
  }));

  return (
    <Animated.View entering={slap}>
      <Animated.View
        style={[styles.slot, slotStyle]}
        onLayout={(e) => {
          if (dismissingRef.current) return;
          fullH.value = e.nativeEvent.layout.height;
          cardW.value = e.nativeEvent.layout.width;
        }}
      >
        <ReanimatedSwipeable
          containerStyle={styles.swipeContainer}
          renderRightActions={(_progress, translation) => (
            <DeleteAction translation={translation} swipe={swipe} armed={armed} />
          )}
          rightThreshold={ARM_AT}
          overshootRight={false}
          friction={1.5}
          onSwipeableWillOpen={() => dismiss('tear')}
          onSwipeableOpen={() => dismiss('tear')}
        >
          <Animated.View style={[styles.card, shadow, styles.cardOrigin, cardStyle]}>
            <Pressable onPress={handleToggle} hitSlop={8} style={styles.checkbox}>
              <Animated.View style={outlineStyle}>
                <Ionicons name="ellipse-outline" size={28} color={colors.primary} />
              </Animated.View>
              <Animated.View style={[styles.layer, stampStyle]} pointerEvents="none">
                <Ionicons name="checkmark-circle" size={28} color={colors.success} />
              </Animated.View>
              <View style={styles.layer} pointerEvents="none">
                <Animated.View style={[styles.ring, ringStyle]} />
              </View>
            </Pressable>

            <View style={styles.middle}>
              <View
                style={styles.nameWrap}
                onLayout={(e) => {
                  nameW.value = e.nativeEvent.layout.width;
                }}
              >
                <InlineEditableField
                  value={item.name}
                  placeholder="Emri i artikullit"
                  onChange={(name) => onUpdate({ name })}
                  onEditingChange={(e) => {
                    editing.value = e ? 1 : 0;
                  }}
                  textStyle={[styles.name, item.bought && styles.nameBought]}
                />
                <Animated.View style={[styles.strike, strikeStyle]} pointerEvents="none" />
              </View>
              {showQuantity && (
                <InlineEditableField
                  value={item.quantity}
                  placeholder="Sasia"
                  onChange={(quantity) => onUpdate({ quantity })}
                  textStyle={styles.quantity}
                />
              )}
            </View>

            <View style={styles.right}>
              <InlineEditableField
                value={item.price != null ? String(item.price) : ''}
                displayValue={item.price != null ? formatNumber(item.price) : undefined}
                placeholder="Çmimi"
                onChange={(text) => {
                  const parsed = parseFloat(text.replace(',', '.'));
                  onUpdate({ price: Number.isFinite(parsed) ? parsed : null });
                }}
                keyboardType="numeric"
                suffix=" Lekë"
                align="right"
                chip
                textStyle={[styles.price, item.bought && styles.priceBought]}
              />
              <Pressable onPress={() => dismiss('suck')} hitSlop={8} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          </Animated.View>
        </ReanimatedSwipeable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: { paddingBottom: spacing.sm },
  swipeContainer: { overflow: 'visible' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardOrigin: { transformOrigin: 'right center' },
  deleteAction: {
    width: 96,
    marginLeft: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  perforation: {
    position: 'absolute',
    left: 6,
    top: 0,
    bottom: 0,
    justifyContent: 'space-evenly',
  },
  perfDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF', opacity: 0.7 },
  checkbox: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.success,
  },
  middle: { flex: 1, gap: 2 },
  nameWrap: { alignSelf: 'flex-start', maxWidth: '100%' },
  strike: {
    position: 'absolute',
    left: spacing.xs,
    top: '50%',
    marginTop: -1,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.textMuted,
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  nameBought: { color: colors.textMuted },
  quantity: { fontSize: 13, color: colors.textMuted },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  price: { fontSize: 15, fontWeight: '600', color: colors.primaryDark },
  priceBought: { color: colors.success },
  deleteButton: { padding: 2 },
});
