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

export interface OptionTotal {
  name: string;
  color: string;
  total: number;
}

// What each group adds up to in one list, bought or not, so the groups add up to the category total shown above them.
// The "other" group appears when the category names it, or otherwise only when it has an amount.
export function buildOptionTotals(items: ShoppingItem[], category: Category): OptionTotal[] {
  const choices = optionChoices(category);
  if (!choices) return [];

  const { names, otherLabel, otherAlwaysShown } = choices;
  const choiceOf = optionMatcher(names);
  const labels = [...names, otherLabel];
  const totals = labels.map(() => 0);
  for (const item of items) totals[choiceOf(item.name)] += itemTotal(item);

  return labels
    .map((name, index) => ({ name, color: optionColor(index), total: totals[index] }))
    .filter((option, index) => index < names.length || otherAlwaysShown || option.total > 0);
}

/** Only the items that fall under `label` (one of the groups from `buildOptionTotals`). */
export function itemsForOption(items: ShoppingItem[], category: Category, label: string): ShoppingItem[] {
  const group = groupOf(category);
  return group ? items.filter((item) => group(item.name) === label) : items;
}
