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
import { deleteDoc, deleteField, doc, getDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import { DELETE_GRACE_DAYS, DELETE_GRACE_MS, formatDeleteMoment } from '@/utils/accountDeletion';
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
   * Marks the account for deletion and signs out: the data stays in the cloud for `DELETE_GRACE_DAYS` days, and signing in
   * again within that time brings the account back; after it, the data is erased for good. Everything this phone keeps of the
   * account goes at once. Asks for the password again first, so an open phone in someone else's hands is not enough to do it.
   */
  deleteAccount: (password: string) => Promise<void>;
  /** True when the person signed in during this run of the app (not a session restored from before). */
  signedInThisSession: () => boolean;
  /** Signing in brought back an account marked for deletion: the mark is taken off. */
  restoreAccount: () => Promise<void>;
  /** The days passed: erases the data in the cloud, the account itself, and the phone's copy, and signs out. */
  endAccount: () => Promise<void>;
  /** The account was marked for deletion on another device: this one signs out. */
  handleRemoteDeletion: () => Promise<void>;
  /** A short message for after something happened to the account (deleted, brought back); shown by CloudSyncGate. */
  notice: string | null;
  showNotice: (text: string) => void;
  clearNotice: () => void;
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
  const [notice, setNotice] = useState<string | null>(null);
  // Set while the person signs in here, so an old session that is still on this device does not count as coming back.
  const freshSignIn = useRef(false);
  const deleting = useRef(false);

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
    freshSignIn.current = true;
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      freshSignIn.current = false;
      throw e;
    }
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!auth) return;
    freshSignIn.current = true;
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      freshSignIn.current = false;
      throw e;
    }
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
    freshSignIn.current = false;
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
    const ref = doc(db, 'users', uid);
    const snap = await withTimeout(getDoc(ref), DELETE_STEP_TIMEOUT_MS);
    if (!snap.exists()) {
      // Nothing is kept in the cloud, so there is nothing to wait for or to bring back: the account goes now.
      await withTimeout(deleteUser(current), DELETE_STEP_TIMEOUT_MS);
      forgetPhoneData(uid, true);
      return;
    }
    // The data stays in the cloud, marked with the moment it is erased; the next sign-in before that moment cancels it.
    const eraseAt = Date.now() + DELETE_GRACE_MS;
    await withTimeout(
      updateDoc(ref, { deleteAt: Timestamp.fromMillis(eraseAt), updatedAt: serverTimestamp() }),
      DELETE_STEP_TIMEOUT_MS,
    );
    deleting.current = true;
    forgetPhoneData(uid, true);
    setNotice(`Llogaria do të fshihet më ${formatDeleteMoment(eraseAt)}. Hyr përsëri para kësaj date për ta rikthyer.`);
    try {
      freshSignIn.current = false;
      await firebaseSignOut(auth);
    } finally {
      deleting.current = false;
    }
  }, []);

  const signedInThisSession = useCallback(() => freshSignIn.current, []);

  const restoreAccount = useCallback(async () => {
    const current = auth?.currentUser;
    if (!db || !current) return;
    await withTimeout(
      updateDoc(doc(db, 'users', current.uid), { deleteAt: deleteField(), updatedAt: serverTimestamp() }),
      DELETE_STEP_TIMEOUT_MS,
    );
  }, []);

  const endAccount = useCallback(async () => {
    const current = auth?.currentUser;
    if (!auth || !db || !current) return;
    const { uid } = current;
    // The data first: if that fails, the account stays marked and this is tried again at the next sign-in.
    await withTimeout(deleteDoc(doc(db, 'users', uid)), DELETE_STEP_TIMEOUT_MS);
    try {
      await withTimeout(deleteUser(current), DELETE_STEP_TIMEOUT_MS);
    } catch (e) {
      // A session this old usually cannot prove itself recent enough to delete the sign-in itself (Firebase asks for that),
      // so the email can stay registered with no data behind it. Clearing that for good needs a scheduled Cloud Function
      // (Firebase's paid plan); this only logs it; it does not retry, since the next load would hit the same wall.
      if (__DEV__) console.warn('endAccount: could not delete the Firebase Auth user', e);
    }
    forgetPhoneData(uid, true);
    freshSignIn.current = false;
    try {
      await firebaseSignOut(auth);
    } catch {}
  }, []);

  const handleRemoteDeletion = useCallback(async () => {
    // The device that asked for the deletion signs itself out and says it in its own words.
    if (deleting.current) return;
    setNotice(
      `Llogaria u caktua për fshirje nga një pajisje tjetër. Hyr përsëri brenda ${DELETE_GRACE_DAYS} ditëve për ta rikthyer.`,
    );
    freshSignIn.current = false;
    if (auth) await firebaseSignOut(auth);
  }, []);

  const showNotice = useCallback((text: string) => setNotice(text), []);
  const clearNotice = useCallback(() => setNotice(null), []);

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
      signedInThisSession,
      restoreAccount,
      endAccount,
      handleRemoteDeletion,
      notice,
      showNotice,
      clearNotice,
      enterDemoMode,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, user, version, demoMode, notice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
