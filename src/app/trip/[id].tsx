import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddItemButton } from '@/components/AddItemButton';
import { BillsSummaryBar } from '@/components/BillsSummaryBar';
import { InlineEditableField } from '@/components/InlineEditableField';
import { ItemRow } from '@/components/ItemRow';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TotalsBar } from '@/components/TotalsBar';
import { useBills } from '@/context/BillsContext';
import { useTrips } from '@/context/TripsContext';
import { useWishlist } from '@/context/WishlistContext';
import { colors, spacing } from '@/theme/theme';
import { goBackOrHome } from '@/utils/navigation';
import { computeSpentTotal, computeTotal } from '@/utils/totals';

type Section = 'products' | 'bills' | 'wishlist';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, addItem, toggleItem, updateItem, removeItem, setBudget, renameTrip, deleteTrip } = useTrips();
  const { bills, addBill, toggleBill, updateBill, removeBill } = useBills();
  const { wishlist, addWish, toggleWish, updateWish, removeWish } = useWishlist();
  const trip = trips.find((t) => t.id === id);
  const [section, setSection] = useState<Section>('products');

  const productsSpent = useMemo(() => computeSpentTotal(trip?.items ?? []), [trip]);
  const billsTotal = useMemo(() => computeTotal(bills), [bills]);
  const billsPaid = useMemo(() => computeSpentTotal(bills), [bills]);
  const wishlistTotal = useMemo(() => computeTotal(wishlist), [wishlist]);
  const wishlistSpent = useMemo(() => computeSpentTotal(wishlist), [wishlist]);
  const visibleWishlist = useMemo(() => wishlist.filter((wish) => !wish.bought), [wishlist]);
  const combinedSpent = productsSpent + billsPaid + wishlistSpent;

  const confirmDelete = () => {
    if (!trip) return;
    Alert.alert('Fshi listën?', `A je i sigurt që do të fshish "${trip.name}"? Ky veprim nuk kthehet mbrapsht.`, [
      { text: 'Anulo', style: 'cancel' },
      {
        text: 'Fshi',
        style: 'destructive',
        onPress: () => {
          deleteTrip(trip.id);
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Pressable onPress={goBackOrHome} hitSlop={8} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          {trip ? (
            <View style={styles.titleWrap}>
              <InlineEditableField
                value={trip.name}
                placeholder="Emri i listës"
                onChange={(name) => renameTrip(trip.id, name)}
                textStyle={styles.title}
                chip
              />
            </View>
          ) : (
            <Text style={styles.title}>Lista</Text>
          )}
          {trip && (
            <Pressable onPress={confirmDelete} hitSlop={8} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          )}
        </View>

        {trip ? (
          <>
            <View style={styles.content}>
              <SegmentedControl
                value={section}
                onChange={setSection}
                options={[
                  { value: 'products', label: 'Produktet' },
                  { value: 'bills', label: 'Faturat' },
                  { value: 'wishlist', label: 'Dëshirat' },
                ]}
              />

              {section === 'products' && (
                <>
                  <TotalsBar
                    budget={trip.budget}
                    spentTotal={combinedSpent}
                    onChangeBudget={(value) => setBudget(trip.id, value)}
                  />
                  <FlatList
                    data={trip.items}
                    keyExtractor={(item) => item.id}
                    style={styles.list}
                    renderItem={({ item }) => (
                      <ItemRow
                        item={item}
                        onToggle={() => toggleItem(trip.id, item.id)}
                        onUpdate={(patch) => updateItem(trip.id, item.id, patch)}
                        onRemove={() => removeItem(trip.id, item.id)}
                      />
                    )}
                    ListEmptyComponent={<Text style={styles.empty}>Kjo listë nuk ka artikuj.</Text>}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                  />
                </>
              )}

              {section === 'bills' && (
                <>
                  <BillsSummaryBar totalAmount={billsTotal} paidAmount={combinedSpent} />
                  <FlatList
                    data={bills}
                    keyExtractor={(bill) => bill.id}
                    style={styles.list}
                    renderItem={({ item }) => (
                      <ItemRow
                        item={item}
                        onToggle={() => toggleBill(item.id)}
                        onUpdate={(patch) => updateBill(item.id, patch)}
                        onRemove={() => removeBill(item.id)}
                        showQuantity={false}
                      />
                    )}
                    ListEmptyComponent={<Text style={styles.empty}>Nuk ka ende asnjë faturë.</Text>}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                  />
                </>
              )}

              {section === 'wishlist' && (
                <>
                  <BillsSummaryBar
                    totalAmount={wishlistTotal}
                    paidAmount={combinedSpent}
                    totalLabel="Gjithsej dëshirat"
                  />
                  <FlatList
                    data={visibleWishlist}
                    keyExtractor={(wish) => wish.id}
                    style={styles.list}
                    renderItem={({ item }) => (
                      <ItemRow
                        item={item}
                        onToggle={() => toggleWish(item.id)}
                        onUpdate={(patch) => updateWish(item.id, patch)}
                        onRemove={() => removeWish(item.id)}
                        showQuantity={false}
                      />
                    )}
                    ListEmptyComponent={<Text style={styles.empty}>Lista e dëshirave është bosh.</Text>}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                  />
                </>
              )}
            </View>
            <View style={styles.footer}>
              {section === 'products' && (
                <AddItemButton onAdd={(name, quantity, price) => addItem(trip.id, name, quantity, price)} />
              )}
              {section === 'bills' && (
                <AddItemButton
                  onAdd={(name, _quantity, price) => addBill(name, price)}
                  showQuantity={false}
                  title="Shto faturë"
                />
              )}
              {section === 'wishlist' && (
                <AddItemButton
                  onAdd={(name, _quantity, price) => addWish(name, price)}
                  showQuantity={false}
                  title="Shto dëshirë"
                />
              )}
            </View>
          </>
        ) : (
          <Text style={styles.empty}>Lista nuk u gjet.</Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.md },
  headerButton: { padding: spacing.xs },
  titleWrap: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { flex: 1, paddingHorizontal: spacing.md },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.sm },
  footer: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, alignItems: 'flex-end' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
