import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NoteList } from '@/types/models';
import { type NoteHistoryEntry, normalizeNoteHistory, normalizeNoteLists } from '@/utils/noteLists';

/** Lists made in demo mode: kept in memory only, like the rest of the demo. */
export const DEMO_NOTE_SCOPE = 'demo';

// The groups of the Note List Shop page live on the phone, one copy per account, like its tasks, and are only read when
// that page is first opened. Unlike the tasks they are also shown on a screen of their own (the group that was opened),
// so this store tells everyone who listens when something changes, and both screens always show the same lists.
// Next to them it keeps what was deleted (one entry per name), only to suggest it again when adding an item.
const cache = new Map<string, NoteList[]>();
const historyCache = new Map<string, NoteHistoryEntry[]>();
const listeners = new Set<() => void>();

const storageKey = (scope: string) => `noteLists.${scope}`;
const historyKey = (scope: string) => `noteHistory.${scope}`;
const emit = () => listeners.forEach((listener) => listener());

const NO_HISTORY: NoteHistoryEntry[] = [];

export function cachedNoteLists(scope: string): NoteList[] | null {
  return cache.get(scope) ?? null;
}

export function cachedNoteHistory(scope: string): NoteHistoryEntry[] {
  return historyCache.get(scope) ?? NO_HISTORY;
}

export function subscribeNoteLists(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function readJson(key: string): Promise<unknown> {
  const raw = await AsyncStorage.getItem(key);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    // A copy that cannot be parsed has nothing to save; start again from an empty list.
    return [];
  }
}

/** Rejects when the phone cannot be read, so nothing is shown as empty (and then overwritten) by mistake. */
export async function loadNoteLists(scope: string): Promise<NoteList[]> {
  let lists: NoteList[] = [];
  let history: NoteHistoryEntry[] = [];
  if (scope !== DEMO_NOTE_SCOPE) {
    const [rawLists, rawHistory] = await Promise.all([readJson(storageKey(scope)), readJson(historyKey(scope))]);
    lists = normalizeNoteLists(rawLists);
    history = normalizeNoteHistory(rawHistory);
  }
  // Something was saved while reading: that is newer.
  const newer = cache.get(scope);
  if (newer) return newer;
  cache.set(scope, lists);
  historyCache.set(scope, history);
  emit();
  return lists;
}

export function saveNoteLists(scope: string, lists: NoteList[]) {
  cache.set(scope, lists);
  emit();
  if (scope !== DEMO_NOTE_SCOPE) AsyncStorage.setItem(storageKey(scope), JSON.stringify(lists)).catch(() => {});
}

export function saveNoteHistory(scope: string, history: NoteHistoryEntry[]) {
  historyCache.set(scope, history);
  emit();
  if (scope !== DEMO_NOTE_SCOPE) AsyncStorage.setItem(historyKey(scope), JSON.stringify(history)).catch(() => {});
}

export function clearDemoNoteLists() {
  cache.delete(DEMO_NOTE_SCOPE);
  historyCache.delete(DEMO_NOTE_SCOPE);
  emit();
}
