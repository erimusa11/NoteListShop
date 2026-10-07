import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { TagGrid } from '@/components/TagGridSheet';
import type { TagOption } from '@/components/TagString';
import { colors, radii, spacing } from '@/theme/theme';
import type { ItemListKey } from '@/types/models';
import { CATEGORIES, type Category } from '@/utils/categories';
import { itemOption, optionColor, optionTargets } from '@/utils/options';

// Every category as a card (no counts: this is only for choosing where an item goes).
const OPTIONS: TagOption<ItemListKey>[] = CATEGORIES.map((category) => ({
  value: category.key,
  label: category.label,
  tabLabel: category.tabLabel,
  icon: category.icon,
  activeIcon: category.activeIcon,
  accent: category.color,
  remaining: 0,
  total: 0,
}));

interface MoveItemSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The category the item is in now, shown as selected. */
  current: ItemListKey;
  /** The item's name, to tell which group of its category (Drion, Naftë…) it is in now. */
  itemName: string;
  /** The item is starred, so its copies in the other lists move with it. */
  starred: boolean;
  /** `group` is set when the category has groups (Drion, Naftë…) and one was picked. */
  onPick: (to: ItemListKey, group?: string) => void;
}

// Two steps in one sheet: pick the category; if it has groups (Karburant, Shendeti & Vizita…), pick the group too.
// Picking the category the item is already in opens its groups, to move the item from one to another.
export function MoveItemSheet({ visible, onClose, current, itemName, starred, onPick }: MoveItemSheetProps) {
  const [target, setTarget] = useState<Category | null>(null);
  const currentCategory = CATEGORIES.find((category) => category.key === current);
  const currentGroup = currentCategory ? itemOption(currentCategory, itemName) : null;

  const close = () => {
    setTarget(null);
    onClose();
  };
  const finish = (to: ItemListKey, group?: string) => {
    setTarget(null);
    onPick(to, group);
  };

  const pickCategory = (key: ItemListKey) => {
    const category = CATEGORIES.find((c) => c.key === key);
    if (!category) return;
    if (optionTargets(category).length > 0) setTarget(category);
    else if (key === current) close();
    else finish(key);
  };

  const scope = starred
    ? 'Ky artikull ka yll: kalon bashkë me të gjitha kopjet e tij në listat e tjera, edhe ato të shënuara (✓).'
    : 'Vetëm ky artikull kalon në kategorinë që zgjedh.';

  return (
    <BottomSheet visible={visible} onClose={close} title={target ? target.label : 'Kalo në kategori tjetër'}>
      {target ? (
        <>
          <Pressable onPress={() => setTarget(null)} hitSlop={8} accessibilityRole="button" style={styles.back}>
            <Ionicons name="chevron-back" size={16} color={colors.primaryDark} />
            <Text style={styles.backText}>Kategoritë</Text>
          </Pressable>
          <Text style={styles.label}>{target.optionsLabel ?? 'Lloji'}</Text>
          <View style={styles.options} accessibilityRole="radiogroup">
            {optionTargets(target).map((group, index) => {
              const selected = target.key === current && group === currentGroup;
              return (
                <Pressable
                  key={group}
                  onPress={() => (selected ? close() : finish(target.key, group))}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <View style={[styles.dot, { backgroundColor: optionColor(index) }]} />
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{group}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>Ajo që ishte emri i artikullit mbetet si përshkrim. {scope}</Text>
        </>
      ) : (
        <>
          <Text style={styles.hint}>{scope}</Text>
          <TagGrid options={OPTIONS} value={current} onSelect={pickCategory} />
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: colors.textMuted, marginVertical: spacing.sm },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: spacing.sm },
  backText: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs },
  // Each choice is as wide as its name, and the row wraps when they do not all fit, as when adding an item.
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    flexGrow: 1,
    flexBasis: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dot: { width: 8, height: 8, borderRadius: 4 },
  optionText: { fontSize: 15, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
  optionTextSelected: { color: colors.primaryDark, fontWeight: '700' },
});
