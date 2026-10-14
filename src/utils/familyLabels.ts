import { normalizeText } from '@/utils/suggestions';

// The family's choices (the people of Dëshirat, Shendeti, Fëmijët, Kopesht & Shkolle…, and the cars of Makina & Shërbime) are saved
// in the lists under these six fixed names, so every list, total, report and calendar that already has them keeps working.
// What the person sees is a label for each one, which they can change in their profile: "Fëmija 1" until then.
export const LABEL_KEYS = ['Alois', 'Drion', 'Alma', 'Eri', 'Kia Morning', 'Hyundai Tucson'] as const;
export type LabelKey = (typeof LABEL_KEYS)[number];

export const DEFAULT_LABELS: Record<LabelKey, string> = {
  Alois: 'Fëmija 1',
  Drion: 'Fëmija 2',
  Alma: 'Prindi 1',
  Eri: 'Prindi 2',
  'Kia Morning': 'Makina 1',
  'Hyundai Tucson': 'Makina 2',
};

/** The labels the person changed; a name that is missing shows its default. */
export type CustomLabels = Partial<Record<LabelKey, string>>;

export const MAX_LABEL_LENGTH = 24;

/** Trims and collapses the spaces inside, and keeps it short enough for the chips and totals. */
export const cleanLabel = (text: string): string =>
  Array.from(text.replace(/\s+/g, ' ').trim()).slice(0, MAX_LABEL_LENGTH).join('').trim();

const KEY_BY_TEXT = new Map<string, LabelKey>(LABEL_KEYS.map((key) => [normalizeText(key), key]));

/** The fixed name this text is (ignoring case and accents, like the lists do), or null when it is any other text. */
export const labelKeyOf = (name: string | undefined | null): LabelKey | null => KEY_BY_TEXT.get(normalizeText(name ?? '')) ?? null;

/** What to show for a choice or a name: its label when it is one of the six, otherwise the text itself. */
export function labelOf(name: string, custom: CustomLabels): string {
  const key = labelKeyOf(name);
  return key ? custom[key] || DEFAULT_LABELS[key] : name;
}

/**
 * What a text typed in place of a name means: when it is the label of one of the six (or the fixed name itself), the fixed
 * name, so the item stays under its choice; any other text stays as typed.
 */
export function nameFromLabel(text: string, custom: CustomLabels): string {
  const wanted = normalizeText(text);
  for (const key of LABEL_KEYS) {
    if (normalizeText(custom[key] || DEFAULT_LABELS[key]) === wanted) return key;
  }
  return labelKeyOf(text) ?? text;
}

/** The first letters of a label for a small avatar: "F1" for "Fëmija 1" (the digit tells two of a kind apart), "D" for "Drini". */
export function initialOf(label: string): string {
  const text = label.trim();
  const first = (Array.from(text)[0] ?? '').toUpperCase();
  const digit = /(\d+)$/.exec(text)?.[1];
  return digit && text.length > digit.length ? `${first}${digit.slice(-1)}` : first;
}

/** Data from the account or the phone may be damaged: only the six names, each with a real label. Always in the order of LABEL_KEYS. */
export function normalizeLabels(raw: unknown): CustomLabels {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const result: CustomLabels = {};
  for (const key of LABEL_KEYS) {
    const value = source[key];
    const text = typeof value === 'string' ? cleanLabel(value) : '';
    if (text && text !== DEFAULT_LABELS[key]) result[key] = text;
  }
  return result;
}
