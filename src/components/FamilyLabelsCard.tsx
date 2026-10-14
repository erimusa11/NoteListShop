import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthField } from '@/components/AuthField';
import { useFamilyLabels } from '@/context/FamilyLabelsContext';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import {
  cleanLabel,
  type CustomLabels,
  DEFAULT_LABELS,
  LABEL_KEYS,
  type LabelKey,
  labelOf,
  MAX_LABEL_LENGTH,
  normalizeLabels,
} from '@/utils/familyLabels';
import { normalizeText } from '@/utils/suggestions';

// How long after the last keystroke the names are saved.
const AUTOSAVE_MS = 700;

const GROUPS: { title: string; icon: 'happy' | 'person' | 'car'; keys: LabelKey[] }[] = [
  { title: 'Fëmijët', icon: 'happy', keys: ['Alois', 'Drion'] },
  { title: 'Prindërit', icon: 'person', keys: ['Alma', 'Eri'] },
  { title: 'Makinat', icon: 'car', keys: ['Kia Morning', 'Hyundai Tucson'] },
];

type Drafts = Record<LabelKey, string>;

const draftsFrom = (labels: CustomLabels): Drafts => ({
  Alois: labelOf('Alois', labels),
  Drion: labelOf('Drion', labels),
  Alma: labelOf('Alma', labels),
  Eri: labelOf('Eri', labels),
  'Kia Morning': labelOf('Kia Morning', labels),
  'Hyundai Tucson': labelOf('Hyundai Tucson', labels),
});

// What each name would show with the drafts as they are now: the text, or its default while the field is empty.
const effectiveOf = (drafts: Drafts, key: LabelKey) => cleanLabel(drafts[key]) || DEFAULT_LABELS[key];

// Two choices with the same name could not be told apart. The names that clash with another are the ones that are not saved.
const clashesOf = (drafts: Drafts): Record<LabelKey, boolean> => {
  const result = {} as Record<LabelKey, boolean>;
  for (const key of LABEL_KEYS) {
    result[key] = LABEL_KEYS.some(
      (other) => other !== key && normalizeText(effectiveOf(drafts, other)) === normalizeText(effectiveOf(drafts, key)),
    );
  }
  return result;
};

// The names shown wherever the family's choices appear (Dëshirat, Fëmijët, Shendeti, Kopesht & Shkolle, Makina & Shërbime…).
// They are saved with the account, so every device that signs in shows the same ones. The lists themselves are not touched:
// an item stays under its choice whatever the choice is called.
export function FamilyLabelsCard() {
  const { labels, hydrate, resetLabels } = useFamilyLabels();
  const [drafts, setDrafts] = useState<Drafts>(() => draftsFrom(labels));
  const [saved, setSaved] = useState(false);

  // The save always works from the newest names and drafts, not the ones a timer was started with.
  const labelsRef = useRef(labels);
  const draftsRef = useRef(drafts);
  useEffect(() => {
    labelsRef.current = labels;
    draftsRef.current = drafts;
  });

  const commit = useCallback(() => {
    const current = labelsRef.current;
    const wanted = draftsRef.current;
    const clashes = clashesOf(wanted);
    const next: CustomLabels = {};
    for (const key of LABEL_KEYS) {
      // A name that clashes keeps what was saved for it until it is changed to something else.
      const chosen = clashes[key] ? labelOf(key, current) : effectiveOf(wanted, key);
      if (chosen !== DEFAULT_LABELS[key]) next[key] = chosen;
    }
    if (JSON.stringify(normalizeLabels(next)) === JSON.stringify(current)) return;
    hydrate(next);
    setSaved(true);
  }, [hydrate]);

  // One save a moment after the typing stops (every field together), and one more when the page is left, so nothing typed is lost.
  useEffect(() => {
    const timer = setTimeout(commit, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [drafts, commit]);
  useEffect(() => () => commit(), [commit]);

  const clashes = clashesOf(drafts);
  const changed = Object.keys(labels).length > 0;

  const change = (key: LabelKey, text: string) => {
    setDrafts((prev) => ({ ...prev, [key]: text }));
    setSaved(false);
  };
  const reset = () => {
    resetLabels();
    setDrafts({ ...DEFAULT_LABELS });
    setSaved(true);
  };

  return (
    <View style={[styles.card, shadow]}>
      <Text style={styles.cardTitle}>Emrat në lista</Text>
      <Text style={styles.cardHint}>
        Emrat që shfaqen te zgjedhjet (Dëshirat, Fëmijët, Shendeti, Kopesht & Shkolle, Makina…). Ruhen në llogarinë tënde dhe
        të ndjekin në çdo pajisje.
      </Text>

      {GROUPS.map((group) => (
        <View key={group.title} style={styles.group}>
          <View style={styles.groupHeader}>
            <Ionicons name={group.icon} size={15} color={colors.primaryDark} />
            <Text style={styles.groupTitle}>{group.title}</Text>
          </View>
          {group.keys.map((key) => (
            <View key={key} style={styles.field}>
              <AuthField
                label={DEFAULT_LABELS[key]}
                value={drafts[key]}
                onChangeText={(text) => change(key, text)}
                placeholder={DEFAULT_LABELS[key]}
                maxLength={MAX_LABEL_LENGTH}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
              />
              {clashes[key] && (
                <Text style={styles.error} accessibilityRole="alert">
                  Ky emër përdoret tashmë. Zgjidh një tjetër.
                </Text>
              )}
            </View>
          ))}
        </View>
      ))}

      <View style={styles.footer}>
        {saved && (
          <View style={styles.savedRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.savedText}>U ruajt</Text>
          </View>
        )}
        {changed && (
          <Pressable onPress={reset} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>Rivendos emrat e parazgjedhur</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm + 2 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  cardHint: { fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: -4 },
  group: { gap: spacing.sm },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  groupTitle: { fontSize: 13, fontWeight: '800', color: colors.primaryDark },
  field: { gap: 4 },
  error: { fontSize: 12, color: colors.danger },
  footer: { alignItems: 'center', gap: spacing.sm },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savedText: { fontSize: 13, fontWeight: '600', color: colors.success },
  link: { fontSize: 14, fontWeight: '600', color: colors.primaryDark, textAlign: 'center' },
});
