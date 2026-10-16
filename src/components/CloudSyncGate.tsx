import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useFamilyLabels } from '@/context/FamilyLabelsContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { useProfile } from '@/context/ProfileContext';
import { useTrips } from '@/context/TripsContext';
import { db } from '@/lib/firebase';
import { brand, colors, radii, spacing } from '@/theme/theme';
import type { NoteList } from '@/types/models';
import { DELETE_GRACE_DAYS, formatDeleteMoment } from '@/utils/accountDeletion';
import { type AccountSettings, normalizeSettings } from '@/utils/accountSettings';
import { normalizeLabels } from '@/utils/familyLabels';
import {
  mergeNoteHistory,
  mergeNoteLists,
  type NoteHistoryEntry,
  normalizeNoteHistory,
  normalizeNoteLists,
} from '@/utils/noteLists';
import {
  cachedNoteHistory,
  cachedNoteLists,
  clearDemoNoteLists,
  hydrateNoteData,
  loadNoteLists,
  subscribeNoteLists,
} from '@/utils/noteListStore';
import { cloudCopyKey, forgetPhoneData, noteSyncKey } from '@/utils/phoneData';
import { upgradeLegacyTrips, type StoredData } from '@/utils/tripLists';
import { withTimeout } from '@/utils/withTimeout';

const SAVE_DELAY_MS = 700;
const OFFLINE_LOAD_TIMEOUT_MS = 6000;
const PENDING_BANNER_DELAY_MS = 4000;
// How long a message about the account (deleted, brought back) stays on top of the screen.
const NOTICE_MS = 12_000;

const LOAD_FAILED_MESSAGE = "Nuk mund t'i ngarkojmë të dhënat. Kontrollo internetin dhe provo përsëri.";

const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

// Data from an older version or a damaged copy may lack a list or hold a broken trip: every list becomes a real
// array and anything that is not a trip object is dropped, so the rest of the app can rely on the shape.
// The note lists are null when the data never had any (an account from before they were synced), which is not the same
// as having none: the lists on the phone are kept then.
function normalize(data: Record<string, unknown> | undefined) {
  return {
    trips: asList(data?.trips).filter((trip) => trip !== null && typeof trip === 'object'),
    bills: asList(data?.bills),
    supplies: asList(data?.supplies),
    wishlist: asList(data?.wishlist),
    noteLists: Array.isArray(data?.noteLists) ? normalizeNoteLists(data.noteLists) : (null as NoteList[] | null),
    noteHistory: Array.isArray(data?.noteHistory)
      ? normalizeNoteHistory(data.noteHistory)
      : (null as NoteHistoryEntry[] | null),
    // The names the person gave to the family's choices (people, cars); none in data from before they could be changed.
    labels: normalizeLabels(data?.labels),
    // What was chosen in the profile (the name, private mode); null for an account that never changed it.
    settings: normalizeSettings(data?.settings),
  };
}

type CloudData = ReturnType<typeof normalize>;

// A copy of the account data kept on the phone so the app opens and keeps working without internet.
// `dirty` means the copy holds changes that have not reached the account yet.
interface LocalCopy {
  data: CloudData;
  dirty: boolean;
}

// `noteSyncKey` is set once this phone has taken part in the sync of the note lists: before that, its lists are merged with the
// account's instead of being replaced by them, so notes made on several phones before the sync existed all survive.
const cacheKey = cloudCopyKey;
const NO_HISTORY: NoteHistoryEntry[] = [];

async function readCopy(uid: string): Promise<LocalCopy | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(uid));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed.data !== 'object' || parsed.data === null) return null;
    return { data: normalize(parsed.data), dirty: parsed.dirty === true };
  } catch {
    return null;
  }
}

function writeCopy(uid: string, copy: LocalCopy) {
  AsyncStorage.setItem(cacheKey(uid), JSON.stringify(copy)).catch(() => {});
}

export function CloudSyncGate({ children }: { children: ReactNode }) {
  const {
    user,
    hasPassword,
    loading,
    demoMode,
    signOut,
    signedInThisSession,
    restoreAccount,
    endAccount,
    handleRemoteDeletion,
    notice,
    showNotice,
    clearNotice,
  } = useAuth();
  const { allTrips, hydrate: hydrateTrips } = useTrips();
  const { labels, hydrate: hydrateLabels } = useFamilyLabels();
  const { custom: profileName, hydrate: hydrateProfile } = useProfile();
  const { hidden: privateMode, hydrate: hydratePrivacy } = usePrivacy();

  const uid = user && hasPassword && db ? user.uid : null;
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  if (uid === null && loadedUid !== null) setLoadedUid(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  if (uid === null && loadError !== null) setLoadError(null);
  const [unsynced, setUnsynced] = useState(false);
  const [pendingShown, setPendingShown] = useState(false);
  const insets = useSafeAreaInsets();
  const noteLists = useSyncExternalStore(
    subscribeNoteLists,
    () => (uid ? cachedNoteLists(uid) : null),
    () => null,
  );
  const noteHistory = useSyncExternalStore(
    subscribeNoteLists,
    () => (uid ? cachedNoteHistory(uid) : NO_HISTORY),
    () => NO_HISTORY,
  );
  const lastSaved = useRef('');
  const latestJson = useRef('');
  const previousUid = useRef<string | null>(null);
  // The settings as the account holds them (as text), to tell a change made on another device from our own save coming back.
  const knownSettings = useRef('');
  // Once the account holds settings they are always sent, so putting the defaults back reaches the other devices too.
  const accountHasSettings = useRef(false);

  const hydrators = useRef({ hydrateTrips, hydrateLabels, hydrateProfile, hydratePrivacy });
  useEffect(() => {
    hydrators.current = { hydrateTrips, hydrateLabels, hydrateProfile, hydratePrivacy };
  });
  const accountActions = useRef({ signOut, signedInThisSession, restoreAccount, endAccount, handleRemoteDeletion, showNotice });
  useEffect(() => {
    accountActions.current = { signOut, signedInThisSession, restoreAccount, endAccount, handleRemoteDeletion, showNotice };
  });

  // Demo data lives only in memory (uid stays null, so nothing syncs); drop it when leaving demo mode.
  const wasDemo = useRef(false);
  useEffect(() => {
    if (demoMode) {
      wasDemo.current = true;
      return;
    }
    if (!wasDemo.current) return;
    wasDemo.current = false;
    hydrators.current.hydrateTrips([]);
    hydrators.current.hydrateLabels({});
    clearDemoNoteLists();
  }, [demoMode]);

  useEffect(() => {
    if (!uid || !db) {
      if (previousUid.current) {
        // Drop everything the phone keeps of the account on sign-out (the offline copy and the notes, so nothing is left on a
        // phone that is lent or lost), unless it still holds changes that never reached the account.
        const leaving = previousUid.current;
        readCopy(leaving).then((copy) => {
          if (copy && !copy.dirty) forgetPhoneData(leaving);
        });
        hydrators.current.hydrateTrips([]);
        hydrators.current.hydrateLabels({});
        knownSettings.current = '';
        accountHasSettings.current = false;
        lastSaved.current = '';
      }
      previousUid.current = null;
      return;
    }

    previousUid.current = uid;
    let cancelled = false;

    (async () => {
      const copy = await readCopy(uid);
      if (cancelled) return;

      let server: CloudData | null = null;
      let failure: { code?: string } | null = null;
      // The moment the account is erased, when it was deleted and the days of waiting have not ended yet (or have just ended).
      let eraseAt: number | null = null;
      try {
        const request = getDoc(doc(db!, 'users', uid));
        const snap = await (copy ? withTimeout(request, OFFLINE_LOAD_TIMEOUT_MS) : request);
        server = normalize(snap.exists() ? snap.data() : undefined);
        const marked = snap.exists() ? snap.data().deleteAt : undefined;
        eraseAt = marked instanceof Timestamp ? marked.toMillis() : null;
      } catch (e) {
        failure = (e as { code?: string }) ?? {};
      }
      if (cancelled) return;

      if (eraseAt !== null) {
        const actions = accountActions.current;
        try {
          if (Date.now() >= eraseAt) {
            // The days are over: whoever signs in now finds the account gone.
            await actions.endAccount();
            actions.showNotice(`Llogaria u fshi përfundimisht, sepse kaluan ${DELETE_GRACE_DAYS} ditët.`);
            return;
          }
          if (!actions.signedInThisSession()) {
            // An old session still on this phone is not the person coming back: it must not undo the deletion.
            actions.showNotice(
              `Llogaria është caktuar për fshirje më ${formatDeleteMoment(eraseAt)}. Hyr përsëri për ta rikthyer.`,
            );
            await actions.signOut();
            return;
          }
          // Signing in again within the days is the way back: the deletion is cancelled and everything is as it was.
          await actions.restoreAccount();
          actions.showNotice('Mirë se u ktheve! Fshirja e llogarisë u anulua.');
        } catch {
          if (!cancelled) setLoadError(LOAD_FAILED_MESSAGE);
          return;
        }
        if (cancelled) return;
      }

      let data: CloudData;
      // A copy still marked as unsent that is exactly what the account holds (the app was closed just after the account
      // confirmed the save): it is not holding anything back, so it counts as sent.
      let alreadySent = false;
      if (server) {
        // Unsent changes from the phone win, so nothing made offline is lost; they are pushed right after.
        data = copy?.dirty ? copy.data : server;
        lastSaved.current = JSON.stringify(server);
        alreadySent = Boolean(copy?.dirty) && JSON.stringify(copy?.data) === lastSaved.current;
      } else if (copy && failure?.code !== 'permission-denied') {
        data = copy.data;
        lastSaved.current = copy.dirty ? '' : JSON.stringify(data);
      } else {
        setLoadError(
          failure?.code === 'permission-denied'
            ? 'Firestore nuk lejon leximin. Vendos rregullat nga skedari firestore.rules në Firebase (Firestore Database > Rules).'
            : LOAD_FAILED_MESSAGE,
        );
        return;
      }

      // The note lists are kept on the phone as well, so they are read from there and joined with the account's.
      const [phoneLists, synced] = await Promise.all([
        loadNoteLists(uid),
        AsyncStorage.getItem(noteSyncKey(uid)).then(
          (raw) => raw === '1',
          () => false,
        ),
      ]);
      if (cancelled) return;
      const phoneHistory = cachedNoteHistory(uid);
      if (data.noteLists !== null) {
        data = {
          ...data,
          noteLists: synced ? data.noteLists : mergeNoteLists(data.noteLists, phoneLists),
          noteHistory: synced ? (data.noteHistory ?? []) : mergeNoteHistory(data.noteHistory ?? [], phoneHistory),
        };
      } else {
        data = { ...data, noteLists: phoneLists, noteHistory: phoneHistory };
      }
      hydrateNoteData(uid, data.noteLists ?? [], data.noteHistory ?? []);
      AsyncStorage.setItem(noteSyncKey(uid), '1').catch(() => {});

      latestJson.current = JSON.stringify(data);
      if (!copy?.dirty || alreadySent) writeCopy(uid, { data, dirty: false });
      hydrators.current.hydrateTrips(upgradeLegacyTrips(data as StoredData));
      hydrators.current.hydrateLabels(data.labels);
      knownSettings.current = data.settings ? JSON.stringify(data.settings) : '';
      accountHasSettings.current = data.settings !== null;
      // Without settings in the account the phone's own are kept (they are sent with the next save).
      if (data.settings) {
        hydrators.current.hydrateProfile(data.settings);
        hydrators.current.hydratePrivacy(data.settings.privateMode);
      }
      setLoadedUid(uid);
    })().catch(() => {
      // Anything unexpected while loading shows the retry panel instead of an endless spinner.
      if (!cancelled) setLoadError(LOAD_FAILED_MESSAGE);
    });

    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  useEffect(() => {
    if (!uid || !db || loadedUid !== uid || !noteLists) return;
    // bills, supplies and wishlist now live inside each trip; the empty lists stay because the Firestore rules still require them.
    const settings: AccountSettings | null =
      privateMode || profileName.firstName !== '' || accountHasSettings.current
        ? { privateMode, firstName: profileName.firstName, lastName: profileName.lastName }
        : null;
    const payload: CloudData = { trips: allTrips, bills: [], supplies: [], wishlist: [], noteLists, noteHistory, labels, settings };
    const json = JSON.stringify(payload);
    latestJson.current = json;
    if (json === lastSaved.current) return;

    // Keep the phone copy current straight away; the account is updated after a short pause.
    writeCopy(uid, { data: payload, dirty: true });
    setUnsynced(true);

    const timer = setTimeout(() => {
      // The names are only sent once some were changed, so an account that never changed them is saved the way it always was.
      const { labels: custom, settings: chosen, ...rest } = payload;
      const base = {
        ...rest,
        ...(Object.keys(custom ?? {}).length > 0 ? { labels: custom } : {}),
        updatedAt: serverTimestamp(),
      };
      let sentSettings = Boolean(chosen);
      setDoc(doc(db!, 'users', uid), chosen ? { ...base, settings: chosen } : base)
        // Rules from before the settings existed refuse them; the rest of the data must still be saved, so it is sent without.
        .catch((error: { code?: string }) => {
          if (!chosen || error?.code !== 'permission-denied') throw error;
          sentSettings = false;
          return setDoc(doc(db!, 'users', uid), { ...base, updatedAt: serverTimestamp() });
        })
        .then(() => {
          // Marked as known only once the write actually lands, so a failed send never makes a later, real change from
          // another device look like an echo of this one and get skipped by the listener below.
          if (sentSettings && chosen) knownSettings.current = JSON.stringify(chosen);
          if (sentSettings) accountHasSettings.current = true;
          // Signed out in the meantime: the phone copy was dealt with then, and must not be written back now.
          if (previousUid.current !== uid) return;
          lastSaved.current = json;
          setSaveError(null);
          if (latestJson.current === json) {
            writeCopy(uid, { data: payload, dirty: false });
            setUnsynced(false);
          }
        })
        .catch((error: { code?: string }) =>
          setSaveError(
            error?.code === 'permission-denied'
              ? 'Rregullat e Firestore nuk e lejojnë ruajtjen. Publiko skedarin firestore.rules te Firebase (Firestore Database > Rules).'
              : 'Ruajtja në llogari dështoi. Do të provojmë përsëri kur të ndryshosh diçka.',
          ),
        );
    }, SAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [uid, loadedUid, allTrips, noteLists, noteHistory, labels, profileName, privateMode]);

  // The settings chosen on another device arrive while this one is open: the name and private mode are applied, and nothing
  // else (the lists are not reloaded here). Our own saves coming back are the same as what is known, so they change nothing.
  useEffect(() => {
    if (!uid || !db || loadedUid !== uid) return;
    return onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.metadata.hasPendingWrites || !snap.exists()) return;
        // Deleted on another device: this one leaves too, so it cannot keep saving over the account while it waits to be erased.
        if (snap.data().deleteAt) {
          void accountActions.current.handleRemoteDeletion();
          return;
        }
        const remote = normalizeSettings(snap.data().settings);
        if (!remote || JSON.stringify(remote) === knownSettings.current) return;
        knownSettings.current = JSON.stringify(remote);
        accountHasSettings.current = true;
        // The applied settings are what the account holds, so they must not be sent back as a change of this device's lists.
        if (lastSaved.current) {
          lastSaved.current = JSON.stringify({ ...JSON.parse(lastSaved.current), settings: remote });
        }
        hydrators.current.hydrateProfile(remote);
        hydrators.current.hydratePrivacy(remote.privateMode);
      },
      () => {},
    );
  }, [uid, loadedUid]);

  // While this panel stands in for the app no navigator exists, and the splash screen is only hidden once one does;
  // without this the retry and sign-out buttons would sit behind a splash that never leaves.
  useEffect(() => {
    if (loadError) SplashScreen.hideAsync().catch(() => {});
  }, [loadError]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(clearNotice, NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice, clearNotice]);

  useEffect(() => {
    if (!unsynced) return;
    const timer = setTimeout(() => setPendingShown(true), PENDING_BANNER_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setPendingShown(false);
    };
  }, [unsynced]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (uid && loadedUid !== uid) {
    return (
      <View style={styles.center}>
        {loadError ? (
          <View style={styles.errorPanel}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable
              onPress={() => {
                setLoadError(null);
                setAttempt((n) => n + 1);
              }}
              accessibilityRole="button"
              style={styles.button}
            >
              <Text style={styles.buttonText}>Provo përsëri</Text>
            </Pressable>
            <Pressable onPress={signOut} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.link}>Dil</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Duke ngarkuar të dhënat e tua…</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {children}
      {notice ? (
        <View style={[styles.banner, styles.bannerNotice, { paddingTop: insets.top + spacing.xs }]}>
          <Text style={styles.bannerText}>{notice}</Text>
        </View>
      ) : saveError ? (
        <View style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}>
          <Text style={styles.bannerText}>{saveError}</Text>
        </View>
      ) : (
        pendingShown && (
          <View style={[styles.banner, styles.bannerPending, { paddingTop: insets.top + spacing.xs }]}>
            <Text style={styles.bannerText}>Pa internet — ndryshimet janë ruajtur në telefon dhe dërgohen kur të kthehet.</Text>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  loadingText: { fontSize: 14, color: colors.textMuted },
  errorPanel: { maxWidth: 420, alignItems: 'center', gap: spacing.md },
  errorText: { fontSize: 14, color: colors.text, textAlign: 'center' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  link: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
  banner: {
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.danger,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  bannerPending: { backgroundColor: colors.primaryDark },
  bannerNotice: { backgroundColor: brand.sageDark },
  bannerText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
