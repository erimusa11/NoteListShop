import { StyleSheet, Text, View } from 'react-native';

import { SectionIcon } from '@/components/NoteSectionTabs';
import { partTones, type Tone, toneShadow, tones } from '@/theme/noteTones';
import { colors, radii, spacing } from '@/theme/theme';
import type { NoteItem, NoteSection } from '@/types/models';
import { isFinished, NOTE_SECTIONS, noteListTotal, sectionOf } from '@/utils/noteLists';
import { formatNumber } from '@/utils/totals';

const SHADOW = toneShadow(tones.orange);

interface NoteShoppingSummaryProps {
  items: NoteItem[];
}

interface Part {
  done: number;
  count: number;
  /** What every product costs, and what the checked ones cost. */
  cost: number;
  doneCost: number;
}

const partOf = (items: NoteItem[]): Part => ({
  done: items.filter((item) => item.done).length,
  count: items.length,
  cost: noteListTotal({ items }),
  doneCost: noteListTotal({ items: items.filter((item) => item.done) }),
});

// The card on top of a shopping list: a bar for Ushqime and one for Detergjente (how many are checked, and what they cost), and
// under them the total of both. Only the products still to buy count; what was sent or moved to the checked ones is not here.
export function NoteShoppingSummary({ items }: NoteShoppingSummaryProps) {
  const total = partTones.total;
  const open = items.filter((item) => !isFinished(item));
  const parts = NOTE_SECTIONS.map(({ value, label }) => ({
    value,
    label,
    part: partOf(open.filter((item) => sectionOf(item) === value)),
  }));
  const all = partOf(open);
  return (
    <View style={[styles.card, SHADOW]}>
      {parts.map(({ value, label, part }) => (
        <Row key={value} section={value} label={label} part={part} accent={partTones[value]} />
      ))}
      <View style={[styles.divider, { backgroundColor: total.light }]} />
      <View style={styles.rowTop}>
        <Text style={[styles.totalLabel, { color: total.dark }]}>Gjithsej</Text>
        <Text style={[styles.rowCount, { color: total.dark }]}>
          {all.done}/{all.count}
        </Text>
        <View style={styles.spacer} />
        <Cost done={all.doneCost} all={all.cost} accent={total} big />
      </View>
    </View>
  );
}

function Row({ section, label, part, accent }: { section: NoteSection; label: string; part: Part; accent: Tone }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <SectionIcon section={section} size={15} color={accent.dark} />
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowCount, { color: accent.dark }]}>
          {part.done}/{part.count}
        </Text>
        <View style={styles.spacer} />
        <Cost done={part.doneCost} all={part.cost} accent={accent} />
      </View>
      <Bar ratio={part.count > 0 ? part.done / part.count : 0} accent={accent} />
    </View>
  );
}

// What the checked products cost, out of what all of them cost: "120/330 Lekë" (just a dash while nothing costs anything).
function Cost({ done, all, accent, big }: { done: number; all: number; accent: Tone; big?: boolean }) {
  return (
    <Text style={[styles.cost, big && styles.costBig, { color: accent.dark }]} numberOfLines={1}>
      {all === 0 ? (
        '—'
      ) : (
        <>
          {formatNumber(done)}
          <Text style={styles.costOf}>/{formatNumber(all)} Lekë</Text>
        </>
      )}
    </Text>
  );
}

function Bar({ ratio, accent }: { ratio: number; accent: Tone }) {
  return (
    <View style={[styles.track, { backgroundColor: accent.light }]}>
      <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: accent.main }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    marginBottom: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  row: { gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  rowCount: { fontSize: 13, fontWeight: '800' },
  spacer: { flex: 1 },
  cost: { fontSize: 13, fontWeight: '800', textAlign: 'right' },
  costBig: { fontSize: 15 },
  costOf: { fontWeight: '600', color: colors.textMuted },
  divider: { height: 1.5, borderRadius: 1 },
  totalLabel: { fontSize: 14, fontWeight: '800' },
  track: { height: 4, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
});
