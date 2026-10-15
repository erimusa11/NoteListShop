import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import {
  type CustomLabels,
  initialOf,
  type LabelKey,
  labelOf,
  nameFromLabel,
  normalizeLabels,
} from '@/utils/familyLabels';

interface FamilyLabelsValue {
  /** The labels that were changed (the others show their defaults). Saved with the account. */
  labels: CustomLabels;
  /** What to show for a choice or name: the label of one of the six family names, any other text as it is. */
  label: (name: string) => string;
  /** The text to keep for something typed in place of a name (see `nameFromLabel`). */
  nameFrom: (text: string) => string;
  /** The letters for a small avatar. */
  initial: (name: string) => string;
  /** Sets the label of one name; an empty text, or the default one, puts the default back. */
  setLabel: (key: LabelKey, text: string) => void;
  /** Puts every default back. */
  resetLabels: () => void;
  /** Replaces the labels with the ones that came from the account (or none, at sign-out). */
  hydrate: (labels: CustomLabels) => void;
}

const FamilyLabelsContext = createContext<FamilyLabelsValue | null>(null);

// The labels are part of what CloudSyncGate saves to the account and loads from it (it calls `hydrate`), like the lists.
export function FamilyLabelsProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<CustomLabels>({});

  const setLabel = useCallback((key: LabelKey, text: string) => {
    setLabels((prev) => normalizeLabels({ ...prev, [key]: text }));
  }, []);
  const resetLabels = useCallback(() => setLabels({}), []);
  const hydrate = useCallback((next: CustomLabels) => setLabels(normalizeLabels(next)), []);

  const value = useMemo<FamilyLabelsValue>(
    () => ({
      labels,
      label: (name) => labelOf(name, labels),
      nameFrom: (text) => nameFromLabel(text, labels),
      initial: (name) => initialOf(labelOf(name, labels)),
      setLabel,
      resetLabels,
      hydrate,
    }),
    [labels, setLabel, resetLabels, hydrate],
  );

  return <FamilyLabelsContext.Provider value={value}>{children}</FamilyLabelsContext.Provider>;
}

export function useFamilyLabels(): FamilyLabelsValue {
  const ctx = useContext(FamilyLabelsContext);
  if (!ctx) throw new Error('useFamilyLabels must be used within a FamilyLabelsProvider');
  return ctx;
}
