import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { ParaprakeDot } from '@/components/ParaprakeDot';
import { colors, radii, spacing } from '@/theme/theme';
import { PARAPRAKE_LABEL } from '@/utils/paraprake';

/** The two kinds a list can be, with what each one means. */
export const LIST_KINDS = [
  {
    paraprake: false,
    label: 'Normale',
    hint: 'Lista e zakonshme. Renditet sipas datës, më e reja lart.',
  },
  {
    paraprake: true,
    label: PARAPRAKE_LABEL,
    hint: 'Për një parashikim ose një përmbledhje. Qëndron gjithmonë në krye të listave dhe ka një pikë kudo që shfaqet. Gjithçka tjetër punon njësoj.',
  },
] as const;

interface ListKindSheetProps {
  visible: boolean;
  onClose: () => void;
  paraprake: boolean;
  /** The kind that was picked; the sheet closes itself after it. */
  onChange: (paraprake: boolean) => void;
}

// Where an open list is switched between normal and paraprake, in either direction, as often as needed.
export function ListKindSheet({ visible, onClose, paraprake, onChange }: ListKindSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Lloji i listës">
      {LIST_KINDS.map((kind) => {
        const selected = kind.paraprake === paraprake;
        return (
          <Pressable
            key={kind.label}
            onPress={() => {
              if (!selected) onChange(kind.paraprake);
              onClose();
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${kind.label}. ${kind.hint}`}
            style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
          >
            <View style={styles.mark}>
              {kind.paraprake ? (
                <ParaprakeDot size={12} />
              ) : (
                <Ionicons name="ellipse-outline" size={20} color={colors.textMuted} />
              )}
            </View>
            <View style={styles.text}>
              <Text style={styles.name}>{kind.label}</Text>
              <Text style={styles.hint}>{kind.hint}</Text>
            </View>
            {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
          </Pressable>
        );
      })}
      <Text style={styles.footnote}>Mund ta ndryshosh kur të duash: asgjë tjetër në listë nuk preket.</Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md - 2,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  pressed: { opacity: 0.7 },
  mark: { width: 26, alignItems: 'center' },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  hint: { fontSize: 12, lineHeight: 17, color: colors.textMuted },
  footnote: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
});
