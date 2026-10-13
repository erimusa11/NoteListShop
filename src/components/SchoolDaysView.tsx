import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AttendanceBrush } from '@/components/AttendanceBrush';
import { AttendanceCalendar } from '@/components/AttendanceCalendar';
import { AttendanceSummary } from '@/components/AttendanceSummary';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTrips } from '@/context/TripsContext';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { Attendance, AttendancePlace, ShoppingItem, ShoppingTrip } from '@/types/models';
import {
  attendanceKids,
  attendancePlaces,
  clearDays,
  countMarks,
  dayKey,
  fillDays,
  isInMonth,
  lastDayPrice,
  type MonthRef,
  monthOfDay,
  monthWeeks,
  openingMonth,
  type PaidPlace,
  type Plan,
  type PriceFor,
  readAttendance,
  addFixed,
  removeFixed,
  setDayPrice,
  setDays,
  setFixedPrice,
  shiftMonth,
  summarize,
  tapDay,
  usualPlaces,
  workdaysOf,
} from '@/utils/attendance';
import type { Category } from '@/utils/categories';
import { formatMonthYearAlbanian } from '@/utils/dates';
import { formatPrice } from '@/utils/totals';

const NOTICE_MS = 7000;

// What undoing a big change puts back: the calendar and the items of the category as they were.
interface Snapshot {
  attendance: Attendance | undefined;
  items: ShoppingItem[];
}

interface Notice {
  text: string;
  /** With it, the notice has a "Zhbëj" button that puts the list back as it was. */
  undo?: Snapshot;
}

interface SchoolDaysViewProps {
  trip: ShoppingTrip;
  trips: ShoppingTrip[];
  category: Category;
  /** What goes above the cards (a back button, the list switcher…). It is given what the days come to, to show in a corner. */
  header: (info: { totalAmount: number }) => ReactNode;
  /** Space on both sides of the cards; none when the page it sits in already has its own. */
  inset?: number;
}

/** What the days come to, in a small pill for a corner of the header. */
export function TotalPill({ amount }: { amount: number }) {
  return (
    <View style={styles.totalPill} accessibilityLabel={`Gjithsej ${formatPrice(amount)}`}>
      <Text style={styles.totalText}>{formatPrice(amount)}</Text>
    </View>
  );
}

// The days calendar of Kopesht & Shkolle. Pick where each child goes (Cerdhe, Kopesht, Shkolle, or sick), then tap the
// days: the days at a paid place become one line per child and place in the list, times what a day costs. Everything is
// saved as it is changed. It is a screen of its own (from the list) and a page of the bottom menu; both are this.
export function SchoolDaysView({ trip, trips, category, header, inset = spacing.md }: SchoolDaysViewProps) {
  const { changeTrip } = useTrips();
  const kids = attendanceKids(category);
  const places = attendancePlaces(category);
  // Read once, when the view opens; the day does not change under it.
  const [today] = useState(() => dayKey(new Date()));
  const [month, setMonth] = useState<MonthRef>(() => openingMonth(trip, today));
  // Where each child is put by a tap on a day: what they did most in this list, else what they had before; empty for a
  // child nothing is known about, who is left out until a place is picked.
  const [brush, setBrush] = useState<Record<string, AttendancePlace | null>>(() => usualPlaces(trips, trip, category));
  // The price typed for a place that has no item yet, by "child|place", for when its first day is marked.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const attendance = readAttendance(trip);
  const plans: Plan[] = kids.flatMap((kid) => {
    const place = brush[kid.name];
    return place ? [{ kid: kid.name, place }] : [];
  });
  const planned = plans.map((plan) => plan.kid);
  const summary = summarize(trip, category, brush);
  const totalAmount = summary.reduce((sum, entry) => sum + entry.amount, 0);

  const suggestedPrice = (kid: string, place: PaidPlace) => lastDayPrice(trips, trip, category, kid, place);
  // The price a new item starts with: what was typed for it, else what that place cost before.
  const priceFor: PriceFor = (kid, place) => {
    const typed = parseFloat((drafts[`${kid}|${place}`] ?? '').replace(',', '.'));
    return Number.isFinite(typed) ? typed : suggestedPrice(kid, place);
  };

  const weeks = monthWeeks(month.year, month.month);
  const monthDays = weeks.flat().filter((day): day is string => day !== null);
  const isCurrentMonth = isInMonth(today, month);
  // In the month that is going on only the days up to today can have been; in any other month, every working day.
  const workdays = workdaysOf(weeks, isCurrentMonth ? today : undefined);
  const monthMarks = countMarks(trip, monthDays, planned);
  const canFill = plans.length > 0 && workdays.length > 0;
  const canClear = plans.length > 0 && monthMarks > 0;

  const dismissNotice = () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = null;
    setNotice(null);
  };
  const showNotice = (text: string, undoable: boolean) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    // `trip` is the list as it is now, before the change that is being announced.
    setNotice({ text, undo: undoable ? { attendance: trip.attendance, items: trip[category.key] ?? [] } : undefined });
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  };
  const undo = () => {
    const snapshot = notice?.undo;
    if (!snapshot) return;
    changeTrip(trip.id, (current) => ({ ...current, attendance: snapshot.attendance ?? {}, [category.key]: snapshot.items }));
    dismissNotice();
  };

  const onTapDay = (day: string) => {
    if (plans.length === 0) return;
    dismissNotice();
    changeTrip(trip.id, (current) => tapDay(current, category, day, plans, priceFor));
  };

  const fillMonth = () => {
    if (!canFill) return;
    const added =
      countMarks(fillDays(trip, category, workdays, plans, priceFor), workdays, planned) - countMarks(trip, workdays, planned);
    if (added === 0) {
      showNotice(`Të gjitha ditët e punës${isCurrentMonth ? ' deri sot' : ''} janë shënuar tashmë.`, false);
      return;
    }
    changeTrip(trip.id, (current) => fillDays(current, category, workdays, plans, priceFor));
    showNotice(`U shënuan ${added} ditë pune${isCurrentMonth ? ' deri sot' : ''}.`, true);
  };

  const clearMonth = () => {
    setConfirmClear(false);
    if (!canClear) return;
    changeTrip(trip.id, (current) => clearDays(current, category, monthDays, planned, priceFor));
    showNotice(`U hoqën ${monthMarks} ditë.`, true);
  };

  const onDays = (kid: string, place: PaidPlace, days: number) => {
    dismissNotice();
    changeTrip(trip.id, (current) => setDays(current, category, kid, place, days, priceFor));
  };

  const onPrice = (kid: string, place: PaidPlace, text: string) => {
    const value = parseFloat(text.replace(',', '.'));
    setDrafts((current) => ({ ...current, [`${kid}|${place}`]: text.trim() }));
    changeTrip(trip.id, (current) => setDayPrice(current, category, kid, place, Number.isFinite(value) ? value : null));
  };

  // Amounts that have nothing to do with the days.
  const onAddFixed = (kid: string, level: string, label: string, price: number) => {
    dismissNotice();
    changeTrip(trip.id, (current) => addFixed(current, category, kid, level, label, price));
  };
  const onFixedPrice = (itemId: string, text: string) => {
    const value = parseFloat(text.replace(',', '.'));
    changeTrip(trip.id, (current) => setFixedPrice(current, category, itemId, Number.isFinite(value) ? value : null));
  };
  const onRemoveFixed = (itemId: string) => {
    dismissNotice();
    changeTrip(trip.id, (current) => removeFixed(current, category, itemId));
  };

  const names = planned.join(' dhe ');

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {header({ totalAmount })}

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingHorizontal: inset }]}
        keyboardShouldPersistTaps="handled"
        // The number keyboard of an iPhone has no Return key: dragging the page closes it, which also confirms the number typed.
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Card step={1} title="Ku shkon secili fëmijë?" hint="Prek një rreth; prek përsëri për ta hequr.">
          <AttendanceBrush
            kids={kids}
            places={places}
            value={brush}
            onChange={(kid, place) => setBrush((current) => ({ ...current, [kid]: place }))}
          />
        </Card>

        <Card step={2} title="Prek ditët që shkuan" hint="Prek një ditë për ta shënuar, prek përsëri për ta hequr.">
          {plans.length === 0 && (
            <View style={styles.notice}>
              <Ionicons name="information-circle" size={18} color={colors.primaryDark} />
              <Text style={styles.noticeText}>Zgjidh më sipër ku shkon të paktën një fëmijë.</Text>
            </View>
          )}
          <AttendanceCalendar
            year={month.year}
            month={month.month}
            attendance={attendance}
            kids={kids}
            places={places}
            today={today}
            onTapDay={onTapDay}
            onShift={(delta) => setMonth((current) => shiftMonth(current, delta))}
            onToday={() => setMonth(monthOfDay(today))}
            footer={
              <View style={styles.actions}>
                <Pressable
                  onPress={fillMonth}
                  disabled={!canFill}
                  accessibilityRole="button"
                  accessibilityLabel={isCurrentMonth ? 'Shëno ditët e punës deri sot' : 'Shëno të gjitha ditët e punës të muajit'}
                  style={({ pressed }) => [styles.action, !canFill && styles.actionDisabled, pressed && styles.actionPressed]}
                >
                  <Ionicons name="checkmark-done" size={16} color={colors.primaryDark} />
                  <Text style={styles.actionText} numberOfLines={1}>
                    Ditët e punës
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setConfirmClear(true)}
                  disabled={!canClear}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.action,
                    styles.actionDanger,
                    !canClear && styles.actionDisabled,
                    pressed && styles.actionPressed,
                  ]}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={[styles.actionText, styles.actionDangerText]} numberOfLines={1}>
                    Pastro muajin
                  </Text>
                </Pressable>
              </View>
            }
          />
        </Card>

        <Card step={3} title="Llogaria" hint="Ndrysho ditët ose çmimin drejtpërdrejt, pa i prekur një nga një.">
          <AttendanceSummary
            kids={kids}
            summary={summary}
            places={places}
            drafts={drafts}
            suggestedPrice={suggestedPrice}
            onDays={onDays}
            onPrice={onPrice}
            levels={category.nameOptions ?? []}
            onAddFixed={onAddFixed}
            onFixedPrice={onFixedPrice}
            onRemoveFixed={onRemoveFixed}
          />
        </Card>
      </ScrollView>

      {notice && (
        <View style={[styles.toast, { left: inset || spacing.md, right: inset || spacing.md }, shadow]} accessibilityRole="alert">
          <Text style={styles.toastText}>{notice.text}</Text>
          {notice.undo && (
            <Pressable onPress={undo} hitSlop={8} accessibilityRole="button">
              <Text style={styles.toastAction}>Zhbëj</Text>
            </Pressable>
          )}
        </View>
      )}

      <ConfirmDialog
        visible={confirmClear}
        title="Pastro muajin?"
        message={`Do të hiqen ${monthMarks} ditë të shënuara për ${names} në ${formatMonthYearAlbanian(month.year, month.month)}.`}
        details={['Ditët e paguara do të pakësohen sipas tyre.']}
        confirmLabel="Pastro"
        onConfirm={clearMonth}
        onCancel={() => setConfirmClear(false)}
      />
    </KeyboardAvoidingView>
  );
}

interface CardProps {
  step: number;
  title: string;
  hint: string;
  children: ReactNode;
}

// A step of the page: a white card with its number, what to do, and a line saying how.
function Card({ step, title, hint, children }: CardProps) {
  return (
    <View style={[styles.card, shadow]}>
      <View style={styles.cardHeader}>
        <View style={styles.step}>
          <Text style={styles.stepText}>{step}</Text>
        </View>
        <View style={styles.cardTitles}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardHint}>{hint}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  totalPill: { backgroundColor: colors.primaryLight, borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 12 },
  totalText: { fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  content: { paddingTop: 0, paddingBottom: 96, gap: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.md, gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  step: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  cardTitles: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardHint: { fontSize: 12, color: colors.textMuted },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
  },
  noticeText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.primaryDark },
  // Side by side when there is room for both labels; one under the other on a very narrow screen.
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  action: {
    flexGrow: 1,
    flexBasis: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm + 1,
    paddingHorizontal: spacing.sm,
  },
  actionDanger: { borderColor: '#F5C2BD', backgroundColor: '#FDECEA' },
  actionDisabled: { opacity: 0.4 },
  actionPressed: { opacity: 0.7 },
  actionText: { flexShrink: 1, fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  actionDangerText: { color: colors.danger },
  toast: {
    position: 'absolute',
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.text,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
  },
  toastText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  toastAction: { fontSize: 14, fontWeight: '800', color: '#FFB866' },
});
