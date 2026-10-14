import AsyncStorage from '@react-native-async-storage/async-storage';

import { forgetNoteScope } from '@/utils/noteListStore';

// What this phone keeps of an account, beside the account's own copy in the cloud. The names live here, in one place, so
// signing out and deleting the account can both find everything.
/** The copy of the account's data (trips and notes) that lets the app open and work without internet. */
export const cloudCopyKey = (uid: string) => `cloudCopy.${uid}`;
/** Set once the phone has joined the sync of the note lists (see CloudSyncGate). */
export const noteSyncKey = (uid: string) => `noteSync.${uid}`;
/** The name typed in the profile page. */
export const profileKey = (uid: string) => `profile.${uid}`;

/**
 * Removes the copy of an account's data from this phone: the offline copy, the notes and their history. For when the account
 * signs out (only once everything reached the account) or is deleted. The profile name stays unless `withProfile` is set,
 * since signing out is not a reason to type it again.
 */
export function forgetPhoneData(uid: string, withProfile = false): void {
  const keys = [cloudCopyKey(uid), noteSyncKey(uid), ...(withProfile ? [profileKey(uid)] : [])];
  AsyncStorage.multiRemove(keys).catch(() => {});
  forgetNoteScope(uid);
}
