import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { colors, radii, spacing } from '@/theme/theme';
import { doneTone, tones } from '@/theme/noteTones';
import type { NoteItem, NoteSection } from '@/types/models';
import { formatQuantity, NOTE_SECTIONS, sectionOf } from '@/utils/noteLists';
import { isSentTo, sentManyText, targetLabel, timesSent } from '@/utils/noteSend';
import { formatNumber } from '@/utils/totals';

/** What the sheet is showing; `key` changes with every opening, so the choice starts fresh. */
export interface NoteSendSheetState {
  open: boolean;
  key: number;
}

interface NoteSendSheetProps {
  sheet: NoteSendSheetState;
  onClose: () => void;
  /** The items that are checked off: the only ones that can be sent. */
  items: NoteItem[];
  /** The newest list of Note Shop List, where the copies go; undefined while there is none. */
  target: { id: string; name: string } | undefined;
  onSend: (items: NoteItem[]) => void;
}

const SECTION_ICON: Record<NoteSection, 'nutrition-outline' | 'sparkles-outline'> = {
  ushqime: 'nutrition-outline',
  detergjente: 'sparkles-outline',
};

// The sheet belongs to the shopping list, so it wears its orange.
const T = tones.orange;

const countText = (n: number) => `${n} ${n === 1 ? 'artikull' : 'artikuj'}`;

// Sends a copy of the checked items to the newest list of Note Shop List: Ushqime into its Produktet, Detergjente into its
// Detergjente & Extra. Everything that was not sent there yet starts out selected, so one tap on "Dërgo" sends what is new;
// each item can be unselected (or an item that went already can be selected again).
export function NoteSendSheet({ sheet, onClose, items, target, onSend }: NoteSendSheetProps) {
  return (
    <BottomSheet visible={sheet.open} onClose={onClose} title="Dërgo te lista">
      <SendForm key={sheet.key} items={items} target={target} onSend={onSend} />
    </BottomSheet>
  );
}

function SendForm({ items, target, onSend }: Pick<NoteSendSheetProps, 'items' | 'target' | 'onSend'>) {
  const { height } = useWindowDimensions();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.filter((item) => !isSentTo(item, target?.id)).map((item) => item.id)),
  );

  if (!target) {
    return (
      <View style={styles.message}>
        <Ionicons name="albums-outline" size={34} color={colors.textMuted} />
        <Text style={styles.messageTitle}>Nuk ke ende asnjë listë</Text>
        <Text style={styles.messageText}>Krijo një listë te Note Shop List dhe pastaj kthehu këtu për t&apos;i dërguar artikujt.</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.message}>
        <Ionicons name="checkmark-circle-outline" size={34} color={colors.textMuted} />
        <Text style={styles.messageTitle}>Asnjë artikull i shënuar</Text>
        <Text style={styles.messageText}>
          Shëno me rrethin artikujt që i bleve dhe pastaj dërgoji këtu. Vetëm artikujt e shënuar mund të dërgohen.
        </Text>
      </View>
    );
  }

  const chosen = items.filter((item) => selected.has(item.id));
  const everything = chosen.length === items.length;
  const total = chosen.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(everything ? new Set() : new Set(items.map((item) => item.id)));

  return (
    <>
      <View style={styles.target}>
        <Ionicons name="albums-outline" size={18} color={T.dark} />
        <Text style={styles.targetText} numberOfLines={3}>
          Kopje te lista e fundit: <Text style={styles.targetName}>{target.name}</Text>. Futen si të blera.
        </Text>
      </View>

      <Pressable
        onPress={toggleAll}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: everything ? true : chosen.length > 0 ? 'mixed' : false }}
        accessibilityLabel="Zgjidh të gjitha"
        style={({ pressed }) => [styles.allRow, pressed && styles.pressed]}
      >
        <Ionicons
          name={everything ? 'checkbox' : chosen.length > 0 ? 'remove-circle' : 'square-outline'}
          size={24}
          color={chosen.length > 0 ? T.main : colors.textMuted}
        />
        <Text style={styles.allText}>{everything ? 'Hiq të gjitha' : 'Zgjidh të gjitha'}</Text>
        <Text style={styles.allCount}>
          {chosen.length} nga {items.length}
        </Text>
      </Pressable>

      <ScrollView style={{ maxHeight: height * 0.42 }} showsVerticalScrollIndicator={false}>
        {NOTE_SECTIONS.map(({ value, label }) => {
          const group = items.filter((item) => sectionOf(item) === value);
          if (group.length === 0) return null;
          return (
            <View key={value} style={styles.group}>
              <View style={styles.groupHeader}>
                <Ionicons name={SECTION_ICON[value]} size={16} color={T.dark} />
                <Text style={styles.groupTitle}>
                  {label} <Text style={styles.groupArrow}>→</Text> {targetLabel(value)}
                </Text>
              </View>
              {group.map((item) => {
                const on = selected.has(item.id);
                const sent = isSentTo(item, target.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggle(item.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${item.name}, ${formatQuantity(item.quantity, item.unit)}${sent ? ', dërguar më parë' : ''}`}
                    style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && styles.pressed]}
                  >
                    <Ionicons
                      name={on ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={on ? T.main : colors.textMuted}
                    />
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      {sent && (
                        <View style={styles.sentRow}>
                          <Ionicons name="paper-plane" size={11} color={doneTone.main} />
                          <Text style={styles.sentText}>{timesSent(item) > 1 ? sentManyText(timesSent(item)) : 'Dërguar më parë'}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.rowAmount}>
                      <Text style={styles.rowQuantity}>{formatQuantity(item.quantity, item.unit)}</Text>
                      {item.price != null && <Text style={styles.rowPrice}>{formatNumber(item.price)} Lekë</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={() => onSend(chosen)}
        disabled={chosen.length === 0}
        accessibilityRole="button"
        accessibilityLabel={chosen.length === 0 ? 'Dërgo, zgjidh të paktën një artikull' : `Dërgo ${countText(chosen.length)}`}
        style={({ pressed }) => [styles.send, chosen.length === 0 && styles.sendDisabled, pressed && styles.pressed]}
      >
        <Ionicons name="paper-plane" size={18} color={chosen.length === 0 ? colors.textMuted : '#FFFFFF'} />
        <Text style={[styles.sendText, chosen.length === 0 && styles.sendTextDisabled]}>
          {chosen.length === 0 ? 'Zgjidh artikujt' : `Dërgo ${countText(chosen.length)}`}
        </Text>
        {chosen.length > 0 && total > 0 && <Text style={styles.sendTotal}>{formatNumber(total)} Lekë</Text>}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  message: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  messageTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  messageText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  target: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: T.light,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
  },
  targetText: { flex: 1, fontSize: 13, color: T.dark },
  targetName: { fontWeight: '800' },
  allRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  allText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  allCount: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  pressed: { opacity: 0.7 },
  group: { marginBottom: spacing.sm },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.xs },
  groupTitle: { fontSize: 13, fontWeight: '800', color: T.dark },
  groupArrow: { color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 2,
    marginTop: spacing.xs + 2,
  },
  rowOn: { borderColor: T.main, backgroundColor: T.light + '66' },
  rowText: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.text },
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  sentText: { fontSize: 12, fontWeight: '600', color: doneTone.main },
  rowAmount: { alignItems: 'flex-end' },
  rowQuantity: { fontSize: 13, fontWeight: '700', color: T.dark },
  rowPrice: { fontSize: 12, color: colors.textMuted },
  send: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: T.main,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 6,
    marginTop: spacing.sm,
  },
  sendDisabled: { backgroundColor: colors.border },
  sendText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  sendTextDisabled: { color: colors.textMuted },
  sendTotal: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', opacity: 0.9 },
});
