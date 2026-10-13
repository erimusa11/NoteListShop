import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { colors, radii, spacing } from '@/theme/theme';
import { formatDateAlbanian } from '@/utils/dates';

/** `key` changes with every opening, so the form starts fresh. */
export interface NoteListSheetState {
  open: boolean;
  key: number;
}

interface NoteListSheetProps {
  sheet: NoteListSheetState;
  onClose: () => void;
  onSave: (name: string) => void;
}

// Naming a new group. The day it is made is put on it by itself; it is only shown here so it is clear it is kept.
export function NoteListSheet({ sheet, onClose, onSave }: NoteListSheetProps) {
  return (
    <BottomSheet visible={sheet.open} onClose={onClose} title="Listë e re">
      <NoteListForm key={sheet.key} onSave={onSave} />
    </BottomSheet>
  );
}

function NoteListForm({ onSave }: Pick<NoteListSheetProps, 'onSave'>) {
  const [name, setName] = useState('');
  // The day is read once, when the form opens.
  const [today] = useState(() => formatDateAlbanian(Date.now()));
  const canSave = name.trim().length > 0;
  const save = () => {
    if (canSave) onSave(name);
  };

  return (
    <>
      <Text style={styles.label}>Emri i listës</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="P.sh. Pazari i javës"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={save}
        maxLength={60}
      />
      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>Krijohet më</Text>
        <Text style={styles.dateValue}>{today}</Text>
      </View>
      <Pressable
        onPress={save}
        disabled={!canSave}
        accessibilityRole="button"
        style={[styles.save, !canSave && styles.saveDisabled]}
      >
        <Text style={styles.saveText}>Krijo listën</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 2 },
  input: {
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  dateLabel: { fontSize: 13, color: colors.textMuted },
  dateValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  save: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveDisabled: { opacity: 0.5 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
