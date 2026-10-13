import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactElement, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { NoteListSheet, type NoteListSheetState } from '@/components/NoteListSheet';
import { NoteListsPanel } from '@/components/NoteListsPanel';
import { TaskRow } from '@/components/TaskRow';
import { TaskSheet, type TaskSheetState } from '@/components/TaskSheet';
import { useNoteLists } from '@/hooks/useNoteLists';
import { useTabSwipe } from '@/hooks/useTabSwipe';
import { useTasks } from '@/hooks/useTasks';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { NoteList, Task } from '@/types/models';
import { newestFirst } from '@/utils/noteLists';
import { doneTasks, filterTasks, openTasks, type TaskFields } from '@/utils/tasks';

// Listat: the groups (named lists with their own items). The other two are the to-do tasks.
type NotesTab = 'lists' | 'todo' | 'done';
type TaskTab = Exclude<NotesTab, 'lists'>;

const TABS: { value: NotesTab; label: string }[] = [
  { value: 'lists', label: 'Listat' },
  { value: 'todo', label: "Për t'u bërë" },
  { value: 'done', label: 'Të kryera' },
];
const ORDER = TABS.map((tab) => tab.value);

// Each tab shows this many tasks at first and this many more each time "load more" is pressed.
const PAGE_SIZE = 10;

// The Note List Shop page: lists and a to-do list apart from the shopping lists. The Listat tab holds the groups: each is
// made by naming it (the day is put on it) and opened to add its own items, with an amount and a unit. Open tasks come most
// important first; checking one off moves it to the Të kryera tab, where it can be brought back. Swipe sideways or tap to go
// from one tab to the other. The task tabs have a search box that looks in all their tasks, and show them 10 at a time.
// The page is only built when its menu is opened, and the tasks are only read from the phone then, so the rest of the app
// does not pay for it.
export function NotesView() {
  const { tasks, failed, retry, add, update, toggle, remove, clearDone } = useTasks();

  if (!tasks) {
    return failed ? (
      <View style={styles.flex}>
        <EmptyState icon="alert-circle-outline" title="Nuk u ngarkuan detyrat" subtitle="Provo përsëri pas pak." />
        <Pressable onPress={retry} accessibilityRole="button" style={styles.retry}>
          <Text style={styles.retryText}>Provo përsëri</Text>
        </Pressable>
      </View>
    ) : (
      <View style={styles.flex} />
    );
  }

  return (
    <NotesContent tasks={tasks} onAdd={add} onUpdate={update} onToggle={toggle} onRemove={remove} onClearDone={clearDone} />
  );
}

interface NotesContentProps {
  tasks: Task[];
  onAdd: (fields: TaskFields) => void;
  onUpdate: (id: string, fields: TaskFields) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onClearDone: () => void;
}

function NotesContent({ tasks, onAdd, onUpdate, onToggle, onRemove, onClearDone }: NotesContentProps) {
  // The page opens on Listat, where a group is made first.
  const [active, setActive] = useState<NotesTab>('lists');
  const { gesture, slideStyle } = useTabSwipe(ORDER, active, setActive);
  // What is typed in each task tab's search box and how many of its tasks are shown. Kept here, so a tab keeps them while
  // another one is open.
  const [queries, setQueries] = useState<Record<TaskTab, string>>({ todo: '', done: '' });
  const [shownCounts, setShownCounts] = useState<Record<TaskTab, number>>({ todo: PAGE_SIZE, done: PAGE_SIZE });
  const { lists: noteLists, addList, removeList } = useNoteLists();
  const groups = useMemo(() => newestFirst(noteLists ?? []), [noteLists]);
  const [listSheet, setListSheet] = useState<NoteListSheetState | null>(null);
  // The group that is asked about; kept after the question closes so its name does not vanish while the dialog fades out.
  const [listDeleteTarget, setListDeleteTarget] = useState<NoteList | null>(null);
  const [listDeleteOpen, setListDeleteOpen] = useState(false);
  // The sheet is only built once it is first opened.
  const [sheet, setSheet] = useState<TaskSheetState | null>(null);
  const [clearing, setClearing] = useState(false);
  // The task that is asked about; kept after the question closes so its text does not vanish while the dialog fades out.
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const open = useMemo(() => openTasks(tasks), [tasks]);
  const done = useMemo(() => doneTasks(tasks), [tasks]);
  const byTab: Record<TaskTab, Task[]> = { todo: open, done };

  const changeQuery = (tab: TaskTab, text: string) => {
    setQueries((prev) => ({ ...prev, [tab]: text }));
    setShownCounts((prev) => ({ ...prev, [tab]: PAGE_SIZE }));
  };
  const showMore = (tab: TaskTab) => setShownCounts((prev) => ({ ...prev, [tab]: prev[tab] + PAGE_SIZE }));

  const openListSheet = () => setListSheet((prev) => ({ open: true, key: (prev?.key ?? 0) + 1 }));
  const closeListSheet = () => setListSheet((prev) => (prev ? { ...prev, open: false } : prev));
  const openGroup = (id: string) => router.push({ pathname: '/note/[id]', params: { id } });
  // A new group is opened right away, so its first item can be added.
  const createGroup = (name: string) => {
    const id = addList(name);
    closeListSheet();
    openGroup(id);
  };
  const askDeleteGroup = (list: NoteList) => {
    setListDeleteTarget(list);
    setListDeleteOpen(true);
  };

  const openSheet = (task: Task | null) => setSheet((prev) => ({ task, open: true, key: (prev?.key ?? 0) + 1 }));
  const closeSheet = () => setSheet((prev) => (prev ? { ...prev, open: false } : prev));

  const save = (fields: TaskFields) => {
    if (sheet?.task) onUpdate(sheet.task.id, fields);
    else onAdd(fields);
    closeSheet();
  };

  const deleteOpened = () => {
    if (sheet?.task) onRemove(sheet.task.id);
    closeSheet();
  };

  const askDelete = (task: Task) => {
    setDeleteTarget(task);
    setDeleteOpen(true);
  };

  const welcome = (title: string, text: string) => (
    <View style={styles.welcome}>
      <View style={[styles.logoCard, shadow]}>
        <Image
          source={require('@/assets/images/note-list-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Note List Shop by Eri"
        />
      </View>
      <Text style={styles.welcomeTitle}>{title}</Text>
      <Text style={styles.welcomeText}>{text}</Text>
    </View>
  );

  const listsEmpty = noteLists ? welcome('Asnjë listë ende', 'Shtyp + për të krijuar listën e parë.') : null;

  const todoEmpty =
    tasks.length === 0 ? (
      welcome('Asnjë detyrë ende', 'Shtyp + për të shtuar detyrën e parë.')
    ) : (
      <EmptyState icon="checkmark-done-outline" title="Gjithçka u krye!" subtitle="Nuk ke asnjë detyrë të hapur." />
    );

  const doneEmpty = (
    <EmptyState
      icon="checkmark-circle-outline"
      title="Asnjë detyrë e kryer ende"
      subtitle="Detyrat që i shënon me ✓ shfaqen këtu."
    />
  );

  const doneSummary = (
    <View style={styles.doneHeader}>
      <Text style={styles.doneCount}>
        {done.length} {done.length === 1 ? 'detyrë e kryer' : 'detyra të kryera'}
      </Text>
      <Pressable
        onPress={() => setClearing(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Fshi të gjitha detyrat e kryera"
        style={styles.clearButton}
      >
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
        <Text style={styles.clearText}>Pastro të gjitha</Text>
      </Pressable>
    </View>
  );

  const counts: Record<NotesTab, number> = { lists: groups.length, todo: open.length, done: done.length };

  return (
    <View style={styles.flex}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const selected = tab.value === active;
          return (
            <Pressable
              key={tab.value}
              onPress={() => setActive(tab.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.tab, selected && styles.tabActive]}
            >
              <Text
                style={[styles.tabText, selected && styles.tabTextActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {tab.label}
                {counts[tab.value] > 0 ? ` · ${counts[tab.value]}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.flex, slideStyle]}>
          {active === 'lists' ? (
            <NoteListsPanel
              lists={groups}
              empty={listsEmpty ?? <View style={styles.flex} />}
              onOpen={(list) => openGroup(list.id)}
              onDelete={askDeleteGroup}
            />
          ) : (
            <TaskList
              // A fresh list for each tab, so it starts at the top.
              key={active}
              all={byTab[active]}
              query={queries[active]}
              onQueryChange={(text) => changeQuery(active, text)}
              shownCount={shownCounts[active]}
              onShowMore={() => showMore(active)}
              empty={active === 'todo' ? todoEmpty : doneEmpty}
              summary={active === 'done' && done.length > 0 ? doneSummary : null}
              onToggle={onToggle}
              onEdit={openSheet}
              onDelete={askDelete}
            />
          )}
        </Animated.View>
      </GestureDetector>

      {active !== 'done' && (
        <View style={styles.footer}>
          <Pressable
            onPress={() => (active === 'lists' ? openListSheet() : openSheet(null))}
            accessibilityRole="button"
            accessibilityLabel={active === 'lists' ? 'Krijo listë' : 'Shto detyrë'}
            style={[styles.fab, shadow]}
            hitSlop={8}
          >
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      {sheet && <TaskSheet sheet={sheet} onClose={closeSheet} onSave={save} onDelete={deleteOpened} />}
      {listSheet && <NoteListSheet sheet={listSheet} onClose={closeListSheet} onSave={createGroup} />}

      <ConfirmDialog
        visible={listDeleteOpen}
        title="Fshi listën?"
        message={`A je i sigurt që do të fshish "${listDeleteTarget?.name ?? ''}"?`}
        details={
          listDeleteTarget && listDeleteTarget.items.length > 0
            ? [
                `${listDeleteTarget.items.length} ${listDeleteTarget.items.length === 1 ? 'artikull' : 'artikuj'} në të do të fshihen.`,
                'Ky veprim nuk kthehet mbrapsht.',
              ]
            : ['Ky veprim nuk kthehet mbrapsht.']
        }
        confirmLabel="Fshi"
        onConfirm={() => {
          setListDeleteOpen(false);
          if (listDeleteTarget) removeList(listDeleteTarget.id);
        }}
        onCancel={() => setListDeleteOpen(false)}
      />

      <ConfirmDialog
        visible={deleteOpen}
        title="Fshi detyrën?"
        message={`A je i sigurt që do të fshish "${deleteTarget?.title ?? ''}"? Këtë nuk mund ta kthesh.`}
        confirmLabel="Fshi"
        onConfirm={() => {
          setDeleteOpen(false);
          if (deleteTarget) onRemove(deleteTarget.id);
        }}
        onCancel={() => setDeleteOpen(false)}
      />

      <ConfirmDialog
        visible={clearing}
        title="Fshi të kryerat?"
        message={`A je i sigurt që do të fshish ${done.length} ${done.length === 1 ? 'detyrë të kryer' : 'detyra të kryera'}? Këtë nuk mund ta kthesh.`}
        confirmLabel="Fshi"
        onConfirm={() => {
          setClearing(false);
          onClearDone();
        }}
        onCancel={() => setClearing(false)}
      />
    </View>
  );
}

interface TaskListProps {
  /** Every task of the tab, in the order it is shown. */
  all: Task[];
  query: string;
  onQueryChange: (text: string) => void;
  shownCount: number;
  onShowMore: () => void;
  /** Shown when the tab has no tasks at all. */
  empty: ReactElement;
  /** Above the tasks while nothing is typed in the search box. */
  summary: ReactElement | null;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

// One tab. What is typed in the search box is looked for in all the tasks of the tab, and only the matches are cut into
// pages, so a task that is not on screen yet is still found.
function TaskList({
  all,
  query,
  onQueryChange,
  shownCount,
  onShowMore,
  empty,
  summary,
  onToggle,
  onEdit,
  onDelete,
}: TaskListProps) {
  const matches = useMemo(() => filterTasks(all, query), [all, query]);
  const shown = useMemo(() => matches.slice(0, shownCount), [matches, shownCount]);
  const hiddenCount = matches.length - shown.length;
  const filtering = query.trim().length > 0;

  return (
    <View style={styles.flex}>
      {all.length > 0 && (
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="Kërko detyrën…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
            returnKeyType="search"
          />
          {filtering && (
            <Pressable onPress={() => onQueryChange('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Pastro kërkimin">
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      )}

      <FlatList
        data={shown}
        keyExtractor={(task) => task.id}
        style={styles.flex}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          filtering && matches.length > 0 ? (
            <Text style={styles.foundText}>
              {matches.length} {matches.length === 1 ? 'detyrë e gjetur' : 'detyra të gjetura'}
            </Text>
          ) : filtering ? null : (
            summary
          )
        }
        renderItem={({ item }) => <TaskRow task={item} onToggle={onToggle} onPress={onEdit} onDelete={onDelete} />}
        ListFooterComponent={
          hiddenCount > 0 ? (
            <Pressable
              onPress={onShowMore}
              accessibilityRole="button"
              accessibilityLabel={`Shfaq edhe ${Math.min(PAGE_SIZE, hiddenCount)} detyra`}
              style={({ pressed }) => [styles.loadMore, pressed && styles.loadMorePressed]}
            >
              <Ionicons name="chevron-down" size={18} color={colors.primaryDark} />
              <Text style={styles.loadMoreText}>Shfaq edhe {Math.min(PAGE_SIZE, hiddenCount)} detyra</Text>
              <Text style={styles.loadMoreMeta}>
                {shown.length} nga {matches.length}
              </Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          all.length === 0 ? (
            empty
          ) : (
            <EmptyState icon="search-outline" title="Asnjë detyrë nuk u gjet" subtitle={`Nuk ka detyrë me "${query.trim()}"`} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.pill },
  tabActive: { backgroundColor: colors.primaryLight },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primaryDark, fontWeight: '700' },
  searchBox: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 },
  listContent: { flexGrow: 1, paddingBottom: spacing.sm },
  foundText: { fontSize: 13, fontWeight: '600', color: colors.textMuted, paddingHorizontal: spacing.xs, marginBottom: spacing.sm },
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
  doneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  doneCount: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  clearButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearText: { fontSize: 13, fontWeight: '700', color: colors.danger },
  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    backgroundColor: colors.card,
    paddingVertical: spacing.sm + 4,
    marginTop: spacing.xs,
  },
  loadMorePressed: { backgroundColor: colors.primaryLight },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  loadMoreMeta: { fontSize: 12, color: colors.textMuted },
  footer: { paddingBottom: spacing.sm, alignItems: 'flex-end' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retry: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
