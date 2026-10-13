import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { spring } from '@/theme/motion';
import { colors, radii, shadow, spacing } from '@/theme/theme';

interface TabOption<T extends string> {
  value: T;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}

interface BottomTabBarProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

const PADDING = 6;

// With more tabs than this the icon goes above the name, which may then take two lines ("Kopesht &\nShkolle").
const STACK_FROM = 4;

export function BottomTabBar<T extends string>({ options, value, onChange }: BottomTabBarProps<T>) {
  const reduced = useReducedMotion();
  const stacked = options.length >= STACK_FROM;
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const x = useSharedValue(index);
  const segW = useSharedValue(0);

  useEffect(() => {
    x.value = reduced ? index : withSpring(index, spring({ damping: 18, stiffness: 380, mass: 0.7 }));
  }, [index, reduced, x]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: segW.value > 0 ? 1 : 0,
    width: segW.value,
    transform: [{ translateX: x.value * segW.value }],
  }));

  return (
    <View style={styles.outer}>
      <View
        style={[styles.bar, shadow]}
        onLayout={(e) => {
          segW.value = (e.nativeEvent.layout.width - PADDING * 2) / options.length;
        }}
      >
        <Animated.View style={[styles.pill, pillStyle]} pointerEvents="none" />
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              aria-selected={active}
              accessibilityLabel={option.label.replace('\n', ' ')}
              style={[styles.tab, stacked && styles.tabStacked]}
            >
              <Ionicons
                name={active ? option.activeIcon : option.icon}
                size={stacked ? 20 : 22}
                color={active ? colors.primaryDark : colors.textMuted}
              />
              <Animated.Text
                numberOfLines={stacked ? 2 : 1}
                style={[styles.label, stacked && styles.labelStacked, active && styles.labelActive]}
              >
                {option.label}
              </Animated.Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, paddingTop: spacing.xs },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    padding: PADDING,
  },
  pill: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.pill,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm - 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
  },
  tabStacked: { flexDirection: 'column', gap: 1, paddingVertical: spacing.xs + 2, paddingHorizontal: 2 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  labelStacked: { fontSize: 11, lineHeight: 13, textAlign: 'center' },
  labelActive: { color: colors.primaryDark },
});
