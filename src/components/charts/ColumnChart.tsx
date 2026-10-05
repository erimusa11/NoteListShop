import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, spacing } from '@/theme/theme';
import { formatCompact } from '@/utils/reports';

export interface Column {
  key: string;
  label: string;
  value: number;
  color: string;
  marker?: number | null;
  warning?: boolean;
}

interface ColumnChartProps {
  data: Column[];
  height?: number;
  onPressColumn?: (key: string) => void;
}

const COLUMN_WIDTH = 64;
const BAR_WIDTH = 30;

function ColumnItem({
  column,
  index,
  max,
  height,
  onPress,
}: {
  column: Column;
  index: number;
  max: number;
  height: number;
  onPress?: () => void;
}) {
  const reduced = useReducedMotion();
  const target = max > 0 ? column.value / max : 0;
  const grow = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (!reduced) {
      grow.value = 0;
      grow.value = withDelay(index * 70, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
    }
  }, [target, index, reduced, grow]);

  const barStyle = useAnimatedStyle(() => ({ height: Math.max(target > 0 ? 3 : 0, target * height * grow.value) }));
  const markerBottom = column.marker != null && max > 0 ? (column.marker / max) * height : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${column.label}: ${formatCompact(column.value)}`}
      style={styles.column}
    >
      <View style={styles.valueRow}>
        {column.warning ? <Ionicons name="warning" size={12} color={colors.danger} /> : null}
        <Text style={styles.value}>{formatCompact(column.value)}</Text>
      </View>
      <View style={[styles.plot, { height }]}>
        {markerBottom != null && <View style={[styles.marker, { bottom: markerBottom }]} />}
        <Animated.View style={[styles.bar, { backgroundColor: column.color }, barStyle]} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {column.label}
      </Text>
    </Pressable>
  );
}

export function ColumnChart({ data, height = 150, onPressColumn }: ColumnChartProps) {
  const max = Math.max(...data.map((d) => Math.max(d.value, d.marker ?? 0)), 0);
  const hasMarker = data.some((d) => d.marker != null);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.row}>
          {data.map((column, index) => (
            <ColumnItem
              key={column.key}
              column={column}
              index={index}
              max={max}
              height={height}
              onPress={onPressColumn ? () => onPressColumn(column.key) : undefined}
            />
          ))}
        </View>
      </ScrollView>
      {hasMarker && (
        <View style={styles.legend}>
          <View style={styles.legendTick} />
          <Text style={styles.legendText}>Të ardhurat e listës</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  row: { flexDirection: 'row', flexGrow: 1, justifyContent: 'space-around' },
  column: { width: COLUMN_WIDTH, alignItems: 'center', gap: 6 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 16 },
  value: { fontSize: 12, fontWeight: '700', color: colors.text },
  plot: {
    width: COLUMN_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bar: { width: BAR_WIDTH, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  marker: { position: 'absolute', width: BAR_WIDTH + 14, height: 2, backgroundColor: colors.textMuted, borderRadius: radii.pill },
  label: { fontSize: 11, color: colors.textMuted, textAlign: 'center', minHeight: 28, paddingTop: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginTop: spacing.sm },
  legendTick: { width: 16, height: 2, backgroundColor: colors.textMuted, borderRadius: radii.pill },
  legendText: { fontSize: 12, color: colors.textMuted },
});
