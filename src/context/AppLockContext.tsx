import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { colors, radii, spacing } from '@/theme/theme';

const STORAGE_KEY = 'appLock.enabled';
const RELOCK_AFTER_MS = 30_000;
const IS_WEB = Platform.OS === 'web';

interface AppLockValue {
  supported: boolean;
  enabled: boolean;
  setEnabled: (next: boolean) => Promise<string | null>;
}

const AppLockContext = createContext<AppLockValue | null>(null);

async function authenticate(message: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: message,
      cancelLabel: 'Anulo',
      fallbackLabel: 'Përdor PIN-in',
    });
    return result.success;
  } catch {
    // The prompt can fail to open (for example while the app is going to the background); treat it as not unlocked.
    return false;
  }
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { user, hasPassword, loading, signOut } = useAuth();
  const signedIn = user !== null && hasPassword;

  const [supported, setSupported] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const enabledRef = useRef(false);
  const leftAt = useRef<number | null>(null);

  useEffect(() => {
    if (IS_WEB) return;
    let cancelled = false;
    (async () => {
      try {
        const [stored, hasHardware, level] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.getEnrolledLevelAsync(),
        ]);
        if (cancelled) return;
        const canLock = hasHardware && level !== LocalAuthentication.SecurityLevel.NONE;
        const on = stored === '1' && canLock;
        setSupported(canLock);
        enabledRef.current = on;
        setEnabledState(on);
        setLocked(on);
      } catch {
        // keep the lock off if the device cannot answer
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loading && user === null) setLocked(false);
  }, [loading, user]);

  useEffect(() => {
    if (IS_WEB) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const left = leftAt.current;
        leftAt.current = null;
        if (left !== null && enabledRef.current && Date.now() - left > RELOCK_AFTER_MS) setLocked(true);
      } else if (leftAt.current === null) {
        leftAt.current = Date.now();
      }
    });
    return () => sub.remove();
  }, []);

  const unlock = useCallback(async () => {
    if (await authenticate('Shkyç Note Shop List')) setLocked(false);
  }, []);

  const overlayVisible = locked && enabled && signedIn;

  useEffect(() => {
    if (overlayVisible) void unlock();
  }, [overlayVisible, unlock]);

  const setEnabled = useCallback(
    async (next: boolean): Promise<string | null> => {
      if (!supported) return 'Kjo pajisje nuk ka gjurmë gishti ose kyçje ekrani (PIN/model) të aktivizuar.';
      if (!(await authenticate(next ? 'Konfirmo për të aktivizuar kyçjen' : 'Konfirmo për të çaktivizuar kyçjen'))) {
        return 'Verifikimi u anulua.';
      }
      await AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      enabledRef.current = next;
      setEnabledState(next);
      return null;
    },
    [supported],
  );

  const value = useMemo<AppLockValue>(() => ({ supported, enabled, setEnabled }), [supported, enabled, setEnabled]);

  return (
    <AppLockContext.Provider value={value}>
      {children}
      {overlayVisible && (
        <View style={styles.overlay} accessibilityViewIsModal>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={34} color={colors.primary} />
          </View>
          <Text style={styles.title}>Aplikacioni është i kyçur</Text>
          <Text style={styles.subtitle}>Përdor gjurmën e gishtit, PIN-in ose modelin për të hyrë.</Text>
          <Pressable onPress={unlock} accessibilityRole="button" style={styles.button}>
            <Ionicons name="finger-print" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Shkyç</Text>
          </Pressable>
          <Pressable onPress={signOut} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>Dil nga llogaria</Text>
          </Pressable>
        </View>
      )}
    </AppLockContext.Provider>
  );
}

export function useAppLock(): AppLockValue {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within an AppLockProvider');
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3000,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 300 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 6,
    paddingHorizontal: spacing.xl,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  link: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
});
