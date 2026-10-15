import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { NoteItemRow } from '@/components/NoteItemRow';
import { NoteItemSheet, type NoteItemSheetState } from '@/components/NoteItemSheet';
import { NoteSectionTabs, type NoteTab } from '@/components/NoteSectionTabs';
import { NoteShoppingSummary } from '@/components/NoteShoppingSummary';
import { NoteSendBar } from '@/components/NoteSendBar';
import { NoteSendSheet, type NoteSendSheetState } from '@/components/NoteSendSheet';
import { useTrips } from '@/context/TripsContext';
import { useUndo } from '@/context/UndoContext';
import { useNoteLists } from '@/hooks/useNoteLists';
import { partTones, type Tone, toneGlow, toneShadow, tones } from '@/theme/noteTones';
import { colors, radii, spacing } from '@/theme/theme';
import type { NoteItem, NoteSection } from '@/types/models';
import {
  buildNoteSuggestions,
  DEFAULT_SECTION,
  isProductList,
  isFinished,
  type NoteItemFields,
  sectionOf,
  sortNoteItems,
} from '@/utils/noteLists';
import { isSentTo, sendableItems, timesSent, tripEntryFor } from '@/utils/noteSend';
import { normalizeText } from '@/utils/suggestions';
import { latestTrip } from '@/utils/tripLists';

// The part of the checked ones shows this many at first, and this many more each time "Shiko më shumë" is tapped.
const DONE_FIRST = 10;
const DONE_MORE = 15;

interface NoteListBodyProps {
  listId: string;
  /** The tone of the tab the list is in. */
  accent: Tone;
}

// The content of the one list of a tab on the Note List Shop page. In a normal list an item is a text with a priority (the
// most important first), like a to-do. In a shopping list an item is a product with an amount (copë, kg, gr or liters) and
// a price, and the list shows the total.
export function NoteListBody({ listId, accent }: NoteListBodyProps) {
  const { lists, history, addItem, updateItem, toggleItem, removeItem, restoreItem, setItemsDone, markItemsSent, archiveItems, reviveItem } =
    useNoteLists();
  const { trips, addItems, discardItems } = useTrips();
  const { showUndo } = useUndo();
  const list = lists?.find((entry) => entry.id === listId);
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
  // The part with everything that was checked; the products that were sent to a list are only there, no longer among the others.
  const [showDone, setShowDone] = useState(false);
  const allItems = list?.items ?? [];
  const sectionItems = products ? allItems.filter((item) => sectionOf(item) === section && !isFinished(item)) : allItems;
  const doneItems = allItems.filter((item) => item.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  // Only the latest ones are listed; "Shiko më shumë" adds more.
  const [doneShown, setDoneShown] = useState(DONE_FIRST);
  const viewingDone = products && showDone;
  const changeTab = (tab: NoteTab) => {
    setShowDone(tab === 'done');
    setDoneShown(DONE_FIRST);
    if (tab !== 'done') setSection(tab);
  };
  const remaining: Record<NoteSection, number> = {
    ushqime: allItems.filter((item) => sectionOf(item) === 'ushqime' && !item.done).length,
    detergjente: allItems.filter((item) => sectionOf(item) === 'detergjente' && !item.done).length,
  };
  // A shopping list shows its items in the order they were added, a normal list by priority.
  const items = viewingDone ? doneItems.slice(0, doneShown) : sortNoteItems(sectionItems, list?.kind);
  const done = items.filter((item) => item.done).length;
  const ratio = items.length > 0 ? done / items.length : 0;
  // What was added before, in any group or since deleted, that this tab does not have yet.
  const suggestions = buildNoteSuggestions((lists ?? []).filter(isProductList), history, sectionItems, section);

  const openSheet = (item: NoteItem | null) => setSheet((prev) => ({ item, open: true, key: (prev?.key ?? 0) + 1 }));
  const closeSheet = () => setSheet((prev) => (prev ? { ...prev, open: false } : prev));
  const toggle = (itemId: string) => toggleItem(listId, itemId);
  const askDelete = (item: NoteItem) => {
    setDeleteTarget(item);
    setDeleteOpen(true);
  };

  const save = (fields: NoteItemFields) => {
    if (!list) return;
    if (sheet?.item) updateItem(list.id, sheet.item.id, fields);
    else {
      // A product that was bought and put away (sent, or moved to the checked ones) comes back as the same one, not as a copy.
      const away = products
        ? allItems.find(
            (item) =>
              isFinished(item) && sectionOf(item) === section && normalizeText(item.name) === normalizeText(fields.name),
          )
        : undefined;
      if (away) reviveItem(list.id, away.id, fields);
      else addItem(list.id, products ? { ...fields, section } : fields);
    }
    closeSheet();
  };
  const removeWithUndo = (id: string, item: NoteItem) => {
    removeItem(id, item.id);
    showUndo(`"${item.name}" u fshi`, () => restoreItem(id, item));
  };
  const deleteOpened = () => {
    if (list && sheet?.item) removeWithUndo(list.id, sheet.item);
    closeSheet();
  };

  // Checking off every item of the open tab at once (or, when they all are, taking the checks away).
  const allChecked = sectionItems.length > 0 && sectionItems.every((item) => item.done);
  const toggleAll = () => list && setItemsDone(list.id, sectionItems.map((item) => item.id), !allChecked);

  // A checked product can be moved to the checked ones without sending it.
  const finish = (item: NoteItem) => {
    if (!list) return;
    const { id: sourceId } = list;
    archiveItems(sourceId, [item.id], true);
    showUndo(`"${item.name}" u zhvendos te të kryerat`, () => archiveItems(sourceId, [item.id], false));
  };

  // The checked items (the only ones that can be sent) go as copies to the newest list of Note Shop List.
  const sendable = list ? sendableItems(list) : [];
  const target = latestTrip(trips);
  // With no list to send to nothing is waiting (the sheet then says so).
  const waiting = target ? sendable.filter((item) => !isSentTo(item, target.id)).length : 0;
  const openSend = () => setSendSheet((prev) => ({ open: true, key: (prev?.key ?? 0) + 1 }));
  const closeSend = () => setSendSheet((prev) => (prev ? { ...prev, open: false } : prev));
  const send = (chosen: NoteItem[]) => {
    if (!list || !target || chosen.length === 0) return;
    const { id: sourceId } = list;
    const { id: tripId, name } = target;
    const created = addItems(tripId, chosen.map(tripEntryFor));
    // What each item said before (it may have gone to an older list), so taking the copies back leaves everything as it was.
    const before = Object.fromEntries(chosen.map((item) => [item.id, item.sentTo]));
    const countsBefore = Object.fromEntries(chosen.map((item) => [item.id, item.sentCount]));
    markItemsSent(
      sourceId,
      Object.fromEntries(chosen.map((item) => [item.id, tripId])),
      // Each send counts, so an item that goes again is told as sent more than once.
      Object.fromEntries(chosen.map((item) => [item.id, timesSent(item) + 1])),
    );
    closeSend();
    showUndo(
      `${chosen.length} ${chosen.length === 1 ? 'artikull u dërgua' : 'artikuj u dërguan'} te "${name}"`,
      () => {
        discardItems(tripId, created);
        markItemsSent(sourceId, before, countsBefore);
      },
      { icon: 'paper-plane', label: 'Kthe dërgimin' },
    );
  };

  // The colors of what is open: the part of a shopping list (orange while the checked ones are shown), or the tone of the normal list.
  const tone = products ? (viewingDone ? tones.orange : partTones[section]) : accent;

  if (!list) return <View style={styles.flex} />;

  return (
    <View style={styles.flex}>
      {viewingDone ? null : products ? (
        <NoteShoppingSummary items={allItems} />
      ) : (
      <View style={[styles.summary, toneShadow(accent)]}>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryLabel}>Të kryera</Text>
            <Text style={[styles.summaryCount, { color: accent.dark }]}>
              {done} <Text style={styles.summaryOf}>nga {items.length}</Text>
            </Text>
          </View>
          <Text style={[styles.percent, { color: accent.main }]}>{Math.round(ratio * 100)}%</Text>
        </View>
        <View style={[styles.track, { backgroundColor: accent.light }]}>
          <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: accent.main }]} />
        </View>
      </View>
      )}

      {products && (
        <NoteSectionTabs
          value={viewingDone ? 'done' : section}
          onChange={changeTab}
          remaining={remaining}
        />
      )}
      {products && !viewingDone && (
        <NoteSendBar
          allChecked={allChecked}
          hasItems={sectionItems.length > 0}
          onToggleAll={toggleAll}
          waiting={waiting}
          onSend={openSend}
          tone={tone}
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
            onFinish={products && !viewingDone ? finish : undefined}
            shopping={products}
            latestTripId={target?.id}
          />
        )}
        ListFooterComponent={
          viewingDone && doneItems.length > doneShown ? (
            <Pressable
              onPress={() => setDoneShown((n) => n + DONE_MORE)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.more, pressed && { opacity: 0.75 }]}
            >
              <Text style={[styles.moreText, { color: accent.dark }]}>Shiko më shumë</Text>
              <Ionicons name="chevron-down" size={16} color={accent.dark} />
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          viewingDone ? (
            <EmptyState tone={tone} icon="checkmark-done-outline" title="Asnjë e kryer ende" subtitle="Çfarë shënon si të kryer shfaqet këtu." />
          ) : products ? (
            <EmptyState tone={tone}
              icon={section === 'ushqime' ? 'nutrition-outline' : 'sparkles-outline'}
              title={section === 'ushqime' ? 'Asnjë ushqim ende' : 'Asnjë detergjent ende'}
              subtitle="Shtyp + për të shtuar produktin e parë."
            />
          ) : (
            <EmptyState tone={tone} icon="list-outline" title="Asnjë shënim ende" subtitle="Shtyp + për të shtuar shënimin e parë." />
          )
        }
      />

      {!viewingDone && (
      <View style={styles.footer}>
        <Pressable
          onPress={() => openSheet(null)}
          accessibilityRole="button"
          accessibilityLabel={products ? 'Shto produkt' : 'Shto shënim'}
          style={[styles.fab, toneGlow(tone), { backgroundColor: tone.main }]}
          hitSlop={8}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </Pressable>
      </View>
      )}

      {sheet && (
        <NoteItemSheet
          sheet={sheet}
          onClose={closeSheet}
          onSave={save}
          onDelete={deleteOpened}
          suggestions={suggestions}
          shopping={products}
          tone={tone}
        />
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    gap: spacing.sm + 2,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 2 },
  summaryCount: { fontSize: 26, fontWeight: '800' },
  summaryOf: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  percent: { fontSize: 22, fontWeight: '800' },
  track: { height: 8, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.xs,
  },
  moreText: { fontSize: 14, fontWeight: '700' },
  listContent: { flexGrow: 1, paddingBottom: spacing.sm },
  footer: { paddingBottom: spacing.sm, alignItems: 'flex-end' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
