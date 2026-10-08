import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddItemButton } from '@/components/AddItemButton';
import { BillsSummaryBar } from '@/components/BillsSummaryBar';
import { OptionTotalsBar } from '@/components/OptionTotalsBar';
import { OverBudgetCard } from '@/components/OverBudgetCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { InlineEditableField } from '@/components/InlineEditableField';
import { IncomeRow } from '@/components/IncomeRow';
import { ImportantList } from '@/components/ImportantList';
import { ItemList } from '@/components/ItemList';
import { TagGridSheet } from '@/components/TagGridSheet';
import { TagString, type TagOption } from '@/components/TagString';
import { useTrips } from '@/context/TripsContext';
import { useTabSwipe } from '@/hooks/useTabSwipe';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { IncomeEntry, ItemListKey, ShoppingItem } from '@/types/models';
import { CATEGORIES, type Category, INCOME_COLOR } from '@/utils/categories';
import { type ImportantEntry, IMPORTANT_COLOR, IMPORTANT_SECTION, importantItems } from '@/utils/important';
import {
  buildIncomeKindTotals,
  INCOME_KIND_LABELS,
  incomeKindFromLabel,
  incomeKindInfo,
  incomesOfKind,
} from '@/utils/incomes';
import { goBackOrHome } from '@/utils/navigation';
import { buildOptionTotals, buildPersonTotals, itemOption, itemsForOption, itemsForPerson } from '@/utils/options';
import { buildListSuggestions, buildSuggestions, suggestionGroups } from '@/utils/suggestions';
import { categoriesByOpenItems, computeSpentTotal, computeTotal, tripAllItems } from '@/utils/totals';

// 'income' or the `section` of a category.
type Section = string;

const NO_ITEMS: ShoppingItem[] = [];
const NO_INCOMES: IncomeEntry[] = [];
const NO_ENTRIES: ImportantEntry[] = [];

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
  overBy: number;
  /** The group of a category with choices (e.g. "Drion") the list is narrowed to, or null for everything. */
  optionFilter: string | null;
  onOptionFilter: (section: Section, group: string | null) => void;
  /** The person (Drion, Alois) of a category that asks who it is for the list is narrowed to, or null for everyone. */
  personFilter: string | null;
  onPersonFilter: (section: Section, person: string | null) => void;
}

// One tab. It is redrawn only when its own data changes, so opening another tab does not touch the others.
const CategoryPane = memo(function CategoryPane({
  category,
  active,
  tripId,
  items,
  preview,
  total,
  spent,
  overBy,
  optionFilter,
  onOptionFilter,
  personFilter,
  onPersonFilter,
}: CategoryPaneProps) {
  const optionTotals = useMemo(() => buildOptionTotals(items, category), [items, category]);
  const personTotals = useMemo(() => buildPersonTotals(items, category), [items, category]);
  // Both filters can be on at once: only what falls under the group and is for the person.
  const shownItems = useMemo(() => {
    const byGroup = optionFilter ? itemsForOption(items, category, optionFilter) : items;
    return personFilter ? itemsForPerson(byGroup, category, personFilter) : byGroup;
  }, [items, category, optionFilter, personFilter]);
  const filterText = [optionFilter, personFilter].filter(Boolean).join(' · ');

  return (
    <Pane active={active}>
      <BillsSummaryBar totalAmount={total} paidAmount={spent} totalLabel={category.totalLabel} />
      {optionTotals.length > 0 && (
        <OptionTotalsBar
          options={optionTotals}
          selected={optionFilter}
          onSelect={(group) => onOptionFilter(category.section, group)}
        />
      )}
      {personTotals.length > 0 && (
        <OptionTotalsBar
          options={personTotals}
          selected={personFilter}
          onSelect={(person) => onPersonFilter(category.section, person)}
        />
      )}
      {overBy > 0 && <OverBudgetCard amount={overBy} />}
      <ItemList
        tripId={tripId}
        list={category.key}
        items={shownItems}
        emptyText={filterText ? `Nuk ka asnjë shpenzim për ${filterText}.` : category.emptyText}
        showQuantity={category.showQuantity}
        limit={preview ? PREVIEW_ROWS : undefined}
        personOptions={category.personOptions}
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
  // The category tabs are sorted by the number on them (most items left to buy first, empty ones last) when the list is
  // opened and then kept as they are, so no tab jumps around while you add or check off items; the next time the list
  // is opened they are sorted again.
  const [categoryOrder] = useState(() => categoriesByOpenItems(trip));
  // The list opens on Më të rëndësishmet, so the strip starts at the left, where that tab is, right after Të ardhurat.
  const [section, setSection] = useState<Section>(IMPORTANT_SECTION);
  // A tab is built the first time it is opened and then kept, so going back to it is instant.
  const [mounted, setMounted] = useState<Section[]>([IMPORTANT_SECTION]);
  // The tabs that were really opened; they keep all their rows.
  const [opened, setOpened] = useState<Section[]>([IMPORTANT_SECTION]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);

  const selectSection = useCallback((next: Section) => {
    setSection(next);
    setMounted((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setOpened((prev) => (prev.includes(next) ? prev : [...prev, next]));
  }, []);

  // Swipe left for the next tab in the strip, right for the previous one (see useTabSwipe).
  const tabOrder = useMemo<Section[]>(
    () => ['income', IMPORTANT_SECTION, ...categoryOrder.map((category) => category.section)],
    [categoryOrder],
  );
  const { gesture: swipeTabs, slideStyle } = useTabSwipe(tabOrder, section, selectSection);

  // Per tab: the group (Drion, Naftë…) its list is narrowed to. Kept here so adding an item can undo it.
  const [optionFilters, setOptionFilters] = useState<Record<Section, string | null>>({});
  const setOptionFilter = useCallback(
    (target: Section, group: string | null) => setOptionFilters((prev) => ({ ...prev, [target]: group })),
    [],
  );
  // The same for the person (Drion, Alois) in a category that asks who it is for.
  const [personFilters, setPersonFilters] = useState<Record<Section, string | null>>({});
  const setPersonFilter = useCallback(
    (target: Section, person: string | null) => setPersonFilters((prev) => ({ ...prev, [target]: person })),
    [],
  );

  // Build the other tabs one by one shortly after the list opens, so they are already there when tapped.
  useEffect(() => {
    // In the order of the strip, so the tabs closest to the open one are ready first.
    const prepareOrder: Section[] = [...categoryOrder.map((category) => category.section), 'income'];
    const timers = prepareOrder.map((next, i) =>
      setTimeout(
        () => setMounted((prev) => (prev.includes(next) ? prev : [...prev, next])),
        PREPARE_AFTER_MS + i * PREPARE_STEP_MS,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [categoryOrder]);

  const incomes = trip?.incomes ?? NO_INCOMES;
  const incomeTotal = incomes.reduce((sum, income) => sum + income.amount, 0);
  // What each kind of income (Rroga, Qoka, Të ardhura shtesë) adds up to, and the kind the list is narrowed to.
  const incomeKindTotals = useMemo(() => buildIncomeKindTotals(incomes), [incomes]);
  const [incomeKindFilter, setIncomeKindFilter] = useState<string | null>(null);
  const shownIncomes = useMemo(
    () => (incomeKindFilter ? incomesOfKind(incomes, incomeKindFilter) : incomes),
    [incomes, incomeKindFilter],
  );
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
            // The kind of income goes where an item has who it is for: both are the add form's second select.
            person: incomeKindInfo(i).label,
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

  // The items of every category marked more important than normal, for the tab that gathers them.
  const important = useMemo(() => importantItems(trip, categoryOrder), [trip, categoryOrder]);
  const importantTotal = useMemo(() => computeTotal(important.all), [important]);
  const importantSpent = useMemo(() => computeSpentTotal(important.all), [important]);

  const activeCategory = CATEGORIES.find((category) => category.section === section);
  const suggestions = useMemo(
    () => (activeCategory ? buildListSuggestions(trips, trip, activeCategory.key, suggestionGroups(activeCategory)) : []),
    [trips, trip, activeCategory],
  );

  const tagOptions = useMemo<TagOption<Section>[]>(
    () => [
      { value: 'income', label: 'Të ardhurat', icon: 'cash-outline', activeIcon: 'cash', accent: INCOME_COLOR, remaining: 0, total: 0 },
      {
        value: IMPORTANT_SECTION,
        label: 'Më të rëndësishmet',
        tabLabel: 'Më të\nrëndësishmet',
        icon: 'flag-outline',
        activeIcon: 'flag',
        accent: IMPORTANT_COLOR,
        remaining: important.open.length,
        total: important.all.length,
      },
      ...categoryOrder.map((category) => ({
        value: category.section,
        label: category.label,
        tabLabel: category.tabLabel,
        icon: category.icon,
        activeIcon: category.activeIcon,
        accent: category.color,
        ...count(trip?.[category.key] ?? NO_ITEMS),
      })),
    ],
    [categoryOrder, trip, important],
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
            <Pressable
              onPress={() => setGridOpen(true)}
              hitSlop={8}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Të gjitha kategoritë"
            >
              <Ionicons name="grid-outline" size={20} color={colors.primaryDark} />
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

              <GestureDetector gesture={swipeTabs}>
                <Animated.View style={[styles.panes, slideStyle]}>
                  {mounted.includes('income') && (
                    <Pane active={section === 'income'}>
                      <BillsSummaryBar
                        totalAmount={incomeTotal}
                        paidAmount={combinedSpent}
                        totalLabel="Të ardhurat gjithsej"
                      />
                      <OptionTotalsBar
                        options={incomeKindTotals}
                        selected={incomeKindFilter}
                        onSelect={setIncomeKindFilter}
                      />
                      {overBy > 0 && <OverBudgetCard amount={overBy} />}
                      <FlatList
                        data={shownIncomes}
                        keyExtractor={(income) => income.id}
                        style={styles.list}
                        renderItem={({ item }) => (
                          <IncomeRow
                            income={item}
                            onUpdate={(patch) => updateIncome(trip.id, item.id, patch)}
                            onRemove={() => removeIncome(trip.id, item.id)}
                          />
                        )}
                        ListEmptyComponent={
                          <Text style={styles.empty}>
                            {incomeKindFilter
                              ? `Nuk ka asnjë të ardhur për ${incomeKindFilter}.`
                              : 'Nuk ke shtuar ende të ardhura.'}
                          </Text>
                        }
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                      />
                    </Pane>
                  )}

                  {mounted.includes(IMPORTANT_SECTION) && (
                    <Pane active={section === IMPORTANT_SECTION}>
                      <BillsSummaryBar
                        totalAmount={importantTotal}
                        paidAmount={importantSpent}
                        totalLabel="Gjithsej më të rëndësishmet"
                      />
                      <ImportantList
                        tripId={trip.id}
                        // Like the other tabs: prepared in the background as just its frame, rows only once it is opened.
                        entries={opened.includes(IMPORTANT_SECTION) ? important.open : NO_ENTRIES}
                        emptyText="Nuk ka asnjë artikull të rëndësishëm për t'u blerë."
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
                          overBy={overBy}
                          optionFilter={optionFilters[category.section] ?? null}
                          onOptionFilter={setOptionFilter}
                          personFilter={personFilters[category.section] ?? null}
                          onPersonFilter={setPersonFilter}
                        />
                      ),
                  )}
                </Animated.View>
              </GestureDetector>
            </View>
            <View style={styles.footer}>
              <Pressable
                onPress={() => setConfirmOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Fshi listën"
                style={[styles.deleteListButton, shadow]}
              >
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
              </Pressable>
              {section === 'income' && (
                <AddItemButton
                  onAdd={(name, _quantity, amount, _priority, _note, kindLabel) => {
                    addIncome(trip.id, name, amount ?? 0, incomeKindFromLabel(kindLabel));
                    // An income of another kind than the one the list is narrowed to would be hidden, so show everything again.
                    if (incomeKindFilter && kindLabel !== incomeKindFilter) setIncomeKindFilter(null);
                  }}
                  showQuantity={false}
                  title="Shto të ardhura"
                  namePlaceholder="P.sh. Rroga Alma, Bonus…"
                  secondOptions={INCOME_KIND_LABELS}
                  secondLabel="Lloji"
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
                  onAdd={(name, quantity, price, priority, note, person) => {
                    addItem(
                      trip.id,
                      activeCategory.key,
                      name,
                      activeCategory.showQuantity ? quantity : '',
                      price,
                      priority,
                      note,
                      person,
                    );
                    // An item added outside the group (or the person) the list is narrowed to would be hidden, so show everything again.
                    const group = optionFilters[activeCategory.section];
                    if (group && itemOption(activeCategory, name) !== group) setOptionFilter(activeCategory.section, null);
                    const forPerson = personFilters[activeCategory.section];
                    if (forPerson && person !== forPerson) setPersonFilter(activeCategory.section, null);
                  }}
                  showQuantity={activeCategory.showQuantity}
                  title={activeCategory.addTitle}
                  namePlaceholder={activeCategory.namePlaceholder}
                  nameOptions={activeCategory.nameOptions}
                  optionsLabel={activeCategory.optionsLabel}
                  otherOption={activeCategory.otherOption}
                  showNote={activeCategory.showNote}
                  secondOptions={activeCategory.personOptions}
                  secondLabel={activeCategory.personLabel}
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
  panes: { flex: 1 },
  pane: { flex: 1 },
  parked: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    // Far off to the side rather than invisible: nothing can overlap (or catch taps meant for) the open tab.
    transform: [{ translateX: -20000 }],
  },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  // At the far left, the add button at the far right, and a plain white circle, so the two are not mixed up.
  deleteListButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
