import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddItemButton } from '@/components/AddItemButton';
import { BillsSummaryBar } from '@/components/BillsSummaryBar';
import { OverBudgetCard } from '@/components/OverBudgetCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { InlineEditableField } from '@/components/InlineEditableField';
import { IncomeRow } from '@/components/IncomeRow';
import { ItemList } from '@/components/ItemList';
import { TagGridSheet } from '@/components/TagGridSheet';
import { TagString, type TagOption } from '@/components/TagString';
import { TotalsBar } from '@/components/TotalsBar';
import { useTrips } from '@/context/TripsContext';
import { colors, spacing } from '@/theme/theme';
import type { ItemListKey, ShoppingItem } from '@/types/models';
import { CATEGORIES, type Category, INCOME_COLOR } from '@/utils/categories';
import { goBackOrHome } from '@/utils/navigation';
import { buildListSuggestions, buildSuggestions } from '@/utils/suggestions';
import { computeSpentTotal, computeTotal, tripAllItems } from '@/utils/totals';

// 'income' or the `section` of a category.
type Section = string;

const NO_ITEMS: ShoppingItem[] = [];

const FIRST_SECTION: Section = CATEGORIES[0].section;
const PREPARE_ORDER: Section[] = [...CATEGORIES.slice(1).map((category) => category.section), 'income'];
const PREPARE_AFTER_MS = 600;
const PREPARE_STEP_MS = 400;
// A tab prepared in the background draws this many rows until it is opened (0: just its frame). Every row kept alive
// has to be torn down when the list is closed, so drawing them all made leaving the screen slow.
const PREVIEW_ROWS = 0;

// A tab that is not open stays at full size, parked off screen, so its list is already drawn when it is opened.
function Pane({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <View
      style={active ? styles.pane : styles.parked}
      aria-hidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </View>
  );
}

interface CategoryPaneProps {
  category: Category;
  active: boolean;
  tripId: string;
  items: ShoppingItem[];
  /** Prepared in the background and not opened yet: only the first rows are drawn. */
  preview: boolean;
  total: number;
  spent: number;
  incomeTotal: number;
  overBy: number;
  onPressIncome: () => void;
}

// One tab. It is redrawn only when its own data changes, so opening another tab does not touch the other ten.
const CategoryPane = memo(function CategoryPane({
  category,
  active,
  tripId,
  items,
  preview,
  total,
  spent,
  incomeTotal,
  overBy,
  onPressIncome,
}: CategoryPaneProps) {
  return (
    <Pane active={active}>
      {category.section === FIRST_SECTION ? (
        <TotalsBar incomeTotal={incomeTotal} spentTotal={spent} onPressIncome={onPressIncome} />
      ) : (
        <BillsSummaryBar totalAmount={total} paidAmount={spent} totalLabel={category.totalLabel} />
      )}
      {overBy > 0 && <OverBudgetCard amount={overBy} />}
      <ItemList
        tripId={tripId}
        list={category.key}
        items={items}
        emptyText={category.emptyText}
        showQuantity={category.showQuantity}
        limit={preview ? PREVIEW_ROWS : undefined}
      />
    </Pane>
  );
});

const count = (list: { bought: boolean }[]) => ({
  total: list.length,
  remaining: list.filter((i) => !i.bought).length,
});

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, addItem, addIncome, updateIncome, removeIncome, renameTrip, deleteTrip } = useTrips();
  const trip = trips.find((t) => t.id === id);
  const [section, setSection] = useState<Section>(FIRST_SECTION);
  // A tab is built the first time it is opened and then kept, so going back to it is instant.
  const [mounted, setMounted] = useState<Section[]>([FIRST_SECTION]);
  // The tabs that were really opened; they keep all their rows.
  const [opened, setOpened] = useState<Section[]>([FIRST_SECTION]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);

  const selectSection = useCallback((next: Section) => {
    setSection(next);
    setMounted((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setOpened((prev) => (prev.includes(next) ? prev : [...prev, next]));
  }, []);
  const openIncome = useCallback(() => selectSection('income'), [selectSection]);

  // Build the other tabs one by one shortly after the list opens, so they are already there when tapped.
  useEffect(() => {
    const timers = PREPARE_ORDER.map((next, i) =>
      setTimeout(
        () => setMounted((prev) => (prev.includes(next) ? prev : [...prev, next])),
        PREPARE_AFTER_MS + i * PREPARE_STEP_MS,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

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

  const totals = useMemo(
    () =>
      Object.fromEntries(CATEGORIES.map(({ key }) => [key, computeTotal(trip?.[key] ?? NO_ITEMS)])) as Record<
        ItemListKey,
        number
      >,
    [trip],
  );
  const combinedSpent = useMemo(() => (trip ? computeSpentTotal(tripAllItems(trip)) : 0), [trip]);
  // Only meaningful once some income was added; otherwise every purchase would count as "over".
  const overBy = incomeTotal > 0 ? combinedSpent - incomeTotal : 0;

  const activeCategory = CATEGORIES.find((category) => category.section === section);
  const suggestions = useMemo(
    () => (activeCategory ? buildListSuggestions(trips, trip, activeCategory.key) : []),
    [trips, trip, activeCategory],
  );

  const tagOptions = useMemo<TagOption<Section>[]>(
    () => [
      { value: 'income', label: 'Të ardhurat', icon: 'cash-outline', activeIcon: 'cash', accent: INCOME_COLOR, remaining: 0, total: 0 },
      ...CATEGORIES.map((category) => ({
        value: category.section,
        label: category.label,
        tabLabel: category.tabLabel,
        icon: category.icon,
        activeIcon: category.activeIcon,
        accent: category.color,
        ...count(trip?.[category.key] ?? NO_ITEMS),
      })),
    ],
    [trip],
  );

  const deleteDetails = trip
    ? [
        `${tripAllItems(trip).length} ${tripAllItems(trip).length === 1 ? 'artikull' : 'artikuj'} në këtë listë do të fshihen.`,
        'Ky veprim nuk kthehet mbrapsht.',
      ]
    : [];

  const performDelete = () => {
    if (!trip) return;
    setConfirmOpen(false);
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
            <>
              <Pressable
                onPress={() => setGridOpen(true)}
                hitSlop={8}
                style={styles.headerButton}
                accessibilityRole="button"
                accessibilityLabel="Të gjitha kategoritë"
              >
                <Ionicons name="grid-outline" size={20} color={colors.primaryDark} />
              </Pressable>
              <Pressable
                onPress={() => setConfirmOpen(true)}
                hitSlop={8}
                style={styles.headerButton}
                accessibilityRole="button"
                accessibilityLabel="Fshi listën"
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </>
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

        <TagGridSheet
          visible={gridOpen}
          onClose={() => setGridOpen(false)}
          options={tagOptions}
          value={section}
          onSelect={(next) => {
            setGridOpen(false);
            selectSection(next);
          }}
        />

        {trip ? (
          <>
            <View style={styles.content}>
              <TagString value={section} onChange={selectSection} options={tagOptions} />

              {mounted.includes('income') && (
                <Pane active={section === 'income'}>
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
                </Pane>
              )}

              {CATEGORIES.map(
                (category) =>
                  mounted.includes(category.section) && (
                    <CategoryPane
                      key={category.section}
                      category={category}
                      active={section === category.section}
                      tripId={trip.id}
                      items={trip[category.key] ?? NO_ITEMS}
                      preview={!opened.includes(category.section)}
                      total={totals[category.key]}
                      spent={combinedSpent}
                      incomeTotal={incomeTotal}
                      overBy={overBy}
                      onPressIncome={openIncome}
                    />
                  ),
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
              {activeCategory && (
                <AddItemButton
                  key={activeCategory.section}
                  onAdd={(name, quantity, price, priority) =>
                    addItem(trip.id, activeCategory.key, name, activeCategory.showQuantity ? quantity : '', price, priority)
                  }
                  showQuantity={activeCategory.showQuantity}
                  title={activeCategory.addTitle}
                  namePlaceholder={activeCategory.namePlaceholder}
                  suggestions={suggestions}
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
  pane: { flex: 1 },
  parked: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: spacing.md,
    right: spacing.md,
    // Far off to the side rather than invisible: nothing can overlap (or catch taps meant for) the open tab.
    transform: [{ translateX: -20000 }],
  },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.sm },
  footer: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, alignItems: 'flex-end' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
