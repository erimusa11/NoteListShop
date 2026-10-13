import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { colors, radii, spacing } from '@/theme/theme';
import type { Attendance } from '@/types/models';
import { isWeekend, type KidInfo, keyToDate, monthWeeks, type PlaceInfo } from '@/utils/attendance';
import { formatMonthYearAlbanian, WEEKDAYS_SHORT } from '@/utils/dates';

interface AttendanceCalendarProps {
  year: number;
  /** From 0, like a Date's. */
  month: number;
  attendance: Attendance;
  kids: KidInfo[];
  places: PlaceInfo[];
  /** Today as a day key, to mark it. */
  today: string;
  onTapDay: (day: string) => void;
  /** Goes to the month before (-1) or after (1). */
  onShift: (delta: number) => void;
  onToday: () => void;
  /** Under the days: the quick actions. */
  footer?: ReactNode;
}

const MARKER = 18;

// One month, Monday first. Each day shows a small circle for every child that has something on it: the child's letter on
// the color of the place (or green for sick). The same slot is always the same child, so who is who is clear at a glance.
export function AttendanceCalendar({
  year,
  month,
  attendance,
  kids,
  places,
  today,
  onTapDay,
  onShift,
  onToday,
  footer,
}: AttendanceCalendarProps) {
  const weeks = monthWeeks(year, month);
  const isCurrentMonth = today.startsWith(`${year}-${String(month + 1).padStart(2, '0')}-`);
  const placeOf = (value: string | undefined) => places.find((place) => place.value === value);

  return (
    <View>
      <View style={styles.bar}>
        <Pressable
          onPress={() => onShift(-1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Muaji i kaluar"
          style={({ pressed }) => [styles.nav, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.barCenter}>
          <Text style={styles.monthTitle}>{formatMonthYearAlbanian(year, month)}</Text>
          {!isCurrentMonth && (
            <Pressable
              onPress={onToday}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Shko te muaji i sotëm"
              style={styles.todayChip}
            >
              <Text style={styles.todayChipText}>Sot</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => onShift(1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Muaji tjetër"
          style={({ pressed }) => [styles.nav, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAYS_SHORT.map((name, index) => (
          <View key={name} style={styles.cell}>
            <Text style={[styles.weekday, index >= 5 && styles.weekend]}>{name}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, row) => (
        <View key={row} style={styles.week}>
          {week.map((day, column) => {
            if (!day) return <View key={column} style={styles.cell} />;
            const marks = attendance[day] ?? {};
            const number = keyToDate(day).getDate();
            const isToday = day === today;
            const said = kids
              .filter((kid) => marks[kid.name])
              .map((kid) => `${kid.name}: ${placeOf(marks[kid.name])?.label ?? ''}`)
              .join(', ');
            return (
              <View key={day} style={styles.cell}>
                <Pressable
                  onPress={() => onTapDay(day)}
                  accessibilityRole="button"
                  accessibilityLabel={`${number} ${formatMonthYearAlbanian(year, month)}${said ? `, ${said}` : ''}`}
                  style={({ pressed }) => [styles.day, pressed && styles.dayPressed]}
                >
                  <View style={[styles.number, isToday && styles.numberToday]}>
                    <Text style={[styles.numberText, isWeekend(day) && styles.weekend, isToday && styles.numberTodayText]}>
                      {number}
                    </Text>
                  </View>
                  <View style={styles.markers}>
                    {kids.map((kid) => {
                      const place = placeOf(marks[kid.name]);
                      return place ? (
                        <Animated.View
                          key={`${kid.name}-${place.value}`}
                          entering={ZoomIn.duration(140)}
                          style={[styles.marker, { backgroundColor: place.color }]}
                        >
                          <Text style={styles.markerText}>{kid.initial}</Text>
                        </Animated.View>
                      ) : (
                        <View key={kid.name} style={styles.marker} />
                      );
                    })}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.legend}>
        {places.map((place) => (
          <View key={place.value} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: place.color }]} />
            <Text style={styles.legendText}>{place.label}</Text>
          </View>
        ))}
      </View>

      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  nav: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  barCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  monthTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  todayChip: { backgroundColor: colors.primaryLight, borderRadius: radii.pill, paddingVertical: 3, paddingHorizontal: 10 },
  todayChipText: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
  week: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center' },
  weekday: { fontSize: 11, fontWeight: '700', color: colors.textMuted, paddingVertical: spacing.xs },
  weekend: { color: '#B9ADA4' },
  day: {
    width: '100%',
    minHeight: 56,
    alignItems: 'center',
    gap: 3,
    paddingTop: 3,
    paddingBottom: 3,
    borderRadius: radii.sm,
  },
  dayPressed: { backgroundColor: colors.primaryLight },
  number: { minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  numberToday: { backgroundColor: colors.primary },
  numberText: { fontSize: 13, fontWeight: '700', color: colors.text },
  numberTodayText: { color: '#FFFFFF' },
  markers: { flexDirection: 'row', gap: 2, height: MARKER },
  marker: { width: MARKER, height: MARKER, borderRadius: MARKER / 2, alignItems: 'center', justifyContent: 'center' },
  markerText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
});
