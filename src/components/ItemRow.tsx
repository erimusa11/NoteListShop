import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
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

import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { InlineEditableField } from '@/components/InlineEditableField';
import { PrioritySelector } from '@/components/PrioritySelector';
import { ms, spring, STAMP_MS, SUCK, TEAR } from '@/theme/motion';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { ShoppingItem } from '@/types/models';
import { normalizePriority, priorityInfo } from '@/utils/priority';
import { DEFAULT_QUANTITY, normalizeQuantity, parseQuantity, sanitizeQuantityInput } from '@/utils/quantity';
import { formatNumber, itemTotal } from '@/utils/totals';

interface ItemRowProps {
  item: ShoppingItem;
  onToggle: () => void;
  onUpdate: (patch: Partial<ShoppingItem>) => void;
  onRemove: () => void;
  /** Fills or empties the star; a starred item also shows up in the other lists and in new ones. */
  onToggleStar: () => void;
  showQuantity?: boolean;
}

// The delete panel is 104 wide. The row has to be pulled almost all the way, and `friction` makes the finger travel
// about twice as far as the row moves, so a light or accidental swipe does nothing.
const ARM_AT = 88;
const SWIPE_FRICTION = 2.2;
const SWIPE_START_OFFSET = 30;
const STAR_COLOR = '#D99100';
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
        armed.value = withSpring(isArmed ? 1 : 0, spring({ damping: 9, stiffness: 420 }));
        if (isArmed) {
          rattle.value = withSequence(
            withTiming(-14, { duration: ms(25) }),
            withRepeat(withTiming(14, { duration: ms(50) }), 4, true),
            withTiming(0, { duration: ms(25) }),
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

export function ItemRow({ item, onToggle, onUpdate, onRemove, onToggleStar, showQuantity = true }: ItemRowProps) {
  const reduced = useReducedMotion();
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // The delete panel and the two pop-ups are only built once they are needed: a list has many rows and
  // most of them are never swiped or opened, so drawing and tearing them down for every row was slow.
  const [swiped, setSwiped] = useState(false);
  const [priorityUsed, setPriorityUsed] = useState(false);
  const [confirmUsed, setConfirmUsed] = useState(false);
  const swipeRef = useRef<SwipeableMethods>(null);
  const starred = item.sharedId !== undefined;
  // The price is for one; the row costs price × quantity, shown only when that differs from the price.
  const lineTotal = showQuantity && item.price != null && parseQuantity(item.quantity) !== 1 ? itemTotal(item) : null;
  const priority = priorityInfo(item.priority);
  const urgent = normalizePriority(item.priority) > 1;

  const stamp = useSharedValue(item.bought ? 1 : 0);
  const strike = useSharedValue(item.bought ? 1 : 0);
  const thud = useSharedValue(0);
  const ring = useSharedValue(1);
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
            withTiming(1, { duration: ms(30) }),
            withSpring(0, spring({ damping: 10, stiffness: 420, mass: 0.5 })),
          );
          ring.value = 0;
          ring.value = withTiming(1, { duration: ms(240), easing: Easing.out(Easing.cubic) });
        }
      });
      strike.value = withDelay(ms(30), withTiming(1, { duration: ms(120), easing: Easing.out(Easing.cubic) }));
    } else {
      stamp.value = withTiming(0, { duration: ms(80), easing: Easing.out(Easing.quad) });
      strike.value = withTiming(0, { duration: ms(90) });
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
    <Animated.View
      style={[styles.slot, slotStyle]}
      onLayout={(e) => {
        if (dismissingRef.current) return;
        fullH.value = e.nativeEvent.layout.height;
        cardW.value = e.nativeEvent.layout.width;
      }}
    >
      <ReanimatedSwipeable
        ref={swipeRef}
        containerStyle={styles.swipeContainer}
        // Until the first drag an empty panel of the same size stands in, so the swipe measures the same width.
        renderRightActions={(_progress, translation) =>
          swiped ? (
            <DeleteAction translation={translation} swipe={swipe} armed={armed} />
          ) : (
            <View style={styles.deleteAction} />
          )
        }
        onSwipeableOpenStartDrag={() => setSwiped(true)}
        rightThreshold={ARM_AT}
        dragOffsetFromRightEdge={SWIPE_START_OFFSET}
        overshootRight={false}
        friction={SWIPE_FRICTION}
        onSwipeableOpen={() => {
          setConfirmUsed(true);
          setConfirmOpen(true);
        }}
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
              <View style={styles.quantityRow}>
                <InlineEditableField
                  value={String(item.quantity ?? '').trim() || DEFAULT_QUANTITY}
                  placeholder="Sasia"
                  prefix="Sasia: "
                  keyboardType="numeric"
                  sanitize={sanitizeQuantityInput}
                  onChange={(quantity) => onUpdate({ quantity: normalizeQuantity(quantity) })}
                  textStyle={styles.quantity}
                />
                {lineTotal != null && (
                  <Text style={[styles.lineTotal, item.bought && styles.priceBought]} numberOfLines={1}>
                    = {formatNumber(lineTotal)} Lekë
                  </Text>
                )}
              </View>
            )}
            {!item.bought && (
              <Pressable
                onPress={() => {
                  setPriorityUsed(true);
                  setPriorityOpen(true);
                }}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Rëndësia: ${priority.label}. Ndrysho`}
                style={[styles.priorityTag, urgent && { backgroundColor: priority.color + '22' }]}
              >
                <Ionicons name={urgent ? 'flag' : 'flag-outline'} size={13} color={priority.color} />
                {urgent && <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>}
              </Pressable>
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
            <Pressable
              onPress={onToggleStar}
              // No extra touch area above the star, so it never overlaps the price.
              hitSlop={{ top: 0, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityState={{ selected: starred }}
              accessibilityLabel={starred ? 'Ylli aktiv: shfaqet në të gjitha listat. Hiqe' : 'Shfaqe në të gjitha listat'}
              style={styles.starButton}
            >
              <Ionicons
                name={starred ? 'star' : 'star-outline'}
                size={20}
                color={starred ? STAR_COLOR : colors.textMuted}
              />
            </Pressable>
          </View>
        </Animated.View>
      </ReanimatedSwipeable>
      {confirmUsed && (
        <ConfirmDialog
          visible={confirmOpen}
          title="Fshi artikullin?"
          message={`A je i sigurt që do të fshish "${item.name}"?`}
          details={starred ? ['Do të fshihet vetëm nga kjo listë; në listat e tjera mbetet.'] : []}
          confirmLabel="Fshi"
          onConfirm={() => {
            setConfirmOpen(false);
            dismiss('tear');
          }}
          onCancel={() => {
            setConfirmOpen(false);
            swipeRef.current?.close();
          }}
        />
      )}
      {priorityUsed && (
        <BottomSheet visible={priorityOpen} onClose={() => setPriorityOpen(false)} title="Sa e rëndësishme është?">
          <PrioritySelector
            value={item.priority}
            onChange={(level) => {
              onUpdate({ priority: level });
              setPriorityOpen(false);
            }}
          />
        </BottomSheet>
      )}
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
  quantityRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  lineTotal: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  priorityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: radii.pill,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  priorityText: { fontSize: 11, fontWeight: '700' },
  right: { alignItems: 'flex-end', gap: spacing.md - 4 },
  price: { fontSize: 15, fontWeight: '600', color: colors.primaryDark },
  priceBought: { color: colors.success },
  starButton: { padding: 2 },
});
