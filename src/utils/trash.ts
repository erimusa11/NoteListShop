/** How long a deleted list is kept in the trash before it is gone for good. */
export const TRASH_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** True once a list deleted at `deletedAt` has been in the trash for the full time. */
export function isTrashExpired(deletedAt: number, now: number = Date.now()): boolean {
  return now - deletedAt >= TRASH_DAYS * DAY_MS;
}

/** Whole days (rounded up, at least 1) until the list in the trash is deleted for good. */
export function trashDaysLeft(deletedAt: number, now: number = Date.now()): number {
  const left = Math.ceil((deletedAt + TRASH_DAYS * DAY_MS - now) / DAY_MS);
  return Math.min(TRASH_DAYS, Math.max(1, left));
}

/** "9 ditë", for the time left in the trash ("ditë" is the same for one and for many). */
export function formatTrashLeft(deletedAt: number, now: number = Date.now()): string {
  return `${trashDaysLeft(deletedAt, now)} ditë`;
}
