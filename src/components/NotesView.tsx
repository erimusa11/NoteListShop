import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { NoteListSheet, type NoteListSheetState } from '@/components/NoteListSheet';
import { NoteListsPanel } from '@/components/NoteListsPanel';
import { TrashSheet } from '@/components/TrashSheet';
import { useUndo } from '@/context/UndoContext';
import { useNoteLists } from '@/hooks/useNoteLists';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { NoteList, NoteListKind } from '@/types/models';
import { newestFirst } from '@/utils/noteLists';
import { TRASH_DAYS } from '@/utils/trash';

// The Note List Shop page. Each group is made by naming it and choosing its category: a normal list (text items with a
// priority, like to-dos) or a shopping list (products with an amount, a unit and a price, and a total). The two kinds are
// shown apart, newest first, and the latest of each shows its most important open items right on the page. The page is only
// built when its menu is opened, so the rest of the app does not pay for it.
export function NotesView() {
  const { lists: noteLists, trashedLists, addList, removeList, restoreList, purgeList } = useNoteLists();
  const { showUndo } = useUndo();
  const [trashOpen, setTrashOpen] = useState(false);
  const groups = useMemo(() => newestFirst(noteLists ?? []), [noteLists]);
  const [listSheet, setListSheet] = useState<NoteListSheetState | null>(null);
  // The group that is asked about; kept after the question closes so its name does not vanish while the dialog fades out.
  const [deleteTarget, setDeleteTarget] = useState<NoteList | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const openListSheet = () => setListSheet((prev) => ({ open: true, key: (prev?.key ?? 0) + 1 }));
  const closeListSheet = () => setListSheet((prev) => (prev ? { ...prev, open: false } : prev));
  const openGroup = (id: string) => router.push({ pathname: '/note/[id]', params: { id } });
  // A new group is opened right away, so its first item can be added.
  const createGroup = (name: string, kind: NoteListKind) => {
    const id = addList(name, kind);
    closeListSheet();
    openGroup(id);
  };
  const askDelete = (list: NoteList) => {
    setDeleteTarget(list);
    setDeleteOpen(true);
  };

  const welcome = noteLists ? (
    <View style={styles.welcome}>
      <View style={[styles.logoCard, shadow]}>
        <Image
          source={require('@/assets/images/note-list-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Note List Shop by Eri"
        />
      </View>
      <Text style={styles.welcomeTitle}>Asnjë listë ende</Text>
      <Text style={styles.welcomeText}>Shtyp + për të krijuar listën e parë.</Text>
    </View>
  ) : (
    <View style={styles.flex} />
  );

  return (
    <View style={styles.flex}>
      <NoteListsPanel
        lists={groups}
        empty={welcome}
        onOpen={(list) => openGroup(list.id)}
        onDelete={askDelete}
        trashCount={trashedLists.length}
        onOpenTrash={() => setTrashOpen(true)}
      />

      <View style={styles.footer}>
        <Pressable
          onPress={openListSheet}
          accessibilityRole="button"
          accessibilityLabel="Krijo listë"
          style={[styles.fab, shadow]}
          hitSlop={8}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </Pressable>
      </View>

      <TrashSheet
        visible={trashOpen}
        onClose={() => setTrashOpen(false)}
        title="Koshi i listave"
        entries={trashedLists.map((list) => ({
          id: list.id,
          name: list.name,
          meta: `${list.items.length} ${list.items.length === 1 ? 'artikull' : 'artikuj'}`,
          deletedAt: list.deletedAt ?? 0,
        }))}
        onRestore={(id) => {
          restoreList(id);
          if (trashedLists.length <= 1) setTrashOpen(false);
        }}
        onPurge={(id) => {
          purgeList(id);
          if (trashedLists.length <= 1) setTrashOpen(false);
        }}
      />
      {listSheet && <NoteListSheet sheet={listSheet} onClose={closeListSheet} onSave={createGroup} />}

      <ConfirmDialog
        visible={deleteOpen}
        title="Fshi listën?"
        message={`A je i sigurt që do të fshish "${deleteTarget?.name ?? ''}"?`}
        details={
          deleteTarget && deleteTarget.items.length > 0
            ? [
                `${deleteTarget.items.length} ${deleteTarget.items.length === 1 ? 'artikull' : 'artikuj'} në të.`,
                `Lista ruhet ${TRASH_DAYS} ditë në Koshin dhe mund ta kthesh.`,
              ]
            : [`Lista ruhet ${TRASH_DAYS} ditë në Koshin dhe mund ta kthesh.`]
        }
        confirmLabel="Fshi"
        onConfirm={() => {
          setDeleteOpen(false);
          if (deleteTarget) {
            const { id, name } = deleteTarget;
            removeList(id);
            showUndo(`"${name}" u fshi`, () => restoreList(id));
          }
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingTop: spacing.lg },
  logoCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  logo: { width: 240, height: 166 },
  welcomeTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  welcomeText: { fontSize: 14, color: colors.textMuted },
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
