import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors, spacing } from '@/theme/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
  size?: number;
  thickness?: number;
}

const GAP = 3;

function Arc({
  p,
  start,
  length,
  circumference,
  r,
  stroke,
  thickness,
  center,
}: {
  p: { value: number };
  start: number;
  length: number;
  circumference: number;
  r: number;
  stroke: string;
  thickness: number;
  center: number;
}) {
  const animatedProps = useAnimatedProps(() => {
    const visible = Math.max(0, length * p.value - GAP);
    return {
      strokeDasharray: [visible, circumference],
      strokeDashoffset: -(start * p.value),
    } as any;
  });

  return (
    <AnimatedCircle
      cx={center}
      cy={center}
      r={r}
      stroke={stroke}
      strokeWidth={thickness}
      fill="none"
      animatedProps={animatedProps}
      transform={`rotate(-90 ${center} ${center})`}
    />
  );
}

export function DonutChart({ segments, centerLabel, centerValue, size = 168, thickness = 22 }: DonutChartProps) {
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (!reduced) p.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [reduced, p]);

  const r = (size - thickness) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * r;
  const visibleSegments = segments.filter((s) => s.value > 0);
  const total = visibleSegments.reduce((sum, s) => sum + s.value, 0);

  const lengths = visibleSegments.map((s) => (s.value / total) * circumference);
  const arcs = visibleSegments.map((segment, i) => ({
    segment,
    start: lengths.slice(0, i).reduce((sum, v) => sum + v, 0),
    length: lengths[i],
  }));

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={center} cy={center} r={r} stroke={colors.border} strokeWidth={thickness} fill="none" />
          {arcs.map(({ segment, start, length }) => (
            <Arc
              key={segment.key}
              p={p}
              start={start}
              length={length}
              circumference={circumference}
              r={r}
              stroke={segment.color}
              thickness={thickness}
              center={center}
            />
          ))}
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.centerValue}>{centerValue}</Text>
          <Text style={styles.centerLabel}>{centerLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xs },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  centerValue: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  centerLabel: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
