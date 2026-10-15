import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Tone, tones } from '@/theme/noteTones';
import { colors, radii, spacing } from '@/theme/theme';

interface NoteSendBarProps {
  /** Whether every item of the open tab is checked off; the first button then takes the checks away instead. */
  allChecked: boolean;
  /** Whether the open tab has any item (with none there is nothing to check). */
  hasItems: boolean;
  onToggleAll: () => void;
  /** How many checked items have not been sent to the newest list yet, shown on the second button. */
  waiting: number;
  onSend: () => void;
  /** The color of the open part (violet for the detergents); the shopping orange when missing. */
  tone?: Tone;
}

// Two buttons under the tabs of a shopping list: check off every item of the open tab at once, and send the checked ones (of
// both tabs) to the newest list of Note Shop List. They sit side by side while there is room and stack on a narrow phone or
// with large text, so the labels are never cut off.
export function NoteSendBar({ allChecked, hasItems, onToggleAll, waiting, onSend, tone = tones.orange }: NoteSendBarProps) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggleAll}
        disabled={!hasItems}
        accessibilityRole="button"
        accessibilityLabel={allChecked ? 'Hiq shenjat e të gjithave' : 'Shëno të gjitha si të kryera'}
        style={({ pressed }) => [
          styles.button,
          styles.outline,
          { borderColor: tone.light },
          !hasItems && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name={allChecked ? 'close-circle-outline' : 'checkmark-circle-outline'} size={18} color={tone.dark} />
        <Text style={[styles.outlineText, { color: tone.dark }]} numberOfLines={2}>
          {allChecked ? 'Hiq shenjat' : 'Shëno të gjitha'}
        </Text>
      </Pressable>
      <Pressable
        onPress={onSend}
        accessibilityRole="button"
        accessibilityLabel={waiting > 0 ? `Dërgo te lista, ${waiting} presin` : 'Dërgo te lista'}
        style={({ pressed }) => [styles.button, { backgroundColor: tones.orange.main }, pressed && styles.pressed]}
      >
        <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
        <Text style={styles.filledText} numberOfLines={2}>
          Dërgo te lista
        </Text>
        {waiting > 0 && (
          <View style={styles.badge}>
            <Text style={[styles.badgeText, { color: tones.orange.dark }]}>{waiting}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  button: {
    flexGrow: 1,
    flexBasis: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  outline: { backgroundColor: colors.card, borderWidth: 1.5 },
  outlineText: { flexShrink: 1, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  filledText: { flexShrink: 1, fontSize: 14, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  badgeText: { fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
});
