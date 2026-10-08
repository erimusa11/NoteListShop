import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { InlineEditableField } from '@/components/InlineEditableField';
import { MoveItemSheet } from '@/components/MoveItemSheet';
import { PrioritySelector } from '@/components/PrioritySelector';
import { ms, spring, STAMP_MS, SUCK, TEAR } from '@/theme/motion';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { ItemListKey, ShoppingItem } from '@/types/models';
import { nextOption, optionMatcher, personColor } from '@/utils/options';
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
  /** Which category the item belongs to, shown above its name; for a list that mixes several categories. */
  tag?: { label: string; color: string };
  /** The category the item is in. With `onMove`, the row gets a button to move it to another category. */
  moveFrom?: ItemListKey;
  onMove?: (to: ItemListKey, group?: string) => void;
  /** The people an item of this category can be for (Drion, Alois): the row shows who it is for, and a tap switches it. */
  personOptions?: string[];
}

// Holding a row this long (a deliberate press, not a tap) asks whether to delete it. A thin red line fills along the
// bottom of the row while it is held, but only after a moment: a tap or the start of a swipe shows nothing.
const HOLD_TO_DELETE_MS = 1500;
const HOLD_SHOWS_AFTER_MS = 350;
const STAR_COLOR = '#D99100';
const CLAMP = Extrapolation.CLAMP;

export function ItemRow({
  item,
  onToggle,
  onUpdate,
  onRemove,
  onToggleStar,
  showQuantity = true,
  tag,
  moveFrom,
  onMove,
  personOptions,
}: ItemRowProps) {
  const reduced = useReducedMotion();
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // The pop-ups are only built once they are needed: a list has many rows and most of them are never
  // held or opened, so drawing and tearing them down for every row was slow.
  const [priorityUsed, setPriorityUsed] = useState(false);
  const [confirmUsed, setConfirmUsed] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveUsed, setMoveUsed] = useState(false);
  const starred = item.sharedId !== undefined;
  // The price is for one; the row costs price × quantity, shown only when that differs from the price.
  const lineTotal = showQuantity && item.price != null && parseQuantity(item.quantity) !== 1 ? itemTotal(item) : null;
  const priority = priorityInfo(item.priority);
  const urgent = normalizePriority(item.priority) > 1;
  // Who it is for gets its own color (the same as in the totals and reports); muted while it is not known.
  const personTone =
    personOptions && item.person ? personColor(optionMatcher(personOptions)(item.person)) : colors.textMuted;

  const stamp = useSharedValue(item.bought ? 1 : 0);
  const strike = useSharedValue(item.bought ? 1 : 0);
  const thud = useSharedValue(0);
  const ring = useSharedValue(1);
  const nameW = useSharedValue(0);
  const editing = useSharedValue(0);

  // 0 → 1 while the row is held, so it turns red until the confirmation asks to delete it.
  const hold = useSharedValue(0);
  const kind = useSharedValue(0);
  const fly = useSharedValue(0);
  const windup = useSharedValue(0);
  const collapse = useSharedValue(0);
  const fullH = useSharedValue(0);
  const cardW = useSharedValue(320);

  const dismissingRef = useRef(false);
  // What runs once the row has flown away: the delete, or the move to another category.
  const afterRef = useRef<() => void>(() => {});
  const finish = useCallback(() => afterRef.current(), []);

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

  const dismiss = (kindArg: 'tear' | 'suck', then: () => void) => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    if (reduced) {
      then();
      return;
    }
    afterRef.current = then;
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
    const shrink = k === 1 ? Math.max(0.001, 1 - f) : 1;
    return {
      opacity: interpolate(f, [0, 0.8, 1], [1, 1, 0]),
      transform: [
        { translateX: k === 0 ? -f * cardW.value : 0 },
        { rotate: `${k === 0 ? 8 * f : -8 * f}deg` },
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

  const holdStyle = useAnimatedStyle(() => ({ width: `${hold.value * 100}%` }));

  // Press and hold anywhere on the row (also on its texts, price and star) to be asked whether to delete it.
  const holdToDelete = Gesture.LongPress()
    .minDuration(HOLD_TO_DELETE_MS)
    .maxDistance(12)
    .runOnJS(true)
    .onBegin(() => {
      hold.set(
        withDelay(
          HOLD_SHOWS_AFTER_MS,
          withTiming(1, { duration: HOLD_TO_DELETE_MS - HOLD_SHOWS_AFTER_MS, easing: Easing.linear }),
        ),
      );
    })
    .onStart(() => {
      setConfirmUsed(true);
      setConfirmOpen(true);
    })
    .onFinalize(() => {
      hold.set(withTiming(0, { duration: 150 }));
    });

  return (
    <Animated.View
      style={[styles.slot, slotStyle]}
      onLayout={(e) => {
        if (dismissingRef.current) return;
        fullH.value = e.nativeEvent.layout.height;
        cardW.value = e.nativeEvent.layout.width;
      }}
    >
      <GestureDetector gesture={holdToDelete}>
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
            {tag && (
              <Text style={[styles.tag, { color: tag.color }]} numberOfLines={1}>
                {tag.label}
              </Text>
            )}
            {/* With a note (what it was for), the note is the big title and the name (e.g. the car) is the small text. */}
            <View
              style={styles.nameWrap}
              onLayout={(e) => {
                nameW.value = e.nativeEvent.layout.width;
              }}
            >
              {item.note ? (
                <InlineEditableField
                  value={item.note}
                  placeholder="Përshkrimi"
                  onChange={(note) => onUpdate({ note: note.trim() })}
                  onEditingChange={(e) => {
                    editing.value = e ? 1 : 0;
                  }}
                  textStyle={[styles.name, item.bought && styles.nameBought]}
                />
              ) : (
                <InlineEditableField
                  value={item.name}
                  placeholder="Emri i artikullit"
                  onChange={(name) => onUpdate({ name })}
                  onEditingChange={(e) => {
                    editing.value = e ? 1 : 0;
                  }}
                  textStyle={[styles.name, item.bought && styles.nameBought]}
                />
              )}
              <Animated.View style={[styles.strike, strikeStyle]} pointerEvents="none" />
            </View>
            {item.note ? (
              <InlineEditableField
                value={item.name}
                placeholder="Emri i artikullit"
                onChange={(name) => onUpdate({ name })}
                textStyle={styles.note}
              />
            ) : null}
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
            <View style={styles.actions}>
              {personOptions && (
                <Pressable
                  onPress={() => onUpdate({ person: nextOption(personOptions, item.person) })}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={item.person ? `Për: ${item.person}. Ndrysho` : 'Zgjidh për kë është'}
                  style={styles.personTag}
                >
                  <Ionicons name="person" size={11} color={personTone} />
                  <Text style={[styles.personText, { color: personTone }]}>{item.person || 'Për kë?'}</Text>
                </Pressable>
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
              {moveFrom && onMove && (
                <Pressable
                  onPress={() => {
                    setMoveUsed(true);
                    setMoveOpen(true);
                  }}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Kalo në kategori tjetër"
                  style={styles.moveButton}
                >
                  <Ionicons name="swap-horizontal" size={14} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
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
          <View style={styles.holdTrack} pointerEvents="none">
            <Animated.View style={[styles.holdLine, holdStyle]} />
          </View>
        </Animated.View>
      </GestureDetector>
      {confirmUsed && (
        <ConfirmDialog
          visible={confirmOpen}
          title="Fshi artikullin?"
          message={`A je i sigurt që do të fshish "${item.name}"?`}
          details={starred ? ['Do të fshihet edhe nga listat e tjera, përveç atyre ku është shënuar (✓).'] : []}
          confirmLabel="Fshi"
          onConfirm={() => {
            setConfirmOpen(false);
            dismiss('tear', onRemove);
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
      {moveUsed && moveFrom && onMove && (
        <MoveItemSheet
          visible={moveOpen}
          onClose={() => setMoveOpen(false)}
          current={moveFrom}
          itemName={item.name}
          starred={starred}
          onPick={(to, group) => {
            setMoveOpen(false);
            // Staying in the same category (only its group changes), the row stays: nothing to fly away.
            if (to === moveFrom) onMove(to, group);
            else dismiss('suck', () => onMove(to, group));
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardOrigin: { transformOrigin: 'right center' },
  holdTrack: { position: 'absolute', left: radii.md, right: radii.md, bottom: 0, height: 3 },
  holdLine: { height: 3, borderRadius: 2, backgroundColor: colors.danger },
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
  tag: { fontSize: 11, fontWeight: '700', paddingHorizontal: spacing.xs },
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
  note: { fontSize: 13, color: colors.textMuted },
  quantityRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  lineTotal: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  // Wraps: on a narrow phone a long importance label plus the move button is wider than the column, and the button
  // would stick out over the price.
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.sm, marginTop: 2 },
  priorityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  personTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  personText: { fontSize: 11, fontWeight: '700' },
  moveButton: {
    borderRadius: radii.pill,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  priorityText: { fontSize: 11, fontWeight: '700' },
  right: { alignItems: 'flex-end', gap: spacing.md - 4 },
  price: { fontSize: 15, fontWeight: '600', color: colors.primaryDark },
  priceBought: { color: colors.success },
  starButton: { padding: 2 },
});
