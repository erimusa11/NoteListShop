import type { ItemListKey, NewTripItem, NoteItem, NoteList, NoteSection } from '@/types/models';
import { CATEGORIES } from '@/utils/categories';
import { isProductList, NOTE_SECTIONS, sectionOf, UNITS } from '@/utils/noteLists';
import { parseQuantity } from '@/utils/quantity';

/**
 * Where the items of each part of a shopping list go in the latest list of Note Shop List: the food into Produktet, the
 * detergents into Detergjente & Extra.
 */
export const SECTION_TARGET: Record<NoteSection, ItemListKey> = {
  ushqime: 'items',
  detergjente: 'supplies',
};

/** The name of the category a part goes to, as it is called in the list ("Produktet", "Detergjente & Extra"). */
export function targetLabel(section: NoteSection): string {
  return CATEGORIES.find((category) => category.key === SECTION_TARGET[section])?.label ?? '';
}

/** The items that are checked off, the only ones that can be sent, in the order of the tabs (Ushqime first). */
export function sendableItems(list: Pick<NoteList, 'items' | 'kind'>): NoteItem[] {
  if (!isProductList(list)) return [];
  return NOTE_SECTIONS.flatMap(({ value }) => list.items.filter((item) => item.done && sectionOf(item) === value));
}

/** Whether a copy of the item already went to this list. */
export const isSentTo = (item: Pick<NoteItem, 'sentTo'>, tripId: string | undefined): boolean =>
  tripId !== undefined && item.sentTo === tripId;

// Prices are whole lines in a note list ("300 Lekë" for 3 copë), but in a list of Note Shop List they are for one, and the row
// costs price × quantity. The price of one, when it comes out in whole cents so the row costs exactly what the line did.
function priceOfOne(line: number, amount: number): number | null {
  if (amount === 1) return line;
  const one = Math.round((line / amount) * 100) / 100;
  return Math.abs(one * amount - line) < 1e-6 ? one : null;
}

// The amount as it is written in a name: up to the 9 characters the quantity field takes, so 0,125 kg is not shown as 0,13 kg.
const amountFormat = new Intl.NumberFormat('sq-AL', { maximumFractionDigits: 9 });

function amountText(item: NoteItem): string {
  const unit = UNITS.find((entry) => entry.value === item.unit)?.short ?? '';
  return `${amountFormat.format(item.quantity)} ${unit}`.trim();
}

/**
 * What an item of a note list becomes in the list it is sent to. The row there costs the same as the line did:
 * - Produktet counts a number of items: copë keep their amount (the price becomes the price of one). Any other unit (kg, gr,
 *   l) has no place there, so the amount goes in the name ("Domate (1,5 kg)") and the quantity stays 1. So does an amount the
 *   list could not read back as the same number, or a price that cannot be split into whole cents.
 * - Detergjente & Extra counts no quantity at all: the price is the whole line, and an amount other than one copë goes in the name.
 * The copy is checked off, as the item was.
 */
export function tripEntryFor(item: NoteItem): NewTripItem {
  const list = SECTION_TARGET[sectionOf(item)];
  const showQuantity = CATEGORIES.find((category) => category.key === list)?.showQuantity ?? false;
  const line = item.price ?? null;
  const single = item.quantity === 1 && item.unit === 'pcs';
  const withAmount = `${item.name} (${amountText(item)})`;
  // The quantity is kept as text, and the list reads only a plain number from it (a tiny one such as 1e-7 would read as 1).
  const readable = parseQuantity(String(item.quantity)) === item.quantity;

  if (showQuantity && item.unit === 'pcs' && readable) {
    const one = line === null ? null : priceOfOne(line, item.quantity);
    if (line === null || one !== null) {
      return { list, name: item.name, quantity: String(item.quantity), price: one, bought: true };
    }
    return { list, name: withAmount, quantity: '1', price: line, bought: true };
  }
  if (showQuantity) return { list, name: withAmount, quantity: '1', price: line, bought: true };
  return { list, name: single ? item.name : withAmount, quantity: '', price: line, bought: true };
}
