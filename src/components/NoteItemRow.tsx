import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { HOLD_ITEM_TO_DELETE_MS, useHoldToDelete } from '@/hooks/useHoldToDelete';
import { doneTone, partTones, toneShadow, tones } from '@/theme/noteTones';
import { colors, radii, spacing } from '@/theme/theme';
import type { NoteItem } from '@/types/models';
import { daysUntilRepeat, formatQuantity, sectionOf } from '@/utils/noteLists';
import { sentManyText, timesSent } from '@/utils/noteSend';
import { normalizePriority, priorityInfo } from '@/utils/priority';
import { formatNumber } from '@/utils/totals';

// A card sits on the sheet of its list: green for a normal list, orange for a shopping list.
const SHADOW_NOTES = toneShadow(tones.green);
const SHADOW_SHOPPING = toneShadow(tones.orange);

interface NoteItemRowProps {
  item: NoteItem;
  onToggle: (id: string) => void;
  /** Opens the item to change its name, amount or unit. */
  onPress: (item: NoteItem) => void;
  /** The row was held long enough to ask to delete the item. */
  onDelete: (item: NoteItem) => void;
  /** In a shopping list: a checked item has a double tick that moves it to the checked ones without sending it. */
  onFinish?: (item: NoteItem) => void;
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
  onFinish,
  shopping,
  latestTripId,
}: NoteItemRowProps) {
  const level = priorityInfo(item.importance);
  // A product wears the color of its part: orange food, violet detergents.
  const tone = partTones[sectionOf(item)];
  const comesBack = daysUntilRepeat(item, Date.now());
  // A checked product that went to a list more than once says how many times; otherwise the tag shows only for the newest list.
  const sentTimes = timesSent(item);
  const sentMany = item.done && sentTimes > 1;
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
        shopping ? SHADOW_SHOPPING : SHADOW_NOTES,
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
          color={item.done ? doneTone.main : shopping ? tone.main : level.color}
        />
      </Pressable>
      <View style={styles.text}>
        <Text style={[styles.name, item.done && styles.nameDone]} numberOfLines={2}>
          {item.name}
        </Text>
        {item.repeatDays !== undefined && (
          <View style={styles.repeat}>
            <Ionicons name="repeat" size={12} color={colors.textMuted} />
            <Text style={styles.repeatText}>
              {comesBack !== undefined
                ? `kthehet pas ${comesBack} ${comesBack === 1 ? 'dite' : 'ditësh'}`
                : `çdo ${item.repeatDays} ditë`}
            </Text>
          </View>
        )}
        {shopping && item.price != null && <Text style={[styles.price, { color: tone.dark }]}>{formatNumber(item.price)} Lekë</Text>}
        {shopping && (sentMany || (item.sentTo !== undefined && item.sentTo === latestTripId)) && (
          <View style={styles.sent}>
            <Ionicons name="paper-plane" size={11} color={doneTone.main} />
            <Text style={styles.sentText}>{sentMany ? sentManyText(sentTimes) : 'Dërguar te lista'}</Text>
          </View>
        )}
      </View>
      {shopping ? (
        <View style={[styles.quantity, { backgroundColor: tone.light }, item.done && styles.quantityDone]}>
          <Text style={[styles.quantityText, { color: tone.dark }, item.done && styles.quantityTextDone]} numberOfLines={1}>
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
      {shopping && item.done && onFinish && (
        <Pressable
          onPress={() => onFinish(item)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Zhvendose te të kryerat pa e dërguar"
          style={({ pressed }) => [styles.finish, pressed && styles.pressed]}
        >
          <Ionicons name="checkmark-done" size={20} color={doneTone.main} />
        </Pressable>
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
  finish: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: doneTone.light,
  },
  check: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  name: { fontSize: 16, lineHeight: 21, fontWeight: '600', color: colors.text },
  price: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  nameDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  repeat: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  repeatText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  sent: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  sentText: { fontSize: 12, fontWeight: '600', color: doneTone.main },
  quantity: {
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  quantityDone: { backgroundColor: doneTone.light },
  quantityText: { fontSize: 14, fontWeight: '700' },
  quantityTextDone: { color: doneTone.main },
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
