import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/AuthField';
import { authErrorMessage, useAuth } from '@/context/AuthContext';
import { colors, radii, shadow, spacing } from '@/theme/theme';

export default function LoginScreen() {
  const { configured, signInWithGoogle, signInWithPassword, resetPassword, enterDevMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'google' | 'password' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const run = async (kind: 'google' | 'password', action: () => Promise<void>) => {
    setError(null);
    setInfo(null);
    setBusy(kind);
    try {
      await action();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const canLogin = email.trim().length > 0 && password.length > 0 && busy === null;

  const forgot = async () => {
    if (!email.trim()) {
      setError('Shkruaj emailin më sipër, pastaj trokit "Harrova fjalëkalimin".');
      return;
    }
    setError(null);
    try {
      await resetPassword(email);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'auth/invalid-email' || code === 'auth/network-request-failed') {
        setError(authErrorMessage(e));
        return;
      }
    }
    setInfo('Nëse ekziston një llogari me këtë email, do të marrësh një email për të ndryshuar fjalëkalimin.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.panel}>
            <View style={styles.logoBadge}>
              <Image source={require('@/assets/images/logo-mark.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.title}>Mirë se vini</Text>
            <Text style={styles.subtitle}>Hyr për të ruajtur listat e tua në llogarinë tënde.</Text>

            {!configured && (
              <View style={styles.notice}>
                <Ionicons name="construct-outline" size={18} color={colors.primaryDark} />
                <View style={styles.noticeText}>
                  <Text style={styles.noticeTitle}>Firebase nuk është konfiguruar ende</Text>
                  <Text style={styles.noticeBody}>
                    {__DEV__
                      ? 'Shto çelësat në skedarin .env (shih .env.example) dhe rinise serverin. Deri atëherë mund të vazhdosh pa hyrje, por të dhënat nuk ruhen në llogari.'
                      : 'Aplikacioni nuk është konfiguruar siç duhet. Kontakto zhvilluesin.'}
                  </Text>
                  {__DEV__ && (
                    <Pressable onPress={enterDevMode} accessibilityRole="button" style={styles.devButton}>
                      <Text style={styles.devButtonText}>Vazhdo pa hyrje (zhvillim)</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            <Pressable
              onPress={() => run('google', signInWithGoogle)}
              disabled={!configured || busy !== null}
              accessibilityRole="button"
              style={[styles.googleButton, shadow, (!configured || busy !== null) && styles.disabled]}
            >
              {busy === 'google' ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color={colors.text} />
                  <Text style={styles.googleText}>Vazhdo me Google</Text>
                </>
              )}
            </Pressable>
            <Text style={styles.hint}>Hera e parë? Hyr me Google, pastaj krijon një fjalëkalim.</Text>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>ose me fjalëkalim</Text>
              <View style={styles.line} />
            </View>

            <AuthField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="emri@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            <AuthField
              label="Fjalëkalimi"
              value={password}
              onChangeText={setPassword}
              placeholder="Fjalëkalimi yt"
              password
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => canLogin && run('password', () => signInWithPassword(email, password))}
            />

            {error && (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            )}
            {info && <Text style={styles.info}>{info}</Text>}

            <Pressable
              onPress={() => run('password', () => signInWithPassword(email, password))}
              disabled={!canLogin || !configured}
              accessibilityRole="button"
              style={[styles.primaryButton, (!canLogin || !configured) && styles.disabled]}
            >
              {busy === 'password' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>Hyr</Text>
              )}
            </Pressable>

            <Pressable onPress={forgot} disabled={!configured} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.link}>Harrova fjalëkalimin</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.md },
  panel: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: spacing.md },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  logo: { width: 44, height: 44 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: -spacing.sm },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  noticeText: { flex: 1, gap: 4 },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  noticeBody: { fontSize: 13, color: colors.text },
  devButton: { alignSelf: 'flex-start', marginTop: 4 },
  devButtonText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark, textDecorationLine: 'underline' },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleText: { fontSize: 16, fontWeight: '700', color: colors.text },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: -spacing.sm },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textMuted },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 6,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  error: { fontSize: 13, color: colors.danger },
  info: { fontSize: 13, color: colors.success },
  link: { fontSize: 14, fontWeight: '600', color: colors.primaryDark, textAlign: 'center' },
});
