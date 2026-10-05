import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import { colors, spacing } from '@/theme/theme';

export interface PieSlice {
  key: string;
  value: number;
  color: string;
}

interface PieChartProps {
  slices: PieSlice[];
  size?: number;
  showLabels?: boolean;
}

function polar(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

export function PieChart({ slices, size = 180, showLabels = true }: PieChartProps) {
  const reduced = useReducedMotion();
  const enter = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (!reduced) enter.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.back(1.4)) });
  }, [reduced, enter]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.75 + 0.25 * enter.value }, { rotate: `${(1 - enter.value) * -40}deg` }],
  }));

  const visible = slices.filter((s) => s.value > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);
  const r = size / 2 - 2;
  const c = size / 2;

  const sweeps = visible.map((s) => (s.value / total) * Math.PI * 2);
  const paths = visible.map((slice, i) => {
    const sweep = sweeps[i];
    const start = -Math.PI / 2 + sweeps.slice(0, i).reduce((sum, v) => sum + v, 0);
    const end = start + sweep;
    const a = polar(c, c, r, start);
    const b = polar(c, c, r, end);
    const mid = polar(c, c, r * 0.62, start + sweep / 2);
    const d = `M ${c} ${c} L ${a.x} ${a.y} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${b.x} ${b.y} Z`;
    return { slice, d, mid, percent: Math.round((slice.value / total) * 100), full: visible.length === 1 };
  });

  return (
    <Animated.View style={[styles.wrap, style]}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {total === 0 && <Circle cx={c} cy={c} r={r} fill={colors.border} />}
          {paths.map(({ slice, d, full }) =>
            full ? (
              <Circle key={slice.key} cx={c} cy={c} r={r} fill={slice.color} />
            ) : (
              <Path key={slice.key} d={d} fill={slice.color} stroke={colors.card} strokeWidth={2} />
            ),
          )}
          {paths.map(({ slice, mid, percent }) =>
            showLabels && percent >= 8 ? (
              <SvgText
                key={`${slice.key}-t`}
                x={mid.x}
                y={mid.y + 4}
                fontSize={13}
                fontWeight="700"
                fill="#FFFFFF"
                textAnchor="middle"
              >
                {`${percent}%`}
              </SvgText>
            ) : null,
          )}
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xs },
});
