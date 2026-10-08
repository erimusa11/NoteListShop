import type { ShoppingItem } from '@/types/models';
import type { Category } from '@/utils/categories';
import { normalizeText } from '@/utils/suggestions';
import { itemTotal } from '@/utils/totals';

// Told apart in the totals and charts; a category with more choices than colors starts over.
export const OPTION_COLORS = ['#8C3B2E', '#2E86C1', '#E0A100', '#7C5CBF', '#1F9E89'];
// Where a name that is not one of the choices is grouped, unless the category names that choice itself (`otherOption`).
export const OTHER_OPTION = 'Të tjera';

export interface OptionChoices {
  /** The choices, in order. */
  names: string[];
  /** The last group: everything whose name is not one of `names`. */
  otherLabel: string;
  /** The category has its own "other" choice, so that group is always listed, even while it is empty. */
  otherAlwaysShown: boolean;
}

/** The choices of a category that has `nameOptions` (Karburant, Shendeti & Vizita), or null for one that does not. */
export function optionChoices(category: Category): OptionChoices | null {
  const names = category.nameOptions;
  if (!names || names.length === 0) return null;
  return { names, otherLabel: category.otherOption ?? OTHER_OPTION, otherAlwaysShown: category.otherOption !== undefined };
}

// Which choice an item name belongs to: its index in `names`, or `names.length` for anything else.
// Matched ignoring case and accents, so a renamed "NAFTE" still counts as Naftë.
export function optionMatcher(names: string[]): (name: string) => number {
  const wanted = names.map(normalizeText);
  return (name) => {
    const index = wanted.indexOf(normalizeText(name));
    return index === -1 ? names.length : index;
  };
}

export const optionColor = (index: number) => OPTION_COLORS[index % OPTION_COLORS.length];

// The people (Drion, Alois) have their own colors, so a dot never means a level (Cerdhe…) in one place and a person in another.
export const PERSON_COLORS = ['#1F9E89', '#C93D7A', '#5F6B7A', '#7A5C3E'];
export const personColor = (index: number) => PERSON_COLORS[index % PERSON_COLORS.length];

/**
 * The choices of a category that also asks who it is for (`personOptions`), or null for one that does not.
 * An item without a person (one moved in from another category) is grouped under "Të tjera", listed only while it has an amount.
 */
export function personChoices(category: Category): OptionChoices | null {
  const names = category.personOptions;
  if (!names || names.length === 0) return null;
  return { names, otherLabel: OTHER_OPTION, otherAlwaysShown: false };
}

/** The choice after `current` (the first when there is none yet), for a tap that goes through the choices. */
export function nextOption(names: string[], current: string | undefined): string {
  const index = optionMatcher(names)(current ?? '');
  return names[index >= names.length ? 0 : (index + 1) % names.length];
}

// Name -> the group it falls under in this category (a choice, or the "other" label); null when it has no choices.
function groupOf(category: Category): ((name: string) => string) | null {
  const choices = optionChoices(category);
  if (!choices) return null;
  const choiceOf = optionMatcher(choices.names);
  return (name) => {
    const index = choiceOf(name);
    return index < choices.names.length ? choices.names[index] : choices.otherLabel;
  };
}

/** The group an item with this name falls under in its category, or null when the category has no choices. */
export function itemOption(category: Category, name: string): string | null {
  return groupOf(category)?.(name) ?? null;
}

/** What an item can be put under in a category with choices: the choices, then its own "other" one if it has it. */
export function optionTargets(category: Category): string[] {
  const choices = optionChoices(category);
  return choices ? [...choices.names, ...(choices.otherAlwaysShown ? [choices.otherLabel] : [])] : [];
}

/**
 * The item put under `group` (one of `optionTargets`) of its new category.
 * A choice (Drion, Naftë…) becomes the name, and what the item was called goes into its description, so nothing is lost
 * and the row still reads as before. The "other" group is any name that is not a choice: the item goes back to being
 * called by its description (or its old name), as when it was added.
 */
export function withOption(item: ShoppingItem, category: Category, group: string): ShoppingItem {
  const choices = optionChoices(category);
  if (!choices) return item;

  const choiceOf = optionMatcher(choices.names);
  if (group === choices.otherLabel) {
    const { note, ...rest } = item;
    const label = (typeof note === 'string' ? note.trim() : '') || String(item.name ?? '').trim();
    // A name that is itself one of the choices would put the item straight back under that choice.
    return { ...rest, name: label && choiceOf(label) === choices.names.length ? label : choices.otherLabel };
  }

  if (normalizeText(item.name) === normalizeText(group)) return { ...item, name: group };
  const note = (typeof item.note === 'string' ? item.note.trim() : '') || String(item.name ?? '').trim();
  return { ...item, name: group, ...(note ? { note } : {}) };
}

export interface OptionTotal {
  name: string;
  color: string;
  total: number;
}

// What each group adds up to in one list, bought or not, so the groups add up to the category total shown above them.
// The "other" group appears when the category names it, or otherwise only when it has an amount.
function totalsBy(
  items: ShoppingItem[],
  { names, otherLabel, otherAlwaysShown }: OptionChoices,
  valueOf: (item: ShoppingItem) => string,
  colorOf: (index: number) => string,
): OptionTotal[] {
  const choiceOf = optionMatcher(names);
  const labels = [...names, otherLabel];
  const totals = labels.map(() => 0);
  for (const item of items) totals[choiceOf(valueOf(item))] += itemTotal(item);

  return labels
    .map((name, index) => ({ name, color: colorOf(index), total: totals[index] }))
    .filter((option, index) => index < names.length || otherAlwaysShown || option.total > 0);
}

const nameOf = (item: ShoppingItem) => item.name;
const personOf = (item: ShoppingItem) => item.person ?? '';

export function buildOptionTotals(items: ShoppingItem[], category: Category): OptionTotal[] {
  const choices = optionChoices(category);
  return choices ? totalsBy(items, choices, nameOf, optionColor) : [];
}

/** The same for the person an item is for (Drion, Alois), in a category that asks for it. */
export function buildPersonTotals(items: ShoppingItem[], category: Category): OptionTotal[] {
  const choices = personChoices(category);
  return choices ? totalsBy(items, choices, personOf, personColor) : [];
}

/** Only the items that fall under `label` (one of the groups from `buildOptionTotals`). */
export function itemsForOption(items: ShoppingItem[], category: Category, label: string): ShoppingItem[] {
  const group = groupOf(category);
  return group ? items.filter((item) => group(item.name) === label) : items;
}

/** Only the items that are for `label` (one of the people from `buildPersonTotals`). */
export function itemsForPerson(items: ShoppingItem[], category: Category, label: string): ShoppingItem[] {
  const choices = personChoices(category);
  if (!choices) return items;
  const choiceOf = optionMatcher(choices.names);
  return items.filter((item) => {
    const index = choiceOf(personOf(item));
    return (index < choices.names.length ? choices.names[index] : choices.otherLabel) === label;
  });
}
