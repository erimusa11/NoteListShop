/** How long a deleted account waits before it is erased for good. Signing in again within this time brings it back. */
export const DELETE_GRACE_DAYS = 2;
export const DELETE_GRACE_MS = DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000;

/** The day and hour an account marked for deletion is erased, for the message shown after deleting. */
export function formatDeleteMoment(at: number): string {
  const date = new Date(at);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} në ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
