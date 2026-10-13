export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  price: number | null;
  bought: boolean;
  createdAt: number;
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
export type AttendancePlace = 'Cerdhe' | 'Kopesht' | 'Shkolle' | 'sick';

/** The days each child went to a place, or was sick: day ('YYYY-MM-DD') → child → place. */
export type Attendance = Record<string, Record<string, AttendancePlace>>;

/** A to-do on the Note List Shop page. They are not part of any shopping list. */
export interface Task {
  id: string;
  title: string;
  /** Optional text under the title. */
  description?: string;
  /** 1 = normal … 5 = urgent, the same scale as an item's priority. */
  importance: number;
  done: boolean;
  createdAt: number;
  /** When it was checked off; the done tab lists the latest first. */
  doneAt?: number;
}

/** How an amount on the Note List Shop page is counted: by number (copë), kilograms, grams or liters. */
export type QuantityUnit = 'pcs' | 'kg' | 'gr' | 'l';

/** One thing in a group (a note list) on the Note List Shop page. */
export interface NoteItem {
  id: string;
  name: string;
  /** Above zero; 1 when none was given. */
  quantity: number;
  unit: QuantityUnit;
  done: boolean;
  createdAt: number;
}

/** A group on the Note List Shop page: a named list, with the day it was made, that holds its own items. */
export interface NoteList {
  id: string;
  name: string;
  createdAt: number;
  items: NoteItem[];
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
