import type { Task } from '@/types/models';
import { normalizePriority } from '@/utils/priority';
import { normalizeText } from '@/utils/suggestions';

/** What the add / edit form hands back. */
export interface TaskFields {
  title: string;
  description: string;
  importance: number;
}

export function newTaskId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function createTask({ title, description, importance }: TaskFields): Task {
  const text = description.trim();
  return {
    id: newTaskId(),
    title: title.trim(),
    ...(text ? { description: text } : {}),
    importance: normalizePriority(importance),
    done: false,
    createdAt: Date.now(),
  };
}

export function editTask(task: Task, { title, description, importance }: TaskFields): Task {
  const { description: _old, ...rest } = task;
  const text = description.trim();
  return { ...rest, title: title.trim(), ...(text ? { description: text } : {}), importance: normalizePriority(importance) };
}

/** Checking a task off stamps the time; unchecking brings it back as an open task. */
export function toggleTask(task: Task): Task {
  const { doneAt: _old, ...rest } = task;
  return task.done ? { ...rest, done: false } : { ...rest, done: true, doneAt: Date.now() };
}

/** What was saved on the phone may be damaged or from an older version: keep only what is a real task. */
export function normalizeTasks(raw: unknown): Task[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): Task[] => {
    if (entry === null || typeof entry !== 'object') return [];
    const task = entry as Partial<Record<keyof Task, unknown>>;
    const title = typeof task.title === 'string' ? task.title.trim() : '';
    if (typeof task.id !== 'string' || !title) return [];
    const description = typeof task.description === 'string' ? task.description.trim() : '';
    const done = task.done === true;
    return [
      {
        id: task.id,
        title,
        ...(description ? { description } : {}),
        importance: normalizePriority(task.importance as number),
        done,
        createdAt: Number.isFinite(task.createdAt) ? Number(task.createdAt) : 0,
        ...(done && Number.isFinite(task.doneAt) ? { doneAt: Number(task.doneAt) } : {}),
      },
    ];
  });
}

/** The tasks whose title or description contains what was typed, ignoring case and accents. All of them, not just the ones on screen. */
export function filterTasks(tasks: Task[], query: string): Task[] {
  const needle = normalizeText(query);
  return needle
    ? tasks.filter((task) => normalizeText(`${task.title} ${task.description ?? ''}`).includes(needle))
    : tasks;
}

/** Tasks still to do: the most important first, and among equals the one that has waited longest. */
export function openTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => !task.done).sort((a, b) => b.importance - a.importance || a.createdAt - b.createdAt);
}

/** Tasks that are done, the one checked last on top. */
export function doneTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.done).sort((a, b) => (b.doneAt ?? b.createdAt) - (a.doneAt ?? a.createdAt));
}
