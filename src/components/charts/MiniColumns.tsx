import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { ms } from '@/theme/motion';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import { formatPrice } from '@/utils/totals';

export interface MiniColumn {
  key: string;
  label: string;
  value: number;
  over: boolean;
}

interface MiniColumnsProps {
  data: MiniColumn[];
  onPressColumn: (key: string) => void;
}

const PLOT_H = 48;

function Bar({
  column,
  index,
  max,
  onPress,
}: {
  column: MiniColumn;
  index: number;
  max: number;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const target = max > 0 ? column.value / max : 0;
  const grow = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (!reduced) {
      grow.value = 0;
      grow.value = withDelay(ms(index * 25), withTiming(1, { duration: ms(330), easing: Easing.out(Easing.cubic) }));
    }
  }, [target, index, reduced, grow]);

  const barStyle = useAnimatedStyle(() => ({ height: Math.max(3, target * PLOT_H * grow.value) }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${column.label}, ${formatPrice(column.value)} shpenzuar`}
      style={styles.slot}
    >
      <Animated.View
        style={[styles.bar, { backgroundColor: column.over ? colors.danger : colors.primary }, barStyle]}
      />
    </Pressable>
  );
}

export function MiniColumns({ data, onPressColumn }: MiniColumnsProps) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <View style={[styles.card, shadow]}>
      <View style={styles.header}>
        <Text style={styles.title}>{data.length === 1 ? 'Lista e fundit' : `${data.length} listat e fundit`}</Text>
        <Text style={styles.total}>{formatPrice(total)}</Text>
      </View>
      <View style={styles.plot}>
        {data.map((column, index) => (
          <Bar
            key={column.key}
            column={column}
            index={index}
            max={max}
            onPress={() => onPressColumn(column.key)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm + 2,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  total: { fontSize: 13, fontWeight: '700', color: colors.text },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: PLOT_H,
    gap: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  slot: { flex: 1, maxWidth: 28, height: PLOT_H, justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
});
