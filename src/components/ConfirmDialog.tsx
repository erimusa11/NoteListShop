import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadow, spacing } from '@/theme/theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  details?: string[];
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  details = [],
  confirmLabel,
  cancelLabel = 'Anulo',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={[styles.dialog, shadow]} onPress={(e) => e.stopPropagation()} accessibilityRole="alert">
          <View style={styles.iconCircle}>
            <Ionicons name="trash" size={26} color={colors.danger} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {details.length > 0 && (
            <View style={styles.details}>
              {details.map((line) => (
                <View key={line} style={styles.detailRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.detailText}>{line}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.buttons}>
            <Pressable onPress={onCancel} accessibilityRole="button" style={[styles.button, styles.cancel]}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} accessibilityRole="button" style={[styles.button, styles.confirm]}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(35, 31, 32, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FDE6E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 19, fontWeight: '700', color: colors.text, textAlign: 'center' },
  message: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  details: { alignSelf: 'stretch', gap: 6, marginTop: spacing.xs },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger, marginTop: 6 },
  detailText: { flex: 1, fontSize: 13, color: colors.text },
  buttons: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.md },
  button: { flex: 1, borderRadius: radii.pill, paddingVertical: spacing.sm + 4, alignItems: 'center' },
  cancel: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  cancelText: { fontSize: 15, fontWeight: '700', color: colors.text },
  confirm: { backgroundColor: colors.danger },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
