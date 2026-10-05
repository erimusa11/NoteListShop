import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, spacing } from '@/theme/theme';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  subtitle?: string;
}

export function EmptyState({
  icon = 'cart-outline',
  title = 'Lista juaj është bosh',
  subtitle = 'Shtoni artikullin e parë më poshtë!',
}: EmptyStateProps) {
  const reduced = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    bob.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    return () => cancelAnimation(bob);
  }, [reduced]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { rotate: `${interpolate(bob.value, [-7, 0], [2.5, -2.5])}deg` }],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(bob.value, [-7, 0], [0.5, 1]),
    transform: [{ scaleX: interpolate(bob.value, [-7, 0], [0.7, 1]) }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.shadowEllipse, shadowStyle]} />
        <Animated.View style={[styles.iconCircle, circleStyle]}>
          <Ionicons name={icon} size={40} color={colors.primary} />
        </Animated.View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingTop: spacing.xl },
  iconWrap: { width: 80, height: 96, alignItems: 'center' },
  shadowEllipse: {
    position: 'absolute',
    bottom: 0,
    width: 44,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(35,31,32,0.12)',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted },
});
