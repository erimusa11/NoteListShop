import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadow, spacing } from '@/theme/theme';
import { type KidDays, type KidInfo, SICK_COLOR } from '@/utils/attendance';

interface AttendanceCardProps {
  kids: KidInfo[];
  summary: KidDays[];
  onPress: () => void;
}

// The door to the days calendar, at the top of the Kopesht & Shkolle list: how many days each child went (and was sick).
export function AttendanceCard({ kids, summary, onPress }: AttendanceCardProps) {
  const any = summary.some((entry) => entry.days > 0 || entry.sick.length > 0);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Hap kalendarin e ditëve"
      style={({ pressed }) => [styles.card, shadow, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={styles.badge}>
          <Ionicons name="calendar" size={20} color={colors.primaryDark} />
        </View>
        <View style={styles.titles}>
          <Text style={styles.title}>Ditët e fëmijëve</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {any ? 'Prek për të shënuar ose ndryshuar ditët' : 'Shëno ditët në cerdhe, kopsht ose shkollë'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>

      {any && (
        <View style={styles.kids}>
          {summary.map((entry) => {
            const info = kids.find((kid) => kid.name === entry.kid);
            return (
              <View key={entry.kid} style={styles.kid}>
                <View style={[styles.avatar, { backgroundColor: info?.color ?? colors.textMuted }]}>
                  <Text style={styles.avatarText}>{info?.initial ?? entry.kid.charAt(0)}</Text>
                </View>
                <View style={styles.kidText}>
                  <Text style={styles.kidName} numberOfLines={1}>
                    {entry.kid}
                  </Text>
                  <View style={styles.kidLine}>
                    <Text style={styles.kidDays}>{entry.days} ditë</Text>
                    {entry.sick.length > 0 && (
                      <View style={styles.sick}>
                        <Ionicons name="thermometer" size={12} color={SICK_COLOR} />
                        <Text style={styles.sickText}>{entry.sick.length}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1 },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  kids: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm + 2 },
  kid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  kidText: { flex: 1 },
  kidName: { fontSize: 13, fontWeight: '700', color: colors.text },
  kidLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kidDays: { fontSize: 12, color: colors.textMuted },
  sick: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  sickText: { fontSize: 12, fontWeight: '800', color: SICK_COLOR },
});
