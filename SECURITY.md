# Security and privacy

## What the app does

- **Accounts.** Sign-in is Google or email + password (Firebase Authentication). A new password needs at least 10 characters with
  letters and digits. Wrong sign-ins all give the same message, and the password-reset page never says whether an email exists.
- **One private document per person.** [`firestore.rules`](firestore.rules) lets only the signed-in owner `get`, `create`,
  `update` or `delete` their own `users/<id>` document. There is no way to list users or read another person's data; the shape
  and size of every write are checked, and an old app version cannot overwrite notes it does not know about.
- **App lock.** Optional fingerprint / PIN / pattern (Profile). While it is on, the screen is covered while the lock state is
  read at start-up, hidden from screenshots, screen recordings and the recent-apps list (`expo-screen-capture`), and the app
  locks again after 30 s in the background. The lock screen is a window of its own, so it also covers an open sheet or dialog.
  Turning the lock off needs the fingerprint / PIN. (The hidden-screen part needs an APK built after `expo-screen-capture` was
  added; so does the backup setting below.)
- **Nothing is left behind.** Signing out removes the offline copy and the notes from the phone (unless some change has not
  reached the account yet, so nothing is lost). **Profile → Fshi llogarinë dhe të dhënat** erases the account, its cloud data
  and everything on the phone, after asking for the password again.
- **Terms and privacy policy.** Signing in (Google or password) needs the box "Kam lexuar dhe pranoj Kushtet e përdorimit dhe
  Politikën e privatësisë" ticked; someone already signed in sees an acceptance page once. The acceptance (version + time) is
  kept on the phone and asked again when `LEGAL_VERSION` in [`src/utils/legal.ts`](src/utils/legal.ts) is raised. The texts
  live in that file too: keep them in line with what the app really does, and put your contact email in `LEGAL_CONTACT_EMAIL`.
- **Backups.** Android auto-backup is off (`android.allowBackup: false`), so the app's data cannot be pulled out through
  Google Drive / `adb backup`.
- **Secrets.** `.env` is git-ignored; only `.env.example` is tracked. The Firebase *web* keys in `EXPO_PUBLIC_*` are not secrets
  (they are in every build); the rules above are what protect the data. No keys were found in the code or in the git history.

## To do once in the consoles (the app cannot do this itself)

1. **Publish the rules:** Firebase console → Firestore Database → Rules → paste [`firestore.rules`](firestore.rules) → Publish.
2. **Close sign-ups:** Authentication → Settings → User actions → turn off "Enable create (sign-up)". The accounts you need
   already exist; this stops strangers from creating accounts with the public key. (A brand-new person can then no longer sign
   in with Google either; the app says so.) Keep **"Enable delete"** ON, otherwise *Fshi llogarinë* cannot remove the account.
   Keep **Email enumeration protection** on.
3. **Server-side password policy:** Authentication → Settings → Password policy → minimum length 10 and require a numeric
   character, the same as the app asks. Do not also require upper/lower case unless `set-password.tsx` asks for it too. Try
   it with a throw-away account first.
4. **Sign-in providers:** only Google and Email/Password should be enabled. Make sure **Anonymous** is off (the rules only
   check that someone is signed in as the owner of the document).
5. **Restrict the API key:** Google Cloud console → APIs & Services → Credentials → the Firebase browser key → *API
   restrictions* → only Identity Toolkit, Token Service and Cloud Firestore. Do **not** add "Android apps" or "HTTP referrer"
   restrictions: the Firebase JS SDK sends neither, so the app would stop working.
6. **Budget alert:** Google Cloud → Billing → Budgets, so abuse could not run up costs unnoticed.

## Habits

- Never commit `.env`, keystores or the `Build APK` folder (already ignored).
- Lost phone: change the account password (this signs the other devices out) and keep the app lock on.
- `npm audit` lists build-tool advisories (Metro, `@expo/cli`, `xcode`, …). They run on the developer machine, not inside the
  app, and its suggested fix would *downgrade* Expo: do not run `npm audit fix --force`. Update through `npx expo install --fix`
  when a new SDK patch is released.
