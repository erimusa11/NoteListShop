import { Ionicons } from '@expo/vector-icons';
import { ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { NoteList } from '@/types/models';
import { formatDateAlbanian } from '@/utils/dates';
import { isProductList, noteListTotal } from '@/utils/noteLists';
import { formatNumber } from '@/utils/totals';

interface NoteListsPanelProps {
  /** Newest first. */
  lists: NoteList[];
  /** Shown when there is no group yet. */
  empty: ReactElement;
  onOpen: (list: NoteList) => void;
  onDelete: (list: NoteList) => void;
  /** How many deleted groups wait in the trash; the link to it is only shown when there are some. */
  trashCount: number;
  onOpenTrash: () => void;
}

// The groups of the Note List Shop page: the name, the day it was made, and how much of it is done. A tap opens the group.
export function NoteListsPanel({ lists, empty, onOpen, onDelete, trashCount, onOpenTrash }: NoteListsPanelProps) {
  return (
    <FlatList
      data={lists}
      keyExtractor={(list) => list.id}
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={empty}
      ListFooterComponent={
        trashCount > 0 ? (
          <Pressable
            onPress={onOpenTrash}
            accessibilityRole="button"
            accessibilityLabel={`Koshi, ${trashCount} lista të fshira`}
            style={({ pressed }) => [styles.trashLink, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
            <Text style={styles.trashLinkText}>Koshi · {trashCount}</Text>
          </Pressable>
        ) : null
      }
      renderItem={({ item: list }) => {
        const done = list.items.filter((item) => item.done).length;
        const total = list.items.length;
        const ratio = total > 0 ? done / total : 0;
        return (
          // No button role on the card itself: on the web that makes a <button>, which cannot hold the trash, a button of its own.
          <Pressable
            onPress={() => onOpen(list)}
            accessibilityLabel={`${list.name}. ${done} nga ${total} të kryera. Hap`}
            style={({ pressed }) => [styles.card, shadow, pressed && styles.pressed]}
          >
            <View style={styles.iconBadge}>
              <Ionicons name={isProductList(list) ? 'pricetag' : 'list'} size={22} color={colors.primaryDark} />
            </View>
            <View style={styles.text}>
              <Text style={styles.name} numberOfLines={2}>
                {list.name}
              </Text>
              <Text style={styles.meta}>
                {total === 0 ? 'Asnjë artikull ende' : `${done} nga ${total} artikuj të kryer`}
                {isProductList(list) && noteListTotal(list) > 0 ? ` · ${formatNumber(noteListTotal(list))} Lekë` : ''}
              </Text>
              {total > 0 && (
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
                </View>
              )}
              <Text style={styles.date}>Krijuar më {formatDateAlbanian(list.createdAt)}</Text>
            </View>
            <Pressable
              onPress={() => onDelete(list)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Fshi listën ${list.name}`}
              style={({ pressed }) => [styles.trash, pressed && styles.trashPressed]}
            >
              <Ionicons name="trash-outline" size={19} color={colors.textMuted} />
            </Pressable>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
  track: { height: 4, borderRadius: radii.pill, backgroundColor: colors.border, overflow: 'hidden', marginVertical: 2 },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.success },
  date: { fontSize: 11, color: colors.textMuted },
  trashLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  trashLinkText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  trash: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  trashPressed: { backgroundColor: '#FDE6E3' },
});
