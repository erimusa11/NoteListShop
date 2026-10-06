import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { OptionTotal } from '@/utils/options';
import { formatPrice } from '@/utils/totals';

interface OptionTotalsBarProps {
  options: OptionTotal[];
  /** The group the list below is narrowed to, or null while every item is shown. */
  selected: string | null;
  /** Tapping a group shows only its items; tapping the selected one again shows everything. */
  onSelect: (name: string | null) => void;
}

// What each choice of a category (Naftë, Gaz, Benzinë; Drioni, Aloisi…) adds up to, under the category total.
// Each one is also a filter for the list below it. More than three wrap onto a second row.
export function OptionTotalsBar({ options, selected, onSelect }: OptionTotalsBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.container, shadow]}>
        {options.map((option) => {
          const active = option.name === selected;
          return (
            <Pressable
              key={option.name}
              onPress={() => onSelect(active ? null : option.name)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${option.name}, ${formatPrice(option.total)}`}
              accessibilityHint={active ? 'Shfaq të gjitha' : 'Shfaq vetëm këtë'}
              style={[styles.cell, active && { backgroundColor: option.color + '22' }]}
            >
              <View style={styles.labelRow}>
                <View style={[styles.dot, { backgroundColor: option.color }]} />
                <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                  {option.name}
                </Text>
              </View>
              <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
                {formatPrice(option.total)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selected !== null && (
        <Pressable
          onPress={() => onSelect(null)}
          accessibilityRole="button"
          accessibilityLabel="Hiq filtrin"
          hitSlop={8}
          style={styles.filterPill}
        >
          <Text style={styles.filterText}>Vetëm: {selected}</Text>
          <Ionicons name="close-circle" size={16} color={colors.primaryDark} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md, gap: spacing.sm },
  // The hairline gaps between the cells show this background, which makes the dividers.
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  cell: {
    flexGrow: 1,
    flexBasis: '32%',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  dot: { width: 8, height: 8, borderRadius: radii.pill },
  label: { fontSize: 12, color: colors.textMuted },
  labelActive: { color: colors.text, fontWeight: '700' },
  value: { fontSize: 15, fontWeight: '700', color: colors.text },
  filterPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingLeft: spacing.sm + 4,
    paddingRight: spacing.sm,
  },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
});
