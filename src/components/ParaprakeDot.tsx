import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '@/theme/theme';
import { PARAPRAKE_LABEL } from '@/utils/paraprake';

/** The small dot that marks a paraprake list wherever the list is shown: a solid dot with a soft ring around it. */
export function ParaprakeDot({ size = 8 }: { size?: number }) {
  const ring = size + 4;
  return (
    // Decoration: the place that shows it names the kind in its own label for a screen reader.
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: ring,
        height: ring,
        borderRadius: ring / 2,
        backgroundColor: colors.paraprakeLight,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.paraprake }} />
    </View>
  );
}

/** The dot with its name, for where there is room (the card of a list, the header of an open list). */
export function ParaprakeBadge() {
  return (
    <View style={styles.badge}>
      <ParaprakeDot size={7} />
      <Text style={styles.badgeText} numberOfLines={1}>
        {PARAPRAKE_LABEL}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.paraprakeLight,
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingLeft: 3,
    paddingRight: 9,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.paraprake },
});
