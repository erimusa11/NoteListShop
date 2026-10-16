import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { PieChart } from '@/components/charts/PieChart';
import { usePrivacy } from '@/context/PrivacyContext';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import { formatDateAlbanian } from '@/utils/dates';
import { CATEGORY_COLORS, type SectionSpend } from '@/utils/reports';
import { formatPrice } from '@/utils/totals';

/** A list the card can show. */
export interface PieChoice {
  id: string;
  name: string;
  createdAt: number;
}

interface LatestListPieProps {
  listName: string;
  sections: SectionSpend[];
  income: number;
  /** A category of the legend (or its slice) was tapped: the key is its section, to open Të shpenzuarat at that part. */
  onPressSection?: (sectionKey: string) => void;
  /** The card was tapped anywhere that is not the chart, a legend entry or the title: to open the list on Më të rëndësishmet. */
  onPressCard?: () => void;
  /** The lists to switch between (newest first). With more than one, the title opens a choice of them. */
  choices?: PieChoice[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

// More entries than this and the legend is laid out in two columns instead of one long list.
const TWO_COLUMNS_FROM = 4;

export function LatestListPie({
  listName,
  sections,
  income,
  onPressSection,
  onPressCard,
  choices,
  selectedId,
  onSelect,
}: LatestListPieProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  // The amount of each category stays; the totals (of the list and of the income) are dots in private mode.
  const { price } = usePrivacy();
  const total = sections.reduce((sum, s) => sum + s.spent, 0);
  // Only the categories with spending, so all the categories do not make this card a long list of zeros.
  const spent = sections.filter((s) => s.spent > 0);
  const twoColumns = spent.length >= TWO_COLUMNS_FROM;
  const switchable = !!choices && choices.length > 1 && !!onSelect;

  return (
    <>
    {/* Not a button for the screen reader (and not a button element on the web): it holds the buttons of the title and the
        legend, and buttons cannot be nested. The tap on the empty parts of the card is only for fingers and the mouse. */}
    <Pressable
      onPress={onPressCard}
      disabled={!onPressCard}
      accessible={false}
      style={({ pressed }) => [styles.card, shadow, pressed && onPressCard && styles.cardPressed]}
    >
      <View style={styles.header}>
        {switchable ? (
          <Pressable
            onPress={() => setPickerOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${listName}. Zgjidh një listë tjetër`}
            style={({ pressed }) => [styles.titleButton, pressed && styles.pressed]}
          >
            <Text style={[styles.title, styles.titleInButton]} numberOfLines={1}>
              {listName}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.primaryDark} />
          </Pressable>
        ) : (
          <Text style={styles.title} numberOfLines={1}>
            {listName}
          </Text>
        )}
        <Text style={styles.total}>{price(total)}</Text>
      </View>
      {spent.length === 0 ? (
        <Text style={styles.none}>Asnjë shpenzim ende</Text>
      ) : (
        <>
          <PieChart
            size={176}
            slices={spent.map((s) => ({ key: s.key, value: s.spent, color: CATEGORY_COLORS[s.key] }))}
            onPressSlice={onPressSection}
          />
          <View style={twoColumns ? styles.legendGrid : styles.legend}>
            {spent.map((section) => {
              const percent = total > 0 ? `${Math.round((section.spent / total) * 100)}%` : '0%';
              const press = {
                onPress: onPressSection && (() => onPressSection(section.key)),
                accessibilityRole: 'button' as const,
                accessibilityLabel: `${section.label}, ${percent}, ${formatPrice(section.spent)}. Hap të shpenzuarat`,
              };
              return twoColumns ? (
                <Pressable key={section.key} style={({ pressed }) => [styles.cell, pressed && styles.pressed]} {...press}>
                  <View style={[styles.dot, styles.cellDot, { backgroundColor: CATEGORY_COLORS[section.key] }]} />
                  <View style={styles.cellText}>
                    <Text style={styles.cellName} numberOfLines={2}>
                      {section.label}
                    </Text>
                    <Text style={styles.cellMeta} numberOfLines={1}>
                      {percent} · {formatPrice(section.spent)}
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable key={section.key} style={({ pressed }) => [styles.row, pressed && styles.pressed]} {...press}>
                  <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[section.key] }]} />
                  <Text style={styles.name} numberOfLines={1}>
                    {section.label}
                  </Text>
                  <Text style={styles.percent}>{percent}</Text>
                  <Text style={styles.value}>{formatPrice(section.spent)}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
      <View style={styles.planned}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${income > 0 ? Math.min(1, total / income) * 100 : 0}%`,
                backgroundColor: income > 0 && total > income ? colors.danger : colors.primary,
              },
            ]}
          />
        </View>
        <View style={styles.plannedRow}>
          <Text style={styles.plannedLabel}>Të ardhurat</Text>
          <Text style={styles.plannedValue}>{price(income)}</Text>
        </View>
      </View>
    </Pressable>

      {switchable && (
        <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Zgjidh listën">
          <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
            {choices.map((entry) => {
              const selected = entry.id === selectedId;
              return (
                <Pressable
                  key={entry.id}
                  onPress={() => {
                    onSelect(entry.id);
                    setPickerOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [styles.pickerRow, selected && styles.pickerRowSelected, pressed && styles.pressed]}
                >
                  <View style={styles.pickerText}>
                    <Text style={styles.pickerName} numberOfLines={1}>
                      {entry.name}
                    </Text>
                    <Text style={styles.pickerDate}>Krijuar më {formatDateAlbanian(entry.createdAt)}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </BottomSheet>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  titleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  titleInButton: { flex: 0, flexShrink: 1 },
  pickerList: { maxHeight: 360 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
  },
  pickerRowSelected: { backgroundColor: colors.primaryLight },
  pickerText: { flex: 1 },
  pickerName: { fontSize: 16, fontWeight: '700', color: colors.text },
  pickerDate: { fontSize: 12, color: colors.textMuted },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardPressed: { opacity: 0.85 },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.textMuted },
  total: { fontSize: 13, fontWeight: '700', color: colors.text },
  legend: { gap: 6 },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pressed: { opacity: 0.55 },
  cell: { width: '48%', flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  cellDot: { marginTop: 3 },
  cellText: { flex: 1 },
  cellName: { fontSize: 12, fontWeight: '600', color: colors.text },
  cellMeta: { fontSize: 11, color: colors.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.text },
  none: { fontSize: 12, color: colors.textMuted },
  percent: { fontSize: 11, color: colors.textMuted, minWidth: 28, textAlign: 'right' },
  value: { fontSize: 12, fontWeight: '700', color: colors.text, minWidth: 64, textAlign: 'right' },
  planned: { gap: 6 },
  track: { height: 5, borderRadius: radii.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary },
  plannedRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  plannedLabel: { fontSize: 12, color: colors.textMuted },
  plannedValue: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
});
