import type { Attendance, AttendancePlace, ShoppingItem, ShoppingTrip } from '@/types/models';
import { CATEGORIES, type Category } from '@/utils/categories';
import { formatDayMonthInline } from '@/utils/dates';
import { optionColor, personColor } from '@/utils/options';
import { DEFAULT_PRIORITY } from '@/utils/priority';
import { parseQuantity } from '@/utils/quantity';
import { normalizeText } from '@/utils/suggestions';
import { itemTotal } from '@/utils/totals';

// The calendar of a category that is paid by the day (Kopesht & Shkolle). Every day each child went to a place (Cerdhe,
// Kopesht, Shkolle) or was sick is marked on `trip.attendance`. The days at a paid place also live as one item per child
// and place (`perDay`) in `trip.calendarItems`: its quantity is the number of days and its price what one day costs. They
// are not in the lists of the category until a month of the calendar is added to one from the add form. Marking a day moves that quantity by one; typing the
// days directly sets it, and the marks are then only the diary. Sick days cost nothing.

export type PaidPlace = Exclude<AttendancePlace, 'sick'>;

export const SICK = 'sick' as const;
export const SICK_COLOR = '#E03131';

export interface PlaceInfo {
  value: AttendancePlace;
  label: string;
  color: string;
}

/** What a day can be marked with: the paid places of the category in their order, then sick. */
export function attendancePlaces(category: Category): PlaceInfo[] {
  const names = category.nameOptions ?? [];
  // The same colors the level has in the totals above the list, so a color means one thing on the whole page.
  const paid = (category.attendancePlaces ?? []).map((place): PlaceInfo => ({
    value: place,
    label: place,
    color: optionColor(Math.max(0, names.indexOf(place))),
  }));
  return [...paid, { value: SICK, label: 'Sëmurë', color: SICK_COLOR }];
}

export interface KidInfo {
  name: string;
  /** The color the person has everywhere else in the app (the totals and charts). */
  color: string;
  /** The letter on the avatar and on the days of the calendar. */
  initial: string;
}

/** The people of the category (Drion, Alois), in order, each with their own color. */
export function attendanceKids(category: Category): KidInfo[] {
  return (category.personOptions ?? []).map((name, index) => ({
    name,
    color: personColor(index),
    initial: name.trim().charAt(0).toUpperCase(),
  }));
}

const KNOWN_PLACES = new Set<string>(['Cerdhe', 'Kopesht', 'Shkolle', SICK]);
const NO_MARKS: Attendance = {};
const NO_ITEMS: ShoppingItem[] = [];

/**
 * What the calendar counts: the days of each child at each place (with what a day costs) and the fixed amounts. They live
 * apart from the lists of the category, which only hold what is added to them by hand (a month of the calendar can be
 * added from the add form).
 */
export const calendarItemsOf = (trip: ShoppingTrip | undefined): ShoppingItem[] => trip?.calendarItems ?? NO_ITEMS;

/** The calendar of a list, with anything that is not a day, a child and a known place left out (damaged or old data). */
export function readAttendance(trip: ShoppingTrip | undefined): Attendance {
  const raw: unknown = trip?.attendance;
  if (!raw || typeof raw !== 'object') return NO_MARKS;
  const clean: Attendance = {};
  for (const [day, marks] of Object.entries(raw as Record<string, unknown>)) {
    if (!marks || typeof marks !== 'object') continue;
    const kept: Record<string, AttendancePlace> = {};
    for (const [kid, place] of Object.entries(marks as Record<string, unknown>)) {
      if (typeof place === 'string' && KNOWN_PLACES.has(place)) kept[kid] = place as AttendancePlace;
    }
    if (Object.keys(kept).length > 0) clean[day] = kept;
  }
  return clean;
}

// ---------------------------------------------------------------------------------------------------------------------
// Days
// ---------------------------------------------------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' of the local day. */
export const dayKey = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** The Date (at midday, so no clock change can move it to another day) of a day key. */
export function keyToDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

/** 0 for Monday … 6 for Sunday. */
export const weekdayOf = (key: string): number => (keyToDate(key).getDay() + 6) % 7;
export const isWeekend = (key: string): boolean => weekdayOf(key) >= 5;

/** The weeks of a month (`month` counts from 0), Monday first; a place outside the month is null. */
export function monthWeeks(year: number, month: number): (string | null)[][] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const length = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= length; day++) cells.push(dayKey(new Date(year, month, day, 12)));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export interface MonthRef {
  year: number;
  /** From 0, like a Date's. */
  month: number;
}

/** The month a day key falls in. */
export function monthOfDay(key: string): MonthRef {
  const [year, month] = key.split('-').map(Number);
  return { year, month: month - 1 };
}

// The start of each month's name, without accents: "tetor" is Tetor, Tetori, Tetorit.
const MONTH_STEMS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nentor', 'dhjetor'];
// A word that is a month's name and at most its ending (-i, -it, -ut) longer: "majtas" is not May.
const MONTH_ENDING_MAX = 2;

/**
 * The month a list is named after ("Tetor 2026", "Shtatori", "Pazari i Nëntorit 2026"), in the year written in its name or
 * else `fallbackYear`; null when its name has no month.
 */
export function monthFromName(name: string, fallbackYear: number): MonthRef | null {
  const words = normalizeText(name).split(/[^a-z0-9]+/).filter(Boolean);
  const month = MONTH_STEMS.findIndex((stem) =>
    words.some((word) => word.startsWith(stem) && word.length <= stem.length + MONTH_ENDING_MAX),
  );
  if (month === -1) return null;
  const year = words.map(Number).find((number) => number >= 2000 && number < 2100) ?? fallbackYear;
  return { year, month };
}

// A creation time before this is a placeholder (data without one), not a real date.
const FIRST_REAL_TIME = Date.UTC(2000, 0, 1);

/**
 * The month the calendar opens on: where the latest mark of the list is, or else the month the list is named after, or else
 * the month it was made in, or else the month of `today`.
 */
export function openingMonth(trip: ShoppingTrip | undefined, today: string): MonthRef {
  const days = Object.keys(readAttendance(trip)).sort();
  if (days.length > 0) return monthOfDay(days[days.length - 1]);
  if (trip && trip.createdAt > FIRST_REAL_TIME) {
    const made = new Date(trip.createdAt);
    return monthFromName(trip.name, made.getFullYear()) ?? { year: made.getFullYear(), month: made.getMonth() };
  }
  return (trip && monthFromName(trip.name, monthOfDay(today).year)) ?? monthOfDay(today);
}

/** Whether a day key is in the month. */
export const isInMonth = (key: string, { year, month }: MonthRef): boolean =>
  key.startsWith(`${year}-${pad(month + 1)}-`);

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const moved = new Date(year, month + delta, 1);
  return { year: moved.getFullYear(), month: moved.getMonth() };
}

/** The Monday-to-Friday days of the weeks of a month, up to `until` (a day key) when given. */
export function workdaysOf(weeks: (string | null)[][], until?: string): string[] {
  return weeks
    .flat()
    .filter((day): day is string => day !== null && !isWeekend(day) && (until === undefined || day <= until));
}

// ---------------------------------------------------------------------------------------------------------------------
// Counting
// ---------------------------------------------------------------------------------------------------------------------

/** How many days `kid` was marked at `place`. */
export function countDays(attendance: Attendance, kid: string, place: AttendancePlace): number {
  let count = 0;
  for (const marks of Object.values(attendance)) if (marks[kid] === place) count += 1;
  return count;
}

const sameText = (a: string | undefined, b: string) => normalizeText(a ?? '') === normalizeText(b);

/** Whether the item is the days of `kid` at `place`. */
export function isDayItem(item: ShoppingItem, kid: string, place: string): boolean {
  return item.perDay === true && sameText(item.name, place) && sameText(item.person, kid);
}

export interface PlaceDays {
  place: PaidPlace;
  item: ShoppingItem | undefined;
  /** The days that are paid: the quantity of the item. */
  days: number;
  /** The days marked on the calendar. */
  marked: number;
  /** What one day costs. */
  price: number | null;
  amount: number;
}

export interface KidDays {
  kid: string;
  index: number;
  places: PlaceDays[];
  /** Amounts that do not depend on the days (a monthly fee…): the child's other lines of the category at a level. */
  fixed: ShoppingItem[];
  /** The sick days, oldest first, as day keys. */
  sick: string[];
  /** The paid days of every place. */
  days: number;
  /** What the days and the fixed amounts come to together. */
  amount: number;
}

/**
 * Each child's days and what they come to. A place is listed when it has days (or an item), and also when it is the one in
 * `show` for that child, so what is about to be marked already has its row.
 */
export function summarize(
  trip: ShoppingTrip | undefined,
  category: Category,
  show: Partial<Record<string, AttendancePlace | null>> = {},
): KidDays[] {
  const attendance = readAttendance(trip);
  const items = calendarItemsOf(trip);
  const paid = category.attendancePlaces ?? [];
  return (category.personOptions ?? []).map((kid, index): KidDays => {
    const places = paid.flatMap((place): PlaceDays[] => {
      const item = items.find((entry) => isDayItem(entry, kid, place));
      const marked = countDays(attendance, kid, place);
      if (!item && marked === 0 && show[kid] !== place) return [];
      return [
        {
          place,
          item,
          days: item ? parseQuantity(item.quantity) : 0,
          marked,
          price: item?.price ?? null,
          amount: item ? itemTotal(item) : 0,
        },
      ];
    });
    const sick = Object.keys(attendance)
      .filter((day) => attendance[day][kid] === SICK)
      .sort();
    const levels = category.nameOptions ?? [];
    const fixed = items.filter(
      (entry) => entry.perDay !== true && sameText(entry.person, kid) && levels.some((level) => sameText(level, entry.name)),
    );
    return {
      kid,
      index,
      places,
      fixed,
      sick,
      days: places.reduce((sum, place) => sum + place.days, 0),
      amount: places.reduce((sum, place) => sum + place.amount, 0) + fixed.reduce((sum, entry) => sum + itemTotal(entry), 0),
    };
  });
}

/** "3 Tet, 4 Tet": the days as a short text. */
export function describeDays(days: string[]): string {
  return days.map((day) => formatDayMonthInline(keyToDate(day).getTime())).join(', ');
}

// ---------------------------------------------------------------------------------------------------------------------
// Changing
// ---------------------------------------------------------------------------------------------------------------------

/** What one day costs for a child at a place, asked when an item has to be made for it. */
export type PriceFor = (kid: string, place: PaidPlace) => number | null;

/** A child and where the brush puts them. */
export interface Plan {
  kid: string;
  place: AttendancePlace;
}

interface Draft {
  attendance: Attendance;
  items: ShoppingItem[];
}

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function newDayItem(kid: string, place: PaidPlace, days: number, price: number | null): ShoppingItem {
  return {
    id: newId(),
    name: place,
    quantity: String(days),
    price,
    bought: false,
    createdAt: Date.now(),
    priority: DEFAULT_PRIORITY,
    person: kid,
    perDay: true,
  };
}

const begin = (trip: ShoppingTrip, _category: Category): Draft => ({
  attendance: readAttendance(trip),
  items: calendarItemsOf(trip),
});

const finish = (trip: ShoppingTrip, _category: Category, draft: Draft): ShoppingTrip => ({
  ...trip,
  attendance: draft.attendance,
  calendarItems: draft.items,
});

// Moves the days of one child at one place by `delta`. The item is made with the first day, and goes with the last one.
// A new item counts every day already marked there (the item may have been deleted while its marks stayed).
function moveDays(draft: Draft, kid: string, place: PaidPlace, delta: number, priceFor: PriceFor) {
  const index = draft.items.findIndex((item) => isDayItem(item, kid, place));
  if (index === -1) {
    if (delta > 0) {
      const days = Math.max(delta, countDays(draft.attendance, kid, place));
      draft.items = [...draft.items, newDayItem(kid, place, days, priceFor(kid, place))];
    }
    return;
  }
  const days = parseQuantity(draft.items[index].quantity) + delta;
  draft.items =
    days > 0
      ? draft.items.map((item, i) => (i === index ? { ...item, quantity: String(days) } : item))
      : draft.items.filter((_, i) => i !== index);
}

// Marks a day for one child with a place, or takes the mark off (`place` null). A child is in one place a day, so a new
// place replaces the old one, and the days of both places follow.
function setMark(draft: Draft, day: string, kid: string, place: AttendancePlace | null, priceFor: PriceFor) {
  const before = draft.attendance[day]?.[kid];
  if ((before ?? null) === place) return;

  const marks = { ...draft.attendance[day] };
  if (place) marks[kid] = place;
  else delete marks[kid];
  const attendance = { ...draft.attendance };
  if (Object.keys(marks).length > 0) attendance[day] = marks;
  else delete attendance[day];
  draft.attendance = attendance;

  if (before && before !== SICK) moveDays(draft, kid, before, -1, priceFor);
  if (place && place !== SICK) moveDays(draft, kid, place, 1, priceFor);
}

/**
 * Taps a day with the brush. When every child of the brush is already marked as the brush says, the day is cleared of them;
 * otherwise each of them is marked (a child who was somewhere else is moved).
 */
export function tapDay(
  trip: ShoppingTrip,
  category: Category,
  day: string,
  plans: Plan[],
  priceFor: PriceFor,
): ShoppingTrip {
  if (plans.length === 0) return trip;
  const draft = begin(trip, category);
  const allSet = plans.every(({ kid, place }) => draft.attendance[day]?.[kid] === place);
  for (const { kid, place } of plans) setMark(draft, day, kid, allSet ? null : place, priceFor);
  return finish(trip, category, draft);
}

/** Marks the days for the children of the brush, leaving alone a child who already has something on that day. */
export function fillDays(
  trip: ShoppingTrip,
  category: Category,
  days: string[],
  plans: Plan[],
  priceFor: PriceFor,
): ShoppingTrip {
  const draft = begin(trip, category);
  for (const day of days) {
    for (const { kid, place } of plans) {
      if (!draft.attendance[day]?.[kid]) setMark(draft, day, kid, place, priceFor);
    }
  }
  return finish(trip, category, draft);
}

/** Takes every mark of these children off these days. */
export function clearDays(
  trip: ShoppingTrip,
  category: Category,
  days: string[],
  kids: string[],
  priceFor: PriceFor,
): ShoppingTrip {
  const draft = begin(trip, category);
  for (const day of days) for (const kid of kids) setMark(draft, day, kid, null, priceFor);
  return finish(trip, category, draft);
}

/** How many marks of these children these days hold, for telling what a fill or a clear did. */
export function countMarks(trip: ShoppingTrip, days: string[], kids: string[]): number {
  const attendance = readAttendance(trip);
  return days.reduce((sum, day) => sum + kids.filter((kid) => attendance[day]?.[kid] !== undefined).length, 0);
}

/** Sets the paid days of a child at a place directly (no calendar); 0 takes the item away. */
export function setDays(
  trip: ShoppingTrip,
  category: Category,
  kid: string,
  place: PaidPlace,
  days: number,
  priceFor: PriceFor,
): ShoppingTrip {
  const items = calendarItemsOf(trip);
  const count = Math.max(0, Math.floor(days));
  const index = items.findIndex((item) => isDayItem(item, kid, place));
  let next = items;
  if (index === -1) {
    if (count > 0) next = [...items, newDayItem(kid, place, count, priceFor(kid, place))];
  } else if (count > 0) {
    next = items.map((item, i) => (i === index ? { ...item, quantity: String(count) } : item));
  } else {
    next = items.filter((_, i) => i !== index);
  }
  return { ...trip, calendarItems: next };
}

/** Sets what one day costs for a child at a place. Nothing to change while there is no item for it yet. */
export function setDayPrice(
  trip: ShoppingTrip,
  category: Category,
  kid: string,
  place: PaidPlace,
  price: number | null,
): ShoppingTrip {
  const items = calendarItemsOf(trip);
  if (!items.some((item) => isDayItem(item, kid, place))) return trip;
  return { ...trip, calendarItems: items.map((item) => (isDayItem(item, kid, place) ? { ...item, price } : item)) };
}

/** Adds an amount that does not depend on the days (a monthly fee…) for a child at a level, with an optional label. */
export function addFixed(
  trip: ShoppingTrip,
  category: Category,
  kid: string,
  level: string,
  label: string,
  price: number,
): ShoppingTrip {
  const text = label.trim();
  const item: ShoppingItem = {
    id: newId(),
    name: level,
    quantity: '1',
    price,
    bought: false,
    createdAt: Date.now(),
    priority: DEFAULT_PRIORITY,
    person: kid,
    ...(text ? { note: text } : {}),
  };
  return { ...trip, calendarItems: [...calendarItemsOf(trip), item] };
}

/** Changes the amount of a fixed line (never of one that counts days). */
export function setFixedPrice(trip: ShoppingTrip, category: Category, itemId: string, price: number | null): ShoppingTrip {
  const items = calendarItemsOf(trip);
  return {
    ...trip,
    calendarItems: items.map((item) => (item.id === itemId && item.perDay !== true ? { ...item, price } : item)),
  };
}

/** Takes a fixed line away (never one that counts days). */
export function removeFixed(trip: ShoppingTrip, category: Category, itemId: string): ShoppingTrip {
  const items = calendarItemsOf(trip);
  return { ...trip, calendarItems: items.filter((item) => !(item.id === itemId && item.perDay !== true)) };
}

// ---------------------------------------------------------------------------------------------------------------------
// What the child usually does
// ---------------------------------------------------------------------------------------------------------------------

const newestFirst = (trips: ShoppingTrip[]) => [...trips].sort((a, b) => b.createdAt - a.createdAt);

/** The price of a day the child (or else anyone) had at that place in the latest list that has one. */
export function lastDayPrice(
  trips: ShoppingTrip[],
  current: ShoppingTrip,
  category: Category,
  kid: string,
  place: PaidPlace,
): number | null {
  const ordered = [current, ...newestFirst(trips.filter((trip) => trip.id !== current.id))];
  for (const sameKid of [true, false]) {
    for (const trip of ordered) {
      const found = [...calendarItemsOf(trip), ...(trip[category.key] ?? [])].find(
        (item) => item.perDay === true && item.price != null && sameText(item.name, place) && (!sameKid || sameText(item.person, kid)),
      );
      if (found) return found.price;
    }
  }
  return null;
}

/**
 * Where each child usually goes: the place with most marked days in this list, or else the place of their day items, or of
 * any line that names them and a level (an older "Kopesht · Drion" expense), in the newest list that has one. Null for a child
 * nothing is known about yet.
 */
export function usualPlaces(
  trips: ShoppingTrip[],
  current: ShoppingTrip,
  category: Category,
): Record<string, PaidPlace | null> {
  const paid = category.attendancePlaces ?? [];
  const attendance = readAttendance(current);
  const result: Record<string, PaidPlace | null> = {};
  for (const kid of category.personOptions ?? []) {
    let best: PaidPlace | null = null;
    let most = 0;
    for (const place of paid) {
      const count = countDays(attendance, kid, place);
      if (count > most) {
        best = place;
        most = count;
      }
    }
    if (!best) {
      // A day item says it best; any other line of the child at a level is the next best thing.
      for (const dayItemsOnly of [true, false]) {
        for (const trip of [current, ...newestFirst(trips.filter((entry) => entry.id !== current.id))]) {
          const item = [...calendarItemsOf(trip), ...(trip[category.key] ?? [])].find(
            (entry) =>
              (!dayItemsOnly || entry.perDay === true) &&
              sameText(entry.person, kid) &&
              paid.some((place) => sameText(place, entry.name)),
          );
          if (item) best = paid.find((place) => sameText(place, item.name)) ?? null;
          if (best) break;
        }
        if (best) break;
      }
    }
    result[kid] = best;
  }
  return result;
}

// ---------------------------------------------------------------------------------------------------------------------
// Between the calendar and the list
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Lists made while the calendar still put its days in the category's own list: those day items move to the calendar, so the
 * list only holds what is added to it. Lists that have none are returned as they are.
 */
export function moveCalendarItems(trips: ShoppingTrip[]): ShoppingTrip[] {
  const category = CATEGORIES.find((entry) => entry.attendancePlaces);
  if (!category) return trips;
  return trips.map((trip) => {
    const listed = trip[category.key] ?? [];
    if (!listed.some((item) => item.perDay === true)) return trip;
    const known = new Set(calendarItemsOf(trip).map((item) => item.id));
    const moved = listed.filter((item) => item.perDay === true && !known.has(item.id));
    return {
      ...trip,
      [category.key]: listed.filter((item) => item.perDay !== true),
      calendarItems: [...calendarItemsOf(trip), ...moved],
    };
  });
}

/** A month the calendar has paid days in. */
export interface CalendarMonth {
  /** "2026-10". */
  key: string;
  year: number;
  /** From 0. */
  month: number;
  /** Paid days marked in the month, of every child. */
  days: number;
}

/** The months with paid days marked in the calendar of the list, newest first. */
export function calendarMonths(trip: ShoppingTrip | undefined, category: Category): CalendarMonth[] {
  const paid = new Set<string>(category.attendancePlaces ?? []);
  const found = new Map<string, CalendarMonth>();
  for (const [day, marks] of Object.entries(readAttendance(trip))) {
    const count = Object.values(marks).filter((place) => paid.has(place)).length;
    if (count === 0) continue;
    const { year, month } = monthOfDay(day);
    const key = `${year}-${pad(month + 1)}`;
    const known = found.get(key);
    if (known) known.days += count;
    else found.set(key, { key, year, month, days: count });
  }
  return [...found.values()].sort((a, b) => b.key.localeCompare(a.key));
}

export interface MonthAmount {
  /** Days marked in the month for the child at the place. */
  days: number;
  /** What one day costs; null while no price is known for it. */
  price: number | null;
  /** Days times the price; null when there is no price or no day. */
  amount: number | null;
}

/** What the calendar says a child's days at a place come to in one month ("2026-10"). */
export function monthAmount(
  trips: ShoppingTrip[],
  trip: ShoppingTrip,
  category: Category,
  monthKey: string,
  kid: string,
  place: PaidPlace,
): MonthAmount {
  let days = 0;
  for (const [day, marks] of Object.entries(readAttendance(trip))) {
    if (day.startsWith(`${monthKey}-`) && marks[kid] === place) days += 1;
  }
  const own = calendarItemsOf(trip).find((item) => isDayItem(item, kid, place))?.price ?? null;
  const price = own ?? lastDayPrice(trips, trip, category, kid, place);
  return { days, price, amount: price != null && days > 0 ? days * price : null };
}
