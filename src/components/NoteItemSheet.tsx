import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { PrioritySelector } from '@/components/PrioritySelector';
import { colors, radii, spacing } from '@/theme/theme';
import type { NoteItem, QuantityUnit } from '@/types/models';
import {
  DEFAULT_UNIT,
  formatQuantity,
  type NoteItemFields,
  type NoteSuggestion,
  pickNoteSuggestions,
  UNITS,
} from '@/utils/noteLists';
import { DEFAULT_PRIORITY, normalizePriority } from '@/utils/priority';
import { DEFAULT_QUANTITY, sanitizeQuantityInput } from '@/utils/quantity';

/** What the sheet is showing: a new item (`item` null) or an existing one. `key` changes with every opening, so the form starts fresh. */
export interface NoteItemSheetState {
  item: NoteItem | null;
  open: boolean;
  key: number;
}

interface NoteItemSheetProps {
  sheet: NoteItemSheetState;
  onClose: () => void;
  onSave: (fields: NoteItemFields) => void;
  onDelete: () => void;
  /** In a shopping list: the item is a product with an amount and a price. Otherwise it is only a text with a priority, like a to-do. */
  shopping?: boolean;
  /** What was added before, offered while a new item is typed: one tap adds it with the amount it was last used with. */
  suggestions: NoteSuggestion[];
}

export function NoteItemSheet({ sheet, onClose, onSave, onDelete, suggestions, shopping }: NoteItemSheetProps) {
  return (
    <BottomSheet visible={sheet.open} onClose={onClose} title={sheet.item ? 'Ndrysho artikullin' : 'Artikull i ri'}>
      <NoteItemForm
        key={sheet.key}
        item={sheet.item}
        onSave={onSave}
        onDelete={onDelete}
        suggestions={suggestions}
        shopping={shopping}
      />
    </BottomSheet>
  );
}

function NoteItemForm({
  item,
  onSave,
  onDelete,
  suggestions,
  shopping,
}: Pick<NoteItemSheetProps, 'onSave' | 'onDelete' | 'suggestions' | 'shopping'> & { item: NoteItem | null }) {
  const [name, setName] = useState(item?.name ?? '');
  // The amount is 1 until it is changed; an empty or invalid one is saved as 1 too.
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : DEFAULT_QUANTITY);
  const [unit, setUnit] = useState<QuantityUnit>(item?.unit ?? DEFAULT_UNIT);
  const [price, setPrice] = useState(item?.price != null ? String(item.price) : '');
  const [importance, setImportance] = useState<number>(normalizePriority(item?.importance ?? DEFAULT_PRIORITY));
  // Deleting takes a second tap, so a stray touch cannot remove an item.
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Only for a new item; changing one has nothing to add.
  const shown = useMemo(
    () => (item || !shopping ? [] : pickNoteSuggestions(suggestions, name)),
    [item, shopping, suggestions, name],
  );

  const canSave = name.trim().length > 0;
  const save = () => {
    if (canSave) onSave({ name, quantity, unit, ...(shopping ? { price } : { importance }) });
  };

  return (
    <>
      <Text style={styles.label}>{shopping ? 'Produkti' : 'Shënimi'}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={shopping ? 'P.sh. Domate' : 'P.sh. Telefono mjekun'}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoFocus={!item}
        returnKeyType={shopping ? 'next' : 'done'}
        onSubmitEditing={shopping ? undefined : save}
        maxLength={120}
      />

      {shown.length > 0 && (
        <View style={styles.suggestions}>
          <Text style={styles.label}>{name.trim() ? 'Sugjerime' : 'Më të përdorurat'}</Text>
          <View style={styles.chips}>
            {shown.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => onSave({ name: s.name, quantity: String(s.quantity), unit: s.unit })}
                accessibilityRole="button"
                accessibilityLabel={`Shto ${s.name}, ${formatQuantity(s.quantity, s.unit)}`}
                style={styles.chip}
              >
                <Ionicons name="add-circle" size={16} color={colors.primary} />
                <Text style={styles.chipText}>{s.name}</Text>
                <Text style={styles.chipMeta}>{formatQuantity(s.quantity, s.unit)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {!shopping && (
        <>
          <Text style={[styles.label, styles.gap]}>Rëndësia</Text>
          <PrioritySelector value={importance} onChange={setImportance} />
        </>
      )}

      {shopping && (
        <>
          <Text style={[styles.label, styles.gap]}>Sasia</Text>
          <View style={styles.quantityRow}>
            <TextInput
              value={quantity}
              onChangeText={(text) => setQuantity(sanitizeQuantityInput(text))}
              // Tapping into the field selects the 1, so the number typed replaces it.
              selectTextOnFocus
              placeholder={DEFAULT_QUANTITY}
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={[styles.input, styles.quantityInput]}
              accessibilityLabel="Sasia"
              onSubmitEditing={save}
            />
            <View style={styles.units} accessibilityRole="radiogroup">
              {UNITS.map((entry) => {
                const selected = entry.value === unit;
                return (
                  <Pressable
                    key={entry.value}
                    onPress={() => setUnit(entry.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[styles.unit, selected && styles.unitSelected]}
                  >
                    <Text style={[styles.unitText, selected && styles.unitTextSelected]}>{entry.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text style={[styles.label, styles.gap]}>Çmimi i artikullit (opsionale)</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="Lekë"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.input}
            accessibilityLabel="Çmimi"
            onSubmitEditing={save}
          />
        </>
      )}

      <Pressable onPress={save} disabled={!canSave} accessibilityRole="button" style={[styles.save, !canSave && styles.saveDisabled]}>
        <Text style={styles.saveText}>{item ? 'Ruaj ndryshimet' : shopping ? 'Shto produktin' : 'Shto shënimin'}</Text>
      </Pressable>

      {item && (
        <Pressable
          onPress={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
          accessibilityRole="button"
          style={[styles.delete, confirmDelete && styles.deleteConfirm]}
        >
          <Text style={[styles.deleteText, confirmDelete && styles.deleteConfirmText]}>
            {confirmDelete ? 'Shtyp përsëri për ta fshirë' : 'Fshi artikullin'}
          </Text>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 2 },
  gap: { marginTop: spacing.sm },
  input: {
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
  },
  suggestions: { gap: 6, marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 12,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
  chipMeta: { fontSize: 12, color: colors.textMuted },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quantityInput: { width: 84, textAlign: 'center', fontWeight: '700' },
  units: { flex: 1, flexDirection: 'row', gap: spacing.xs },
  unit: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 1,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  unitSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  unitText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  unitTextSelected: { color: colors.primaryDark, fontWeight: '700' },
  save: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveDisabled: { opacity: 0.5 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  delete: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  deleteConfirm: { backgroundColor: colors.danger, borderColor: colors.danger },
  deleteText: { fontSize: 15, fontWeight: '700', color: colors.danger },
  deleteConfirmText: { color: '#FFFFFF' },
});
