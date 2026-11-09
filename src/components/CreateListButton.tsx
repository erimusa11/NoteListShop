import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { LIST_KINDS } from '@/components/ListKindSheet';
import { ParaprakeDot } from '@/components/ParaprakeDot';
import { colors, radii, shadow, spacing } from '@/theme/theme';

interface CreateListButtonProps {
  /** `paraprake` is set when the list is made as a preliminary one. */
  onCreate: (name: string, paraprake: boolean) => void;
}

export function CreateListButton({ onCreate }: CreateListButtonProps) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [paraprake, setParaprake] = useState(false);

  const close = () => {
    setVisible(false);
    setName('');
    setParaprake(false);
  };

  const submit = () => {
    onCreate(name.trim(), paraprake);
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
        <Text style={[styles.label, styles.kindLabel]}>Lloji</Text>
        <View style={styles.kinds} accessibilityRole="radiogroup">
          {LIST_KINDS.map((kind) => {
            const selected = kind.paraprake === paraprake;
            return (
              <Pressable
                key={kind.label}
                onPress={() => setParaprake(kind.paraprake)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={kind.label}
                style={[styles.kind, selected && styles.kindSelected]}
              >
                {kind.paraprake && <ParaprakeDot size={7} />}
                <Text style={[styles.kindText, selected && styles.kindTextSelected]}>{kind.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.kindHint}>
          {paraprake
            ? 'Qëndron gjithmonë në krye të listave. Mund ta kthesh në normale më vonë.'
            : 'Renditet sipas datës, më e reja lart.'}
        </Text>
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
  kindLabel: { marginTop: spacing.xs },
  kinds: { flexDirection: 'row', gap: spacing.sm },
  kind: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm + 1,
  },
  kindSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  kindText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  kindTextSelected: { color: colors.primaryDark, fontWeight: '700' },
  kindHint: { fontSize: 12, color: colors.textMuted },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
