import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadow, spacing } from '@/theme/theme';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive, active && shadow]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm - 2,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: colors.card },
  label: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  labelActive: { color: colors.primaryDark },
});
