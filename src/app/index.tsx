import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/BottomSheet';
import { BottomTabBar } from '@/components/BottomTabBar';
import { MiniColumns } from '@/components/charts/MiniColumns';
import { CreateListButton } from '@/components/CreateListButton';
import { EmptyState } from '@/components/EmptyState';
import { LatestListPie } from '@/components/LatestListPie';
import { ReportsView } from '@/components/ReportsView';
import { TripCard } from '@/components/TripCard';
import { useAppLock } from '@/context/AppLockContext';
import { useAuth } from '@/context/AuthContext';
import { useBills } from '@/context/BillsContext';
import { useSupplies } from '@/context/SuppliesContext';
import { useTrips } from '@/context/TripsContext';
import { useWishlist } from '@/context/WishlistContext';
import { colors, spacing } from '@/theme/theme';
import { buildListSpend, buildSectionSpend } from '@/utils/reports';
import { tripIncomeTotal } from '@/utils/totals';

// Lower-case and strip accents so "shtator" finds "Shtator" and "mire" finds "Mirë".
function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export default function ListsOverviewScreen() {
  const { trips, createList } = useTrips();
  const { user, signOut } = useAuth();
  const { supported, enabled: lockEnabled, setEnabled: setLockEnabled } = useAppLock();
  const [lockError, setLockError] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const firstName = user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Eri';
  const { bills } = useBills();
  const { supplies } = useSupplies();
  const { wishlist } = useWishlist();
  const sorted = [...trips].sort((a, b) => b.createdAt - a.createdAt);
  const [tab, setTab] = useState<'lists' | 'reports'>('lists');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const needle = normalizeText(query);
  const visibleTrips = needle ? sorted.filter((trip) => normalizeText(trip.name).includes(needle)) : sorted;
  const closeSearch = () => {
    setSearching(false);
    setQuery('');
  };
  const latestSections = buildSectionSpend(sorted.slice(0, 1), supplies, bills, wishlist);
  const recent = buildListSpend(trips)
    .slice(-12)
    .map((list) => ({
      key: list.id,
      label: list.name,
      value: list.spent,
      over: list.budget != null && list.spent > list.budget,
    }));

  const openTrip = (id: string) => router.push({ pathname: '/trip/[id]', params: { id } });

  const handleCreate = (name: string) => {
    const id = createList(name);
    router.push({ pathname: '/trip/[id]', params: { id } });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Image source={require('@/assets/images/logo-mark.png')} style={styles.logo} resizeMode="contain" />
        </View>
        {searching && tab === 'lists' ? (
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Kërko listën…"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
            />
            <Pressable onPress={closeSearch} hitSlop={8} accessibilityRole="button" accessibilityLabel="Mbyll kërkimin">
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>Note Shop List</Text>
              <Text style={styles.subtitle}>Mirë se erdhe, {firstName}</Text>
            </View>
            {tab === 'lists' && trips.length > 1 && (
              <Pressable
                onPress={() => setSearching(true)}
                style={styles.searchButton}
                accessibilityRole="button"
                accessibilityLabel="Kërko listë"
              >
                <Ionicons name="search" size={20} color={colors.primaryDark} />
              </Pressable>
            )}
          </>
        )}
        <Pressable
          onPress={() => setProfileOpen(true)}
          style={styles.avatar}
          accessibilityRole="button"
          accessibilityLabel="Profili"
        >
          <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
        </Pressable>
      </View>

      <BottomSheet visible={profileOpen} onClose={() => setProfileOpen(false)} title="Profili">
        <View style={styles.profileRow}>
          <View style={[styles.avatar, styles.avatarLarge]}>
            <Text style={[styles.avatarText, styles.avatarTextLarge]}>{firstName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName}>{user?.displayName ?? firstName}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? 'Modalitet zhvillimi (pa llogari)'}</Text>
          </View>
        </View>
        {supported && (
          <View style={styles.lockRow}>
            <Ionicons name="finger-print" size={22} color={colors.primaryDark} />
            <View style={styles.profileText}>
              <Text style={styles.lockTitle}>Kyçja e aplikacionit</Text>
              <Text style={styles.profileEmail}>Gjurmë gishti, PIN ose model kur e hap</Text>
            </View>
            <Switch
              value={lockEnabled}
              onValueChange={async (next) => setLockError(await setLockEnabled(next))}
              trackColor={{ true: colors.primary, false: colors.border }}
              accessibilityLabel="Kyçja e aplikacionit"
            />
          </View>
        )}
        {lockError && <Text style={styles.lockError}>{lockError}</Text>}
        <Pressable
          onPress={() => {
            setProfileOpen(false);
            signOut();
          }}
          accessibilityRole="button"
          style={styles.signOutButton}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.signOutText}>Dil nga llogaria</Text>
        </Pressable>
      </BottomSheet>

      <View style={styles.content}>
        {tab === 'lists' ? (
          <FlatList
            data={visibleTrips}
            keyExtractor={(trip) => trip.id}
            style={styles.list}
            ListHeaderComponent={
              recent.length > 0 && !needle ? (
                <>
                  <MiniColumns data={recent} onPressColumn={openTrip} />
                  <LatestListPie
                    listName={`${sorted[0].name} · sipas kategorisë`}
                    sections={latestSections}
                    income={tripIncomeTotal(sorted[0])}
                  />
                </>
              ) : null
            }
            renderItem={({ item: trip, index }) => (
              <TripCard index={index} trip={trip} onPress={() => openTrip(trip.id)} />
            )}
            ListEmptyComponent={
              needle ? (
                <EmptyState icon="search-outline" title="Asnjë listë nuk u gjet" subtitle={`Nuk ka listë me "${query.trim()}"`} />
              ) : (
                <EmptyState
                  icon="list-outline"
                  title="Nuk ke ende asnjë listë"
                  subtitle="Krijo listën tënde të parë me butonin + më poshtë!"
                />
              )
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <ReportsView onOpenTrip={openTrip} />
        )}
      </View>

      {tab === 'lists' && (
        <View style={styles.footer}>
          <CreateListButton onCreate={handleCreate} />
        </View>
      )}

      <BottomTabBar
        value={tab}
        onChange={setTab}
        options={[
          { value: 'lists', label: 'Listat', icon: 'list-outline', activeIcon: 'list' },
          { value: 'reports', label: 'Raportet', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  avatarLarge: { width: 52, height: 52, borderRadius: 26 },
  avatarTextLarge: { fontSize: 22 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  lockTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  lockError: { fontSize: 13, color: colors.danger },
  profileText: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: colors.text },
  profileEmail: { fontSize: 13, color: colors.textMuted },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 4,
    marginTop: spacing.sm,
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: colors.danger },
  titleBlock: { flex: 1 },
  searchButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted },
  content: { flex: 1, paddingHorizontal: spacing.md },
  list: { flex: 1 },
  listContent: { flexGrow: 1, paddingBottom: spacing.sm },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'flex-end',
  },
});
