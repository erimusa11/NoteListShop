export type PriorityLevel = 1 | 2 | 3 | 4 | 5;

export const DEFAULT_PRIORITY: PriorityLevel = 1;

export const PRIORITY_LEVELS: { level: PriorityLevel; label: string; color: string }[] = [
  { level: 1, label: 'Normale', color: '#8A7E76' },
  { level: 2, label: 'Pak e rëndësishme', color: '#3E7CB1' },
  { level: 3, label: 'E rëndësishme', color: '#D99100' },
  { level: 4, label: 'Shumë e rëndësishme', color: '#E8590C' },
  { level: 5, label: 'Urgjente', color: '#D32F2F' },
];

export function normalizePriority(value: number | undefined | null): PriorityLevel {
  const n = Math.round(Number(value));
  return (n >= 1 && n <= 5 ? n : DEFAULT_PRIORITY) as PriorityLevel;
}

export function priorityInfo(value: number | undefined | null) {
  return PRIORITY_LEVELS[normalizePriority(value) - 1];
}
