import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing } from '@/theme/theme';
import { normalizePriority, PRIORITY_LEVELS, priorityInfo } from '@/utils/priority';

interface PrioritySelectorProps {
  value: number | undefined;
  onChange: (level: number) => void;
}

export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  const current = normalizePriority(value);
  const info = priorityInfo(current);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {PRIORITY_LEVELS.map(({ level, label, color }) => {
          const selected = level === current;
          return (
            <Pressable
              key={level}
              onPress={() => onChange(level)}
              accessibilityRole="button"
              accessibilityLabel={`Rëndësia ${level}: ${label}`}
              accessibilityState={{ selected }}
              style={[
                styles.dot,
                { borderColor: color, backgroundColor: color + '14', height: 34 + level * 3 },
                selected && { backgroundColor: color },
              ]}
            >
              <Text style={[styles.dotText, { color: selected ? '#FFFFFF' : color }]}>{level}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.name, { color: info.color }]}>{info.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  dot: {
    flex: 1,
    borderRadius: radii.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { fontSize: 16, fontWeight: '800' },
  name: { fontSize: 13, fontWeight: '700' },
});
