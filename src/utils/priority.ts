import { priorityColors } from '@/theme/noteTones';

export type PriorityLevel = 1 | 2 | 3 | 4 | 5;

export const DEFAULT_PRIORITY: PriorityLevel = 1;

export const PRIORITY_LEVELS: { level: PriorityLevel; label: string; color: string }[] = [
  { level: 1, label: 'Normale', color: priorityColors[0] },
  { level: 2, label: 'Pak e rëndësishme', color: priorityColors[1] },
  { level: 3, label: 'E rëndësishme', color: priorityColors[2] },
  { level: 4, label: 'Shumë e rëndësishme', color: priorityColors[3] },
  { level: 5, label: 'Urgjente', color: priorityColors[4] },
];

export function normalizePriority(value: number | undefined | null): PriorityLevel {
  const n = Math.round(Number(value));
  return (n >= 1 && n <= 5 ? n : DEFAULT_PRIORITY) as PriorityLevel;
}

export function priorityInfo(value: number | undefined | null) {
  return PRIORITY_LEVELS[normalizePriority(value) - 1];
}
