import { Ionicons } from '@expo/vector-icons';
import { ReactElement } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { NoteList } from '@/types/models';
import { formatDateAlbanian } from '@/utils/dates';
import { formatQuantity, isProductList, noteListTotal, sortNoteItems } from '@/utils/noteLists';
import { normalizePriority, priorityInfo } from '@/utils/priority';
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

// How many open items the latest list of each kind shows on the page.
const PREVIEW_COUNT = 3;

// The groups of the Note List Shop page, in two parts: the normal lists and the shopping lists. Each shows the name, the day
// it was made, and how much of it is done (and the total of a shopping list). The latest of each part also shows its most
// important open items (the highest priority in a normal list, the first ones in a shopping list). A tap opens the group.
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
      renderItem={({ item: list, index }) => {
        const preview = index === 0 ? sortNoteItems(list.items, list.kind).filter((item) => !item.done).slice(0, PREVIEW_COUNT) : [];
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
              {preview.length > 0 && (
                <View style={styles.preview}>
                  {preview.map((item) => {
                    const level = priorityInfo(item.importance);
                    return (
                      <View key={item.id} style={styles.previewRow}>
                        {isProductList(list) ? (
                          <Ionicons name="ellipse-outline" size={12} color={colors.primary} />
                        ) : (
                          <Ionicons name="flag" size={12} color={level.color} />
                        )}
                        <Text style={styles.previewName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.previewMeta}>
                          {isProductList(list) ? formatQuantity(item.quantity, item.unit) : normalizePriority(item.importance)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
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
  preview: { gap: 4, marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  previewName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  previewMeta: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
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
