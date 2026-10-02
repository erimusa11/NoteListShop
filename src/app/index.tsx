import { router } from 'expo-router';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreateListButton } from '@/components/CreateListButton';
import { EmptyState } from '@/components/EmptyState';
import { TripCard } from '@/components/TripCard';
import { useTrips } from '@/context/TripsContext';
import { colors, spacing } from '@/theme/theme';

export default function ListsOverviewScreen() {
  const { trips, createList } = useTrips();
  const sorted = [...trips].sort((a, b) => b.createdAt - a.createdAt);

  const handleCreate = (name: string) => {
    const id = createList(name);
    router.push({ pathname: '/trip/[id]', params: { id } });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Image source={require('@/assets/images/logo-mark.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Note Shop List</Text>
          <Text style={styles.subtitle}>by Eri</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Listat e tua</Text>
        <FlatList
          data={sorted}
          keyExtractor={(trip) => trip.id}
          style={styles.list}
          renderItem={({ item: trip }) => (
            <TripCard trip={trip} onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trip.id } })} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="list-outline"
              title="Nuk ke ende asnjë listë"
              subtitle="Krijo listën tënde të parë me butonin + më poshtë!"
            />
          }
          contentContainerStyle={sorted.length === 0 ? styles.flex : styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View style={styles.footer}>
        <CreateListButton onCreate={handleCreate} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 30, height: 30 },
  titleBlock: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  content: { flex: 1, paddingHorizontal: spacing.md },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.sm },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.sm },
  footer: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, alignItems: 'flex-end' },
});
