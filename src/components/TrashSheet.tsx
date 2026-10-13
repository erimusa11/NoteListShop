import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { colors, radii, spacing } from '@/theme/theme';
import { formatTrashLeft, TRASH_DAYS } from '@/utils/trash';

export interface TrashEntry {
  id: string;
  name: string;
  /** What the list holds, e.g. "12 artikuj". */
  meta: string;
  deletedAt: number;
}

interface TrashSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Newest deletion first. */
  entries: TrashEntry[];
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
}

// The lists that were deleted and wait here for TRASH_DAYS before they are gone for good: each can be brought back, or
// deleted right away (after a second tap, so it is not done by mistake).
export function TrashSheet({ visible, onClose, title, entries, onRestore, onPurge }: TrashSheetProps) {
  const [purging, setPurging] = useState<string | null>(null);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <Text style={styles.hint}>
        Listat e fshira ruhen këtu {TRASH_DAYS} ditë dhe mund të kthehen. Pas kësaj fshihen përgjithmonë.
      </Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>Koshi është bosh.</Text>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {entries.map((entry) => (
            <View key={entry.id} style={styles.row}>
              <View style={styles.text}>
                <Text style={styles.name} numberOfLines={2}>
                  {entry.name}
                </Text>
                <Text style={styles.meta}>
                  {entry.meta} · mbeten {formatTrashLeft(entry.deletedAt)}
                </Text>
              </View>
              {purging === entry.id ? (
                <>
                  <Pressable
                    onPress={() => setPurging(null)}
                    accessibilityRole="button"
                    style={[styles.button, styles.neutral]}
                  >
                    <Text style={styles.neutralText}>Jo</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setPurging(null);
                      onPurge(entry.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Fshi "${entry.name}" përgjithmonë`}
                    style={[styles.button, styles.danger]}
                  >
                    <Text style={styles.dangerText}>Fshi përgjithmonë</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={() => setPurging(entry.id)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Fshi "${entry.name}" përgjithmonë`}
                    style={styles.iconButton}
                  >
                    <Ionicons name="trash-outline" size={19} color={colors.danger} />
                  </Pressable>
                  <Pressable
                    onPress={() => onRestore(entry.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Kthe "${entry.name}"`}
                    style={[styles.button, styles.restore]}
                  >
                    <Ionicons name="arrow-undo" size={15} color="#FFFFFF" />
                    <Text style={styles.restoreText}>Kthe</Text>
                  </Pressable>
                </>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: colors.textMuted },
  empty: { fontSize: 15, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
  scroll: { maxHeight: 360 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  text: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  restore: { backgroundColor: colors.primary },
  restoreText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  neutral: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  neutralText: { fontSize: 14, fontWeight: '700', color: colors.text },
  danger: { backgroundColor: colors.danger },
  dangerText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
