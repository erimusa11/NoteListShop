import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { LEGAL_VERSION } from '@/utils/legal';

const STORAGE_KEY = 'legal.accepted';

interface LegalValue {
  /** Whether this phone has accepted the current Terms of use and Privacy policy. */
  accepted: boolean;
  /** Records the acceptance (the version of the texts and when), on this phone. */
  accept: () => Promise<void>;
}

const LegalContext = createContext<LegalValue | null>(null);

// The acceptance is kept on the phone, once for the version of the texts that was shown; when the texts change in a way that
// matters (LEGAL_VERSION), it is asked for again. Nothing is shown until it has been read, which takes a moment.
export function LegalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'accepted' | 'pending'>('loading');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY).then(
      (raw) => {
        let version: unknown;
        try {
          version = raw ? JSON.parse(raw)?.version : undefined;
        } catch {
          version = undefined;
        }
        if (!cancelled) setState(version === LEGAL_VERSION ? 'accepted' : 'pending');
      },
      () => {
        if (!cancelled) setState('pending');
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const accept = useCallback(async () => {
    setState('accepted');
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ version: LEGAL_VERSION, at: Date.now() }));
    } catch {
      // Not kept: it will be asked again the next time the app opens.
    }
  }, []);

  const value = useMemo<LegalValue>(() => ({ accepted: state === 'accepted', accept }), [state, accept]);

  if (state === 'loading') return null;
  return <LegalContext.Provider value={value}>{children}</LegalContext.Provider>;
}

export function useLegal(): LegalValue {
  const ctx = useContext(LegalContext);
  if (!ctx) throw new Error('useLegal must be used within a LegalProvider');
  return ctx;
}
