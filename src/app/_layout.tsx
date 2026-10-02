import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { BillsProvider } from '@/context/BillsContext';
import { TripsProvider } from '@/context/TripsContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { colors } from '@/theme/theme';

export default function RootLayout() {
  return (
    <TripsProvider>
      <BillsProvider>
        <WishlistProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
        </WishlistProvider>
      </BillsProvider>
    </TripsProvider>
  );
}
