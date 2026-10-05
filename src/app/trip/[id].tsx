import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LayoutAnimationConfig } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddItemButton } from '@/components/AddItemButton';
import { BillsSummaryBar } from '@/components/BillsSummaryBar';
import { OverBudgetCard } from '@/components/OverBudgetCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { InlineEditableField } from '@/components/InlineEditableField';
import { IncomeRow } from '@/components/IncomeRow';
import { ItemRow } from '@/components/ItemRow';
import { TagString, type TagOption } from '@/components/TagString';
import { TotalsBar } from '@/components/TotalsBar';
import { useBills } from '@/context/BillsContext';
import { useSupplies } from '@/context/SuppliesContext';
import { useTrips } from '@/context/TripsContext';
import { useWishlist } from '@/context/WishlistContext';
import { colors, spacing } from '@/theme/theme';
import { goBackOrHome } from '@/utils/navigation';
import { buildSuggestions } from '@/utils/suggestions';
import { CATEGORY_COLORS } from '@/utils/reports';
import { computeSpentTotal, computeTotal, sortBoughtLast } from '@/utils/totals';

type Section = 'income' | 'products' | 'supplies' | 'bills' | 'wishlist';

const count = (list: { bought: boolean }[]) => ({
  total: list.length,
  remaining: list.filter((i) => !i.bought).length,
});

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    trips,
    addItem,
    toggleItem,
    updateItem,
    removeItem,
    addIncome,
    updateIncome,
    removeIncome,
    renameTrip,
    deleteTrip,
  } = useTrips();
  const { bills, addBill, toggleBill, updateBill, removeBill, releaseTrip: releaseBills } = useBills();
  const { wishlist, addWish, toggleWish, updateWish, removeWish, releaseTrip: releaseWishes } = useWishlist();
  const { supplies, addSupply, toggleSupply, updateSupply, removeSupply, releaseTrip: releaseSupplies } =
    useSupplies();
  const trip = trips.find((t) => t.id === id);
  const [section, setSection] = useState<Section>('products');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checkedHere, setCheckedHere] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCheckedHere(new Set());
  }, [id]);

  const onToggleWish = (wishId: string) => {
    setCheckedHere((prev) => new Set(prev).add(wishId));
    toggleWish(wishId, trip?.id);
  };

  const incomes = trip?.incomes ?? [];
  const incomeTotal = incomes.reduce((sum, income) => sum + income.amount, 0);
  const incomeSuggestions = useMemo(
    () =>
      buildSuggestions(
        trips.flatMap((t) =>
          (t.incomes ?? []).map((i) => ({
            id: i.id,
            name: i.name,
            quantity: '',
            price: i.amount,
            bought: false,
            createdAt: i.createdAt,
          })),
        ),
      ),
    [trips],
  );

  const productsSpent = useMemo(() => computeSpentTotal(trip?.items ?? []), [trip]);
  const billsTotal = useMemo(() => computeTotal(bills), [bills]);
  const billsPaid = useMemo(() => computeSpentTotal(bills), [bills]);
  const suppliesTotal = useMemo(() => computeTotal(supplies), [supplies]);
  const suppliesSpent = useMemo(() => computeSpentTotal(supplies), [supplies]);
  const wishlistTotal = useMemo(() => computeTotal(wishlist), [wishlist]);
  const productSuggestions = useMemo(() => buildSuggestions(trips.flatMap((t) => t.items)), [trips]);
  const supplySuggestions = useMemo(() => buildSuggestions(supplies), [supplies]);
  const billSuggestions = useMemo(() => buildSuggestions(bills), [bills]);
  const wishSuggestions = useMemo(() => buildSuggestions(wishlist), [wishlist]);
  const wishlistSpent = useMemo(() => computeSpentTotal(wishlist), [wishlist]);
  const visibleWishlist = useMemo(
    () => wishlist.filter((wish) => !wish.bought || checkedHere.has(wish.id)),
    [wishlist, checkedHere],
  );
  const combinedSpent = productsSpent + suppliesSpent + billsPaid + wishlistSpent;
  // Only meaningful once some income was added; otherwise every purchase would count as "over".
  const overBy = incomeTotal > 0 ? combinedSpent - incomeTotal : 0;
  const tripItems = trip?.items;
  const tagOptions = useMemo<TagOption<Section>[]>(
    () => [
      { value: 'income', label: 'Të ardhurat', icon: 'cash-outline', activeIcon: 'cash', accent: CATEGORY_COLORS.income, remaining: 0, total: 0 },
      { value: 'products', label: 'Produktet', icon: 'basket-outline', activeIcon: 'basket', accent: CATEGORY_COLORS.products, ...count(tripItems ?? []) },
      { value: 'supplies', label: 'Detergjente & Extra', icon: 'sparkles-outline', activeIcon: 'sparkles', accent: CATEGORY_COLORS.supplies, ...count(supplies) },
      { value: 'bills', label: 'Faturat', icon: 'receipt-outline', activeIcon: 'receipt', accent: CATEGORY_COLORS.bills, ...count(bills) },
      { value: 'wishlist', label: 'Dëshirat', icon: 'heart-outline', activeIcon: 'heart', accent: CATEGORY_COLORS.wishlist, ...count(wishlist) },
    ],
    [tripItems, supplies, bills, wishlist],
  );

  const releasedCount = trip
    ? [...supplies, ...bills, ...wishlist].filter((item) => item.boughtInTripId === trip.id).length
    : 0;

  const deleteDetails = trip
    ? [
        `${trip.items.length} ${trip.items.length === 1 ? 'artikull' : 'artikuj'} në këtë listë do të fshihen.`,
        ...(releasedCount > 0
          ? [
              `${releasedCount} ${releasedCount === 1 ? 'artikull i shënuar' : 'artikuj të shënuar'} si të blerë në Detergjente, Faturat ose Dëshirat do të kthehen si të pablerë.`,
            ]
          : []),
        'Ky veprim nuk kthehet mbrapsht.',
      ]
    : [];

  const performDelete = () => {
    if (!trip) return;
    setConfirmOpen(false);
    releaseSupplies(trip.id);
    releaseBills(trip.id);
    releaseWishes(trip.id);
    deleteTrip(trip.id);
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
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
            <Pressable
              onPress={() => setConfirmOpen(true)}
              hitSlop={8}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Fshi listën"
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          )}
        </View>

        <ConfirmDialog
          visible={confirmOpen && trip !== undefined}
          title="Fshi listën?"
          message={trip ? `A je i sigurt që do të fshish "${trip.name}"?` : ''}
          details={deleteDetails}
          confirmLabel="Fshi"
          onConfirm={performDelete}
          onCancel={() => setConfirmOpen(false)}
        />

        {trip ? (
          <>
            <View style={styles.content}>
              <TagString value={section} onChange={setSection} options={tagOptions} />

              {section === 'income' && (
                <>
                  <BillsSummaryBar
                    totalAmount={incomeTotal}
                    paidAmount={combinedSpent}
                    totalLabel="Të ardhurat gjithsej"
                  />
                  {overBy > 0 && <OverBudgetCard amount={overBy} />}
                  <FlatList
                    data={incomes}
                    keyExtractor={(income) => income.id}
                    style={styles.list}
                    renderItem={({ item }) => (
                      <IncomeRow
                        income={item}
                        onUpdate={(patch) => updateIncome(trip.id, item.id, patch)}
                        onRemove={() => removeIncome(trip.id, item.id)}
                      />
                    )}
                    ListEmptyComponent={<Text style={styles.empty}>Nuk ke shtuar ende të ardhura.</Text>}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                  />
                </>
              )}

              {section === 'products' && (
                <>
                  <TotalsBar
                    incomeTotal={incomeTotal}
                    spentTotal={combinedSpent}
                    onPressIncome={() => setSection('income')}
                  />
                  {overBy > 0 && <OverBudgetCard amount={overBy} />}
                  <LayoutAnimationConfig skipEntering>
                    <FlatList
                      data={sortBoughtLast(trip.items)}
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
                  </LayoutAnimationConfig>
                </>
              )}

              {section === 'supplies' && (
                <>
                  <BillsSummaryBar
                    totalAmount={suppliesTotal}
                    paidAmount={combinedSpent}
                    totalLabel="Gjithsej detergjente & extra"
                  />
                  {overBy > 0 && <OverBudgetCard amount={overBy} />}
                  <LayoutAnimationConfig skipEntering>
                    <FlatList
                      data={sortBoughtLast(supplies)}
                      keyExtractor={(supply) => supply.id}
                      style={styles.list}
                      renderItem={({ item }) => (
                        <ItemRow
                          item={item}
                          onToggle={() => toggleSupply(item.id, trip.id)}
                          onUpdate={(patch) => updateSupply(item.id, patch)}
                          onRemove={() => removeSupply(item.id)}
                          showQuantity={false}
                        />
                      )}
                      ListEmptyComponent={<Text style={styles.empty}>Nuk ka ende asnjë artikull.</Text>}
                      contentContainerStyle={styles.listContent}
                      showsVerticalScrollIndicator={false}
                    />
                  </LayoutAnimationConfig>
                </>
              )}

              {section === 'bills' && (
                <>
                  <BillsSummaryBar totalAmount={billsTotal} paidAmount={combinedSpent} />
                  {overBy > 0 && <OverBudgetCard amount={overBy} />}
                  <LayoutAnimationConfig skipEntering>
                    <FlatList
                      data={sortBoughtLast(bills)}
                      keyExtractor={(bill) => bill.id}
                      style={styles.list}
                      renderItem={({ item }) => (
                        <ItemRow
                          item={item}
                          onToggle={() => toggleBill(item.id, trip.id)}
                          onUpdate={(patch) => updateBill(item.id, patch)}
                          onRemove={() => removeBill(item.id)}
                          showQuantity={false}
                        />
                      )}
                      ListEmptyComponent={<Text style={styles.empty}>Nuk ka ende asnjë faturë.</Text>}
                      contentContainerStyle={styles.listContent}
                      showsVerticalScrollIndicator={false}
                    />
                  </LayoutAnimationConfig>
                </>
              )}

              {section === 'wishlist' && (
                <>
                  <BillsSummaryBar
                    totalAmount={wishlistTotal}
                    paidAmount={combinedSpent}
                    totalLabel="Gjithsej dëshirat"
                  />
                  {overBy > 0 && <OverBudgetCard amount={overBy} />}
                  <LayoutAnimationConfig skipEntering>
                    <FlatList
                      data={sortBoughtLast(visibleWishlist)}
                      keyExtractor={(wish) => wish.id}
                      style={styles.list}
                      renderItem={({ item }) => (
                        <ItemRow
                          item={item}
                          onToggle={() => onToggleWish(item.id)}
                          onUpdate={(patch) => updateWish(item.id, patch)}
                          onRemove={() => removeWish(item.id)}
                          showQuantity={false}
                        />
                      )}
                      ListEmptyComponent={<Text style={styles.empty}>Lista e dëshirave është bosh.</Text>}
                      contentContainerStyle={styles.listContent}
                      showsVerticalScrollIndicator={false}
                    />
                  </LayoutAnimationConfig>
                </>
              )}
            </View>
            <View style={styles.footer}>
              {section === 'income' && (
                <AddItemButton
                  onAdd={(name, _quantity, amount) => addIncome(trip.id, name, amount ?? 0)}
                  showQuantity={false}
                  title="Shto të ardhura"
                  namePlaceholder="P.sh. Rroga, Bonus…"
                  priceLabel="Shuma"
                  submitLabel="Shto të ardhurën"
                  requirePrice
                  showPriority={false}
                  suggestions={incomeSuggestions}
                />
              )}
              {section === 'products' && (
                <AddItemButton
                  onAdd={(name, quantity, price, priority) => addItem(trip.id, name, quantity, price, priority)}
                  suggestions={productSuggestions}
                />
              )}
              {section === 'supplies' && (
                <AddItemButton
                  onAdd={(name, _quantity, price, priority) => addSupply(name, price, priority)}
                  showQuantity={false}
                  title="Shto artikull"
                  suggestions={supplySuggestions}
                />
              )}
              {section === 'bills' && (
                <AddItemButton
                  onAdd={(name, _quantity, price, priority) => addBill(name, price, priority)}
                  showQuantity={false}
                  title="Shto faturë"
                  suggestions={billSuggestions}
                />
              )}
              {section === 'wishlist' && (
                <AddItemButton
                  onAdd={(name, _quantity, price, priority) => addWish(name, price, priority)}
                  showQuantity={false}
                  title="Shto dëshirë"
                  suggestions={wishSuggestions}
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
