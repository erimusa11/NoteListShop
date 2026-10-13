import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { EmptyState } from '@/components/EmptyState';
import { SchoolDaysView, TotalPill } from '@/components/SchoolDaysView';
import { useTrips } from '@/context/TripsContext';
import { colors, radii, spacing } from '@/theme/theme';
import { CATEGORIES } from '@/utils/categories';
import { formatDateAlbanian } from '@/utils/dates';

// The category that counts days (Kopesht & Shkolle).
const CATEGORY = CATEGORIES.find((category) => category.attendancePlaces);

interface SchoolDaysTabProps {
  /** The list the days are added to; the newest one while none was picked (or the picked one is gone). */
  tripId: string | null;
  onPickTrip: (id: string) => void;
  /** For when there is no list yet. */
  onGoToLists: () => void;
}

// The Kopesht & Shkolle page of the bottom menu: the days calendar of one list, the newest by default, with a small switch
// to another list. The days of a month belong to a list (that is where the money of the days is counted), so the list
// that is open is always shown on top.
// Nothing is built until the menu is opened, so the lists screen does not pay for it.
export function SchoolDaysTab({ tripId, onPickTrip, onGoToLists }: SchoolDaysTabProps) {
  const { trips } = useTrips();
  const [pickerOpen, setPickerOpen] = useState(false);
  const newest = [...trips].sort((a, b) => b.createdAt - a.createdAt);
  const trip = newest.find((entry) => entry.id === tripId) ?? newest[0];

  if (!CATEGORY) return null;

  if (!trip) {
    return (
      <View style={styles.flex}>
        <EmptyState
          icon="school-outline"
          title="Krijo një listë së pari"
          subtitle="Ditët e kopshtit dhe të shkollës shënohen brenda një liste, p.sh. Tetor 2026."
        />
        <Pressable onPress={onGoToLists} accessibilityRole="button" style={styles.goButton}>
          <Text style={styles.goText}>Shko te Listat</Text>
        </Pressable>
      </View>
    );
  }

  const several = newest.length > 1;

  return (
    <>
      <SchoolDaysView
        // A new list starts the page over: its own days, its own month, its own prices.
        key={trip.id}
        trip={trip}
        trips={trips}
        category={CATEGORY}
        inset={0}
        header={({ totalAmount }) => (
          <View style={styles.header}>
            <Pressable
              onPress={() => setPickerOpen(true)}
              disabled={!several}
              accessibilityRole="button"
              accessibilityLabel={`Lista: ${trip.name}${several ? '. Zgjidh një tjetër' : ''}`}
              style={({ pressed }) => [styles.listPill, pressed && styles.pressed]}
            >
              <Ionicons name="albums-outline" size={18} color={colors.primaryDark} />
              <Text style={styles.listName} numberOfLines={1}>
                {trip.name}
              </Text>
              {several && <Ionicons name="chevron-down" size={16} color={colors.textMuted} />}
            </Pressable>
            <TotalPill amount={totalAmount} />
          </View>
        )}
      />

      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Ditët shtohen në listën…">
        <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
          {newest.map((entry) => {
            const selected = entry.id === trip.id;
            return (
              <Pressable
                key={entry.id}
                onPress={() => {
                  onPickTrip(entry.id);
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
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.md },
  listPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pressed: { opacity: 0.7 },
  listName: { flexShrink: 1, fontSize: 15, fontWeight: '800', color: colors.text },
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
  goButton: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  goText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
