import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/AuthField';
import { authErrorMessage, useAuth } from '@/context/AuthContext';
import { colors, radii, spacing } from '@/theme/theme';

const MIN_LENGTH = 10;

export default function SetPasswordScreen() {
  const { user, setAccountPassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const longEnough = password.length >= MIN_LENGTH;
  const mixed = /[A-Za-z]/.test(password) && /\d/.test(password);
  const matches = password.length > 0 && password === confirm;
  const canSubmit = longEnough && mixed && matches && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setBusy(true);
    try {
      await setAccountPassword(password);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.panel}>
            <View style={styles.iconBadge}>
              <Ionicons name="lock-closed" size={30} color={colors.primary} />
            </View>
            <Text style={styles.title}>Krijo fjalëkalimin</Text>
            <Text style={styles.subtitle}>
              Hyre si {user?.email ?? 'përdorues'}. Krijo një fjalëkalim që të mund të hysh edhe pa Google.
            </Text>

            <AuthField
              label="Fjalëkalimi"
              value={password}
              onChangeText={setPassword}
              placeholder={`Të paktën ${MIN_LENGTH} shkronja ose shifra`}
              password
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
            />
            <AuthField
              label="Përsërite fjalëkalimin"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Shkruaje edhe një herë"
              password
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={submit}
            />

            <View style={styles.checks}>
              <Check ok={longEnough} text={`Të paktën ${MIN_LENGTH} karaktere`} />
              <Check ok={mixed} text="Përmban shkronja dhe shifra" />
              <Check ok={matches} text="Të dy fjalëkalimet janë njësoj" />
            </View>

            {error && (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            )}

            <Pressable
              onPress={submit}
              disabled={!canSubmit}
              accessibilityRole="button"
              style={[styles.primaryButton, !canSubmit && styles.disabled]}
            >
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Ruaj fjalëkalimin</Text>}
            </Pressable>

            <Pressable onPress={signOut} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>Dil dhe përdor një llogari tjetër</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Check({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.checkRow}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={ok ? colors.success : colors.textMuted}
      />
      <Text style={[styles.checkText, ok && styles.checkTextOk]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.md },
  panel: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: spacing.md },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: -spacing.sm },
  checks: { gap: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkText: { fontSize: 13, color: colors.textMuted },
  checkTextOk: { color: colors.success },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 6,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  error: { fontSize: 13, color: colors.danger },
  link: { fontSize: 14, fontWeight: '600', color: colors.primaryDark, textAlign: 'center' },
});
