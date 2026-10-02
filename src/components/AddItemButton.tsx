import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { colors, radii, shadow, spacing } from '@/theme/theme';

interface AddItemButtonProps {
  onAdd: (name: string, quantity: string, price: number | null) => void;
  showQuantity?: boolean;
  title?: string;
}

export function AddItemButton({ onAdd, showQuantity = true, title = 'Shto artikull' }: AddItemButtonProps) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');

  const close = () => {
    setVisible(false);
    setName('');
    setQuantity('');
    setPrice('');
  };

  const canSubmit = name.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    const parsedPrice = parseFloat(price.replace(',', '.'));
    onAdd(name.trim(), quantity.trim(), Number.isFinite(parsedPrice) ? parsedPrice : null);
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
          placeholder="P.sh. Qumësht, Bukë…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoFocus
          returnKeyType="next"
        />

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
              <Text style={styles.label}>Çmimi (opsionale)</Text>
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
            <Text style={styles.label}>Çmimi (opsionale)</Text>
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

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        >
          <Text style={styles.submitText}>Shto në listë</Text>
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
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  rowItem: { flex: 1 },
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
