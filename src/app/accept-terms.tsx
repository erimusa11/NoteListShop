import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LegalConsent } from '@/components/LegalConsent';
import { useAuth } from '@/context/AuthContext';
import { useLegal } from '@/context/LegalContext';
import { colors, radii, spacing } from '@/theme/theme';

// For someone who is already signed in but has not accepted the current Terms of use and Privacy policy on this phone yet (the
// app was installed or updated since): they are shown before anything else, once.
export default function AcceptTermsScreen() {
  const { signOut, user } = useAuth();
  const { accept } = useLegal();
  const [agreed, setAgreed] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.panel}>
          <View style={styles.iconBadge}>
            <Ionicons name="shield-checkmark" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>Para se të vazhdosh</Text>
          <Text style={styles.subtitle}>
            {user?.email ? `${user.email}, ` : ''}lexo Kushtet e përdorimit dhe Politikën e privatësisë dhe pranoji për të
            përdorur aplikacionin.
          </Text>

          <LegalConsent checked={agreed} onToggle={() => setAgreed((value) => !value)} />

          <Pressable
            onPress={accept}
            disabled={!agreed}
            accessibilityRole="button"
            style={[styles.primaryButton, !agreed && styles.disabled]}
          >
            <Text style={styles.primaryText}>Pranoj dhe vazhdoj</Text>
          </Pressable>

          <Pressable onPress={signOut} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>Nuk pranoj, dil nga llogaria</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 6,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  link: { fontSize: 14, fontWeight: '600', color: colors.primaryDark, textAlign: 'center' },
});
