import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ms } from '@/theme/motion';
import { colors } from '@/theme/theme';
import { formatCompact } from '@/utils/reports';

export interface Column {
  key: string;
  /** Short text under the column; may hold a line break. */
  label: string;
  /** What a screen reader says for the column. */
  description: string;
  value: number;
}

interface ColumnChartProps {
  data: Column[];
  color: string;
  height?: number;
  onPressColumn?: (key: string) => void;
}

// The columns share the width, so twelve of them fit a phone without scrolling; fewer stay narrow on the left.
const SLOT_MAX_W = 56;
const BAR_MAX_W = 32;
const VALUE_H = 14;

export function ColumnChart({ data, color, height = 96, onPressColumn }: ColumnChartProps) {
  const reduced = useReducedMotion();
  const rise = useSharedValue(reduced ? 1 : 0);

  // One short fade for the whole chart instead of an animation per column.
  useEffect(() => {
    if (!reduced) rise.value = withTiming(1, { duration: ms(200), easing: Easing.out(Easing.cubic) });
  }, [reduced, rise]);

  const riseStyle = useAnimatedStyle(() => ({ opacity: rise.value, transform: [{ translateY: (1 - rise.value) * 8 }] }));

  const max = Math.max(...data.map((d) => d.value), 0);
  const barRoom = height - VALUE_H;

  return (
    <Animated.View style={[styles.row, riseStyle]}>
      {data.map((column) => {
        const barHeight = column.value > 0 && max > 0 ? Math.max(3, (column.value / max) * barRoom) : 0;
        return (
          <Pressable
            key={column.key}
            onPress={onPressColumn ? () => onPressColumn(column.key) : undefined}
            disabled={!onPressColumn}
            accessibilityRole={onPressColumn ? 'button' : undefined}
            accessibilityLabel={column.description}
            style={styles.slot}
          >
            <View style={[styles.plot, { height }]}>
              {column.value > 0 && (
                <Text style={styles.value} numberOfLines={1} maxFontSizeMultiplier={1}>
                  {formatCompact(column.value)}
                </Text>
              )}
              <View style={[styles.bar, { height: barHeight, backgroundColor: color }]} />
            </View>
            <Text style={styles.label} numberOfLines={2} maxFontSizeMultiplier={1}>
              {column.label}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  slot: { flex: 1, maxWidth: SLOT_MAX_W, alignItems: 'center' },
  plot: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  // Wider than the column so a long number is centered over it instead of being cut off.
  value: { width: SLOT_MAX_W, height: VALUE_H, fontSize: 9, fontWeight: '700', color: colors.text, textAlign: 'center' },
  bar: { width: '68%', maxWidth: BAR_MAX_W, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  label: { fontSize: 9, lineHeight: 11, color: colors.textMuted, textAlign: 'center', minHeight: 24, paddingTop: 3 },
});
