import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { PrioritySelector } from '@/components/PrioritySelector';
import { useFamilyLabels } from '@/context/FamilyLabelsContext';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import { DEFAULT_QUANTITY, normalizeQuantity, parseQuantity, sanitizeQuantityInput } from '@/utils/quantity';
import { pickSuggestions, type Suggestion } from '@/utils/suggestions';
import { formatNumber } from '@/utils/totals';

/** What a calendar has for a child at a place in one month. */
export interface CalendarLine {
  level: string;
  person: string;
  days: number;
  /** What one day costs; null while it is not known. */
  price: number | null;
  /** Days times the price; null without a price. */
  amount: number | null;
}

/** The months filled in on a calendar (Kopesht & Shkolle); one of them can be added to the list in a single step. */
export interface CalendarChoice {
  months: { key: string; label: string; days: number }[];
  /** Everything the calendar has in the month: one line per child and place. */
  linesFor: (monthKey: string) => CalendarLine[];
}

interface AddItemButtonProps {
  onAdd: (name: string, quantity: string, price: number | null, priority: number, note?: string, second?: string) => void;
  showPriority?: boolean;
  showQuantity?: boolean;
  title?: string;
  suggestions?: Suggestion[];
  namePlaceholder?: string;
  /** Choose the name from these (a select) instead of typing it, e.g. the kind of fuel. */
  nameOptions?: string[];
  /** Heading above the choices (default "Lloji"). */
  optionsLabel?: string;
  /** One more choice after `nameOptions` with this label; picking it shows a field to type any name. */
  otherOption?: string;
  /** Under the choices, ask for a short optional text (what it was for). Not asked for the "other" choice, whose typed name is that text. */
  showNote?: boolean;
  /** A second select that has to be answered before adding (who it is for, e.g. Drion or Alois; the kind of income). */
  secondOptions?: string[];
  /** Heading above the `secondOptions` (default "Për kë"). */
  secondLabel?: string;
  priceLabel?: string;
  submitLabel?: string;
  requirePrice?: boolean;
  /** Only the amount is needed: the name becomes an optional description, and this is the name when none is typed. */
  defaultName?: string;
  /** Months that were filled in on a calendar: picking one (with a level and a person) fills in the amount from it. */
  calendar?: CalendarChoice;
}

export function AddItemButton({
  onAdd,
  showQuantity = true,
  title = 'Shto artikull',
  suggestions = [],
  namePlaceholder = 'P.sh. Qumësht, Bukë…',
  nameOptions,
  optionsLabel = 'Lloji',
  otherOption,
  showNote = false,
  secondOptions,
  secondLabel = 'Për kë',
  priceLabel = 'Çmimi (opsionale)',
  submitLabel = 'Shto në listë',
  requirePrice = false,
  defaultName,
  showPriority = true,
  calendar,
}: AddItemButtonProps) {
  const { label, nameFrom } = useFamilyLabels();
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(DEFAULT_QUANTITY);
  const [price, setPrice] = useState('');
  const [priority, setPriority] = useState(1);
  // The "other" choice is picked: `name` is then whatever is typed instead of one of `nameOptions`.
  const [other, setOther] = useState(false);
  const [note, setNote] = useState('');
  const [second, setSecond] = useState('');
  // The month of the calendar that is added as a whole, if one is picked: the rest of the form is then not needed.
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const monthLines = useMemo(() => (calendar && monthKey ? calendar.linesFor(monthKey) : []), [calendar, monthKey]);
  const monthLabel = calendar?.months.find((entry) => entry.key === monthKey)?.label ?? '';

  const close = () => {
    setMonthKey(null);
    setVisible(false);
    setName('');
    setOther(false);
    setNote('');
    setSecond('');
    setQuantity(DEFAULT_QUANTITY);
    setPrice('');
    setPriority(1);
  };

  const priceValue = parseFloat(price.replace(',', '.'));
  const amountOnly = defaultName !== undefined;
  const canSubmit =
    (name.trim().length > 0 || amountOnly) &&
    (!secondOptions || second !== '') &&
    (!(requirePrice || amountOnly) || (Number.isFinite(priceValue) && priceValue > 0));
  const canAdd = monthKey ? monthLines.length > 0 : canSubmit;
  // With choices (Drion, Kia Morning…), `name` is the choice picked and what is typed is the description (`note`), or, with
  // the "other" choice, the name itself. What is suggested follows: before a choice is picked, everything used before;
  // after one, the descriptions used under it; with "other", the names used without a choice.
  const choiceMade = !!nameOptions && !other && name !== '';
  const query = !nameOptions || other ? name : choiceMade ? note : '';
  // A suggestion is added in one tap, so it needs to know its second choice (who it is for, what kind of income): the one
  // picked above, or else the one it was last added with. Until one is picked, only the suggestions that know theirs are offered.
  const usable = useMemo(
    () => (secondOptions && !second ? suggestions.filter((s) => s.person) : suggestions),
    [suggestions, secondOptions, second],
  );
  const shown = useMemo(() => {
    if (!nameOptions) return pickSuggestions(usable, name);
    if (other) return pickSuggestions(usable.filter((s) => !s.group), name);
    if (choiceMade) return pickSuggestions(usable.filter((s) => s.group === name), note);
    return pickSuggestions(usable, '');
  }, [usable, nameOptions, other, choiceMade, name, note]);

  const pick = (s: Suggestion) => {
    // A description goes in as the note under its group; a group alone (Naftë) is just that name.
    const text = s.group && s.group !== s.name ? s.name : undefined;
    onAdd(
      s.group ?? s.name,
      showQuantity ? normalizeQuantity(s.quantity) : '',
      s.price,
      priority,
      text,
      secondOptions ? second || s.person : undefined,
    );
    close();
  };

  // Each child's days at each place of the month become one line, with the amount the calendar comes to.
  const addMonth = () => {
    for (const line of monthLines) {
      const perDay = line.price != null ? ` × ${formatNumber(line.price)}` : '';
      onAdd(line.level, '1', line.amount, 1, `${monthLabel} · ${line.days} ditë${perDay}`, line.person);
    }
    close();
  };

  const submit = () => {
    if (monthKey) {
      addMonth();
      return;
    }
    if (!canSubmit) return;
    const parsedPrice = parseFloat(price.replace(',', '.'));
    onAdd(
      other ? nameFrom(name.trim()) : name.trim() || (defaultName ?? ''),
      showQuantity ? normalizeQuantity(quantity) : '',
      Number.isFinite(parsedPrice) ? parsedPrice : null,
      priority,
      showNote && !other ? note.trim() || undefined : undefined,
      secondOptions ? second : undefined,
    );
    close();
  };

  // Right under the name or its choices, so both selects are answered before the text and the price.
  const secondSelect = secondOptions ? (
    <>
      <Text style={[styles.label, styles.otherLabel]}>{secondLabel}</Text>
      <View style={styles.options} accessibilityRole="radiogroup">
        {secondOptions.map((option) => {
          const selected = second === option;
          return (
            <Pressable
              key={option}
              onPress={() => setSecond(option)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label(option)}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  ) : null;

  // First thing in the form: a month filled in on the calendar. With one picked, Shto adds everything the calendar has in it.
  const calendarSection =
    calendar && calendar.months.length > 0 ? (
      <>
        <Text style={styles.label}>Shto një muaj nga kalendari</Text>
        <View style={styles.options} accessibilityRole="radiogroup">
          {calendar.months.map((entry) => {
            const selected = monthKey === entry.key;
            return (
              <Pressable
                key={entry.key}
                onPress={() => setMonthKey(selected ? null : entry.key)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{entry.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {monthKey && (
          <View style={styles.monthLines}>
            {monthLines.map((line) => (
              <View key={`${line.level}-${line.person}`} style={styles.monthLine}>
                <View style={styles.monthLineText}>
                  <Text style={styles.monthLineName}>
                    {line.level} · {label(line.person)}
                  </Text>
                  <Text style={styles.calendarHint}>
                    {line.days} ditë
                    {line.price != null ? ` × ${formatNumber(line.price)} Lekë` : ' · çmimi i ditës nuk është vendosur në kalendar'}
                  </Text>
                </View>
                <Text style={styles.monthLineAmount}>{line.amount != null ? `${formatNumber(line.amount)} Lekë` : '—'}</Text>
              </View>
            ))}
            {monthLines.length === 0 && <Text style={styles.calendarHint}>Nuk ka ditë të shënuara në këtë muaj.</Text>}
          </View>
        )}
        {!monthKey && <Text style={styles.calendarHint}>ose plotëso formularin më poshtë</Text>}
      </>
    ) : null;

  return (
    <>
      <Pressable onPress={() => setVisible(true)} style={[styles.fab, shadow]} hitSlop={8}>
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </Pressable>

      <BottomSheet visible={visible} onClose={close} title={title}>
        {calendarSection}
        {monthKey ? null : nameOptions ? (
          <>
            <Text style={styles.label}>{optionsLabel}</Text>
            <View style={styles.options} accessibilityRole="radiogroup">
              {[...nameOptions, ...(otherOption ? [otherOption] : [])].map((option) => {
                const isOther = option === otherOption;
                const selected = isOther ? other : !other && name === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setOther(isOther);
                      setName(isOther ? '' : option);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label(option)}</Text>
                  </Pressable>
                );
              })}
            </View>
            {secondSelect}
            {calendarSection}
            {other && (
              <>
                <Text style={[styles.label, styles.otherLabel]}>Emri</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={namePlaceholder}
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoFocus
                  returnKeyType="next"
                />
              </>
            )}
            {showNote && !other && (
              <>
                <Text style={[styles.label, styles.otherLabel]}>Përshkrimi (opsionale)</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder={namePlaceholder}
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  returnKeyType="next"
                />
              </>
            )}
          </>
        ) : (
          <>
            <Text style={styles.label}>{amountOnly ? 'Përshkrimi (opsionale)' : 'Emri'}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={namePlaceholder}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoFocus={!amountOnly}
              returnKeyType="next"
            />
            {secondSelect}
          </>
        )}

        {!monthKey && shown.length > 0 && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsLabel}>{query.trim() ? 'Sugjerime' : 'Më të përdorurat'}</Text>
            <View style={styles.chips}>
              {shown.map((s) => (
                <Pressable
                  key={s.key}
                  onPress={() => pick(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`Shto ${nameOptions ? label(s.name) : s.name}`}
                  style={styles.chip}
                >
                  <Ionicons name="add-circle" size={16} color={colors.primary} />
                  <Text style={styles.chipText}>{nameOptions ? label(s.name) : s.name}</Text>
                  {/* Before a choice is picked, say which one the description belongs to. */}
                  {!choiceMade && s.group && s.group !== s.name && <Text style={styles.chipPrice}>{label(s.group)}</Text>}
                  {s.price != null && <Text style={styles.chipPrice}>{formatNumber(s.price)}</Text>}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {monthKey ? null : showQuantity ? (
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Sasia</Text>
              <TextInput
                value={quantity}
                onChangeText={(text) => setQuantity(sanitizeQuantityInput(text))}
                placeholder={DEFAULT_QUANTITY}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{priceLabel}</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="Lekë"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={styles.input}
                onSubmitEditing={submit}
              />
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.label}>{amountOnly ? 'Shuma' : priceLabel}</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="Lekë"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={styles.input}
              autoFocus={amountOnly}
              onSubmitEditing={submit}
            />
          </>
        )}

        {!monthKey && showQuantity && Number.isFinite(priceValue) && parseQuantity(quantity) !== 1 && (
          <Text style={styles.total}>Gjithsej: {formatNumber(priceValue * parseQuantity(quantity))} Lekë</Text>
        )}

        {!monthKey && showPriority && !amountOnly && (
          <View style={styles.priority}>
            <Text style={styles.label}>Rëndësia</Text>
            <PrioritySelector value={priority} onChange={setPriority} />
          </View>
        )}

        <Pressable
          onPress={submit}
          disabled={!canAdd}
          style={[styles.submitButton, !canAdd && styles.submitButtonDisabled]}
        >
          <Text style={styles.submitText}>{monthKey ? `Shto ${monthLabel} në listë` : submitLabel}</Text>
        </Pressable>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 2 },
  input: {
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
  },
  // Each choice is as wide as its name, and the row wraps (the rest of each row is shared out) when they do not all fit,
  // so a long name such as "Hyundai Tucson" stays on one line.
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  otherLabel: { marginTop: spacing.sm },
  option: {
    flexGrow: 1,
    flexBasis: 'auto',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionText: { fontSize: 15, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
  optionTextSelected: { color: colors.primaryDark, fontWeight: '700' },
  suggestions: { gap: 6 },
  suggestionsLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 12,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
  chipPrice: { fontSize: 12, color: colors.textMuted },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  rowItem: { flex: 1 },
  calendarHint: { fontSize: 13, color: colors.textMuted },
  monthLines: { gap: spacing.sm, marginTop: spacing.xs },
  monthLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    padding: spacing.sm + 2,
  },
  monthLineText: { flex: 1 },
  monthLineName: { fontSize: 15, fontWeight: '700', color: colors.text },
  monthLineAmount: { fontSize: 15, fontWeight: '800', color: colors.primaryDark },
  total: { fontSize: 14, fontWeight: '700', color: colors.primaryDark, marginTop: spacing.sm },
  priority: { marginTop: spacing.sm },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
