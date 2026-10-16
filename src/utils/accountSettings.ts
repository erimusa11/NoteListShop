import { cleanName } from '@/utils/profileName';

/** What the person chose in the profile, kept in the account so every device they sign in on shows the same. */
export interface AccountSettings {
  /** Private mode: the total amounts are hidden. */
  privateMode: boolean;
  /** The name typed in the profile; empty when the name of the account (Google) is used. */
  firstName: string;
  lastName: string;
}

export const MAX_NAME_LENGTH = 40;

const text = (value: unknown) => (typeof value === 'string' ? cleanName(value).slice(0, MAX_NAME_LENGTH) : '');

/**
 * The settings of what came from the account or the phone's copy of it, or null when it holds none (an account that never
 * changed them, or an older version of the app). The keys are always in the same order: the sync compares them as text.
 */
export function normalizeSettings(raw: unknown): AccountSettings | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const firstName = text(source.firstName);
  // A surname without a first name is not a name (see resolveName).
  return { privateMode: source.privateMode === true, firstName, lastName: firstName ? text(source.lastName) : '' };
}
