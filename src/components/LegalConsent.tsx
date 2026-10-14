import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme/theme';

interface LegalConsentProps {
  checked: boolean;
  onToggle: () => void;
}

// The line that has to be ticked before signing in: the box, and the two documents it is about as links that open them.
export function LegalConsent({ checked, onToggle }: LegalConsentProps) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        aria-checked={checked}
        accessibilityLabel="Kam lexuar dhe pranoj Kushtet e përdorimit dhe Politikën e privatësisë"
      >
        <Ionicons
          name={checked ? 'checkbox' : 'square-outline'}
          size={26}
          color={checked ? colors.primary : colors.textMuted}
        />
      </Pressable>
      <Text style={styles.text}>
        Kam lexuar dhe pranoj{' '}
        <Text style={styles.link} accessibilityRole="link" onPress={() => router.push('/terms')}>
          Kushtet e përdorimit
        </Text>{' '}
        dhe{' '}
        <Text style={styles.link} accessibilityRole="link" onPress={() => router.push('/privacy')}>
          Politikën e privatësisë
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  text: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.text, paddingTop: 2 },
  link: { fontWeight: '700', color: colors.primaryDark, textDecorationLine: 'underline' },
});
