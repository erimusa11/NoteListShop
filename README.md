# Note Shop List

Shopping list app by Eri — built with [Expo](https://expo.dev) + React Native.

Keep monthly shopping lists, track what you plan to spend vs. what you've
spent, manage recurring monthly bills, and keep a wishlist — all in
Albanian, with prices in Lekë.

## Features

- Create and name multiple shopping lists (e.g. one per month)
- Add items with quantity and price, check them off as you buy them
- Set a budget per list and see how much you've spent against it
- **Faturat** (Bills) — a shared list of recurring monthly bills; checking
  one off counts it as spent, combined with the list's total
- **Lista e Dëshirave** (Wishlist) — a shared wishlist; checked-off items
  disappear from view but still count toward spending
- Rename or delete any list at any time

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

   Press `w` to open it in a browser, or scan the QR code with
   [Expo Go](https://expo.dev/go) on an Android phone.

## Status

This is currently a **local-only prototype** — all data lives in memory on
the device and is not shared between devices or saved between restarts.
Firebase-backed syncing (so the list can be shared live with another
person) is planned but not yet implemented.

## Tech stack

- Expo + Expo Router (file-based navigation)
- TypeScript
- React Context for state management
