import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { NoteItem } from '@/types/models';
import { formatQuantity } from '@/utils/noteLists';
import { formatNumber } from '@/utils/totals';

interface NoteItemRowProps {
  item: NoteItem;
  onToggle: (id: string) => void;
  /** Opens the item to change its name, amount or unit. */
  onPress: (item: NoteItem) => void;
  /** Asks to delete the item. */
  onDelete: (item: NoteItem) => void;
  /** In a list of products: the price is shown under the name. */
  showPrice?: boolean;
}

// One item of a group: the check, the name, the amount with its unit ("2 kg") and the trash. A tap on the row opens it.
export const NoteItemRow = memo(function NoteItemRow({ item, onToggle, onPress, onDelete, showPrice }: NoteItemRowProps) {
  return (
    // No button role on the row itself: on the web that makes a <button>, which cannot hold the check, a button of its own.
    <Pressable
      onPress={() => onPress(item)}
      accessibilityLabel={`${item.name}, ${formatQuantity(item.quantity, item.unit)}. Ndrysho`}
      style={({ pressed }) => [styles.card, shadow, pressed && styles.pressed]}
    >
      <Pressable
        onPress={() => onToggle(item.id)}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.done }}
        accessibilityLabel={item.done ? 'Hiqe shenjën e kryer' : 'Shëno si të kryer'}
        style={styles.check}
      >
        <Ionicons
          name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
          size={28}
          color={item.done ? colors.success : colors.primary}
        />
      </Pressable>
      <View style={styles.text}>
        <Text style={[styles.name, item.done && styles.nameDone]} numberOfLines={2}>
          {item.name}
        </Text>
        {showPrice && item.price != null && <Text style={styles.price}>{formatNumber(item.price)} Lekë</Text>}
      </View>
      <View style={[styles.quantity, item.done && styles.quantityDone]}>
        <Text style={[styles.quantityText, item.done && styles.quantityTextDone]} numberOfLines={1}>
          {formatQuantity(item.quantity, item.unit)}
        </Text>
      </View>
      <Pressable
        onPress={() => onDelete(item)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Fshi artikullin ${item.name}`}
        style={({ pressed }) => [styles.trash, pressed && styles.trashPressed]}
      >
        <Ionicons name="trash-outline" size={19} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  check: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  name: { fontSize: 16, lineHeight: 21, fontWeight: '600', color: colors.text },
  price: { fontSize: 13, fontWeight: '700', color: colors.primaryDark, marginTop: 2 },
  nameDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  quantity: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  quantityDone: { backgroundColor: colors.successLight },
  quantityText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  quantityTextDone: { color: colors.success },
  trash: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  trashPressed: { backgroundColor: '#FDE6E3' },
});
