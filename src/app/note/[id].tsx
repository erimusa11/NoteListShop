import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { InlineEditableField } from '@/components/InlineEditableField';
import { NoteItemRow } from '@/components/NoteItemRow';
import { NoteItemSheet, type NoteItemSheetState } from '@/components/NoteItemSheet';
import { NoteSectionTabs } from '@/components/NoteSectionTabs';
import { NoteSendBar } from '@/components/NoteSendBar';
import { NoteSendSheet, type NoteSendSheetState } from '@/components/NoteSendSheet';
import { useTrips } from '@/context/TripsContext';
import { useUndo } from '@/context/UndoContext';
import { useNoteLists } from '@/hooks/useNoteLists';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { NoteItem, NoteSection } from '@/types/models';
import { formatDateAlbanian } from '@/utils/dates';
import { goBackOrHome } from '@/utils/navigation';
import {
  buildNoteSuggestions,
  DEFAULT_SECTION,
  isProductList,
  type NoteItemFields,
  noteListTotal,
  sectionOf,
  sortNoteItems,
} from '@/utils/noteLists';
import { isSentTo, sendableItems, tripEntryFor } from '@/utils/noteSend';
import { formatNumber } from '@/utils/totals';
import { latestTrip } from '@/utils/tripLists';

// One group of the Note List Shop page: its name and the day it was made on top, then its items. In a normal list an item is a
// text with a priority (the most important first), like a to-do. In a shopping list an item is a product with an amount
// (copë, kg, gr or liters) and a price, and the list shows the total.
export default function NoteListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    lists,
    history,
    renameList,
    addItem,
    updateItem,
    toggleItem,
    removeItem,
    restoreItem,
    setItemsDone,
    markItemsSent,
  } = useNoteLists();
  const { trips, addItems, discardItems } = useTrips();
  const { showUndo } = useUndo();
  const list = lists?.find((entry) => entry.id === id);
  // The sheets are only built once they are first opened.
  const [sheet, setSheet] = useState<NoteItemSheetState | null>(null);
  const [sendSheet, setSendSheet] = useState<NoteSendSheetState | null>(null);
  // The item that is asked about; kept after the question closes so its name does not vanish while the dialog fades out.
  const [deleteTarget, setDeleteTarget] = useState<NoteItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // A shopping list: its items have an amount and a price, and the list shows what they all cost together.
  const products = list ? isProductList(list) : false;
  // A shopping list is divided in two tabs (Ushqime, Detergjente); everything below is about the one that is open.
  const [section, setSection] = useState<NoteSection>(DEFAULT_SECTION);
  const allItems = list?.items ?? [];
  const sectionItems = products ? allItems.filter((item) => sectionOf(item) === section) : allItems;
  const remaining: Record<NoteSection, number> = {
    ushqime: allItems.filter((item) => sectionOf(item) === 'ushqime' && !item.done).length,
    detergjente: allItems.filter((item) => sectionOf(item) === 'detergjente' && !item.done).length,
  };
  // A shopping list shows its items in the order they were added, a normal list by priority.
  const items = sortNoteItems(sectionItems, list?.kind);
  const listTotal = noteListTotal({ items: sectionItems });
  const done = items.filter((item) => item.done).length;
  // What was added before, in any group or since deleted, that this tab does not have yet.
  const suggestions = buildNoteSuggestions((lists ?? []).filter(isProductList), history, sectionItems, section);

  const openSheet = (item: NoteItem | null) => setSheet((prev) => ({ item, open: true, key: (prev?.key ?? 0) + 1 }));
  const closeSheet = () => setSheet((prev) => (prev ? { ...prev, open: false } : prev));
  const toggle = (itemId: string) => id && toggleItem(id, itemId);
  const askDelete = (item: NoteItem) => {
    setDeleteTarget(item);
    setDeleteOpen(true);
  };

  const save = (fields: NoteItemFields) => {
    if (!list) return;
    if (sheet?.item) updateItem(list.id, sheet.item.id, fields);
    else addItem(list.id, products ? { ...fields, section } : fields);
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

  // Checking off every item of the open tab at once (or, when they all are, taking the checks away).
  const allChecked = sectionItems.length > 0 && sectionItems.every((item) => item.done);
  const toggleAll = () => list && setItemsDone(list.id, sectionItems.map((item) => item.id), !allChecked);

  // The checked items (the only ones that can be sent) go as copies to the newest list of Note Shop List.
  const sendable = list ? sendableItems(list) : [];
  const target = latestTrip(trips);
  // With no list to send to nothing is waiting (the sheet then says so).
  const waiting = target ? sendable.filter((item) => !isSentTo(item, target.id)).length : 0;
  const openSend = () => setSendSheet((prev) => ({ open: true, key: (prev?.key ?? 0) + 1 }));
  const closeSend = () => setSendSheet((prev) => (prev ? { ...prev, open: false } : prev));
  const send = (chosen: NoteItem[]) => {
    if (!list || !target || chosen.length === 0) return;
    const { id: listId } = list;
    const { id: tripId, name } = target;
    const created = addItems(tripId, chosen.map(tripEntryFor));
    // What each item said before (it may have gone to an older list), so taking the copies back leaves everything as it was.
    const before = Object.fromEntries(chosen.map((item) => [item.id, item.sentTo]));
    markItemsSent(listId, Object.fromEntries(chosen.map((item) => [item.id, tripId])));
    closeSend();
    showUndo(
      `${chosen.length} ${chosen.length === 1 ? 'artikull u dërgua' : 'artikuj u dërguan'} te "${name}"`,
      () => {
        discardItems(tripId, created);
        markItemsSent(listId, before);
      },
      { icon: 'paper-plane', label: 'Kthe dërgimin' },
    );
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

            {products && <NoteSectionTabs value={section} onChange={setSection} remaining={remaining} />}
            {products && (
              <NoteSendBar
                allChecked={allChecked}
                hasItems={sectionItems.length > 0}
                onToggleAll={toggleAll}
                waiting={waiting}
                onSend={openSend}
              />
            )}

            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              style={styles.flex}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <NoteItemRow
                  item={item}
                  onToggle={toggle}
                  onPress={openSheet}
                  onDelete={askDelete}
                  shopping={products}
                  latestTripId={target?.id}
                />
              )}
              ListEmptyComponent={
                products ? (
                  <EmptyState
                    icon={section === 'ushqime' ? 'nutrition-outline' : 'sparkles-outline'}
                    title={section === 'ushqime' ? 'Asnjë ushqim ende' : 'Asnjë detergjent ende'}
                    subtitle="Shtyp + për të shtuar produktin e parë."
                  />
                ) : (
                  <EmptyState icon="basket-outline" title="x" subtitle="y" />
                )
              }
            />
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={() => openSheet(null)}
              accessibilityRole="button"
              accessibilityLabel={products ? 'Shto produkt' : 'Shto shënim'}
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
              shopping={products}
            />}

          {sendSheet && products && (
            <NoteSendSheet sheet={sendSheet} onClose={closeSend} items={sendable} target={target} onSend={send} />
          )}

          <ConfirmDialog
            visible={deleteOpen}
            title="Fshi artikullin?"
            message={`A je i sigurt që do të fshish "${deleteTarget?.name ?? ''}"?`}
            // A copy that was sent to a list is the list's own from then on: deleting (or unchecking) the item here leaves it alone.
            details={
              deleteTarget?.sentTo !== undefined
                ? ['Kopja që u dërgua te lista nuk preket. Për ta ndryshuar ose fshirë, shko te lista.']
                : []
            }
            confirmLabel="Fshi"
            onConfirm={() => {
              setDeleteOpen(false);
              if (deleteTarget) removeWithUndo(list.id, deleteTarget);
            }}
            onCancel={() => setDeleteOpen(false)}
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
