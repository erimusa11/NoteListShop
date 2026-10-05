import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { PrioritySelector } from '@/components/PrioritySelector';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import { pickSuggestions, type Suggestion } from '@/utils/suggestions';
import { formatNumber } from '@/utils/totals';

interface AddItemButtonProps {
  onAdd: (name: string, quantity: string, price: number | null, priority: number) => void;
  showPriority?: boolean;
  showQuantity?: boolean;
  title?: string;
  suggestions?: Suggestion[];
  namePlaceholder?: string;
  priceLabel?: string;
  submitLabel?: string;
  requirePrice?: boolean;
}

export function AddItemButton({
  onAdd,
  showQuantity = true,
  title = 'Shto artikull',
  suggestions = [],
  namePlaceholder = 'P.sh. Qumësht, Bukë…',
  priceLabel = 'Çmimi (opsionale)',
  submitLabel = 'Shto në listë',
  requirePrice = false,
  showPriority = true,
}: AddItemButtonProps) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [priority, setPriority] = useState(1);

  const close = () => {
    setVisible(false);
    setName('');
    setQuantity('');
    setPrice('');
    setPriority(1);
  };

  const priceValue = parseFloat(price.replace(',', '.'));
  const canSubmit = name.trim().length > 0 && (!requirePrice || (Number.isFinite(priceValue) && priceValue > 0));
  const shown = useMemo(() => pickSuggestions(suggestions, name), [suggestions, name]);

  const pick = (s: Suggestion) => {
    onAdd(s.name, showQuantity ? s.quantity : '', s.price, priority);
    close();
  };

  const submit = () => {
    if (!canSubmit) return;
    const parsedPrice = parseFloat(price.replace(',', '.'));
    onAdd(name.trim(), quantity.trim(), Number.isFinite(parsedPrice) ? parsedPrice : null, priority);
    close();
  };

  return (
    <>
      <Pressable onPress={() => setVisible(true)} style={[styles.fab, shadow]} hitSlop={8}>
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </Pressable>

      <BottomSheet visible={visible} onClose={close} title={title}>
        <Text style={styles.label}>Emri</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={namePlaceholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoFocus
          returnKeyType="next"
        />

        {shown.length > 0 && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsLabel}>{name.trim() ? 'Sugjerime' : 'Më të përdorurat'}</Text>
            <View style={styles.chips}>
              {shown.map((s) => (
                <Pressable
                  key={s.key}
                  onPress={() => pick(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`Shto ${s.name}`}
                  style={styles.chip}
                >
                  <Ionicons name="add-circle" size={16} color={colors.primary} />
                  <Text style={styles.chipText}>{s.name}</Text>
                  {s.price != null && <Text style={styles.chipPrice}>{formatNumber(s.price)}</Text>}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {showQuantity ? (
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Sasia</Text>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                placeholder="P.sh. 2"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{priceLabel}</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="Lekë"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={styles.input}
                onSubmitEditing={submit}
              />
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.label}>{priceLabel}</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="Lekë"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={styles.input}
              onSubmitEditing={submit}
            />
          </>
        )}

        {showPriority && (
          <View style={styles.priority}>
            <Text style={styles.label}>Rëndësia</Text>
            <PrioritySelector value={priority} onChange={setPriority} />
          </View>
        )}

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        >
          <Text style={styles.submitText}>{submitLabel}</Text>
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
  suggestions: { gap: 6 },
  suggestionsLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
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
  chipPrice: { fontSize: 12, color: colors.textMuted },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  rowItem: { flex: 1 },
  priority: { marginTop: spacing.sm },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
