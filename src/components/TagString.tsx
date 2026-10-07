import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { dealIn, ms, spring } from '@/theme/motion';
import { colors, shadow, spacing } from '@/theme/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface TagOption<T extends string> {
  value: T;
  label: string;
  /** Label for the tab itself with its own line break, when the automatic split at " & " does not fit. */
  tabLabel?: string;
  icon: IconName;
  activeIcon: IconName;
  accent: string;
  remaining: number;
  total: number;
}

const GAP = 6;
// More tabs than this and the strip scrolls sideways, showing whole tabs plus half of the next, so it is clear there is more.
const SCROLL_FROM = 5;
const TARGET_SLOT_W = 80;
const SCROLL_PAD = 6;
// Room below the tags so the selected tag's shadow is not cut off by the scroll area.
const SHADOW_ROOM = 14;
const ROW_H = 88;
const TAG_H = 64;
const REST_Y = 12;
const DROP = 7;
const PIVOT_Y = 5;
const G = ROW_H - PIVOT_Y;
const TWINE = '#D9C3AE';
const THREAD = '#CDB5A0';
const LABEL_IDLE = '#6F645C';
const TAG_RADII = {
  borderTopLeftRadius: 14,
  borderTopRightRadius: 14,
  borderBottomLeftRadius: 8,
  borderBottomRightRadius: 8,
} as const;

interface TagProps<T extends string> {
  option: TagOption<T>;
  index: number;
  selIdx: number;
  active: boolean;
  onPress: () => void;
  fs: number;
  iconSize: number;
  reduced: boolean;
  /** Fixed width when the strip scrolls; otherwise the tags share the row equally. */
  slotWidth?: number;
}

function Tag<T extends string>({
  option,
  index,
  selIdx,
  active,
  onPress,
  fs,
  iconSize,
  reduced,
  slotWidth,
}: TagProps<T>) {
  const { label, tabLabel, icon, activeIcon, accent, remaining, total } = option;
  const ratio = total ? (total - remaining) / total : 0;

  const sel = useSharedValue(active ? 1 : 0);
  const swing = useSharedValue(0);
  const press = useSharedValue(0);
  const hover = useSharedValue(0);
  const pop = useSharedValue(0);
  const rail = useSharedValue(ratio);
  const prevIdx = useRef(selIdx);
  const firstPop = useRef(true);
  const [focused, setFocused] = useState(false);
  const entering = useMemo(() => dealIn(index), [index]);

  useEffect(() => {
    sel.value = reduced ? (active ? 1 : 0) : withSpring(active ? 1 : 0, spring({ damping: 15, stiffness: 400, mass: 0.7 }));
    if (reduced) {
      prevIdx.current = selIdx;
      return;
    }
    if (prevIdx.current !== selIdx) {
      const d = Math.sign(selIdx - prevIdx.current) || 1;
      const dist = Math.abs(index - selIdx);
      const amp = 6 / (1 + 1.2 * dist);
      cancelAnimation(swing);
      swing.value = withDelay(
        ms(dist * 20),
        withSequence(withTiming(d * amp, { duration: ms(45) }), withSpring(0, spring({ damping: 8, stiffness: 220, mass: 0.6 }))),
      );
      prevIdx.current = selIdx;
    }
  }, [selIdx, reduced]);

  useEffect(() => {
    if (firstPop.current) {
      firstPop.current = false;
      return;
    }
    if (reduced) return;
    pop.value = withSequence(withTiming(1, { duration: ms(55) }), withSpring(0, spring({ damping: 8, stiffness: 440 })));
  }, [remaining]);

  useEffect(() => {
    rail.value = reduced ? ratio : withTiming(ratio, { duration: ms(160) });
  }, [ratio, reduced]);

  const groupStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -G / 2 }, { rotate: `${swing.value}deg` }, { translateY: G / 2 }],
  }));

  const tagStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: DROP * sel.value - 2 * hover.value + 2 * press.value },
      { scale: interpolate(sel.value, [0, 1], [1, 1.04]) * (1 - 0.06 * press.value) },
      { scaleX: 1 + 0.02 * press.value },
      { scaleY: 1 - 0.04 * press.value },
    ],
  }));

  const liftStyle = useAnimatedStyle(() => ({ opacity: Math.min(sel.value, 1) }));
  const outlineIconStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(sel.value, 1) }));
  const filledIconStyle = useAnimatedStyle(() => ({
    opacity: Math.min(sel.value, 1),
    transform: [{ scale: interpolate(sel.value, [0, 1], [1, 1.2]) }],
  }));
  const railStyle = useAnimatedStyle(() => ({ width: `${rail.value * 100}%` }));
  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.35 * pop.value }, { rotate: `${-8 * pop.value}deg` }],
  }));

  const a11yLabel = total === 0 ? `${label}, bosh` : `${label}, ${remaining} nga ${total} mbeten`;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      aria-selected={active}
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      onPressIn={() => {
        if (!reduced) press.value = withSpring(1, spring({ damping: 14, stiffness: 420 }));
      }}
      onPressOut={() => {
        if (!reduced) press.value = withSpring(0, spring({ damping: 7, stiffness: 300 }));
      }}
      onHoverIn={() => {
        if (!reduced) hover.value = withSpring(1, spring({ damping: 14, stiffness: 300 }));
      }}
      onHoverOut={() => {
        if (!reduced) hover.value = withSpring(0, spring({ damping: 14, stiffness: 300 }));
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.slot,
        // flexBasis too: a basis of 0 (from flex: 1) would otherwise win over the width on the web.
        slotWidth ? { flexGrow: 0, flexShrink: 0, flexBasis: slotWidth, width: slotWidth } : null,
        { zIndex: active ? 2 : 1 },
        reduced && pressed && styles.reducedPressed,
      ]}
    >
      <Animated.View
        entering={entering}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Animated.View style={[styles.group, { zIndex: active ? 2 : 1 }, groupStyle]} pointerEvents="none">
          <View style={[styles.pin, { backgroundColor: active ? accent : THREAD }]} />
          <View style={styles.thread} />
          <Animated.View style={[styles.tag, shadow, tagStyle]}>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                TAG_RADII,
                {
                  backgroundColor: colors.card,
                  shadowColor: accent,
                  shadowOpacity: 0.25,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 6,
                },
                liftStyle,
              ]}
            />
            <View style={[StyleSheet.absoluteFill, TAG_RADII, styles.clip]}>
              <Animated.View
                style={[StyleSheet.absoluteFill, { backgroundColor: accent + '1F' }, liftStyle]}
              />
              <View style={[styles.railTrack, { backgroundColor: accent + '33' }]} />
              <Animated.View style={[styles.railFill, { backgroundColor: accent }, railStyle]} />
            </View>
            <Animated.View
              style={[StyleSheet.absoluteFill, TAG_RADII, styles.activeBorder, { borderColor: accent }, liftStyle]}
            />
            <View style={styles.content}>
              <View style={[styles.hole, { borderColor: active ? accent : TWINE }]} />
              <View style={[styles.iconBox, { width: iconSize, height: iconSize }]}>
                <Animated.View style={[styles.iconLayer, outlineIconStyle]}>
                  <Ionicons name={icon} size={iconSize} color={accent} />
                </Animated.View>
                <Animated.View style={[styles.iconLayer, filledIconStyle]}>
                  <Ionicons name={activeIcon} size={iconSize} color={accent} />
                </Animated.View>
              </View>
              <View style={styles.labelBlock}>
                <Text
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.15}
                  // A long word ("rëndësishmet", "Guzhine") that is wider than the tab shrinks a little instead of being cut.
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={[styles.label, { fontSize: fs, color: active ? colors.text : LABEL_IDLE }]}
                >
                  {tabLabel ?? label.replace(' & ', '\n& ')}
                </Text>
              </View>
            </View>
            {total > 0 && (
              <Animated.View
                style={[
                  styles.chip,
                  remaining > 0
                    ? { backgroundColor: colors.card, borderWidth: active ? 2 : 1.5, borderColor: accent }
                    : { backgroundColor: accent },
                  chipStyle,
                ]}
              >
                {remaining > 0 ? (
                  <Text style={styles.chipText}>{remaining}</Text>
                ) : (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                )}
              </Animated.View>
            )}
            {focused && <View style={[styles.focusRing, { borderColor: accent }]} />}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export function TagString<T extends string>({
  options,
  value,
  onChange,
}: {
  options: TagOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const reduced = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const [rowW, setRowW] = useState(0);
  const selIdx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const many = options.length > 4;
  const scrolls = options.length > SCROLL_FROM;
  const gap = many ? 4 : GAP;
  const wide = rowW >= 440;
  const fs = rowW > 0 && rowW < 300 ? 9 : scrolls ? 10 : wide ? 12 : many ? 10 : 11;
  const iconSize = scrolls ? 18 : wide ? 22 : many ? 16 : 18;
  const wholeTabs = Math.max(3, Math.floor(rowW / TARGET_SLOT_W));
  const slotW = !scrolls ? 0 : rowW > 0 ? (rowW - SCROLL_PAD - wholeTabs * gap) / (wholeTabs + 0.5) : TARGET_SLOT_W;
  const contentW = SCROLL_PAD * 2 + options.length * slotW + (options.length - 1) * gap;

  // Keep the open tab in the middle of the strip, also when it was picked from somewhere else.
  useEffect(() => {
    if (!scrolls || rowW === 0) return;
    const center = SCROLL_PAD + selIdx * (slotW + gap) + slotW / 2;
    const centered = Math.min(Math.max(0, center - rowW / 2), Math.max(0, contentW - rowW));
    // Less than half a tab from the start: stay at the start, so the first tab is not left half hidden when a list opens
    // (the open tab is on screen from there anyway).
    const x = centered < slotW / 2 ? 0 : centered;
    scrollRef.current?.scrollTo({ x, animated: !reduced });
  }, [selIdx, scrolls, rowW, slotW, gap, contentW, reduced]);

  const tags = options.map((option, i) => (
    <Tag
      key={option.value}
      option={option}
      index={i}
      selIdx={selIdx}
      active={i === selIdx}
      onPress={() => onChange(option.value)}
      fs={fs}
      iconSize={iconSize}
      reduced={reduced}
      slotWidth={scrolls ? slotW : undefined}
    />
  ));

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.root, many && { columnGap: 4 }]}
      onLayout={(e) => setRowW(e.nativeEvent.layout.width)}
    >
      {scrolls ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { columnGap: gap, paddingHorizontal: SCROLL_PAD }]}
        >
          <View style={styles.twine} pointerEvents="none">
            <View style={[styles.knot, { left: -3 }]} />
            <View style={[styles.knot, { right: -3 }]} />
          </View>
          {tags}
        </ScrollView>
      ) : (
        <>
          <View style={styles.twine} pointerEvents="none">
            <View style={[styles.knot, { left: -3 }]} />
            <View style={[styles.knot, { right: -3 }]} />
          </View>
          {tags}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    height: ROW_H,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    columnGap: GAP,
  },
  twine: { position: 'absolute', top: 4, left: 0, right: 0, height: 2, borderRadius: 1, backgroundColor: TWINE },
  knot: { position: 'absolute', top: -2, width: 6, height: 6, borderRadius: 3, backgroundColor: TWINE },
  slot: { flex: 1, height: ROW_H },
  scroll: { flex: 1, height: ROW_H + SHADOW_ROOM },
  scrollContent: { height: ROW_H + SHADOW_ROOM },
  reducedPressed: { opacity: 0.85 },
  group: { position: 'absolute', top: PIVOT_Y, left: 1, right: 1, height: G },
  pin: { position: 'absolute', top: -3, alignSelf: 'center', width: 6, height: 6, borderRadius: 3, zIndex: 3 },
  thread: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 1.5,
    height: REST_Y - PIVOT_Y + DROP,
    backgroundColor: THREAD,
    zIndex: 0,
  },
  tag: {
    position: 'absolute',
    top: REST_Y - PIVOT_Y,
    left: 0,
    right: 0,
    height: TAG_H,
    zIndex: 1,
    backgroundColor: colors.card,
    ...TAG_RADII,
  },
  clip: { overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  railTrack: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 },
  railFill: { position: 'absolute', bottom: 0, left: 0, height: 3 },
  activeBorder: { borderWidth: 2 },
  content: { ...StyleSheet.absoluteFill, alignItems: 'center' },
  hole: {
    position: 'absolute',
    top: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.background,
    borderWidth: 1.5,
  },
  iconBox: { position: 'absolute', top: 14 },
  iconLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  labelBlock: { position: 'absolute', top: 35, left: 0, right: 0, paddingHorizontal: 3, height: 26, justifyContent: 'center' },
  label: { textAlign: 'center', lineHeight: 13, fontWeight: '700' },
  chip: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 10.5, fontWeight: '800', color: colors.text },
  focusRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 14,
    borderWidth: 2,
  },
});
