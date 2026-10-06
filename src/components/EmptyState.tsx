import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme/theme';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  subtitle?: string;
}

// Kept still on purpose: an animation that never ends keeps the screen redrawing for as long as it is open.
export function EmptyState({
  icon = 'cart-outline',
  title = 'Lista juaj është bosh',
  subtitle = 'Shtoni artikullin e parë më poshtë!',
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <View style={styles.shadowEllipse} />
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={40} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingTop: spacing.xl },
  iconWrap: { width: 80, height: 96, alignItems: 'center' },
  shadowEllipse: {
    position: 'absolute',
    bottom: 0,
    width: 44,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(35,31,32,0.12)',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted },
});
