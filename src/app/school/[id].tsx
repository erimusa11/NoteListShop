import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SchoolDaysView, TotalPill } from '@/components/SchoolDaysView';
import { useTrips } from '@/context/TripsContext';
import { colors, spacing } from '@/theme/theme';
import { CATEGORIES } from '@/utils/categories';
import { goBackOrHome } from '@/utils/navigation';

// The category that counts days (Kopesht & Shkolle).
const CATEGORY = CATEGORIES.find((category) => category.attendancePlaces);

// The days calendar of one list, opened from the Kopesht & Shkolle tab of that list. The same page is in the bottom menu.
export default function SchoolDaysScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips } = useTrips();
  const trip = trips.find((entry) => entry.id === id);

  const back = (
    <Pressable onPress={goBackOrHome} hitSlop={8} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Mbrapa">
      <Ionicons name="chevron-back" size={24} color={colors.text} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      {trip && CATEGORY ? (
        <SchoolDaysView
          trip={trip}
          trips={trips}
          category={CATEGORY}
          header={({ totalAmount }) => (
            <View style={styles.header}>
              {back}
              <View style={styles.titles}>
                <Text style={styles.title}>Ditët e fëmijëve</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {trip.name}
                </Text>
              </View>
              <TotalPill amount={totalAmount} />
            </View>
          )}
        />
      ) : (
        <>
          <View style={styles.header}>{back}</View>
          <Text style={styles.empty}>Lista nuk u gjet.</Text>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.md },
  headerButton: { padding: spacing.xs },
  titles: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
