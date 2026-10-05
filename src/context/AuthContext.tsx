import {
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { auth, isFirebaseConfigured } from '@/lib/firebase';

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  user: User | null;
  hasPassword: boolean;
  /** Browsing without an account: nothing is read from or saved to Firebase. */
  demoMode: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  setAccountPassword: (password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterDemoMode: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Emaili ose fjalëkalimi nuk është i saktë.',
  'auth/wrong-password': 'Emaili ose fjalëkalimi nuk është i saktë.',
  'auth/user-not-found': 'Emaili ose fjalëkalimi nuk është i saktë.',
  'auth/invalid-email': 'Emaili nuk është i vlefshëm.',
  'auth/missing-password': 'Shkruaj fjalëkalimin.',
  'auth/too-many-requests': 'Shumë përpjekje. Provo përsëri pas pak.',
  'auth/network-request-failed': 'Nuk ka lidhje me internetin.',
  'auth/popup-closed-by-user': 'Dritarja e Google u mbyll para se të hyje.',
  'auth/cancelled-popup-request': 'Dritarja e Google u mbyll para se të hyje.',
  'auth/popup-blocked': 'Shfletuesi bllokoi dritaren e Google. Lejo dritaret popup dhe provo përsëri.',
  'auth/weak-password': 'Fjalëkalimi është shumë i dobët.',
  'auth/requires-recent-login': 'Për siguri, dil dhe hyr përsëri me Google, pastaj krijo fjalëkalimin.',
  'auth/operation-not-allowed': 'Ky lloj hyrjeje nuk është aktivizuar në Firebase (Authentication > Sign-in method).',
  'auth/unauthorized-domain': 'Ky domen nuk është i autorizuar në Firebase (Authentication > Settings > Authorized domains).',
  'auth/provider-already-linked': 'Kjo llogari ka tashmë një fjalëkalim.',
  'auth/credential-already-in-use': 'Ky email ka tashmë një llogari tjetër.',
  'google-native-unavailable':
    'Hyrja me Google në telefon kërkon një development build. Hyr me email dhe fjalëkalim, ose përdore Google në web.',
};

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? (error as { message?: string })?.message ?? '';
  return MESSAGES[code] ?? 'Diçka shkoi keq. Provo përsëri.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [version, setVersion] = useState(0);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) return;
    if (Platform.OS !== 'web') throw new Error('google-native-unavailable');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!auth) return;
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const setAccountPassword = useCallback(async (password: string) => {
    const current = auth?.currentUser;
    if (!current || !current.email) throw new Error('auth/requires-recent-login');
    await linkWithCredential(current, EmailAuthProvider.credential(current.email, password));
    await current.reload();
    setVersion((v) => v + 1);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!auth) return;
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const signOut = useCallback(async () => {
    setDemoMode(false);
    if (auth) await firebaseSignOut(auth);
  }, []);

  const enterDemoMode = useCallback(() => {
    setDemoMode(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isFirebaseConfigured,
      loading,
      user,
      hasPassword: Boolean(auth?.currentUser?.providerData.some((p) => p.providerId === 'password')),
      demoMode,
      signInWithGoogle,
      signInWithPassword,
      setAccountPassword,
      resetPassword,
      signOut,
      enterDemoMode,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, user, version, demoMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
