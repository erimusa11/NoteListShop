# Note Shop List

Personal shopping-list app by Eri — built with [Expo](https://expo.dev) + React Native.
The interface is in Albanian and prices are in Lekë.

## Features

- **Lists** — create and name multiple lists (e.g. one per month), search them by name, see when each was created. The lists screen shows 5 at a time, with a button to load 5 more
- **Të ardhurat (Income)** — add income entries (name + amount) per list; the total is what the list is measured against
- **Produktet** — items with a quantity (a number, 1 by default) and the price of one, checked off as you buy them; the row total is quantity × price and that is what counts in every total and report
- **More categories** — **Detergjente & Extra**, **Faturat** (bills), **Dëshirat** (wishlist), **Veshje & Rroba**, **Karburant & Makina**, **Blerje online**, **Shetitje**, **Guzhina & Enë Guzhine** and **Playstation & Abonime**. They all work like products (without a quantity): every list has its own copy, so checking one off counts as spent in that list only. The tabs scroll sideways, and the grid button at the top opens all of them at once. New categories are added in `src/utils/categories.ts`
- **Star an item** (★) to make it recurring — it appears in every other list and in every new list, unchecked and at priority 1. Its name is the same everywhere, but the price, quantity, priority and checked state belong to each list. Tap the star again to stop sharing it (each list keeps its own copy). Items without a star only exist in the list they were added to.
- **Priority levels 1–5** (Normale → Urgjente) on every item type except income; unchecked items are sorted by urgency, checked items go to the bottom
- **Spending vs. income** — totals bar on every tab, plus a red card showing how much you exceeded your income
- **Add suggestions** — the most-used items appear as one-tap chips while adding
- **Reports** — one column chart per category showing what was spent in each of the last 12 lists (tap a column to open that list), then a card with the total of each category and all of them together over those 12 lists, ending with a pie chart of the split. The charts are drawn as you scroll, so the tab opens fast. The lists screen has a mini chart of the last 12 lists and a pie of the latest list by category
- **Swipe to delete** items — a long pull to the left, then a confirmation popup; it removes the item from that list only. Deleting a whole list also asks first
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
