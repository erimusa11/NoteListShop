import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { PrioritySelector } from '@/components/PrioritySelector';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import { DEFAULT_QUANTITY, normalizeQuantity, parseQuantity, sanitizeQuantityInput } from '@/utils/quantity';
import { pickSuggestions, type Suggestion } from '@/utils/suggestions';
import { formatNumber } from '@/utils/totals';

interface AddItemButtonProps {
  onAdd: (name: string, quantity: string, price: number | null, priority: number) => void;
  showPriority?: boolean;
  showQuantity?: boolean;
  title?: string;
  suggestions?: Suggestion[];
  namePlaceholder?: string;
  /** Choose the name from these (a select) instead of typing it, e.g. the kind of fuel. */
  nameOptions?: string[];
  /** Heading above the choices (default "Lloji"). */
  optionsLabel?: string;
  /** One more choice after `nameOptions` with this label; picking it shows a field to type any name. */
  otherOption?: string;
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
  nameOptions,
  optionsLabel = 'Lloji',
  otherOption,
  priceLabel = 'Çmimi (opsionale)',
  submitLabel = 'Shto në listë',
  requirePrice = false,
  showPriority = true,
}: AddItemButtonProps) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(DEFAULT_QUANTITY);
  const [price, setPrice] = useState('');
  const [priority, setPriority] = useState(1);
  // The "other" choice is picked: `name` is then whatever is typed instead of one of `nameOptions`.
  const [other, setOther] = useState(false);

  const close = () => {
    setVisible(false);
    setName('');
    setOther(false);
    setQuantity(DEFAULT_QUANTITY);
    setPrice('');
    setPriority(1);
  };

  const priceValue = parseFloat(price.replace(',', '.'));
  const canSubmit = name.trim().length > 0 && (!requirePrice || (Number.isFinite(priceValue) && priceValue > 0));
  const shown = useMemo(() => pickSuggestions(suggestions, name), [suggestions, name]);

  const pick = (s: Suggestion) => {
    onAdd(s.name, showQuantity ? normalizeQuantity(s.quantity) : '', s.price, priority);
    close();
  };

  const submit = () => {
    if (!canSubmit) return;
    const parsedPrice = parseFloat(price.replace(',', '.'));
    onAdd(
      name.trim(),
      showQuantity ? normalizeQuantity(quantity) : '',
      Number.isFinite(parsedPrice) ? parsedPrice : null,
      priority,
    );
    close();
  };

  return (
    <>
      <Pressable onPress={() => setVisible(true)} style={[styles.fab, shadow]} hitSlop={8}>
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </Pressable>

      <BottomSheet visible={visible} onClose={close} title={title}>
        {nameOptions ? (
          <>
            <Text style={styles.label}>{optionsLabel}</Text>
            <View style={styles.options} accessibilityRole="radiogroup">
              {[...nameOptions, ...(otherOption ? [otherOption] : [])].map((option) => {
                const isOther = option === otherOption;
                const selected = isOther ? other : !other && name === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setOther(isOther);
                      setName(isOther ? '' : option);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
            {other && (
              <>
                <Text style={[styles.label, styles.otherLabel]}>Emri</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={namePlaceholder}
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoFocus
                  returnKeyType="next"
                />
              </>
            )}
          </>
        ) : (
          <>
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
          </>
        )}

        {!nameOptions && shown.length > 0 && (
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
                onChangeText={(text) => setQuantity(sanitizeQuantityInput(text))}
                placeholder={DEFAULT_QUANTITY}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
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

        {showQuantity && Number.isFinite(priceValue) && parseQuantity(quantity) !== 1 && (
          <Text style={styles.total}>Gjithsej: {formatNumber(priceValue * parseQuantity(quantity))} Lekë</Text>
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
  // Each choice is as wide as its name, and the row wraps (the rest of each row is shared out) when they do not all fit,
  // so a long name such as "Hyundai Tucson" stays on one line.
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  otherLabel: { marginTop: spacing.sm },
  option: {
    flexGrow: 1,
    flexBasis: 'auto',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionText: { fontSize: 15, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
  optionTextSelected: { color: colors.primaryDark, fontWeight: '700' },
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
  total: { fontSize: 14, fontWeight: '700', color: colors.primaryDark, marginTop: spacing.sm },
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
