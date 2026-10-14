import { Ionicons } from '@expo/vector-icons';
import { ReactElement } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { HOLD_LIST_TO_DELETE_MS, useHoldToDelete } from '@/hooks/useHoldToDelete';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { NoteList } from '@/types/models';
import { formatDateAlbanian } from '@/utils/dates';
import { isProductList, noteListTotal } from '@/utils/noteLists';
import { formatNumber } from '@/utils/totals';

interface NoteListsPanelProps {
  /** Newest first; the normal lists and the shopping lists are shown apart, in two groups. */
  lists: NoteList[];
  /** Shown when there is no group yet. */
  empty: ReactElement;
  onOpen: (list: NoteList) => void;
  onDelete: (list: NoteList) => void;
  /** How many deleted groups wait in the trash; the link to it is only shown when there are some. */
  trashCount: number;
  onOpenTrash: () => void;
}

interface ListGroup {
  key: string;
  title: string;
  /** Said under the title while the group has no list. */
  none: string;
  data: NoteList[];
}

// The groups of the Note List Shop page, in two parts: the normal lists and the shopping lists. Each is a small, quiet card:
// the name and the day it was made on one line, then how much of it is done (and the total of a shopping list) with a thin
// bar under it. A tap opens the group.
export function NoteListsPanel({ lists, empty, onOpen, onDelete, trashCount, onOpenTrash }: NoteListsPanelProps) {
  // With no list at all the welcome is shown instead of two empty parts.
  const sections: ListGroup[] =
    lists.length === 0
      ? []
      : [
          { key: 'work', title: 'Listat normale', none: 'Asnjë listë normale ende', data: lists.filter((list) => !isProductList(list)) },
          { key: 'products', title: 'Listat e blerjeve', none: 'Asnjë listë blerjesh ende', data: lists.filter(isProductList) },
        ];
  return (
    <SectionList
      sections={sections}
      keyExtractor={(list) => list.id}
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Ionicons name={section.key === 'products' ? 'cart' : 'list'} size={16} color={colors.primaryDark} />
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionCount}>{section.data.length}</Text>
        </View>
      )}
      renderSectionFooter={({ section }) =>
        section.data.length === 0 ? <Text style={styles.sectionNone}>{section.none}</Text> : null
      }
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
      renderItem={({ item: list }) => <NoteListCard list={list} onOpen={onOpen} onDelete={onDelete} />}
    />
  );
}

interface NoteListCardProps {
  list: NoteList;
  onOpen: (list: NoteList) => void;
  onDelete: (list: NoteList) => void;
}

// A tap opens the list; holding it (a little longer than an item) asks whether to delete it, with a thin red line filling
// along the bottom of the card while it is held.
function NoteListCard({ list, onOpen, onDelete }: NoteListCardProps) {
  const { holdStyle, begin, end } = useHoldToDelete();
  const done = list.items.filter((item) => item.done).length;
  const total = list.items.length;
  const ratio = total > 0 ? done / total : 0;
  const cost = isProductList(list) ? noteListTotal(list) : 0;
  return (
    <Pressable
      onPress={() => onOpen(list)}
      onLongPress={() => onDelete(list)}
      delayLongPress={HOLD_LIST_TO_DELETE_MS}
      onPressIn={begin}
      onPressOut={end}
      accessibilityLabel={`${list.name}. ${done} nga ${total} të kryera. Hap`}
      accessibilityHint="Mbaje të shtypur për ta fshirë listën"
      style={({ pressed }) => [styles.card, shadow, pressed && styles.pressed]}
    >
      <View style={styles.iconBadge}>
        <Ionicons name={isProductList(list) ? 'pricetag' : 'list'} size={17} color={colors.primaryDark} />
      </View>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {list.name}
          </Text>
          <Text style={styles.date}>{formatDateAlbanian(list.createdAt)}</Text>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {total === 0 ? 'Asnjë artikull ende' : `${done} nga ${total} të kryera`}
          {cost > 0 ? ` · ${formatNumber(cost)} Lekë` : ''}
        </Text>
        {total > 0 && (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
          </View>
        )}
      </View>
      <View style={styles.holdTrack}>
        <Animated.View style={[styles.holdLine, holdStyle]} />
      </View>
    </Pressable>
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
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs + 2,
  },
  pressed: { opacity: 0.85 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  sectionCount: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  sectionNone: { fontSize: 13, color: colors.textMuted, paddingHorizontal: spacing.xs, marginBottom: spacing.md },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  date: { fontSize: 11, color: colors.textMuted },
  meta: { fontSize: 12, color: colors.textMuted },
  track: { height: 3, borderRadius: radii.pill, backgroundColor: colors.border, overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.success },
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
  holdTrack: { pointerEvents: 'none', position: 'absolute', left: radii.md, right: radii.md, bottom: 0, height: 3 },
  holdLine: { height: 3, borderRadius: 2, backgroundColor: colors.danger },
});
