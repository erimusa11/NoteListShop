import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { formatPrice } from '@/utils/totals';

/** What stands where a total would be while the private mode is on; same width as an amount, so nothing jumps. */
export const HIDDEN_AMOUNT = '•••••';

interface PrivacyValue {
  /** Private mode is on: the total amounts are not shown. */
  hidden: boolean;
  setHidden: (next: boolean) => void;
  /** Replaces the choice with the one that came from the account; it is not sent back (see CloudSyncGate). */
  hydrate: (next: boolean) => void;
  /** An amount as "12.000 Lekë", or dots in its place while private mode is on. */
  price: (value: number) => string;
  /** The same, with a minus in front of an amount below zero. */
  signedPrice: (value: number) => string;
}

const PrivacyContext = createContext<PrivacyValue | null>(null);

interface Stored {
  scope: string;
  value: boolean;
}

// The choice is part of what CloudSyncGate saves to the account and loads from it (it calls `hydrate`), like the names of
// the profile, so it is the same on every device. In demo mode it only lives in memory, like the rest of the demo.
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const { user, demoMode } = useAuth();
  const scope = demoMode ? 'demo' : (user?.uid ?? 'none');

  const [stored, setStored] = useState<Stored>({ scope: 'none', value: false });
  // Another account (or the demo starting or ending) never sees the previous one's choice.
  const hidden = stored.scope === scope && stored.value;

  const setHidden = useCallback((next: boolean) => setStored({ scope, value: next }), [scope]);
  const hydrate = useCallback(
    (next: boolean) => setStored((prev) => (prev.scope === scope && prev.value === next ? prev : { scope, value: next })),
    [scope],
  );

  const value = useMemo<PrivacyValue>(
    () => ({
      hidden,
      setHidden,
      hydrate,
      price: (amount) => (hidden ? `${HIDDEN_AMOUNT} Lekë` : formatPrice(amount)),
      signedPrice: (amount) =>
        hidden ? `${HIDDEN_AMOUNT} Lekë` : `${amount < 0 ? '-' : ''}${formatPrice(Math.abs(amount))}`,
    }),
    [hidden, setHidden, hydrate],
  );

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy(): PrivacyValue {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error('usePrivacy must be used within a PrivacyProvider');
  return ctx;
}
