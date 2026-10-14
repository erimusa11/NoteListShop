import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/theme/theme';
import type { NoteSection } from '@/types/models';
import { NOTE_SECTIONS } from '@/utils/noteLists';

interface NoteSectionTabsProps {
  value: NoteSection;
  onChange: (section: NoteSection) => void;
  /** How many items of each part are still to do, shown as the number on its tab. */
  remaining: Record<NoteSection, number>;
}

// The two parts of a shopping list (Ushqime, Detergjente) as tabs above its items.
export function NoteSectionTabs({ value, onChange, remaining }: NoteSectionTabsProps) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {NOTE_SECTIONS.map((section) => {
        const selected = section.value === value;
        const left = remaining[section.value];
        return (
          <Pressable
            key={section.value}
            onPress={() => onChange(section.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={left > 0 ? `${section.label}, ${left} mbeten` : section.label}
            style={[styles.tab, selected && styles.tabSelected]}
          >
            <Ionicons
              name={section.icon}
              size={18}
              color={selected ? colors.primaryDark : colors.textMuted}
            />
            <Text style={[styles.label, selected && styles.labelSelected]}>{section.label}</Text>
            {left > 0 && (
              <View style={[styles.badge, selected && styles.badgeSelected]}>
                <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>{left}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tabSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  label: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  labelSelected: { color: colors.primaryDark, fontWeight: '800' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  badgeSelected: { backgroundColor: colors.primary },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  badgeTextSelected: { color: '#FFFFFF' },
});
