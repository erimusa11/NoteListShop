import {
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import { forgetPhoneData } from '@/utils/phoneData';
import { withTimeout } from '@/utils/withTimeout';

// How long each cloud step of deleting the account may take before the user is told there is no connection.
const DELETE_STEP_TIMEOUT_MS = 15_000;

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
  /**
   * Erases the account for good: its data in the cloud, the account itself, and everything this phone keeps of it. Asks for the
   * password again first, so an open phone in someone else's hands is not enough to do it.
   */
  deleteAccount: (password: string) => Promise<void>;
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
  'auth/admin-restricted-operation': 'Regjistrimet e reja janë mbyllur. Mund të hyjnë vetëm llogaritë që ekzistojnë.',
  'auth/password-does-not-meet-requirements':
    'Fjalëkalimi nuk i plotëson kërkesat e sigurisë. Përdor të paktën 10 karaktere me shkronja dhe shifra.',
  'auth/user-disabled': 'Kjo llogari është çaktivizuar.',
  'auth/user-token-expired': 'Sesioni ka skaduar. Dil dhe hyr përsëri.',
  timeout: 'Nuk ka lidhje me internetin. Provo përsëri.',
  'account-partly-deleted': 'Të dhënat u fshinë, por llogaria jo. Trokit përsëri për ta përfunduar.',
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

  const deleteAccount = useCallback(async (password: string) => {
    const current = auth?.currentUser;
    if (!auth || !db || !current || !current.email) throw new Error('auth/requires-recent-login');
    const { uid, email } = current;
    // The data goes first, while the account can still be proved to own it; then the account. A wrong password stops everything
    // here. Each step has a time limit: without internet the cloud steps would wait forever, and the user would be stuck.
    await withTimeout(
      reauthenticateWithCredential(current, EmailAuthProvider.credential(email, password)),
      DELETE_STEP_TIMEOUT_MS,
    );
    await withTimeout(deleteDoc(doc(db, 'users', uid)), DELETE_STEP_TIMEOUT_MS);
    try {
      await withTimeout(deleteUser(current), DELETE_STEP_TIMEOUT_MS);
    } catch {
      // The data is gone but the account is not: say so plainly, so the user knows to press the button again to finish.
      throw Object.assign(new Error('account-partly-deleted'), { code: 'account-partly-deleted' });
    }
    forgetPhoneData(uid, true);
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
      deleteAccount,
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
