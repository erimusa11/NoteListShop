import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NoteList, ShoppingTrip, Task } from '@/types/models';
import type { NoteHistoryEntry } from '@/utils/noteLists';

/** How often the automatic backup to Google Drive is made. */
export const BACKUP_INTERVAL_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Everything the app keeps for an account, as one file. The trash is included, so a restore brings back deleted lists too. */
export interface BackupData {
  app: 'note-shop-list';
  version: 1;
  createdAt: number;
  trips: ShoppingTrip[];
  noteLists: NoteList[];
  noteHistory: NoteHistoryEntry[];
  tasks: Task[];
}

export function buildBackup(
  parts: Pick<BackupData, 'trips' | 'noteLists' | 'noteHistory' | 'tasks'>,
  now: number = Date.now(),
): BackupData {
  return { app: 'note-shop-list', version: 1, createdAt: now, ...parts };
}

/** "Note Shop List backup 2026-10-13 18-05": sorts by date, and holds no character Drive or Windows dislike. */
export function backupFileName(prefix: string, now: number = Date.now()): string {
  const date = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix} ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}-${pad(date.getMinutes())}.json`;
}

/** True when no backup was ever made, or the last one is a full period old. */
export function isBackupDue(lastBackupAt: number | null, now: number = Date.now()): boolean {
  return lastBackupAt === null || now - lastBackupAt >= BACKUP_INTERVAL_DAYS * DAY_MS;
}

export interface BackupSettings {
  /** Backs up by itself, once every `BACKUP_INTERVAL_DAYS`, whenever the app is opened after that time. */
  auto: boolean;
  lastBackupAt: number | null;
  /** The Google account of the Drive that is connected; null while none is. */
  email: string | null;
}

export const NO_BACKUP_SETTINGS: BackupSettings = { auto: false, lastBackupAt: null, email: null };

const settingsKey = (uid: string) => `driveBackup.${uid}`;

export async function loadBackupSettings(uid: string): Promise<BackupSettings> {
  try {
    const raw = await AsyncStorage.getItem(settingsKey(uid));
    const parsed = raw ? (JSON.parse(raw) as Partial<BackupSettings>) : {};
    return {
      auto: parsed.auto === true,
      lastBackupAt: typeof parsed.lastBackupAt === 'number' && Number.isFinite(parsed.lastBackupAt) ? parsed.lastBackupAt : null,
      email: typeof parsed.email === 'string' && parsed.email ? parsed.email : null,
    };
  } catch {
    return NO_BACKUP_SETTINGS;
  }
}

export function saveBackupSettings(uid: string, settings: BackupSettings) {
  AsyncStorage.setItem(settingsKey(uid), JSON.stringify(settings)).catch(() => {});
}
