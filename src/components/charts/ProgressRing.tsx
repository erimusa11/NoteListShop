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

import { colors } from '@/theme/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  ratio: number;
  size?: number;
  thickness?: number;
}

export function ProgressRing({ ratio, size = 96, thickness = 12 }: ProgressRingProps) {
  const reduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, ratio));
  const p = useSharedValue(reduced ? clamped : 0);

  useEffect(() => {
    p.value = reduced ? clamped : withTiming(clamped, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [clamped, reduced, p]);

  const r = (size - thickness) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * r;

  const animatedProps = useAnimatedProps(() => ({ strokeDasharray: [circumference * p.value, circumference] }) as any);
  const done = clamped >= 1;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={r} stroke={colors.border} strokeWidth={thickness} fill="none" />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={r}
          stroke={done ? colors.success : colors.primary}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.value}>{Math.round(clamped * 100)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 20, fontWeight: '700', color: colors.text },
});
