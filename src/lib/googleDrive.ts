import { GoogleSignin, isErrorWithCode, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

// Only the files this app made are visible to it (the drive.file scope): it never sees the rest of the user's Drive.
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

const FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

/** The backups of Drive are made on the phone, and only once the Google client of the project is set up (see the README). */
export const driveAvailable = Platform.OS === 'android' && Boolean(WEB_CLIENT_ID);

/** The prefix of every file name; the date follows. */
export const BACKUP_NAME_PREFIX = 'Note Shop List backup';

// The newest backups kept in Drive; older ones are deleted after each new one, so it never fills up.
const KEEP_BACKUPS = 6;

let configured = false;
function configure() {
  if (configured) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, scopes: [DRIVE_SCOPE] });
  configured = true;
}

/** Opens the Google account picker. Returns the email of the account, or null when it was closed without choosing. */
export async function connectDrive(): Promise<string | null> {
  configure();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (!isSuccessResponse(result)) return null;
  if (!result.data.scopes.includes(DRIVE_SCOPE)) {
    const added = await GoogleSignin.addScopes({ scopes: [DRIVE_SCOPE] });
    if (!added || !isSuccessResponse(added) || !added.data.scopes.includes(DRIVE_SCOPE)) {
      throw new Error('drive-scope-denied');
    }
  }
  return result.data.user.email;
}

export async function disconnectDrive(): Promise<void> {
  configure();
  await GoogleSignin.signOut();
}

async function accessToken(): Promise<string> {
  configure();
  const user = await GoogleSignin.signInSilently();
  if (user.type !== 'success') throw new Error('drive-not-connected');
  return (await GoogleSignin.getTokens()).accessToken;
}

// A token that Drive refuses (expired in the cache) is dropped once and the request is tried again with a new one.
async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const send = async (token: string) =>
    fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` } });
  let token = await accessToken();
  let response = await send(token);
  if (response.status === 401) {
    await GoogleSignin.clearCachedAccessToken(token);
    token = await accessToken();
    response = await send(token);
  }
  if (!response.ok) throw new Error(`drive-http-${response.status}`);
  return response;
}

interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
}

async function listBackups(): Promise<DriveFile[]> {
  const query = encodeURIComponent(`name contains '${BACKUP_NAME_PREFIX}' and trashed = false`);
  const response = await driveFetch(
    `${FILES_URL}?q=${query}&orderBy=createdTime%20desc&pageSize=100&fields=files(id,name,createdTime)`,
  );
  return ((await response.json()) as { files?: DriveFile[] }).files ?? [];
}

/** Puts the backup in Drive as a new file, then deletes the oldest ones beyond the newest few. */
export async function uploadBackup(name: string, json: string): Promise<void> {
  const boundary = `noteshoplist${Date.now().toString(36)}`;
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify({ name, mimeType: 'application/json' })}\r\n` +
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${json}\r\n` +
    `--${boundary}--`;
  await driveFetch(UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });

  // The new file is already safe; failing to tidy up the old ones is not a failed backup.
  try {
    const old = (await listBackups()).slice(KEEP_BACKUPS);
    await Promise.all(old.map((file) => driveFetch(`${FILES_URL}/${file.id}`, { method: 'DELETE' })));
  } catch {
    // They are deleted after the next backup.
  }
}

const MESSAGES: Record<string, string> = {
  'drive-not-connected': 'Google Drive nuk është i lidhur. Lidhe përsëri.',
  'drive-scope-denied': 'Nuk u dha leja për Google Drive.',
  'drive-http-403': 'Google Drive nuk lejoi ruajtjen. Kontrollo që Drive API është aktivizuar në projektin e Google.',
  'drive-http-401': 'Google Drive nuk e njohu llogarinë. Lidhe përsëri.',
};

export function driveErrorMessage(error: unknown): string {
  const message = (error as { message?: string })?.message ?? '';
  if (MESSAGES[message]) return MESSAGES[message];
  if (message.startsWith('drive-http-')) return 'Google Drive dështoi. Provo përsëri pas pak.';
  if (isErrorWithCode(error)) return 'Hyrja me Google dështoi. Provo përsëri.';
  if (message.includes('Network request failed')) return 'Nuk ka lidhje me internetin.';
  return 'Kopja në Google Drive dështoi. Provo përsëri.';
}
