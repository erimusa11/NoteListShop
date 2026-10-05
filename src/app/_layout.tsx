import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CloudSyncGate } from '@/components/CloudSyncGate';
import { AppLockProvider } from '@/context/AppLockContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BillsProvider } from '@/context/BillsContext';
import { SuppliesProvider } from '@/context/SuppliesContext';
import { TripsProvider } from '@/context/TripsContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { colors } from '@/theme/theme';

function RootNavigator() {
  const { user, hasPassword, devMode } = useAuth();
  const signedIn = devMode || (user !== null && hasPassword);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="trip/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={user === null && !devMode}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={user !== null && !hasPassword && !devMode}>
        <Stack.Screen name="set-password" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <TripsProvider>
          <BillsProvider>
            <WishlistProvider>
              <SuppliesProvider>
                <StatusBar style="dark" />
                <CloudSyncGate>
                  <AppLockProvider>
                    <RootNavigator />
                  </AppLockProvider>
                </CloudSyncGate>
              </SuppliesProvider>
            </WishlistProvider>
          </BillsProvider>
        </TripsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
