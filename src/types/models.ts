export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  price: number | null;
  bought: boolean;
  createdAt: number;
  /** When it was last checked off (the newest-checked view of Të shpenzuarat uses it). Missing on items checked before it was noted: they count from `createdAt`. */
  boughtAt?: number;
  /** 1 = normal … 5 = urgent. Missing means 1. */
  priority?: number;
  /** Set when the item is starred. Its copies in other lists carry the same id and follow its name. */
  sharedId?: string;
  /** What it was for (e.g. "Servis"), in a category that asks for it; shown under the name. */
  note?: string;
  /** Who it is for (e.g. "Drion"), in a category that asks for it (`personOptions`). */
  person?: string;
  /** Counted by the day (Cerdhe, Kopesht…): the quantity is the number of days and the price is what one day costs. */
  perDay?: boolean;
}

/** Where a child spent a day: one of the places that are paid by the day, or at home sick. */
export type AttendancePlace = 'Cerdhe' | 'Kopesht' | 'Shkolle' | 'Kurse' | 'sick';

/** The days each child went to a place, or was sick: day ('YYYY-MM-DD') → child → place. */
export type Attendance = Record<string, Record<string, AttendancePlace>>;

/** How an amount on the Note List Shop page is counted: by number (copë), kilograms, grams or liters. */
export type QuantityUnit = 'pcs' | 'kg' | 'gr' | 'l';

/** The two parts a shopping list is divided in. */
export type NoteSection = 'ushqime' | 'detergjente';

/** One thing in a group (a note list) on the Note List Shop page. */
export interface NoteItem {
  id: string;
  name: string;
  /** Above zero; 1 when none was given. */
  quantity: number;
  unit: QuantityUnit;
  done: boolean;
  createdAt: number;
  /** What the item costs (for the whole line), in a list of products. Missing when none was given. */
  price?: number;
  /** 1 to 5, in a normal list, where an item is a to-do with a priority. Missing means the lowest. */
  importance?: number;
  /** In a list of products: the part it belongs to. Missing means Ushqime: that is what every product was before the parts existed. */
  section?: NoteSection;
  /** In a list of products: the id of the shopping list (Note Shop List) a copy of it was sent to. Missing while it was never sent. */
  sentTo?: string;
  /** In a list of products: how many times a copy of it was sent to a list. Missing means once if `sentTo` is set (from before it was counted), otherwise never. */
  sentCount?: number;
  /** In a normal list: after this many days a checked item comes back unchecked, like a reminder. Missing means it does not repeat. */
  repeatDays?: number;
  /** When the item was last checked; the repeat counts its days from here. */
  doneAt?: number;
  /** In a list of products: a checked item that was moved to the checked ones without being sent anywhere. */
  archived?: boolean;
}

/** What a group is for: a normal list (text items with a priority, like to-dos) or a shopping list of products, whose items have an amount and a price that adds up. */
export type NoteListKind = 'work' | 'products';

/** A group on the Note List Shop page: a named list, with the day it was made, that holds its own items. */
export interface NoteList {
  id: string;
  name: string;
  createdAt: number;
  items: NoteItem[];
  /** Missing means a normal list: that is what every group was before the kinds existed. */
  kind?: NoteListKind;
  /** Set when the group is deleted: it waits in the trash, and can be brought back, until `TRASH_DAYS` have passed. */
  deletedAt?: number;
}

/** What an income is: a salary, a qokë given to us, or any other extra income. */
export type IncomeKind = 'rroga' | 'qoka' | 'shtese';

export interface IncomeEntry {
  id: string;
  name: string;
  amount: number;
  createdAt: number;
  /** Missing means a salary: that is what every income was before the kinds existed. */
  kind?: IncomeKind;
}

/** An item to be added to a list in one go (for example a copy of a checked item of a note list). */
export interface NewTripItem {
  list: ItemListKey;
  name: string;
  quantity: string;
  price: number | null;
  /** Added already checked off, as the item it is a copy of was. Missing means unchecked. */
  bought?: boolean;
}

/** Where an item is: its category and its id there, enough to find it again (to take it out). */
export interface TripItemRef {
  list: ItemListKey;
  id: string;
}

/** What a deleted item leaves behind in its list: just enough to suggest it again when adding one. */
export interface RemovedItem extends Pick<ShoppingItem, 'name' | 'quantity' | 'price' | 'createdAt' | 'note' | 'person'> {
  list: ItemListKey;
}

/** The item lists every shopping list owns. Each list has its own copy, so checking one off only affects that list. */
export type ItemListKey =
  | 'items'
  | 'supplies'
  | 'bills'
  | 'wishlist'
  | 'clothes'
  | 'fuel'
  | 'refuel'
  | 'online'
  | 'outings'
  | 'kitchen'
  | 'playstation'
  | 'health'
  | 'children'
  | 'bathroom'
  | 'home'
  | 'daily'
  | 'school'
  | 'qoka';

// Besides `items` (Produktet), a list may not have every category yet (lists saved before it was added).
// The categories and their names are in utils/categories.ts.
export interface ShoppingTrip extends Partial<Record<Exclude<ItemListKey, 'items'>, ShoppingItem[]>> {
  id: string;
  name: string;
  createdAt: number;
  budget: number | null;
  /** Produktet */
  items: ShoppingItem[];
  incomes?: IncomeEntry[];
  /** The calendar of the category that counts days (Kopesht & Shkolle): what the children did on each day. */
  attendance?: Attendance;
  /** What the calendar counts: the days of each child at each place (with the price of a day) and its fixed amounts. Not part of the category's own list. */
  calendarItems?: ShoppingItem[];
  /** Items deleted from this list, one per name and category. Only used for suggestions; they are not shown anywhere else. */
  removed?: RemovedItem[];
  /** Set when the list is deleted: it waits in the trash, and can be brought back, until `TRASH_DAYS` have passed. */
  deletedAt?: number;
}
