import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { Savings } from '@/utils/reports';
import { formatPrice } from '@/utils/totals';

interface SavingsCardProps {
  savings: Savings;
  /** A list of the breakdown was tapped. */
  onOpenList?: (id: string) => void;
}

const PANEL_MAX_HEIGHT = 250;

// Minus in front of an amount below zero, since the amount itself is shown without a sign.
const signed = (value: number) => `${value < 0 ? '-' : ''}${formatPrice(Math.abs(value))}`;

// The bank: what is left of the income over all the lists, to see how much was saved. Below zero (in red) when some
// list spent more than it had. A tap opens what is left of each list.
export function SavingsCard({ savings, onOpenList }: SavingsCardProps) {
  const { income, spent, left, lists, overLists, perList } = savings;
  const [open, setOpen] = useState(false);
  const negative = left < 0;
  const tone = negative ? colors.danger : colors.success;

  return (
    <View style={[styles.card, shadow]}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Të ardhura të kursyera: ${signed(left)}. ${open ? 'Mbyll' : 'Shfaq'} listat`}
        style={({ pressed }) => [styles.top, pressed && styles.pressed]}
      >
        <View style={[styles.iconBadge, { backgroundColor: negative ? '#FDECEA' : colors.successLight }]}>
          <Ionicons name={negative ? 'trending-down' : 'wallet'} size={22} color={tone} />
        </View>
        <View style={styles.middle}>
          <Text style={styles.label}>Të ardhura të kursyera</Text>
          <Text style={[styles.value, { color: tone }]}>{signed(left)}</Text>
          <Text style={styles.meta} numberOfLines={2}>
            Të ardhura {formatPrice(income)} · Shpenzuar {formatPrice(spent)} · {lists} {lists === 1 ? 'listë' : 'lista'}
          </Text>
          {overLists > 0 && (
            <Text style={styles.over}>
              {overLists === 1 ? '1 listë ka kaluar limitin' : `${overLists} lista kanë kaluar limitin`}
            </Text>
          )}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </Pressable>

      {open && (
        // With many lists the panel stops growing and scrolls on its own, apart from the page behind it.
        <ScrollView style={styles.rows} nestedScrollEnabled showsVerticalScrollIndicator persistentScrollbar>
          {perList.map((list) => {
            const over = list.left < 0;
            return (
              <Pressable
                key={list.id}
                onPress={onOpenList && (() => onOpenList(list.id))}
                accessibilityRole="button"
                accessibilityLabel={`${list.name}: mbeten ${signed(list.left)}. Hap listën`}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {list.name}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {formatPrice(list.income)} − {formatPrice(list.spent)}
                  </Text>
                </View>
                <Text style={[styles.rowValue, { color: over ? colors.danger : colors.success }]}>
                  {signed(list.left)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  pressed: { opacity: 0.6 },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, gap: 1 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  value: { fontSize: 24, fontWeight: '800' },
  meta: { fontSize: 11, color: colors.textMuted },
  over: { fontSize: 11, fontWeight: '700', color: colors.danger },
  // About four and a half rows: the half row shows there is more to scroll to.
  rows: { maxHeight: PANEL_MAX_HEIGHT, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: 11, color: colors.textMuted },
  rowValue: { fontSize: 15, fontWeight: '700' },
});
