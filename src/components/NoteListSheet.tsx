import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { colors, radii, spacing } from '@/theme/theme';
import type { NoteListKind } from '@/types/models';
import { formatDateAlbanian } from '@/utils/dates';

const KINDS: { value: NoteListKind; title: string; hint: string; icon: 'list-outline' | 'cart-outline' }[] = [
  { value: 'work', title: 'Listë normale', hint: 'Shënime me rëndësi, si detyra', icon: 'list-outline' },
  { value: 'products', title: 'Listë blerjesh', hint: 'Produkt, sasi, çmim dhe shuma', icon: 'cart-outline' },
];

/** `key` changes with every opening, so the form starts fresh. */
export interface NoteListSheetState {
  open: boolean;
  key: number;
}

interface NoteListSheetProps {
  sheet: NoteListSheetState;
  onClose: () => void;
  onSave: (name: string, kind: NoteListKind) => void;
}

// Naming a new group and choosing its category: a normal list or a shopping list. The day it is made is put on it by itself;
// it is only shown here so it is clear it is kept.
export function NoteListSheet({ sheet, onClose, onSave }: NoteListSheetProps) {
  return (
    <BottomSheet visible={sheet.open} onClose={onClose} title="Listë e re">
      <NoteListForm key={sheet.key} onSave={onSave} />
    </BottomSheet>
  );
}

function NoteListForm({ onSave }: Pick<NoteListSheetProps, 'onSave'>) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<NoteListKind>('work');
  // The day is read once, when the form opens.
  const [today] = useState(() => formatDateAlbanian(Date.now()));
  const canSave = name.trim().length > 0;
  const save = () => {
    if (canSave) onSave(name, kind);
  };

  return (
    <>
      <Text style={styles.label}>Emri i listës</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={kind === 'products' ? 'P.sh. Pazari i javës' : 'P.sh. Punët e shtëpisë'}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={save}
        maxLength={60}
      />
      <Text style={[styles.label, styles.kindLabel]}>Kategoria</Text>
      <View style={styles.kinds} accessibilityRole="radiogroup">
        {KINDS.map((entry) => {
          const selected = kind === entry.value;
          return (
            <Pressable
              key={entry.value}
              onPress={() => setKind(entry.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[styles.kind, selected && styles.kindSelected]}
            >
              <Ionicons name={entry.icon} size={22} color={selected ? colors.primaryDark : colors.textMuted} />
              <Text style={[styles.kindTitle, selected && styles.kindTitleSelected]}>{entry.title}</Text>
              <Text style={styles.kindHint}>{entry.hint}</Text>
            </Pressable>
          );
        })}
      </View>
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
  kindLabel: { marginTop: spacing.sm },
  kinds: { flexDirection: 'row', gap: spacing.sm },
  kind: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  kindSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  kindTitle: { fontSize: 14, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  kindTitleSelected: { color: colors.primaryDark },
  kindHint: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
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
