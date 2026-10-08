import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import type { Task } from '@/types/models';
import { cachedTasks, DEMO_SCOPE, loadTasks, saveTasks } from '@/utils/taskStore';
import { createTask, editTask, toggleTask, type TaskFields } from '@/utils/tasks';

interface Loaded {
  scope: string;
  tasks: Task[];
}

/**
 * The tasks of the Note List Shop page. Nothing is read until a component uses this hook, which is only the page itself,
 * so the rest of the app never pays for it. `tasks` is null while they are being read from the phone.
 */
export function useTasks() {
  const { user, demoMode } = useAuth();
  const scope = !demoMode && user ? user.uid : DEMO_SCOPE;

  const [loaded, setLoaded] = useState<Loaded | null>(() => {
    const hit = cachedTasks(scope);
    return hit ? { scope, tasks: hit } : null;
  });
  const [attempt, setAttempt] = useState(0);
  const [failedAttempt, setFailedAttempt] = useState<number | null>(null);
  const tasks = loaded?.scope === scope ? loaded.tasks : null;
  const hasTasks = tasks !== null;

  useEffect(() => {
    if (hasTasks) return;
    let cancelled = false;
    loadTasks(scope).then(
      (list) => {
        if (!cancelled) setLoaded({ scope, tasks: list });
      },
      () => {
        if (!cancelled) setFailedAttempt(attempt);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [scope, attempt, hasTasks]);

  // The saved copy is the source of truth, so a change never starts from a list that is a render behind.
  const commit = useCallback(
    (change: (list: Task[]) => Task[]) => {
      const current = cachedTasks(scope);
      if (!current) return;
      const next = change(current);
      saveTasks(scope, next);
      setLoaded({ scope, tasks: next });
    },
    [scope],
  );

  const actions = useMemo(
    () => ({
      add: (fields: TaskFields) => commit((list) => [...list, createTask(fields)]),
      update: (id: string, fields: TaskFields) =>
        commit((list) => list.map((task) => (task.id === id ? editTask(task, fields) : task))),
      toggle: (id: string) => commit((list) => list.map((task) => (task.id === id ? toggleTask(task) : task))),
      remove: (id: string) => commit((list) => list.filter((task) => task.id !== id)),
      clearDone: () => commit((list) => list.filter((task) => !task.done)),
    }),
    [commit],
  );

  return {
    tasks,
    failed: !hasTasks && failedAttempt === attempt,
    retry: () => setAttempt((n) => n + 1),
    ...actions,
  };
}
