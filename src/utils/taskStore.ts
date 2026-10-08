import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Task } from '@/types/models';
import { normalizeTasks } from '@/utils/tasks';

/** Tasks made in demo mode: kept in memory only, like the rest of the demo. */
export const DEMO_SCOPE = 'demo';

// The tasks of the Note List Shop page live on the phone, one copy per account, and are only read when that page is first
// opened. What was read or written is kept here for the rest of the session, so leaving the page and coming back
// does not read the phone again.
const cache = new Map<string, Task[]>();

const storageKey = (scope: string) => `tasks.${scope}`;

export function cachedTasks(scope: string): Task[] | null {
  return cache.get(scope) ?? null;
}

/** Rejects when the phone cannot be read, so nothing is shown as empty (and then overwritten) by mistake. */
export async function loadTasks(scope: string): Promise<Task[]> {
  let tasks: Task[] = [];
  if (scope !== DEMO_SCOPE) {
    const raw = await AsyncStorage.getItem(storageKey(scope));
    try {
      tasks = normalizeTasks(raw ? JSON.parse(raw) : []);
    } catch {
      // A copy that cannot be parsed has nothing to save; start again from an empty list.
    }
  }
  // Something was saved while reading: that is newer.
  const newer = cache.get(scope);
  if (newer) return newer;
  cache.set(scope, tasks);
  return tasks;
}

export function saveTasks(scope: string, tasks: Task[]) {
  cache.set(scope, tasks);
  if (scope !== DEMO_SCOPE) AsyncStorage.setItem(storageKey(scope), JSON.stringify(tasks)).catch(() => {});
}

export function clearDemoTasks() {
  cache.delete(DEMO_SCOPE);
}
