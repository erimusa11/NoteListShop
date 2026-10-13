import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { useTrips } from '@/context/TripsContext';
import {
  BACKUP_NAME_PREFIX,
  connectDrive,
  disconnectDrive,
  driveAvailable,
  driveErrorMessage,
  uploadBackup,
} from '@/lib/googleDrive';
import {
  type BackupSettings,
  backupFileName,
  buildBackup,
  isBackupDue,
  loadBackupSettings,
  NO_BACKUP_SETTINGS,
  saveBackupSettings,
} from '@/utils/backup';
import { cachedNoteHistory, loadNoteLists } from '@/utils/noteListStore';
import { loadTasks } from '@/utils/taskStore';

// A failed automatic backup is tried again the next time the app is opened, but not more often than this.
const RETRY_AFTER_MS = 60 * 60 * 1000;

export interface BackupStatus {
  kind: 'ok' | 'error';
  text: string;
}

interface BackupValue {
  /** False on the web and until the Google client of the project is set up (see the README). */
  available: boolean;
  settings: BackupSettings;
  busy: boolean;
  status: BackupStatus | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  backupNow: () => Promise<void>;
  setAuto: (next: boolean) => void;
}

const BackupContext = createContext<BackupValue | null>(null);

interface Loaded {
  uid: string;
  settings: BackupSettings;
}

// The second copy of the account's data, in the user's own Google Drive: made by a tap on the profile page, or by itself
// once a month (the first time the app is opened after the month has passed). Lives under the cloud sync gate, so the
// lists it saves are the ones already loaded.
export function BackupProvider({ children }: { children: ReactNode }) {
  const { user, demoMode } = useAuth();
  const { allTrips } = useTrips();
  const uid = !demoMode && user ? user.uid : null;

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const settings = loaded && loaded.uid === uid ? loaded.settings : NO_BACKUP_SETTINGS;

  const busyRef = useRef(false);
  const lastTryRef = useRef(0);
  const latest = useRef({ uid, settings, allTrips });
  useEffect(() => {
    latest.current = { uid, settings, allTrips };
  });

  useEffect(() => {
    if (!uid || !driveAvailable) return;
    let cancelled = false;
    loadBackupSettings(uid).then((next) => {
      if (!cancelled) setLoaded({ uid, settings: next });
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const update = useCallback((forUid: string, change: (current: BackupSettings) => BackupSettings) => {
    const current = latest.current.uid === forUid ? latest.current.settings : NO_BACKUP_SETTINGS;
    const next = change(current);
    latest.current = { ...latest.current, settings: next };
    saveBackupSettings(forUid, next);
    setLoaded({ uid: forUid, settings: next });
  }, []);

  const runBackup = useCallback(
    async (forUid: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const [noteLists, tasks] = await Promise.all([loadNoteLists(forUid), loadTasks(forUid)]);
        const now = Date.now();
        const backup = buildBackup(
          { trips: latest.current.allTrips, noteLists, noteHistory: cachedNoteHistory(forUid), tasks },
          now,
        );
        await uploadBackup(backupFileName(BACKUP_NAME_PREFIX, now), JSON.stringify(backup));
        update(forUid, (current) => ({ ...current, lastBackupAt: now }));
        setStatus({ kind: 'ok', text: 'Kopja u ruajt në Google Drive.' });
      } catch (error) {
        setStatus({ kind: 'error', text: driveErrorMessage(error) });
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [update],
  );

  // Once a month, by itself: when the app opens (and each time it comes back to the front) with the month passed.
  const runIfDue = useCallback(() => {
    const { uid: current, settings: saved } = latest.current;
    if (!current || !driveAvailable || !saved.auto || !saved.email) return;
    if (!isBackupDue(saved.lastBackupAt) || Date.now() - lastTryRef.current < RETRY_AFTER_MS) return;
    lastTryRef.current = Date.now();
    void runBackup(current);
  }, [runBackup]);

  useEffect(() => {
    if (loaded?.uid === uid) runIfDue();
  }, [loaded, uid, runIfDue]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') runIfDue();
    });
    return () => subscription.remove();
  }, [runIfDue]);

  const connect = useCallback(async () => {
    if (!uid) return;
    setStatus(null);
    try {
      const email = await connectDrive();
      if (email) update(uid, (current) => ({ ...current, email }));
    } catch (error) {
      setStatus({ kind: 'error', text: driveErrorMessage(error) });
    }
  }, [uid, update]);

  const disconnect = useCallback(async () => {
    if (!uid) return;
    setStatus(null);
    try {
      await disconnectDrive();
    } catch {
      // Forgetting the account here is enough, even if Google could not be told.
    }
    update(uid, (current) => ({ ...current, email: null, auto: false }));
  }, [uid, update]);

  const backupNow = useCallback(async () => {
    if (!uid) return;
    setStatus(null);
    await runBackup(uid);
  }, [uid, runBackup]);

  const setAuto = useCallback(
    (next: boolean) => {
      if (uid) update(uid, (current) => ({ ...current, auto: next }));
    },
    [uid, update],
  );

  const value = useMemo<BackupValue>(
    () => ({ available: driveAvailable, settings, busy, status, connect, disconnect, backupNow, setAuto }),
    [settings, busy, status, connect, disconnect, backupNow, setAuto],
  );

  return <BackupContext.Provider value={value}>{children}</BackupContext.Provider>;
}

export function useBackup(): BackupValue {
  const value = useContext(BackupContext);
  if (!value) throw new Error('useBackup must be used inside BackupProvider');
  return value;
}
