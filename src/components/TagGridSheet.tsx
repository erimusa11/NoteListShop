import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import type { TagOption } from '@/components/TagString';
import { colors, radii, spacing } from '@/theme/theme';

interface TagGridProps<T extends string> {
  options: TagOption<T>[];
  value: T;
  onSelect: (value: T) => void;
}

// The tabs as cards, two to a row, with the one in `value` highlighted.
export function TagGrid<T extends string>({ options, value, onSelect }: TagGridProps<T>) {
  const { height } = useWindowDimensions();

  return (
    <ScrollView style={{ maxHeight: height * 0.6 }} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
      {options.map((option) => {
        const selected = option.value === value;
        const { accent, remaining, total } = option;
        const meta = total === 0 ? '' : remaining > 0 ? `${remaining} nga ${total} mbeten` : `Të gjitha ${total} të blera`;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={meta ? `${option.label}, ${meta}` : option.label}
            style={[styles.card, selected && { borderColor: accent, backgroundColor: accent + '14' }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: accent + '22' }]}>
              <Ionicons name={selected ? option.activeIcon : option.icon} size={20} color={accent} />
            </View>
            <View style={styles.texts}>
              <Text style={styles.label} numberOfLines={2}>
                {option.label}
              </Text>
              {meta !== '' && <Text style={styles.meta}>{meta}</Text>}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

interface TagGridSheetProps<T extends string> extends TagGridProps<T> {
  visible: boolean;
  onClose: () => void;
}

// All the tabs at once, for jumping straight to one without swiping through the strip.
export function TagGridSheet<T extends string>({ visible, onClose, options, value, onSelect }: TagGridSheetProps<T>) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Kategoritë">
      <TagGrid options={options} value={value} onSelect={onSelect} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  card: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.sm + 2,
  },
  iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 1 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  meta: { fontSize: 11, color: colors.textMuted },
});
