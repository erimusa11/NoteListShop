import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { InlineEditableField } from '@/components/InlineEditableField';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { ShoppingItem } from '@/types/models';
import { formatNumber } from '@/utils/totals';

interface ItemRowProps {
  item: ShoppingItem;
  onToggle: () => void;
  onUpdate: (patch: Partial<ShoppingItem>) => void;
  onRemove: () => void;
  showQuantity?: boolean;
}

export function ItemRow({ item, onToggle, onUpdate, onRemove, showQuantity = true }: ItemRowProps) {
  return (
    <View style={[styles.card, shadow]}>
      <Pressable onPress={onToggle} hitSlop={8} style={styles.checkbox}>
        <Ionicons
          name={item.bought ? 'checkmark-circle' : 'ellipse-outline'}
          size={28}
          color={item.bought ? colors.success : colors.primary}
        />
      </Pressable>

      <View style={styles.middle}>
        <InlineEditableField
          value={item.name}
          placeholder="Emri i artikullit"
          onChange={(name) => onUpdate({ name })}
          textStyle={[styles.name, item.bought && styles.nameBought]}
        />
        {showQuantity && (
          <InlineEditableField
            value={item.quantity}
            placeholder="Sasia"
            onChange={(quantity) => onUpdate({ quantity })}
            textStyle={styles.quantity}
          />
        )}
      </View>

      <View style={styles.right}>
        <InlineEditableField
          value={item.price != null ? String(item.price) : ''}
          displayValue={item.price != null ? formatNumber(item.price) : undefined}
          placeholder="Çmimi"
          onChange={(text) => {
            const parsed = parseFloat(text.replace(',', '.'));
            onUpdate({ price: Number.isFinite(parsed) ? parsed : null });
          }}
          keyboardType="numeric"
          suffix=" Lekë"
          align="right"
          chip
          textStyle={[styles.price, item.bought && styles.priceBought]}
        />
        <Pressable onPress={onRemove} hitSlop={8} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  checkbox: { paddingRight: spacing.xs },
  middle: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  nameBought: { textDecorationLine: 'line-through', color: colors.textMuted },
  quantity: { fontSize: 13, color: colors.textMuted },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  price: { fontSize: 15, fontWeight: '600', color: colors.primaryDark },
  priceBought: { color: colors.success },
  deleteButton: { padding: 2 },
});
