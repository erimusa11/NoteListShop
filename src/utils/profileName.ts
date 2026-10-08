/** What the user typed in the profile. Empty strings when nothing was typed. */
export interface CustomName {
  firstName: string;
  lastName: string;
}

export const EMPTY_NAME: CustomName = { firstName: '', lastName: '' };

export interface ResolvedName {
  /** For greetings: "Dilaver". */
  firstName: string;
  /** "Dilaver Musa". */
  fullName: string;
  /** True when it is the name typed in the profile, false when it comes from the account (Google). */
  isCustom: boolean;
}

/** Trims and collapses the spaces inside, so "  Eri   Musa " is "Eri Musa". */
export function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** What was saved on the phone may be damaged: anything that is not text becomes empty. */
export function parseStoredName(raw: string | null): CustomName {
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<Record<keyof CustomName, unknown>>) : {};
    return {
      firstName: typeof parsed.firstName === 'string' ? cleanName(parsed.firstName) : '',
      lastName: typeof parsed.lastName === 'string' ? cleanName(parsed.lastName) : '',
    };
  } catch {
    return EMPTY_NAME;
  }
}

/**
 * The name used across the app: the one typed in the profile when its first name is filled, otherwise the name of the
 * account (Google), otherwise the start of the email, otherwise `fallback`. A surname alone does not count as a name.
 */
export function resolveName(
  custom: CustomName,
  accountName: string | null | undefined,
  email: string | null | undefined,
  fallback: string,
): ResolvedName {
  const first = cleanName(custom.firstName);
  const last = cleanName(custom.lastName);
  if (first) return { firstName: first, fullName: [first, last].filter(Boolean).join(' '), isCustom: true };

  const account = cleanName(accountName ?? '');
  if (account) return { firstName: account.split(' ')[0], fullName: account, isCustom: false };

  const fromEmail = email?.split('@')[0] ?? '';
  const name = fromEmail || fallback;
  return { firstName: name, fullName: name, isCustom: false };
}
