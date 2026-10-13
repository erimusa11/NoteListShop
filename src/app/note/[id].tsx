import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { InlineEditableField } from '@/components/InlineEditableField';
import { NoteItemRow } from '@/components/NoteItemRow';
import { NoteItemSheet, type NoteItemSheetState } from '@/components/NoteItemSheet';
import { useUndo } from '@/context/UndoContext';
import { useNoteLists } from '@/hooks/useNoteLists';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { NoteItem } from '@/types/models';
import { formatDateAlbanian } from '@/utils/dates';
import { goBackOrHome } from '@/utils/navigation';
import { buildNoteSuggestions, isProductList, type NoteItemFields, noteListTotal, sortNoteItems } from '@/utils/noteLists';
import { formatNumber } from '@/utils/totals';
import { TRASH_DAYS } from '@/utils/trash';

// One group of the Note List Shop page: its name and the day it was made on top, then its items. Each item has an amount
// (1 unless changed) counted in copë, kg, gr or liters.
export default function NoteListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lists, history, renameList, removeList, restoreList, addItem, updateItem, toggleItem, removeItem, restoreItem } =
    useNoteLists();
  const { showUndo } = useUndo();
  const list = lists?.find((entry) => entry.id === id);
  // The sheet is only built once it is first opened.
  const [sheet, setSheet] = useState<NoteItemSheetState | null>(null);
  // The item that is asked about; kept after the question closes so its name does not vanish while the dialog fades out.
  const [deleteTarget, setDeleteTarget] = useState<NoteItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteListOpen, setDeleteListOpen] = useState(false);

  const items = useMemo(() => sortNoteItems(list?.items ?? []), [list?.items]);
  // A list of products: its items have a price, and the list shows what they all cost together.
  const products = list ? isProductList(list) : false;
  const listTotal = list ? noteListTotal(list) : 0;
  const done = items.filter((item) => item.done).length;
  // What was added before, in any group or since deleted, that this one does not have yet.
  const suggestions = useMemo(
    () => buildNoteSuggestions(lists ?? [], history, list?.items ?? []),
    [lists, history, list?.items],
  );

  const openSheet = useCallback(
    (item: NoteItem | null) => setSheet((prev) => ({ item, open: true, key: (prev?.key ?? 0) + 1 })),
    [],
  );
  const closeSheet = () => setSheet((prev) => (prev ? { ...prev, open: false } : prev));
  const toggle = useCallback((itemId: string) => id && toggleItem(id, itemId), [id, toggleItem]);
  const askDelete = useCallback((item: NoteItem) => {
    setDeleteTarget(item);
    setDeleteOpen(true);
  }, []);

  const save = (fields: NoteItemFields) => {
    if (!list) return;
    if (sheet?.item) updateItem(list.id, sheet.item.id, fields);
    else addItem(list.id, fields);
    closeSheet();
  };
  const removeWithUndo = (listId: string, item: NoteItem) => {
    removeItem(listId, item.id);
    showUndo(`"${item.name}" u fshi`, () => restoreItem(listId, item));
  };
  const deleteOpened = () => {
    if (list && sheet?.item) removeWithUndo(list.id, sheet.item);
    closeSheet();
  };
  // Leaves the screen first, so the group is never seen as "not found" while it is being removed.
  const deleteList = () => {
    if (!list) return;
    const { id: listId, name } = list;
    setDeleteListOpen(false);
    goBackOrHome();
    removeList(listId);
    showUndo(`"${name}" u fshi`, () => restoreList(listId));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={goBackOrHome} hitSlop={8} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Mbrapa">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        {list ? (
          <View style={styles.titleWrap}>
            <InlineEditableField
              value={list.name}
              placeholder="Emri i listës"
              onChange={(name) => renameList(list.id, name)}
              textStyle={styles.title}
              chip
            />
          </View>
        ) : (
          <Text style={styles.title}>Lista</Text>
        )}
        {list && (
          <Pressable
            onPress={() => setDeleteListOpen(true)}
            hitSlop={8}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Fshi listën"
          >
            <Ionicons name="trash-outline" size={21} color={colors.danger} />
          </Pressable>
        )}
      </View>

      {list ? (
        <>
          <View style={styles.content}>
            <View style={[styles.summary, shadow]}>
              <View style={styles.summaryHalf}>
                <Text style={styles.summaryLabel}>Krijuar më</Text>
                <Text style={styles.summaryDate}>{formatDateAlbanian(list.createdAt)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryHalf}>
                <Text style={styles.summaryLabel}>Të kryera</Text>
                <Text style={styles.summaryCount}>
                  {done} nga {items.length}
                </Text>
              </View>
              {products && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.summaryHalf}>
                    <Text style={styles.summaryLabel}>Gjithsej</Text>
                    <Text style={styles.summaryCount}>{formatNumber(listTotal)} Lekë</Text>
                  </View>
                </>
              )}
            </View>

            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              style={styles.flex}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <NoteItemRow item={item} onToggle={toggle} onPress={openSheet} onDelete={askDelete} showPrice={products} />
              )}
              ListEmptyComponent={
                <EmptyState icon="basket-outline" title="Lista është bosh" subtitle="Shtyp + për të shtuar artikullin e parë." />
              }
            />
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={() => openSheet(null)}
              accessibilityRole="button"
              accessibilityLabel="Shto artikull"
              style={[styles.fab, shadow]}
              hitSlop={8}
            >
              <Ionicons name="add" size={30} color="#FFFFFF" />
            </Pressable>
          </View>

          {sheet && <NoteItemSheet
              sheet={sheet}
              onClose={closeSheet}
              onSave={save}
              onDelete={deleteOpened}
              suggestions={suggestions}
              showPrice={products}
            />}

          <ConfirmDialog
            visible={deleteOpen}
            title="Fshi artikullin?"
            message={`A je i sigurt që do të fshish "${deleteTarget?.name ?? ''}"?`}
            confirmLabel="Fshi"
            onConfirm={() => {
              setDeleteOpen(false);
              if (deleteTarget) removeWithUndo(list.id, deleteTarget);
            }}
            onCancel={() => setDeleteOpen(false)}
          />

          <ConfirmDialog
            visible={deleteListOpen}
            title="Fshi listën?"
            message={`A je i sigurt që do të fshish "${list.name}"?`}
            details={
              list.items.length > 0
                ? [
                    `${list.items.length} ${list.items.length === 1 ? 'artikull' : 'artikuj'} në të.`,
                    `Lista ruhet ${TRASH_DAYS} ditë në Koshin dhe mund ta kthesh.`,
                  ]
                : [`Lista ruhet ${TRASH_DAYS} ditë në Koshin dhe mund ta kthesh.`]
            }
            confirmLabel="Fshi"
            onConfirm={deleteList}
            onCancel={() => setDeleteListOpen(false)}
          />
        </>
      ) : (
        <Text style={styles.empty}>{lists ? 'Lista nuk u gjet.' : ''}</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.md },
  headerButton: { padding: spacing.xs },
  titleWrap: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { flex: 1, paddingHorizontal: spacing.md },
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  summaryHalf: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  summaryLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  summaryDate: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  summaryCount: { fontSize: 16, fontWeight: '700', color: colors.success },
  listContent: { flexGrow: 1, paddingBottom: spacing.sm },
  footer: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, alignItems: 'flex-end' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
