import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, spacing } from '@/theme/theme';
import type { AttendancePlace } from '@/types/models';
import type { KidInfo, PlaceInfo } from '@/utils/attendance';

interface AttendanceBrushProps {
  kids: KidInfo[];
  places: PlaceInfo[];
  /** The place picked for each child, or null while the child is left out. */
  value: Record<string, AttendancePlace | null | undefined>;
  onChange: (kid: string, place: AttendancePlace | null) => void;
}

const NAME_WIDTH = 80;
const DOT = 34;
// Below this width the place names (Kopesht…) get a smaller type so all five fit over their circles.
const COMPACT_BELOW = 350;

// A small table: a row per child, a column per place, one circle to pick in each row. The circle looks like the mark that
// will appear on the days (the child's letter on the color of the place), so what is picked is what is seen.
// Tapping the picked circle again leaves the child out.
export function AttendanceBrush({ kids, places, value, onChange }: AttendanceBrushProps) {
  const compact = useWindowDimensions().width < COMPACT_BELOW;
  return (
    <View>
      <View style={styles.headRow}>
        <View style={styles.who} />
        {places.map((place) => (
          <View key={place.value} style={styles.cell}>
            <Text style={[styles.placeLabel, compact && styles.placeLabelCompact, { color: place.color }]} numberOfLines={1}>
              {place.label}
            </Text>
          </View>
        ))}
      </View>

      {kids.map((kid) => {
        const chosen = value[kid.name] ?? null;
        return (
          <View key={kid.name} style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={kid.name}>
            <View style={styles.who}>
              <View style={[styles.avatar, { backgroundColor: kid.color }, chosen === null && styles.off]}>
                <Text style={styles.avatarText}>{kid.initial}</Text>
              </View>
              <Text style={[styles.name, chosen === null && styles.nameOff]} numberOfLines={1}>
                {kid.name}
              </Text>
            </View>
            {places.map((place) => {
              const selected = chosen === place.value;
              return (
                <View key={place.value} style={styles.cell}>
                  <Pressable
                    onPress={() => onChange(kid.name, selected ? null : place.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${kid.name}: ${place.label}`}
                    hitSlop={4}
                    style={({ pressed }) => [
                      styles.dot,
                      selected
                        ? { backgroundColor: place.color, borderColor: place.color }
                        : { backgroundColor: place.color + '14', borderColor: place.color + '66' },
                      pressed && styles.pressed,
                    ]}
                  >
                    {selected && <Text style={styles.dotText}>{kid.initial}</Text>}
                  </Pressable>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: DOT + spacing.sm },
  who: { width: NAME_WIDTH, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cell: { flex: 1, alignItems: 'center' },
  placeLabel: { fontSize: 11, fontWeight: '800' },
  placeLabelCompact: { fontSize: 10 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  off: { opacity: 0.4 },
  name: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  nameOff: { color: colors.textMuted, fontWeight: '600' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  pressed: { transform: [{ scale: 0.9 }] },
});
