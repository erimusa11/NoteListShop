import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import {
  cleanName,
  type CustomName,
  EMPTY_NAME,
  parseStoredName,
  type ResolvedName,
  resolveName,
} from '@/utils/profileName';

interface ProfileValue extends ResolvedName {
  /** First letter of the first name, for the round avatar. */
  initial: string;
  /** What was typed in the profile (empty when nothing was). */
  custom: CustomName;
  /** The name of the account (Google), the one used while the profile has none. */
  accountName: string | null;
  email: string | null;
  /** Saves the name; with an empty first name the profile has no name and the account's is used again. */
  save: (firstName: string, lastName: string) => void;
  /** The name that would be shown for this input, so the profile page can preview it while typing. */
  preview: (input: CustomName) => ResolvedName;
}

const ProfileContext = createContext<ProfileValue | null>(null);

const storageKey = (uid: string) => `profile.${uid}`;

interface Stored {
  scope: string;
  value: CustomName;
}

// The name typed in the profile is kept on the phone, one per account, and read once when the app starts: it is a few
// bytes, and the greeting needs it. In demo mode it is only kept in memory, like the rest of the demo.
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, demoMode } = useAuth();
  const uid = !demoMode && user ? user.uid : null;
  const scope = demoMode ? 'demo' : (uid ?? 'none');
  const fallback = demoMode ? 'Vizitor' : 'Eri';

  const [stored, setStored] = useState<Stored>({ scope: 'none', value: EMPTY_NAME });
  // Another account (or the demo starting or ending) never sees the previous one's name: a change of scope starts over,
  // and the effect below reads the new account's from the phone.
  const [seenScope, setSeenScope] = useState(scope);
  if (seenScope !== scope) {
    setSeenScope(scope);
    setStored({ scope: 'none', value: EMPTY_NAME });
  }
  const custom = stored.scope === scope ? stored.value : EMPTY_NAME;

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    AsyncStorage.getItem(storageKey(uid)).then(
      (raw) => {
        if (!cancelled) setStored({ scope: uid, value: parseStoredName(raw) });
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const accountName = user?.displayName ?? null;
  const email = user?.email ?? null;

  const save = useCallback(
    (firstName: string, lastName: string) => {
      const first = cleanName(firstName);
      // A surname without a first name is not a name (see resolveName), so it is not kept either.
      const value: CustomName = first ? { firstName: first, lastName: cleanName(lastName) } : EMPTY_NAME;
      setStored({ scope, value });
      if (!uid) return;
      const write = first
        ? AsyncStorage.setItem(storageKey(uid), JSON.stringify(value))
        : AsyncStorage.removeItem(storageKey(uid));
      write.catch(() => {});
    },
    [scope, uid],
  );

  const preview = useCallback(
    (input: CustomName) => resolveName(input, accountName, email, fallback),
    [accountName, email, fallback],
  );

  const value = useMemo<ProfileValue>(() => {
    const resolved = resolveName(custom, accountName, email, fallback);
    return {
      ...resolved,
      initial: resolved.firstName.charAt(0).toUpperCase(),
      custom,
      accountName,
      email,
      save,
      preview,
    };
  }, [custom, accountName, email, fallback, save, preview]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider');
  return ctx;
}
