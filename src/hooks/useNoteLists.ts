import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { useAuth } from '@/context/AuthContext';
import type { NoteItem, NoteList } from '@/types/models';
import {
  createNoteItem,
  createNoteList,
  editNoteItem,
  type NoteItemFields,
  rememberNoteItems,
} from '@/utils/noteLists';
import {
  cachedNoteHistory,
  cachedNoteLists,
  DEMO_NOTE_SCOPE,
  loadNoteLists,
  saveNoteHistory,
  saveNoteLists,
  subscribeNoteLists,
} from '@/utils/noteListStore';

/**
 * The groups of the Note List Shop page (each with its own items). Nothing is read until a component uses this hook;
 * `lists` is null while they are being read from the phone. Every component that uses it sees the same lists.
 */
export function useNoteLists() {
  const { user, demoMode } = useAuth();
  const scope = !demoMode && user ? user.uid : DEMO_NOTE_SCOPE;

  const allLists = useSyncExternalStore(
    subscribeNoteLists,
    () => cachedNoteLists(scope),
    () => null,
  );
  // Deleted groups wait in the trash (newest deletion first) and are left out of `lists` until they are brought back.
  const lists = useMemo(() => allLists?.filter((list) => list.deletedAt === undefined) ?? null, [allLists]);
  const trashedLists = useMemo(
    () =>
      (allLists ?? [])
        .filter((list) => list.deletedAt !== undefined)
        .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [allLists],
  );
  // What was deleted, kept only to suggest it again when adding an item.
  const history = useSyncExternalStore(
    subscribeNoteLists,
    () => cachedNoteHistory(scope),
    () => cachedNoteHistory(scope),
  );
  const hasLists = allLists !== null;
  const [attempt, setAttempt] = useState(0);
  const [failedAttempt, setFailedAttempt] = useState<number | null>(null);

  useEffect(() => {
    if (hasLists) return;
    let cancelled = false;
    loadNoteLists(scope).catch(() => {
      if (!cancelled) setFailedAttempt(attempt);
    });
    return () => {
      cancelled = true;
    };
  }, [scope, attempt, hasLists]);

  // The saved copy is the source of truth, so a change never starts from a list that is a render behind.
  const commit = useCallback(
    (change: (all: NoteList[]) => NoteList[]) => {
      const current = cachedNoteLists(scope);
      if (current) saveNoteLists(scope, change(current));
    },
    [scope],
  );
  const changeList = useCallback(
    (listId: string, change: (list: NoteList) => NoteList) =>
      commit((all) => all.map((list) => (list.id === listId ? change(list) : list))),
    [commit],
  );

  const forget = useCallback(
    (items: NoteItem[]) => {
      if (items.length > 0) saveNoteHistory(scope, rememberNoteItems(cachedNoteHistory(scope), items));
    },
    [scope],
  );

  const actions = useMemo(
    () => ({
      /** Makes a new group and returns its id. */
      addList: (name: string): string => {
        const list = createNoteList(name);
        commit((all) => [...all, list]);
        return list.id;
      },
      renameList: (id: string, name: string) => changeList(id, (list) => ({ ...list, name: name.trim() || list.name })),
      /** Moves the group to the trash, where it can be brought back until `TRASH_DAYS` have passed. */
      removeList: (id: string) => {
        const now = Date.now();
        changeList(id, (list) => ({ ...list, deletedAt: now }));
      },
      restoreList: (id: string) =>
        changeList(id, (list) => {
          const { deletedAt: _deletedAt, ...restored } = list;
          return restored;
        }),
      /** Deletes a group from the trash for good; what it held is only kept as suggestions. */
      purgeList: (id: string) => {
        forget(cachedNoteLists(scope)?.find((list) => list.id === id)?.items ?? []);
        commit((all) => all.filter((list) => list.id !== id));
      },
      addItem: (listId: string, fields: NoteItemFields) =>
        changeList(listId, (list) => ({ ...list, items: [...list.items, createNoteItem(fields)] })),
      updateItem: (listId: string, itemId: string, fields: NoteItemFields) =>
        changeList(listId, (list) => ({
          ...list,
          items: list.items.map((item) => (item.id === itemId ? editNoteItem(item, fields) : item)),
        })),
      toggleItem: (listId: string, itemId: string) =>
        changeList(listId, (list) => ({
          ...list,
          items: list.items.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
        })),
      /** Puts a deleted item back in its group, at the place its creation date gives it. */
      restoreItem: (listId: string, item: NoteItem) =>
        changeList(listId, (list) => {
          if (list.items.some((entry) => entry.id === item.id)) return list;
          const at = list.items.findIndex((entry) => entry.createdAt > item.createdAt);
          const items = at === -1 ? [...list.items, item] : [...list.items.slice(0, at), item, ...list.items.slice(at)];
          return { ...list, items };
        }),
      removeItem: (listId: string, itemId: string) => {
        const list = cachedNoteLists(scope)?.find((entry) => entry.id === listId);
        forget(list?.items.filter((item) => item.id === itemId) ?? []);
        changeList(listId, (current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId) }));
      },
    }),
    [commit, changeList, forget, scope],
  );

  return {
    lists,
    trashedLists,
    history,
    failed: !hasLists && failedAttempt === attempt,
    retry: () => setAttempt((n) => n + 1),
    ...actions,
  };
}
