import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/AuthField';
import { LegalConsent } from '@/components/LegalConsent';
import { LoginHero } from '@/components/LoginHero';
import { authErrorMessage, useAuth } from '@/context/AuthContext';
import { useLegal } from '@/context/LegalContext';
import { ms } from '@/theme/motion';
import { brand, colors, radii, shadow, spacing } from '@/theme/theme';

export default function LoginScreen() {
  const { configured, signInWithGoogle, signInWithPassword, resetPassword, enterDemoMode } = useAuth();
  const { accept } = useLegal();
  // Signing in needs the Terms of use and Privacy policy to be accepted. The box starts ticked (it can be unticked, and then
  // nothing signs in); signing in records the acceptance on this phone.
  const [agreed, setAgreed] = useState(true);
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

  // The acceptance is recorded the moment someone signs in, then the sign-in goes on.
  const withConsent = (action: () => Promise<void>) => async () => {
    await accept();
    await action();
  };

  const canLogin = email.trim().length > 0 && password.length > 0 && busy === null && agreed;
  const canGoogle = configured && busy === null && agreed;

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
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LoginHero />

          <View style={styles.content}>
            <Animated.View entering={FadeInDown.duration(ms(500)).delay(ms(250))} style={styles.titleBlock}>
              <Text style={styles.title} accessibilityRole="header">
                Note Shop List
              </Text>
              <Text style={styles.tagline}>Blerjet, shpenzimet dhe shënimet e tua, të gjitha në një vend.</Text>
              <View style={styles.pills}>
                <View style={[styles.pill, styles.pillShop]}>
                  <Ionicons name="cart" size={15} color={colors.primaryDark} />
                  <Text style={[styles.pillText, { color: colors.primaryDark }]}>Blerje & buxhet</Text>
                </View>
                <View style={[styles.pill, styles.pillNotes]}>
                  <Ionicons name="checkbox" size={15} color={brand.sageDark} />
                  <Text style={[styles.pillText, { color: brand.sageDark }]}>Shënime & lista</Text>
                </View>
              </View>
            </Animated.View>

            {!configured && (
              <View style={styles.notice}>
                <Ionicons name="construct-outline" size={18} color={colors.primaryDark} />
                <View style={styles.noticeText}>
                  <Text style={styles.noticeTitle}>Firebase nuk është konfiguruar ende</Text>
                  <Text style={styles.noticeBody}>
                    {__DEV__
                      ? 'Shto çelësat në skedarin .env (shih .env.example) dhe rinise serverin. Deri atëherë mund të provosh aplikacionin në modalitetin demo, por të dhënat nuk ruhen në llogari.'
                      : 'Aplikacioni nuk është konfiguruar siç duhet. Kontakto zhvilluesin.'}
                  </Text>
                </View>
              </View>
            )}

            <Animated.View entering={FadeInDown.duration(ms(500)).delay(ms(380))} style={[styles.card, shadow]}>
              <Text style={styles.cardTitle}>Hyr në llogari</Text>

              <Pressable
                onPress={enterDemoMode}
                disabled={busy !== null}
                accessibilityRole="button"
                style={({ pressed }) => [styles.demoButton, busy !== null && styles.disabled, pressed && styles.pressed]}
              >
                <Ionicons name="eye-outline" size={18} color={brand.sageDark} />
                <Text style={styles.demoText}>Provo pa llogari (demo)</Text>
              </Pressable>
              <Text style={styles.hint}>Modaliteti demo nuk ruan asgjë në llogari dhe ndryshimet humbasin kur del.</Text>

              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>ose me email</Text>
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
                onSubmitEditing={() =>
                  canLogin && run('password', withConsent(() => signInWithPassword(email, password)))
                }
              />

              {error && (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              )}
              {info && <Text style={styles.info}>{info}</Text>}

              <Pressable
                onPress={() => run('password', withConsent(() => signInWithPassword(email, password)))}
                disabled={!canLogin || !configured}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.primaryButton,
                  (!canLogin || !configured) && styles.disabled,
                  pressed && styles.pressed,
                ]}
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

              <View style={[styles.consent, agreed && styles.consentOn]}>
                <LegalConsent checked={agreed} onToggle={() => setAgreed((value) => !value)} />
              </View>

              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>ose</Text>
                <View style={styles.line} />
              </View>

              <Pressable
                onPress={() => run('google', withConsent(signInWithGoogle))}
                disabled={!canGoogle}
                accessibilityRole="button"
                style={({ pressed }) => [styles.googleButton, !canGoogle && styles.disabled, pressed && styles.pressed]}
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
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(ms(500)).delay(ms(520))} style={styles.demoBlock}>
              <Text style={styles.signature}>By Eri</Text>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingBottom: spacing.lg },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center', paddingHorizontal: spacing.md, gap: spacing.md },
  titleBlock: { alignItems: 'center', gap: spacing.xs + 2, paddingTop: spacing.sm },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.5 },
  tagline: { fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center', maxWidth: 320 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xs },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pillShop: { backgroundColor: brand.peach },
  pillNotes: { backgroundColor: brand.sageLight },
  pillText: { fontSize: 12, fontWeight: '700' },
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: spacing.md + 2,
    gap: spacing.md - 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  consent: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.sm + 2,
  },
  consentOn: { borderColor: brand.sage, backgroundColor: brand.sageLight },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 6,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  googleText: { fontSize: 16, fontWeight: '700', color: colors.text },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textMuted },
  error: { fontSize: 13, color: colors.danger },
  info: { fontSize: 13, color: colors.success },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 7,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  link: { fontSize: 14, fontWeight: '600', color: colors.primaryDark, textAlign: 'center' },
  demoBlock: { alignItems: 'center', gap: spacing.sm },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 3,
    paddingHorizontal: spacing.lg,
    backgroundColor: brand.sageLight,
  },
  demoText: { fontSize: 15, fontWeight: '700', color: brand.sageDark },
  signature: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: spacing.xs },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
