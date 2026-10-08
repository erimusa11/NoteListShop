import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CloudSyncGate } from '@/components/CloudSyncGate';
import { AppLockProvider } from '@/context/AppLockContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { TripsProvider } from '@/context/TripsContext';
import { colors } from '@/theme/theme';

function RootNavigator() {
  const { user, hasPassword, demoMode } = useAuth();
  const signedIn = demoMode || (user !== null && hasPassword);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        // Android's default screen change is a slow slide; a fade is much quicker (iOS keeps its native one).
        animation: Platform.OS === 'android' ? 'fade' : 'default',
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="trip/[id]" />
        <Stack.Screen name="profile" />
      </Stack.Protected>
      <Stack.Protected guard={user === null && !demoMode}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={user !== null && !hasPassword && !demoMode}>
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
          <ProfileProvider>
            <StatusBar style="dark" />
            <CloudSyncGate>
              <AppLockProvider>
                <RootNavigator />
              </AppLockProvider>
            </CloudSyncGate>
          </ProfileProvider>
        </TripsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
