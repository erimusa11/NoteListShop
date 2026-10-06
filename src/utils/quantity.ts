export const DEFAULT_QUANTITY = '1';

// While typing: digits and a single decimal point (a comma counts as the point).
export function sanitizeQuantityInput(text: string): string {
  const cleaned = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const dot = cleaned.indexOf('.');
  return dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
}

// Only a plain number above zero counts. Anything else (empty, 0, old free text such as "1kg") is 1.
export function parseQuantity(value: string | null | undefined): number {
  const text = (value ?? '').trim().replace(',', '.');
  const n = /^(\d+(\.\d*)?|\.\d+)$/.test(text) ? Number(text) : 0;
  return n > 0 ? n : 1;
}

// What gets saved: the number as text, and "1" when nothing valid was typed.
export function normalizeQuantity(text: string): string {
  return String(parseQuantity(text));
}
