# Note Shop List

Personal shopping-list app by Eri — built with [Expo](https://expo.dev) + React Native.
The interface is in Albanian and prices are in Lekë.

## Features

- **Lists** — create and name multiple lists (e.g. one per month), search them by name, see when each was created
- **Të ardhurat (Income)** — add income entries (name + amount) per list; the total is what the list is measured against
- **Produktet** — items with quantity and price, checked off as you buy them
- **Detergjente & Extra**, **Faturat** (bills) and **Dëshirat** (wishlist) — shared across all lists; checking one off counts it as spent in the list where you bought it
- **Priority levels 1–5** (Normale → Urgjente) on every item type except income; unchecked items are sorted by urgency, checked items go to the bottom
- **Spending vs. income** — totals bar on every tab, plus a red card showing how much you exceeded your income
- **Add suggestions** — the most-used items appear as one-tap chips while adding
- **Reports** — column, donut and pie charts (spend per list, per category, latest list) and a mini chart of the last 12 lists
- **Swipe to delete** items, with a confirmation popup before deleting a whole list
- **Accounts** — sign in with Google (web), then set a password; afterwards sign in with either. All data is saved per account in Firestore
- **App lock** (phone) — fingerprint, PIN or pattern when opening the app
- **Works offline** — a copy is kept on the phone, and changes are sent to the account when the connection returns

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Create your Firebase config. Copy `.env.example` to `.env` and fill in the
   values from Firebase console > Project settings > Your apps > Web app.
   `.env` is git-ignored and must never be committed.

3. In the Firebase console, enable **Authentication** (Google + Email/Password)
   and create a **Firestore** database, then paste the contents of
   [`firestore.rules`](firestore.rules) into Firestore > Rules and publish.

4. Start the app

   ```bash
   npx expo start
   ```

   Press `w` to open it in a browser, or scan the QR code with
   [Expo Go](https://expo.dev/go) on a phone.

**Demo mode** — the login screen has a "Provo pa llogari (demo)" button that opens the app
without an account, in any build. Nothing is read from or saved to Firebase, so it works
without a `.env` too; changes live in memory only and are cleared when you leave demo.

## Building an installable Android app (EAS)

```bash
npx eas-cli build --platform android --profile preview
```

This produces an APK you can install from the build page on the phone. The
`EXPO_PUBLIC_FIREBASE_*` values must exist as EAS environment variables (they
are not read from `.env` in the cloud). The version code is increased
automatically with every build.

Google sign-in does not work in the installed APK; use email and password there.

## Tech stack

- Expo SDK 57 + Expo Router (file-based navigation, protected routes)
- React Native 0.86, React 19, Reanimated, Gesture Handler, SVG charts
- Firebase Auth + Firestore (one document per user, owner-only rules)
- AsyncStorage for the offline copy and app-lock setting
- TypeScript, React Context for state
