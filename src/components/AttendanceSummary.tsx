import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ShoppingItem } from '@/types/models';

import { useFamilyLabels } from '@/context/FamilyLabelsContext';
import { colors, radii, spacing } from '@/theme/theme';
import {
  describeDays,
  type KidDays,
  type KidInfo,
  type PaidPlace,
  type PlaceDays,
  type PlaceInfo,
  SICK_COLOR,
} from '@/utils/attendance';
import { sanitizeQuantityInput } from '@/utils/quantity';
import { formatPrice } from '@/utils/totals';

interface AttendanceSummaryProps {
  kids: KidInfo[];
  summary: KidDays[];
  places: PlaceInfo[];
  /** The price typed for a place that has no item yet (nothing to save it on), by "child|place". */
  drafts: Record<string, string>;
  /** What a day is expected to cost for a child at a place, shown faintly while no price is typed. */
  suggestedPrice: (kid: string, place: PaidPlace) => number | null;
  onDays: (kid: string, place: PaidPlace, days: number) => void;
  onPrice: (kid: string, place: PaidPlace, text: string) => void;
  /** The levels (Cerdhe, Kopesht, Shkolle, Kurse) a fixed amount can be put under. */
  levels: string[];
  onAddFixed: (kid: string, level: string, label: string, price: number) => void;
  onFixedPrice: (itemId: string, text: string) => void;
  onRemoveFixed: (itemId: string) => void;
}

const sanitizeDays = (text: string) => text.replace(/\D/g, '').slice(0, 3);

interface NumberBoxProps {
  value: string;
  placeholder?: string;
  width: number;
  label: string;
  sanitize: (text: string) => string;
  onCommit: (text: string) => void;
}

// A number that can be typed. What is typed is kept apart until the field is left (or Enter is pressed), so a half-typed
// number (or an empty field on the way to a new one) never changes the amounts.
function NumberBox({ value, placeholder, width, label, sanitize, onCommit }: NumberBoxProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const input = useRef<TextInput>(null);
  const finish = () => {
    if (draft !== null && draft !== value) onCommit(draft);
    setDraft(null);
  };
  return (
    <TextInput
      ref={input}
      value={draft ?? value}
      onFocus={() => setDraft(value)}
      onChangeText={(text) => setDraft(sanitize(text))}
      onBlur={finish}
      onSubmitEditing={() => input.current?.blur()}
      selectTextOnFocus
      keyboardType="numeric"
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      accessibilityLabel={label}
      style={[styles.box, { width }]}
    />
  );
}

interface StepperProps {
  icon: 'add' | 'remove';
  label: string;
  disabled?: boolean;
  onPress: () => void;
}

function Stepper({ icon, label, disabled, onPress }: StepperProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.step, disabled && styles.stepDisabled, pressed && styles.stepPressed]}
    >
      <Ionicons name={icon} size={18} color={colors.primaryDark} />
    </Pressable>
  );
}

interface FixedSectionProps {
  kid: string;
  items: ShoppingItem[];
  levels: string[];
  defaultLevel: string;
  onAdd: AttendanceSummaryProps['onAddFixed'];
  onPrice: AttendanceSummaryProps['onFixedPrice'];
  onRemove: AttendanceSummaryProps['onRemoveFixed'];
}

// Amounts that have nothing to do with the days (a monthly fee, a trip, books…): a label, a level and an amount.
function FixedSection({ kid, items, levels, defaultLevel, onAdd, onPrice, onRemove }: FixedSectionProps) {
  const { label: nameOf } = useFamilyLabels();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [level, setLevel] = useState(defaultLevel);
  const [amount, setAmount] = useState('');

  const value = parseFloat(amount.replace(',', '.'));
  const canAdd = Number.isFinite(value) && value > 0;
  const close = () => {
    setAdding(false);
    setLabel('');
    setAmount('');
  };
  const add = () => {
    if (!canAdd) return;
    onAdd(kid, level, label, value);
    close();
  };

  return (
    <View style={styles.fixed}>
      <Text style={styles.fixedTitle}>Çmime fikse (pa lidhje me ditët)</Text>

      {items.map((item) => (
        <View key={item.id} style={styles.fixedRow}>
          <View style={styles.fixedText}>
            <Text style={styles.fixedName} numberOfLines={1}>
              {item.note || item.name}
            </Text>
            {item.note ? <Text style={styles.fixedLevel}>{item.name}</Text> : null}
          </View>
          <NumberBox
            value={item.price != null ? String(item.price) : ''}
            placeholder="Çmimi"
            width={86}
            label={`Çmimi fiks, ${nameOf(kid)} ${item.note || item.name}`}
            sanitize={sanitizeQuantityInput}
            onCommit={(text) => onPrice(item.id, text)}
          />
          <Text style={styles.unit}>Lekë</Text>
          <Pressable
            onPress={() => onRemove(item.id)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Hiq çmimin fiks ${item.note || item.name} të ${nameOf(kid)}`}
            style={({ pressed }) => [styles.trash, pressed && styles.stepPressed]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        </View>
      ))}

      {adding ? (
        <View style={styles.form}>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Emërtimi (opsionale), p.sh. Tarifa mujore"
            placeholderTextColor={colors.textMuted}
            style={styles.formInput}
            maxLength={60}
            accessibilityLabel={`Emërtimi i çmimit fiks të ${nameOf(kid)}`}
          />
          <View style={styles.levels}>
            {levels.map((entry) => {
              const selected = entry === level;
              return (
                <Pressable
                  key={entry}
                  onPress={() => setLevel(entry)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  style={[styles.level, selected && styles.levelSelected]}
                >
                  <Text style={[styles.levelText, selected && styles.levelTextSelected]}>{entry}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.formRow}>
            <NumberBox
              value={amount}
              placeholder="Shuma"
              width={110}
              label={`Shuma e çmimit fiks të ${nameOf(kid)}`}
              sanitize={sanitizeQuantityInput}
              onCommit={setAmount}
            />
            <Text style={styles.unit}>Lekë</Text>
            <View style={styles.formButtons}>
              <Pressable onPress={close} accessibilityRole="button" style={styles.cancel}>
                <Text style={styles.cancelText}>Anulo</Text>
              </Pressable>
              <Pressable
                onPress={add}
                disabled={!canAdd}
                accessibilityRole="button"
                style={[styles.addFixed, !canAdd && styles.stepDisabled]}
              >
                <Text style={styles.addFixedText}>Shto</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            setLevel(defaultLevel);
            setAdding(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Shto çmim fiks për ${nameOf(kid)}`}
          style={({ pressed }) => [styles.sync, pressed && styles.stepPressed]}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.syncText}>Shto çmim fiks</Text>
        </Pressable>
      )}
    </View>
  );
}

interface PlaceRowProps {
  kid: string;
  row: PlaceDays;
  place: PlaceInfo;
  draft: string;
  suggested: number | null;
  onDays: AttendanceSummaryProps['onDays'];
  onPrice: AttendanceSummaryProps['onPrice'];
}

// One place of one child: how many days are paid, what a day costs, and what that makes. The days can be changed here
// directly (a number, or one by one with the steppers) without marking each of them on the calendar.
function PlaceRow({ kid, row, place, draft, suggested, onDays, onPrice }: PlaceRowProps) {
  const { label: nameOf } = useFamilyLabels();
  const paid = row.place;
  const priceValue = row.item ? (row.price != null ? String(row.price) : '') : draft;
  return (
    <View style={styles.placeRow}>
      <View style={styles.placeTop}>
        <View style={styles.placeName}>
          <View style={[styles.placeDot, { backgroundColor: place.color }]} />
          <Text style={styles.placeText}>{place.label}</Text>
        </View>
        <Text style={[styles.amount, row.amount === 0 && styles.amountZero]}>{formatPrice(row.amount)}</Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Ditë</Text>
          <View style={styles.fieldRow}>
            <Stepper icon="remove" label={`Një ditë më pak, ${nameOf(kid)} ${place.label}`} disabled={row.days <= 0} onPress={() => onDays(kid, paid, row.days - 1)} />
            <NumberBox
              value={String(row.days)}
              width={54}
              label={`Ditët e ${nameOf(kid)} në ${place.label}`}
              sanitize={sanitizeDays}
              onCommit={(text) => {
                const days = parseInt(text, 10);
                if (Number.isFinite(days)) onDays(kid, paid, days);
              }}
            />
            <Stepper icon="add" label={`Një ditë më shumë, ${nameOf(kid)} ${place.label}`} onPress={() => onDays(kid, paid, row.days + 1)} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Çmimi për ditë</Text>
          <View style={styles.fieldRow}>
            <NumberBox
              value={priceValue}
              placeholder={suggested != null ? String(suggested) : 'Çmimi'}
              width={86}
              label={`Çmimi i një dite, ${nameOf(kid)} ${place.label}`}
              sanitize={sanitizeQuantityInput}
              onCommit={(text) => onPrice(kid, paid, text)}
            />
            <Text style={styles.unit}>Lekë</Text>
          </View>
        </View>
      </View>

      {row.marked > 0 && row.marked !== row.days && (
        <Pressable
          onPress={() => onDays(kid, paid, row.marked)}
          accessibilityRole="button"
          accessibilityLabel={`Përdor ${row.marked} ditët e kalendarit`}
          style={({ pressed }) => [styles.sync, pressed && styles.stepPressed]}
        >
          <Ionicons name="calendar-outline" size={14} color={colors.primaryDark} />
          <Text style={styles.syncText}>
            Kalendari ka {row.marked} ditë · përdore
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// The days and money of each child, and of both together. Everything here is also what the list of the category shows.
export function AttendanceSummary({
  kids,
  summary,
  places,
  drafts,
  suggestedPrice,
  onDays,
  onPrice,
  levels,
  onAddFixed,
  onFixedPrice,
  onRemoveFixed,
}: AttendanceSummaryProps) {
  const { label: nameOf, initial } = useFamilyLabels();
  const totalDays = summary.reduce((sum, kid) => sum + kid.days, 0);
  const totalAmount = summary.reduce((sum, kid) => sum + kid.amount, 0);

  return (
    <View style={styles.wrap}>
      {summary.map((entry) => {
        const info = kids.find((kid) => kid.name === entry.kid);
        const empty = entry.places.length === 0 && entry.sick.length === 0 && entry.fixed.length === 0;
        return (
          <View key={entry.kid} style={styles.kid}>
            <View style={styles.kidHeader}>
              <View style={[styles.avatar, { backgroundColor: info?.color ?? colors.textMuted }]}>
                <Text style={styles.avatarText}>{initial(entry.kid)}</Text>
              </View>
              <Text style={styles.kidName}>{nameOf(entry.kid)}</Text>
              <Text style={styles.kidTotal}>
                {entry.days} ditë · {formatPrice(entry.amount)}
              </Text>
            </View>

            {entry.places.map((row) => {
              const place = places.find((candidate) => candidate.value === row.place);
              return place ? (
                <PlaceRow
                  key={row.place}
                  kid={entry.kid}
                  row={row}
                  place={place}
                  draft={drafts[`${entry.kid}|${row.place}`] ?? ''}
                  suggested={suggestedPrice(entry.kid, row.place)}
                  onDays={onDays}
                  onPrice={onPrice}
                />
              ) : null;
            })}

            {entry.sick.length > 0 && (
              <View style={styles.sick}>
                <Ionicons name="thermometer" size={16} color={SICK_COLOR} />
                <Text style={styles.sickText}>
                  <Text style={styles.sickCount}>
                    Sëmurë: {entry.sick.length} ditë
                  </Text>
                  {'  '}
                  {describeDays(entry.sick)}
                </Text>
              </View>
            )}

            {empty && <Text style={styles.hint}>Zgjidh më sipër ku shkon {nameOf(entry.kid)}, pastaj shëno ditët.</Text>}

            <FixedSection
              kid={entry.kid}
              items={entry.fixed}
              levels={levels}
              defaultLevel={entry.places[0]?.place ?? levels[0] ?? ''}
              onAdd={onAddFixed}
              onPrice={onFixedPrice}
              onRemove={onRemoveFixed}
            />
          </View>
        );
      })}

      <View style={styles.total}>
        <View>
          <Text style={styles.totalLabel}>Gjithsej</Text>
          <Text style={styles.totalDays}>
            {totalDays} ditë
          </Text>
        </View>
        <Text style={styles.totalAmount}>{formatPrice(totalAmount)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  kid: { gap: spacing.sm },
  kidHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  kidName: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  kidTotal: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  placeRow: {
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
  },
  placeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  placeName: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  placeDot: { width: 10, height: 10, borderRadius: 5 },
  placeText: { fontSize: 15, fontWeight: '700', color: colors.text },
  amount: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  amountZero: { color: colors.textMuted },
  controls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  field: { gap: 3 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unit: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  box: {
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: 0,
    paddingHorizontal: spacing.xs,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: { opacity: 0.35 },
  stepPressed: { opacity: 0.6 },
  sync: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  syncText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  sick: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#E6F6EC',
    borderRadius: radii.md,
    padding: spacing.sm + 2,
  },
  sickText: { flex: 1, fontSize: 13, color: colors.textMuted },
  sickCount: { fontWeight: '800', color: SICK_COLOR },
  hint: { fontSize: 13, color: colors.textMuted },
  fixed: { gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm },
  fixedTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  fixedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fixedText: { flex: 1 },
  fixedName: { fontSize: 14, fontWeight: '700', color: colors.text },
  fixedLevel: { fontSize: 11, color: colors.textMuted },
  trash: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  form: { gap: spacing.sm, backgroundColor: colors.background, borderRadius: radii.md, padding: spacing.sm + 2 },
  formInput: {
    height: 38,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  level: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  levelSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  levelText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  levelTextSelected: { color: colors.primaryDark, fontWeight: '800' },
  formRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  formButtons: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  cancel: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radii.pill },
  cancelText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  addFixed: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.primary },
  addFixedText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  totalLabel: { fontSize: 15, fontWeight: '800', color: colors.primaryDark },
  totalDays: { fontSize: 12, color: colors.primaryDark },
  totalAmount: { fontSize: 22, fontWeight: '800', color: colors.primaryDark },
});
