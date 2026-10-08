import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/BottomTabBar';
import { MiniColumns } from '@/components/charts/MiniColumns';
import { QokatView } from '@/components/QokatView';
import { CreateListButton } from '@/components/CreateListButton';
import { EmptyState } from '@/components/EmptyState';
import { HomeChooser } from '@/components/HomeChooser';
import { LatestListPie } from '@/components/LatestListPie';
import { NotesView } from '@/components/NotesView';
import { ReportsView } from '@/components/ReportsView';
import { TripCard } from '@/components/TripCard';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { useTrips } from '@/context/TripsContext';
import { colors, spacing } from '@/theme/theme';
import { buildListSpend, buildSectionSpend } from '@/utils/reports';
import { tripIncomeTotal } from '@/utils/totals';

// The lists screen shows this many lists at first and this many more each time "load more" is pressed.
const PAGE_SIZE = 5;

type Tab = 'home' | 'lists' | 'reports' | 'qokat' | 'notes';
// The pages of Note Shop List, the ones with the tabs at the bottom.
type ShopTab = 'lists' | 'reports' | 'qokat';
const isShopTab = (value: Tab): value is ShopTab => value === 'lists' || value === 'reports' || value === 'qokat';

// Lower-case and strip accents so "shtator" finds "Shtator" and "mire" finds "Mirë".
function normalizeText(value: string): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export default function ListsOverviewScreen() {
  const { trips, createList } = useTrips();
  const { demoMode } = useAuth();
  // The name from the profile page, or the account's (Google) name while the profile has none.
  const { firstName, fullName, initial } = useProfile();
  const sorted = [...trips].sort((a, b) => b.createdAt - a.createdAt);
  // The app opens on the chooser; from there the user goes to the shopping pages or to Note List Shop.
  const [tab, setTab] = useState<Tab>('home');
  // The shopping page that was open last, so the way back to Note Shop List leads there.
  const [returnTab, setReturnTab] = useState<ShopTab>('lists');
  const goTo = (next: Tab) => {
    if (isShopTab(tab)) setReturnTab(tab);
    setTab(next);
  };
  // Only the chooser is a way out of the app: from any other page the phone's back button leads back to the chooser.
  // Only while this screen is the one in front: with a list open on top of it, back has to close that list.
  useFocusEffect(
    useCallback(() => {
      if (tab === 'home') return;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isShopTab(tab)) setReturnTab(tab);
        setTab('home');
        return true;
      });
      return () => subscription.remove();
    }, [tab, setTab, setReturnTab]),
  );
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [shownCount, setShownCount] = useState(PAGE_SIZE);
  const needle = normalizeText(query);
  const visibleTrips = needle ? sorted.filter((trip) => normalizeText(trip.name).includes(needle)) : sorted;
  const shownTrips = visibleTrips.slice(0, shownCount);
  const hiddenCount = visibleTrips.length - shownTrips.length;
  const changeQuery = (text: string) => {
    setQuery(text);
    setShownCount(PAGE_SIZE);
  };
  const closeSearch = () => {
    setSearching(false);
    changeQuery('');
  };
  const latestSections = buildSectionSpend(sorted.slice(0, 1));
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
      {/* The chooser has no header: the avatar is the big one in the middle of that screen. */}
      {tab !== 'home' && (
        <View style={styles.header}>
          {/* The shopping pages keep the cart; the Note List Shop page has its own logo. Either one leads back to the chooser. */}
          <Pressable
            onPress={() => goTo('home')}
            style={styles.logoBadge}
            accessibilityRole="button"
            accessibilityLabel="Kthehu në fillim"
          >
            {tab === 'notes' ? (
              <Image source={require('@/assets/images/note-list-icon.png')} style={styles.logoNotes} resizeMode="contain" />
            ) : (
              <Image source={require('@/assets/images/logo-mark.png')} style={styles.logo} resizeMode="contain" />
            )}
          </Pressable>
          {searching && tab === 'lists' ? (
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={changeQuery}
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
                <Text style={styles.title}>{tab === 'notes' ? 'Note List Shop' : 'Note Shop List'}</Text>
                <Text style={styles.subtitle}>
                  {demoMode
                    ? 'Modalitet demo · ndryshimet nuk ruhen'
                    : tab === 'notes'
                      ? 'Lista jote e detyrave'
                      : `Mirë se erdhe, ${firstName}`}
                </Text>
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
              {/* A quick switch to the other part: the notepad opens Note List Shop, the cart goes to Note Shop List. */}
              {tab === 'notes' ? (
                <Pressable
                  onPress={() => goTo(returnTab)}
                  style={styles.notesButton}
                  accessibilityRole="button"
                  accessibilityLabel="Hap Note Shop List"
                >
                  <Image source={require('@/assets/images/logo-mark.png')} style={styles.notesButtonLogo} resizeMode="contain" />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => goTo('notes')}
                  style={styles.notesButton}
                  accessibilityRole="button"
                  accessibilityLabel="Hap Note List Shop"
                >
                  <Image source={require('@/assets/images/note-list-icon.png')} style={styles.notesButtonLogo} resizeMode="contain" />
                </Pressable>
              )}
            </>
          )}
          <Pressable
            onPress={() => router.push('/profile')}
            style={styles.avatar}
            accessibilityRole="button"
            accessibilityLabel="Profili"
          >
            <Text style={styles.avatarText}>{initial}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.content}>
        {/* A faint cart behind the shopping pages: seen through the gaps between the cards and in the empty space. */}
        {isShopTab(tab) && (
          <View style={styles.watermark} pointerEvents="none">
            <Image
              source={require('@/assets/images/logo-watermark.png')}
              style={styles.watermarkLogo}
              resizeMode="contain"
              accessible={false}
            />
          </View>
        )}
        {tab === 'home' ? (
          <HomeChooser
            name={fullName}
            initial={initial}
            demo={demoMode}
            onOpenProfile={() => router.push('/profile')}
            onChoose={(section) => goTo(section === 'notes' ? 'notes' : returnTab)}
          />
        ) : tab === 'lists' ? (
          <FlatList
            data={shownTrips}
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
              <TripCard index={index % PAGE_SIZE} trip={trip} onPress={() => openTrip(trip.id)} />
            )}
            ListFooterComponent={
              hiddenCount > 0 ? (
                <Pressable
                  onPress={() => setShownCount((count) => count + PAGE_SIZE)}
                  accessibilityRole="button"
                  accessibilityLabel={`Shfaq edhe ${Math.min(PAGE_SIZE, hiddenCount)} lista`}
                  style={({ pressed }) => [styles.loadMore, pressed && styles.loadMorePressed]}
                >
                  <Ionicons name="chevron-down" size={18} color={colors.primaryDark} />
                  <Text style={styles.loadMoreText}>Shfaq edhe {Math.min(PAGE_SIZE, hiddenCount)} lista</Text>
                  <Text style={styles.loadMoreMeta}>
                    {shownTrips.length} nga {visibleTrips.length}
                  </Text>
                </Pressable>
              ) : null
            }
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
        ) : tab === 'reports' ? (
          <ReportsView onOpenTrip={openTrip} />
        ) : tab === 'qokat' ? (
          // Only built once its tab is opened, so it costs nothing until then.
          <QokatView onOpenTrip={openTrip} />
        ) : (
          // Same here: nothing of the Note List Shop page runs, or is read from the phone, until its tab is opened.
          <NotesView />
        )}
      </View>

      {tab === 'lists' && (
        <View style={styles.footer}>
          <CreateListButton onCreate={handleCreate} />
        </View>
      )}

      {/* The tabs belong to the shopping pages; the chooser and Note List Shop are pages of their own and have none. */}
      {isShopTab(tab) && (
        <BottomTabBar
          value={tab}
          onChange={setTab}
          options={[
            { value: 'lists', label: 'Listat', icon: 'list-outline', activeIcon: 'list' },
            { value: 'reports', label: 'Raportet', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
            { value: 'qokat', label: 'Qokat', icon: 'cafe-outline', activeIcon: 'cafe' },
          ]}
        />
      )}
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
  logoNotes: { width: 36, height: 36 },
  notesButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesButtonLogo: { width: 28, height: 28 },
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
  // At the bottom, where the lists leave room, and clear of the text that is centered on the empty pages.
  watermark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg,
  },
  watermarkLogo: { width: 200, height: 194, opacity: 0.17 },
  list: { flex: 1 },
  listContent: { flexGrow: 1, paddingBottom: spacing.sm },
  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    backgroundColor: colors.card,
    paddingVertical: spacing.sm + 4,
    marginTop: spacing.xs,
  },
  loadMorePressed: { backgroundColor: colors.primaryLight },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  loadMoreMeta: { fontSize: 12, color: colors.textMuted },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'flex-end',
  },
});
