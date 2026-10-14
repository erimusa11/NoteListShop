import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthField } from '@/components/AuthField';
import { BottomSheet } from '@/components/BottomSheet';
import { authErrorMessage, useAuth } from '@/context/AuthContext';
import { colors, radii, spacing } from '@/theme/theme';

interface DeleteAccountSheetProps {
  visible: boolean;
  onClose: () => void;
}

// Erasing the account and all its data (the right to have your data deleted). It asks for the password once more, and says
// plainly what goes. When it is done the account is signed out, so the app returns to the sign-in page by itself.
export function DeleteAccountSheet({ visible, onClose }: DeleteAccountSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Fshi llogarinë">
      <DeleteForm onClose={onClose} />
    </BottomSheet>
  );
}

function DeleteForm({ onClose }: { onClose: () => void }) {
  const { deleteAccount, user } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Two quick presses can both pass the check below before the screen shows the first as busy.
  const running = useRef(false);
  const canDelete = password.length > 0 && !busy;

  const submit = async () => {
    if (!canDelete || running.current) return;
    running.current = true;
    setError(null);
    setBusy(true);
    try {
      await deleteAccount(password);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password'
          ? 'Fjalëkalimi nuk është i saktë.'
          : authErrorMessage(e),
      );
      setBusy(false);
      running.current = false;
    }
  };

  return (
    <>
      <View style={styles.warning}>
        <Ionicons name="warning" size={20} color={colors.danger} />
        <Text style={styles.warningText}>
          Kjo fshin përgjithmonë llogarinë {user?.email ? `(${user.email}) ` : ''}dhe të gjitha listat, shënimet dhe të
          dhënat e saj, nga cloud-i dhe nga ky telefon. Nuk mund të kthehet.
        </Text>
      </View>

      <AuthField
        label="Shkruaj fjalëkalimin për të konfirmuar"
        value={password}
        onChangeText={setPassword}
        placeholder="Fjalëkalimi yt"
        password
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}

      <Pressable
        onPress={submit}
        disabled={!canDelete}
        accessibilityRole="button"
        accessibilityLabel="Fshi llogarinë dhe të dhënat përgjithmonë"
        style={({ pressed }) => [styles.delete, !canDelete && styles.disabled, pressed && styles.pressed]}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="trash" size={18} color="#FFFFFF" />
            <Text style={styles.deleteText}>Fshi përgjithmonë</Text>
          </>
        )}
      </Pressable>
      <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8} style={styles.cancel}>
        <Text style={styles.cancelText}>Anulo</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  warning: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#FDE6E3',
    borderRadius: radii.md,
    padding: spacing.sm + 2,
  },
  warningText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.text },
  error: { fontSize: 13, color: colors.danger },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.danger,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 6,
    marginTop: spacing.xs,
  },
  deleteText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  cancel: { alignItems: 'center', paddingVertical: spacing.xs },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
});
