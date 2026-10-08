import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/AuthField';
import { useAppLock } from '@/context/AppLockContext';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import { cleanName } from '@/utils/profileName';

// The profile: a name and surname that are used across the app. While they are empty, the name of the Google account is used.
export default function ProfileScreen() {
  const { demoMode, signOut } = useAuth();
  const profile = useProfile();
  const { supported, enabled: lockEnabled, setEnabled: setLockEnabled } = useAppLock();
  const [first, setFirst] = useState(profile.custom.firstName);
  const [last, setLast] = useState(profile.custom.lastName);
  const [saved, setSaved] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  // What the app will call the user with what is typed now, shown at the top while typing.
  const shown = profile.preview({ firstName: first, lastName: last });
  const needsFirst = cleanName(first) === '' && cleanName(last) !== '';
  const unchanged = cleanName(first) === profile.custom.firstName && cleanName(last) === profile.custom.lastName;
  const canSave = !needsFirst && !unchanged;
  const badge = shown.isCustom ? 'Emri yt' : profile.accountName ? 'Emri nga Google' : null;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const edit = (setter: (text: string) => void) => (text: string) => {
    setter(text);
    setSaved(false);
  };

  const save = () => {
    if (!canSave) return;
    profile.save(first, last);
    setFirst(cleanName(first));
    setLast(cleanName(first) ? cleanName(last) : '');
    setSaved(true);
    Keyboard.dismiss();
  };

  const resetToAccountName = () => {
    setFirst('');
    setLast('');
    profile.save('', '');
    setSaved(true);
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Kthehu"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Profili</Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{shown.firstName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.heroName} numberOfLines={2}>
              {shown.fullName}
            </Text>
            <Text style={styles.heroEmail}>{demoMode ? 'Modalitet demo · ndryshimet nuk ruhen' : (profile.email ?? '')}</Text>
            {badge && (
              <View style={[styles.badge, shown.isCustom && styles.badgeCustom]}>
                <Ionicons
                  name={shown.isCustom ? 'person' : 'logo-google'}
                  size={12}
                  color={shown.isCustom ? colors.primaryDark : colors.textMuted}
                />
                <Text style={[styles.badgeText, shown.isCustom && styles.badgeTextCustom]}>{badge}</Text>
              </View>
            )}
          </View>

          <View style={[styles.card, shadow]}>
            <Text style={styles.cardTitle}>Emri yt</Text>
            <Text style={styles.cardHint}>
              Shkruaje dhe do të përdoret kudo në aplikacion. Lëre bosh për të përdorur emrin nga Google.
            </Text>

            <AuthField
              label="Emri"
              value={first}
              onChangeText={edit(setFirst)}
              placeholder={profile.accountName?.split(' ')[0] ?? 'P.sh. Dilaver'}
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              maxLength={40}
              returnKeyType="next"
            />
            <AuthField
              label="Mbiemri"
              value={last}
              onChangeText={edit(setLast)}
              placeholder="P.sh. Musa"
              autoCapitalize="words"
              autoComplete="family-name"
              textContentType="familyName"
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={save}
            />

            {needsFirst && (
              <Text style={styles.error} accessibilityRole="alert">
                Shkruaj emrin përpara mbiemrit.
              </Text>
            )}

            {profile.accountName && (
              <View style={styles.googleRow}>
                <Ionicons name="logo-google" size={14} color={colors.textMuted} />
                <Text style={styles.googleText} numberOfLines={2}>
                  Emri nga Google: {profile.accountName}
                </Text>
              </View>
            )}

            <Pressable
              onPress={save}
              disabled={!canSave}
              accessibilityRole="button"
              style={[styles.primaryButton, !canSave && !(saved && unchanged) && styles.disabled, saved && unchanged && styles.savedButton]}
            >
              {saved && unchanged && <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
              <Text style={styles.primaryText}>{saved && unchanged ? 'U ruajt' : 'Ruaj emrin'}</Text>
            </Pressable>

            {profile.custom.firstName !== '' && (
              <Pressable onPress={resetToAccountName} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>Përdor emrin nga Google</Text>
              </Pressable>
            )}
          </View>

          {supported && !demoMode && (
            <View style={[styles.card, shadow]}>
              <View style={styles.lockRow}>
                <View style={styles.lockIcon}>
                  <Ionicons name="finger-print" size={22} color={colors.primaryDark} />
                </View>
                <View style={styles.lockText}>
                  <Text style={styles.lockTitle}>Kyçja e aplikacionit</Text>
                  <Text style={styles.lockHint}>Gjurmë gishti, PIN ose model kur e hap</Text>
                </View>
                <Switch
                  value={lockEnabled}
                  onValueChange={async (next) => setLockError(await setLockEnabled(next))}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  accessibilityLabel="Kyçja e aplikacionit"
                />
              </View>
              {lockError && <Text style={styles.error}>{lockError}</Text>}
            </View>
          )}

          <Pressable onPress={signOut} accessibilityRole="button" style={styles.signOutButton}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.signOutText}>{demoMode ? 'Dil nga demo' : 'Dil nga llogaria'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md, width: '100%', maxWidth: 520, alignSelf: 'center' },
  hero: { alignItems: 'center', gap: 4, paddingVertical: spacing.sm },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight,
    borderWidth: 4,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarText: { fontSize: 40, fontWeight: '800', color: colors.primaryDark },
  heroName: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  heroEmail: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: spacing.xs,
  },
  badgeCustom: { backgroundColor: colors.primaryLight },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  badgeTextCustom: { color: colors.primaryDark },
  card: { backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm + 2 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  cardHint: { fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: -4 },
  error: { fontSize: 13, color: colors.danger },
  googleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  googleText: { flex: 1, fontSize: 12, color: colors.textMuted },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 6,
    marginTop: spacing.xs,
  },
  savedButton: { backgroundColor: colors.success },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  link: { fontSize: 14, fontWeight: '600', color: colors.primaryDark, textAlign: 'center' },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lockIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockText: { flex: 1 },
  lockTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  lockHint: { fontSize: 13, color: colors.textMuted },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: spacing.sm + 4,
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: colors.danger },
});
