export const DEFAULT_QUANTITY = '1';
// Long enough for any real amount; a few hundred digits would overflow to Infinity and turn the totals into NaN.
const MAX_QUANTITY_LENGTH = 9;

// While typing: digits and a single decimal point (a comma counts as the point).
export function sanitizeQuantityInput(text: string): string {
  const cleaned = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const dot = cleaned.indexOf('.');
  const single = dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
  return single.slice(0, MAX_QUANTITY_LENGTH);
}

// Only a plain number above zero counts. Anything else (empty, 0, old free text such as "1kg") is 1.
// `String()` because data that came from an account may hold a number instead of text.
export function parseQuantity(value: string | null | undefined): number {
  const text = String(value ?? '').trim().replace(',', '.');
  const n = /^(\d+(\.\d*)?|\.\d+)$/.test(text) ? Number(text) : 0;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// What gets saved: the number as text, and "1" when nothing valid was typed.
export function normalizeQuantity(text: string): string {
  return String(parseQuantity(text));
}
