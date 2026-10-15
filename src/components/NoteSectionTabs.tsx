import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { partTones, tones } from '@/theme/noteTones';
import { colors, radii, spacing } from '@/theme/theme';
import type { NoteSection } from '@/types/models';
import { NOTE_SECTIONS } from '@/utils/noteLists';

/** The two parts of a shopping list, or the part with everything that was checked. */
export type NoteTab = NoteSection | 'done';

interface NoteSectionTabsProps {
  value: NoteTab;
  onChange: (tab: NoteTab) => void;
  /** How many items of each part are still to do, shown as the number on its tab. */
  remaining: Record<NoteSection, number>;
}

/** The icon of a part: an apple for Ushqime, a t-shirt for the laundry detergents (Ionicons has none). */
export function SectionIcon({ section, size, color }: { section: NoteSection; size: number; color: string }) {
  return section === 'detergjente' ? (
    <MaterialCommunityIcons name="tshirt-crew-outline" size={size} color={color} />
  ) : (
    <Ionicons name="nutrition-outline" size={size} color={color} />
  );
}

// The two parts of a shopping list (Ushqime, Detergjente) as tabs above its items.
export function NoteSectionTabs({ value, onChange, remaining }: NoteSectionTabsProps) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {NOTE_SECTIONS.map((section) => {
        const selected = section.value === value;
        const left = remaining[section.value];
        const tone = partTones[section.value];
        return (
          <Pressable
            key={section.value}
            onPress={() => onChange(section.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={left > 0 ? `${section.label}, ${left} mbeten` : section.label}
            style={[styles.tab, selected && { backgroundColor: tone.light, borderColor: tone.main }]}
          >
            <SectionIcon section={section.value} size={17} color={selected ? tone.dark : tone.main} />
            <Text style={[styles.label, selected && [styles.labelSelected, { color: tone.dark }]]}>{section.label}</Text>
            {left > 0 && (
              <View style={[styles.badge, selected && { backgroundColor: tone.main }]}>
                <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>{left}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => onChange('done')}
        accessibilityRole="tab"
        accessibilityState={{ selected: value === 'done' }}
        accessibilityLabel="Të kryerat"
        style={[styles.tab, styles.tabDone, value === 'done' && { backgroundColor: tones.orange.light, borderColor: tones.orange.main }]}
      >
        <Ionicons name="checkmark-done" size={20} color={value === 'done' ? tones.orange.dark : colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: spacing.md },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tabDone: { flex: 0.7 },
  label: { fontSize: 13, flexShrink: 1, fontWeight: '600', color: colors.textMuted },
  labelSelected: { fontWeight: '800' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  badgeTextSelected: { color: '#FFFFFF' },
});
