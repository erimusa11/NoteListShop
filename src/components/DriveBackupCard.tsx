import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useBackup } from '@/context/BackupContext';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import { BACKUP_INTERVAL_DAYS } from '@/utils/backup';
import { formatDateAlbanian } from '@/utils/dates';

// The profile card for the second copy of the data, kept in the user's own Google Drive: a button for a copy right now,
// and a switch for one by itself every month.
export function DriveBackupCard() {
  const { available, settings, busy, status, connect, disconnect, backupNow, setAuto } = useBackup();
  const connected = settings.email !== null;

  return (
    <View style={[styles.card, shadow]}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name="cloud-upload-outline" size={22} color={colors.primaryDark} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>Kopje rezervë në Google Drive</Text>
          <Text style={styles.hint}>
            {connected ? settings.email : 'Një kopje e dytë e listave, detyrave dhe koshit, në Drive-in tënd'}
          </Text>
        </View>
      </View>

      {!available ? (
        <Text style={styles.note}>
          Kopja në Google Drive nuk është konfiguruar ende në këtë version të aplikacionit (shih README).
        </Text>
      ) : !connected ? (
        <Pressable onPress={connect} accessibilityRole="button" style={styles.primary}>
          <Ionicons name="logo-google" size={17} color="#FFFFFF" />
          <Text style={styles.primaryText}>Lidh Google Drive</Text>
        </Pressable>
      ) : (
        <>
          <Text style={styles.last}>
            {settings.lastBackupAt === null
              ? 'Ende nuk ka asnjë kopje.'
              : `Kopja e fundit: ${formatDateAlbanian(settings.lastBackupAt)}`}
          </Text>

          <Pressable
            onPress={backupNow}
            disabled={busy}
            accessibilityRole="button"
            style={[styles.primary, busy && styles.disabled]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.primaryText}>{busy ? 'Po ruhet…' : 'Bëj kopjen tani'}</Text>
          </Pressable>

          <View style={styles.row}>
            <View style={styles.text}>
              <Text style={styles.switchTitle}>Kopje automatike çdo muaj</Text>
              <Text style={styles.hint}>
                Bëhet vetë kur e hap aplikacionin pas {BACKUP_INTERVAL_DAYS} ditësh nga kopja e fundit
              </Text>
            </View>
            <Switch
              value={settings.auto}
              onValueChange={setAuto}
              trackColor={{ true: colors.primary, false: colors.border }}
              accessibilityLabel="Kopje automatike çdo muaj"
            />
          </View>

          <Pressable onPress={disconnect} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>Shkëput Google Drive</Text>
          </Pressable>
        </>
      )}

      {status && (
        <Text style={status.kind === 'ok' ? styles.ok : styles.error} accessibilityRole="alert">
          {status.text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm + 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  switchTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted },
  note: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
  last: { fontSize: 13, color: colors.textMuted },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 6,
  },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  link: { fontSize: 14, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
  ok: { fontSize: 13, color: colors.success },
  error: { fontSize: 13, color: colors.danger },
});
