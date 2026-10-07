import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

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
import { TotalsBar } from '@/components/TotalsBar';
import { useTrips } from '@/context/TripsContext';
import { TAB_SLIDE, TAB_SLIDE_OUT_EASING } from '@/theme/motion';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { ItemListKey, ShoppingItem } from '@/types/models';
import { CATEGORIES, type Category, INCOME_COLOR } from '@/utils/categories';
import { type ImportantEntry, IMPORTANT_COLOR, IMPORTANT_SECTION, importantItems } from '@/utils/important';
import { goBackOrHome } from '@/utils/navigation';
import { buildOptionTotals, itemOption, itemsForOption } from '@/utils/options';
import { buildListSuggestions, buildSuggestions } from '@/utils/suggestions';
import { categoriesByOpenItems, computeSpentTotal, computeTotal, tripAllItems } from '@/utils/totals';

// 'income' or the `section` of a category.
type Section = string;

const NO_ITEMS: ShoppingItem[] = [];
const NO_ENTRIES: ImportantEntry[] = [];

// Produktet is the tab that carries the income / spent bar, wherever it stands in the strip.
const PRODUCTS_SECTION: Section = CATEGORIES[0].section;
const PREPARE_AFTER_MS = 600;
const PREPARE_STEP_MS = 400;
// A tab prepared in the background draws this many rows until it is opened (0: just its frame). Every row kept alive
// has to be torn down when the list is closed, so drawing them all made leaving the screen slow.
const PREVIEW_ROWS = 0;
// Swiping the lists sideways opens the neighbouring tab. It starts after this much sideways movement, is dropped when
// the finger goes up or down first (that is the list scrolling), and counts when it went far or fast enough.
const SWIPE_START_X = 24;
const SWIPE_CANCEL_Y = 14;
const SWIPE_MIN_DISTANCE = 50;
const SWIPE_MIN_VELOCITY = 600;

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
  /** The group of a category with choices (e.g. "Drion") the list is narrowed to, or null for everything. */
  optionFilter: string | null;
  onOptionFilter: (section: Section, group: string | null) => void;
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
  incomeTotal,
  overBy,
  onPressIncome,
  optionFilter,
  onOptionFilter,
}: CategoryPaneProps) {
  const optionTotals = useMemo(() => buildOptionTotals(items, category), [items, category]);
  const shownItems = useMemo(
    () => (optionFilter ? itemsForOption(items, category, optionFilter) : items),
    [items, category, optionFilter],
  );

  return (
    <Pane active={active}>
      {category.section === PRODUCTS_SECTION ? (
        <TotalsBar incomeTotal={incomeTotal} spentTotal={spent} onPressIncome={onPressIncome} />
      ) : (
        <BillsSummaryBar totalAmount={total} paidAmount={spent} totalLabel={category.totalLabel} />
      )}
      {optionTotals.length > 0 && (
        <OptionTotalsBar
          options={optionTotals}
          selected={optionFilter}
          onSelect={(group) => onOptionFilter(category.section, group)}
        />
      )}
      {overBy > 0 && <OverBudgetCard amount={overBy} />}
      <ItemList
        tripId={tripId}
        list={category.key}
        items={shownItems}
        emptyText={optionFilter ? `Nuk ka asnjë shpenzim për ${optionFilter}.` : category.emptyText}
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
  // The category tabs are sorted by the number on them (most items left to buy first, empty ones last) when the list is
  // opened and then kept as they are, so no tab jumps around while you add or check off items; the next time the list
  // is opened they are sorted again.
  const [categoryOrder] = useState(() => categoriesByOpenItems(trip));
  // The list opens on the first of them, so the strip starts at the left, right after Të ardhurat.
  const firstSection = categoryOrder[0].section;
  const [section, setSection] = useState<Section>(firstSection);
  // A tab is built the first time it is opened and then kept, so going back to it is instant.
  const [mounted, setMounted] = useState<Section[]>([firstSection]);
  // The tabs that were really opened; they keep all their rows.
  const [opened, setOpened] = useState<Section[]>([firstSection]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);

  const selectSection = useCallback((next: Section) => {
    setSection(next);
    setMounted((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setOpened((prev) => (prev.includes(next) ? prev : [...prev, next]));
  }, []);
  const openIncome = useCallback(() => selectSection('income'), [selectSection]);

  // Swipe left for the next tab in the strip, right for the previous one; nothing happens past either end.
  // The lists follow the finger, slide out the way it went, and the next tab slides in from the other side.
  const reduced = useReducedMotion();
  const tabOrder = useMemo<Section[]>(
    () => ['income', IMPORTANT_SECTION, ...categoryOrder.map((category) => category.section)],
    [categoryOrder],
  );
  const slideX = useSharedValue(0);
  const slideOpacity = useSharedValue(1);
  const slideStyle = useAnimatedStyle(() => ({ opacity: slideOpacity.value, transform: [{ translateX: slideX.value }] }));
  // Set when the old tab has slid out and the next one was swapped in: the side it slides in from (1: from the right,
  // -1: from the left, 0: no animation). A new object every time, so the effect below always runs once the tab is on screen.
  const [slideIn, setSlideIn] = useState<{ dir: number } | null>(null);
  const swapTab = useCallback(
    (next: Section, dir: number) => {
      selectSection(next);
      setSlideIn({ dir });
    },
    [selectSection],
  );
  useEffect(() => {
    if (!slideIn) return;
    if (slideIn.dir === 0) {
      slideX.set(0);
      slideOpacity.set(1);
      return;
    }
    slideX.set(slideIn.dir * TAB_SLIDE.inDistance);
    slideX.set(withSpring(0, TAB_SLIDE.spring));
    slideOpacity.set(withTiming(1, { duration: TAB_SLIDE.inMs }));
  }, [slideIn, slideX, slideOpacity]);

  const swipeTabs = useMemo(() => {
    const index = tabOrder.indexOf(section);
    return Gesture.Pan()
      .activeOffsetX([-SWIPE_START_X, SWIPE_START_X])
      .failOffsetY([-SWIPE_CANCEL_Y, SWIPE_CANCEL_Y])
      .onUpdate((e) => {
        if (reduced) return;
        const hasNeighbour = tabOrder[index + (e.translationX < 0 ? 1 : -1)] !== undefined;
        slideX.set(e.translationX * (hasNeighbour ? TAB_SLIDE.pull : TAB_SLIDE.edgePull));
      })
      .onEnd((e, success) => {
        const dir = e.translationX < 0 ? 1 : -1;
        const next = tabOrder[index + dir];
        const far = Math.abs(e.translationX) >= SWIPE_MIN_DISTANCE || Math.abs(e.velocityX) >= SWIPE_MIN_VELOCITY;
        if (!success || !far || next === undefined) {
          slideX.set(withSpring(0, TAB_SLIDE.spring));
          return;
        }
        if (reduced) {
          scheduleOnRN(swapTab, next, 0);
          return;
        }
        slideX.set(withTiming(-dir * TAB_SLIDE.outDistance, { duration: TAB_SLIDE.outMs, easing: TAB_SLIDE_OUT_EASING }));
        slideOpacity.set(
          withTiming(0, { duration: TAB_SLIDE.outMs }, (done) => {
            if (done) scheduleOnRN(swapTab, next, dir);
          }),
        );
      });
  }, [tabOrder, section, reduced, swapTab, slideX, slideOpacity]);

  // Per tab: the group (Drion, Naftë…) its list is narrowed to. Kept here so adding an item can undo it.
  const [optionFilters, setOptionFilters] = useState<Record<Section, string | null>>({});
  const setOptionFilter = useCallback(
    (target: Section, group: string | null) => setOptionFilters((prev) => ({ ...prev, [target]: group })),
    [],
  );

  // Build the other tabs one by one shortly after the list opens, so they are already there when tapped.
  useEffect(() => {
    // In the order of the strip, so the tabs closest to the open one are ready first.
    const prepareOrder: Section[] = [
      IMPORTANT_SECTION,
      ...categoryOrder.slice(1).map((category) => category.section),
      'income',
    ];
    const timers = prepareOrder.map((next, i) =>
      setTimeout(
        () => setMounted((prev) => (prev.includes(next) ? prev : [...prev, next])),
        PREPARE_AFTER_MS + i * PREPARE_STEP_MS,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [categoryOrder]);

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

  // The items of every category marked more important than normal, for the tab that gathers them.
  const important = useMemo(() => importantItems(trip, categoryOrder), [trip, categoryOrder]);
  const importantTotal = useMemo(() => computeTotal(important.all), [important]);
  const importantSpent = useMemo(() => computeSpentTotal(important.all), [important]);

  const activeCategory = CATEGORIES.find((category) => category.section === section);
  const suggestions = useMemo(
    () => (activeCategory ? buildListSuggestions(trips, trip, activeCategory.key) : []),
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
                          incomeTotal={incomeTotal}
                          overBy={overBy}
                          onPressIncome={openIncome}
                          optionFilter={optionFilters[category.section] ?? null}
                          onOptionFilter={setOptionFilter}
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
                  onAdd={(name, quantity, price, priority, note) => {
                    addItem(
                      trip.id,
                      activeCategory.key,
                      name,
                      activeCategory.showQuantity ? quantity : '',
                      price,
                      priority,
                      note,
                    );
                    // An item added outside the group the list is narrowed to would be hidden, so show everything again.
                    const group = optionFilters[activeCategory.section];
                    if (group && itemOption(activeCategory, name) !== group) setOptionFilter(activeCategory.section, null);
                  }}
                  showQuantity={activeCategory.showQuantity}
                  title={activeCategory.addTitle}
                  namePlaceholder={activeCategory.namePlaceholder}
                  nameOptions={activeCategory.nameOptions}
                  optionsLabel={activeCategory.optionsLabel}
                  otherOption={activeCategory.otherOption}
                  showNote={activeCategory.showNote}
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
