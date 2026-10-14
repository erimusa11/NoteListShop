import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CloudSyncGate } from '@/components/CloudSyncGate';
import { AppLockProvider } from '@/context/AppLockContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { FamilyLabelsProvider } from '@/context/FamilyLabelsContext';
import { LegalProvider, useLegal } from '@/context/LegalContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { TripsProvider } from '@/context/TripsContext';
import { UndoProvider } from '@/context/UndoContext';
import { colors } from '@/theme/theme';

function RootNavigator() {
  const { user, hasPassword, demoMode } = useAuth();
  const { accepted } = useLegal();
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
      {/* The app itself: only for someone signed in who has accepted the Terms of use and Privacy policy (the demo holds no data). */}
      <Stack.Protected guard={signedIn && (accepted || demoMode)}>
        <Stack.Screen name="index" />
        <Stack.Screen name="trip/[id]" />
        <Stack.Screen name="note/[id]" />
        <Stack.Screen name="profile" />
      </Stack.Protected>
      <Stack.Protected guard={user === null && !demoMode}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={user !== null && !hasPassword && !demoMode}>
        <Stack.Screen name="set-password" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !accepted && !demoMode}>
        <Stack.Screen name="accept-terms" />
      </Stack.Protected>
      {/* The two documents can be read from anywhere, signed in or not. They come last so they are never the first screen. */}
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <TripsProvider>
          <FamilyLabelsProvider>
            <ProfileProvider>
              <StatusBar style="dark" />
              <CloudSyncGate>
                <AppLockProvider>
                  <UndoProvider>
                    <LegalProvider>
                      <RootNavigator />
                    </LegalProvider>
                  </UndoProvider>
                </AppLockProvider>
              </CloudSyncGate>
            </ProfileProvider>
          </FamilyLabelsProvider>
        </TripsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
