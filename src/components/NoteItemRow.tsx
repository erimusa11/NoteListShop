import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { HOLD_ITEM_TO_DELETE_MS, useHoldToDelete } from '@/hooks/useHoldToDelete';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { NoteItem } from '@/types/models';
import { formatQuantity } from '@/utils/noteLists';
import { normalizePriority, priorityInfo } from '@/utils/priority';
import { formatNumber } from '@/utils/totals';

interface NoteItemRowProps {
  item: NoteItem;
  onToggle: (id: string) => void;
  /** Opens the item to change its name, amount or unit. */
  onPress: (item: NoteItem) => void;
  /** The row was held long enough to ask to delete the item. */
  onDelete: (item: NoteItem) => void;
  /** In a shopping list: the amount with its unit and the price are shown. In a normal list the item is a text with a priority. */
  shopping?: boolean;
  /**
   * The newest list of Note Shop List, where checked items are sent. An item shows the tag "Dërguar te lista" only when its copy
   * went to this one, the same test the send button and its sheet use.
   */
  latestTripId?: string;
}

// One item of a group: the check and the name; holding the row asks to delete it. A shopping list also shows the amount with its unit ("2 kg") and the
// price; a normal list shows the priority (the stripe on the left and the flag). A tap on the row opens it.
export const NoteItemRow = memo(function NoteItemRow({
  item,
  onToggle,
  onPress,
  onDelete,
  shopping,
  latestTripId,
}: NoteItemRowProps) {
  const level = priorityInfo(item.importance);
  const { holdStyle, begin, end } = useHoldToDelete(HOLD_ITEM_TO_DELETE_MS);
  return (
    // No button role on the row itself: on the web that makes a <button>, which cannot hold the check, a button of its own.
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={() => onDelete(item)}
      delayLongPress={HOLD_ITEM_TO_DELETE_MS}
      onPressIn={begin}
      onPressOut={end}
      accessibilityLabel={`${item.name}, ${shopping ? formatQuantity(item.quantity, item.unit) : level.label}. Ndrysho`}
      accessibilityHint="Mbaje të shtypur për ta fshirë"
      style={({ pressed }) => [
        styles.card,
        shadow,
        !shopping && { borderLeftWidth: 4, borderLeftColor: item.done ? colors.border : level.color },
        pressed && styles.pressed,
      ]}
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
          color={item.done ? colors.success : shopping ? colors.primary : level.color}
        />
      </Pressable>
      <View style={styles.text}>
        <Text style={[styles.name, item.done && styles.nameDone]} numberOfLines={2}>
          {item.name}
        </Text>
        {shopping && item.price != null && <Text style={styles.price}>{formatNumber(item.price)} Lekë</Text>}
        {shopping && item.sentTo !== undefined && item.sentTo === latestTripId && (
          <View style={styles.sent}>
            <Ionicons name="paper-plane" size={11} color={colors.success} />
            <Text style={styles.sentText}>Dërguar te lista</Text>
          </View>
        )}
      </View>
      {shopping ? (
        <View style={[styles.quantity, item.done && styles.quantityDone]}>
          <Text style={[styles.quantityText, item.done && styles.quantityTextDone]} numberOfLines={1}>
            {formatQuantity(item.quantity, item.unit)}
          </Text>
        </View>
      ) : (
        !item.done && (
          <View style={[styles.badge, { backgroundColor: level.color + '22' }]}>
            <Ionicons name="flag" size={12} color={level.color} />
            <Text style={[styles.badgeText, { color: level.color }]}>{normalizePriority(item.importance)}</Text>
          </View>
        )
      )}
      <View style={styles.holdTrack}>
        <Animated.View style={[styles.holdLine, holdStyle]} />
      </View>
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
  sent: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  sentText: { fontSize: 12, fontWeight: '600', color: colors.success },
  quantity: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  quantityDone: { backgroundColor: colors.successLight },
  quantityText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  quantityTextDone: { color: colors.success },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '800' },
  holdTrack: { pointerEvents: 'none', position: 'absolute', left: radii.md, right: radii.md, bottom: 0, height: 3 },
  holdLine: { height: 3, borderRadius: 2, backgroundColor: colors.danger },
});
