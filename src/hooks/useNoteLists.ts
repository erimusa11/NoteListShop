import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { useAuth } from '@/context/AuthContext';
import type { NoteItem, NoteList, NoteListKind } from '@/types/models';
import {
  createNoteItem,
  createNoteList,
  editNoteItem,
  isRepeatDue,
  type NoteItemFields,
  rememberNoteItems,
  tidyNormalList,
} from '@/utils/noteLists';
import { timesSent } from '@/utils/noteSend';
import {
  cachedNoteHistory,
  cachedNoteLists,
  DEMO_NOTE_SCOPE,
  loadNoteLists,
  saveNoteHistory,
  saveNoteLists,
  subscribeNoteLists,
} from '@/utils/noteListStore';

/** The item checked or unchecked; a checked one remembers when, so a repeating item knows when to come back. */
function withDone(item: NoteItem, done: boolean): NoteItem {
  // Checking or unchecking again starts a new purchase: the item is no longer sent or moved to the checked ones. How many times it
  // went to a list in all is kept, so the next send is counted on top of the earlier ones.
  const { doneAt: _before, archived: _archived, sentTo: _sent, ...rest } = item;
  const sent = timesSent(item);
  const counted = sent > 0 ? { ...rest, sentCount: sent } : rest;
  return done ? { ...counted, done, doneAt: Date.now() } : { ...counted, done };
}

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
      /** Makes a new group (a work list, or a list of products) and returns its id. */
      addList: (name: string, kind?: NoteListKind): string => {
        const list = createNoteList(name, kind);
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
          items: list.items.map((item) => (item.id === itemId ? withDone(item, !item.done) : item)),
        })),
      /** Checks off (or, with `false`, unchecks) these items of a group in one go. */
      setItemsDone: (listId: string, itemIds: string[], done: boolean) => {
        const ids = new Set(itemIds);
        changeList(listId, (list) => ({
          ...list,
          items: list.items.map((item) => (ids.has(item.id) && item.done !== done ? withDone(item, done) : item)),
        }));
      },
      /**
       * Notes which shopping list (an id) a copy of each of these items was sent to; an item mapped to `undefined` is
       * marked as never sent. An item that is not in `sentTo` stays as it is. `counts` sets how many times each was sent.
       */
      markItemsSent: (listId: string, sentTo: Record<string, string | undefined>, counts?: Record<string, number | undefined>) =>
        changeList(listId, (list) => ({
          ...list,
          items: list.items.map((item) => {
            if (!(item.id in sentTo)) return item;
            const { sentTo: _before, sentCount: _count, ...rest } = item;
            const to = sentTo[item.id];
            // `counts` says how many times it was sent now; without it the count stays as it was.
            const count = counts && item.id in counts ? counts[item.id] : item.sentCount;
            return { ...rest, ...(to ? { sentTo: to } : {}), ...(count ? { sentCount: count } : {}) };
          }),
        })),
      /**
       * Brings a checked product that was put away (sent, or moved to the checked ones) back among the products to buy, with the
       * fields just given, instead of making a second one with the same name. It goes to the end, as a new product would.
       */
      reviveItem: (listId: string, itemId: string, fields: NoteItemFields) =>
        changeList(listId, (list) => ({
          ...list,
          items: list.items.map((item) => {
            if (item.id !== itemId) return item;
            // The copy it sent before was of the last time; this one is bought again.
            const { sentTo: _sent, ...back } = withDone(editNoteItem(item, fields), false);
            return { ...back, createdAt: Date.now() };
          }),
        })),
      /** Moves these checked items to the part of the checked ones (or, with `false`, back among the others) without sending them. */
      archiveItems: (listId: string, itemIds: string[], archived: boolean) => {
        const ids = new Set(itemIds);
        changeList(listId, (list) => ({
          ...list,
          items: list.items.map((item) => {
            if (!ids.has(item.id) || !item.done) return item;
            const { archived: _before, ...rest } = item;
            return archived ? { ...rest, archived: true } : rest;
          }),
        }));
      },
      /** Brings back unchecked every repeating item whose days have passed since it was checked; saves nothing when none is due. */
      resetRepeating: () => {
        const now = Date.now();
        const current = cachedNoteLists(scope);
        if (!current?.some((list) => list.items.some((item) => isRepeatDue(item, now)))) return;
        commit((all) =>
          all.map((list) => ({
            ...list,
            items: list.items.map((item) => {
              if (!isRepeatDue(item, now)) return item;
              // A product that comes back is to be bought again: its copy in a list is of the last time.
              const { sentTo: _sent, ...back } = withDone(item, false);
              return back;
            }),
          })),
        );
      },
      /** Clears the checked items of the normal list that were not repeating and are a month old; saves nothing when there are none. */
      clearStale: () => {
        const now = Date.now();
        const current = cachedNoteLists(scope);
        if (!current?.some((list) => tidyNormalList(list, now) !== list)) return;
        commit((all) => all.map((list) => tidyNormalList(list, now)));
      },
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
