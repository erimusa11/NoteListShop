import type { IncomeEntry, IncomeKind } from '@/types/models';
import { INCOME_COLOR } from '@/utils/categories';
import type { OptionTotal } from '@/utils/options';

export interface IncomeKindInfo {
  kind: IncomeKind;
  label: string;
  color: string;
}

// In the order of the choices.
export const INCOME_KINDS: IncomeKindInfo[] = [
  { kind: 'rroga', label: 'Rroga', color: INCOME_COLOR },
  { kind: 'qoka', label: 'Qoka', color: '#A0522D' },
  { kind: 'shtese', label: 'Të ardhura shtesë', color: '#1F9E89' },
];

export const INCOME_KIND_LABELS = INCOME_KINDS.map(({ label }) => label);

const DEFAULT_KIND = INCOME_KINDS[0];

/** What an income is. One saved before the kinds existed (or with a kind that is not known) is a salary. */
export function incomeKindInfo(income: Pick<IncomeEntry, 'kind'>): IncomeKindInfo {
  return INCOME_KINDS.find(({ kind }) => kind === income.kind) ?? DEFAULT_KIND;
}

/** The kind behind a label from `INCOME_KIND_LABELS` (a salary when it is not one of them). */
export function incomeKindFromLabel(label: string | undefined): IncomeKind {
  return (INCOME_KINDS.find((info) => info.label === label) ?? DEFAULT_KIND).kind;
}

/** The kind after this one, going round, for a tap that switches it. */
export function nextIncomeKind(income: Pick<IncomeEntry, 'kind'>): IncomeKind {
  const index = INCOME_KINDS.indexOf(incomeKindInfo(income));
  return INCOME_KINDS[(index + 1) % INCOME_KINDS.length].kind;
}

/** What each kind adds up to, all of them listed (even with nothing yet), for the row under the income total. */
export function buildIncomeKindTotals(incomes: IncomeEntry[]): OptionTotal[] {
  return INCOME_KINDS.map(({ kind, label, color }) => ({
    name: label,
    color,
    total: incomes.filter((income) => incomeKindInfo(income).kind === kind).reduce((sum, income) => sum + income.amount, 0),
  }));
}

/** Only the incomes of the kind with this label. */
export function incomesOfKind(incomes: IncomeEntry[], label: string): IncomeEntry[] {
  return incomes.filter((income) => incomeKindInfo(income).label === label);
}
