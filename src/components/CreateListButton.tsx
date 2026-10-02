import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { colors, radii, shadow, spacing } from '@/theme/theme';

interface CreateListButtonProps {
  onCreate: (name: string) => void;
}

export function CreateListButton({ onCreate }: CreateListButtonProps) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');

  const close = () => {
    setVisible(false);
    setName('');
  };

  const submit = () => {
    onCreate(name.trim());
    close();
  };

  return (
    <>
      <Pressable onPress={() => setVisible(true)} style={[styles.fab, shadow]} hitSlop={8}>
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </Pressable>

      <BottomSheet visible={visible} onClose={close} title="Listë e re">
        <Text style={styles.label}>Emri i listës</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="P.sh. Tetori 2026"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoFocus
          onSubmitEditing={submit}
          returnKeyType="done"
        />
        <Pressable onPress={submit} style={styles.submitButton}>
          <Text style={styles.submitText}>Krijo listën</Text>
        </Pressable>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 2 },
  input: {
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
