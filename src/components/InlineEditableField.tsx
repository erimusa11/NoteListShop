import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextStyle, View } from 'react-native';

import { colors, radii, spacing } from '@/theme/theme';

interface InlineEditableFieldProps {
  value: string;
  displayValue?: string;
  placeholder: string;
  onChange: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
  /** Cleans up the text as it is typed, e.g. to keep only digits. */
  sanitize?: (text: string) => string;
  prefix?: string;
  suffix?: string;
  textStyle?: StyleProp<TextStyle>;
  align?: 'left' | 'right';
  chip?: boolean;
  /** How many lines the text may take before it is cut off with "…". One by default; a longer text goes on to the next line. */
  numberOfLines?: number;
  /** Tells how many lines the shown text really takes, e.g. to know whether a long name went on to a second line. */
  onLineCount?: (lines: number) => void;
  onEditingChange?: (editing: boolean) => void;
}

export function InlineEditableField({
  value,
  displayValue,
  placeholder,
  onChange,
  keyboardType = 'default',
  sanitize,
  prefix,
  suffix,
  textStyle,
  align = 'left',
  chip = false,
  numberOfLines = 1,
  onLineCount,
  onEditingChange,
}:InlineEditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    setEditing(false);
    onEditingChange?.(false);
    if (draft !== value) onChange(draft);
  };

  if (editing) {
    return (
      <TextInput
        value={draft}
        onChangeText={(text) => setDraft(sanitize ? sanitize(text) : text)}
        onBlur={commit}
        onSubmitEditing={commit}
        autoFocus
        keyboardType={keyboardType}
        style={[styles.input, textStyle, align === 'right' && styles.alignRight]}
        placeholderTextColor={colors.textMuted}
      />
    );
  }

  return (
    <Pressable
      onPress={() => {
        setDraft(value);
        setEditing(true);
        onEditingChange?.(true);
      }}
      style={[styles.pressable, chip && styles.chip]}
    >
      <View style={align === 'right' ? styles.rowRight : styles.rowLeft}>
        {value ? (
          <Text
            style={[styles.text, textStyle]}
            numberOfLines={numberOfLines}
            onTextLayout={onLineCount ? (e) => onLineCount(e.nativeEvent.lines.length) : undefined}
          >
            {prefix}
            {displayValue ?? value}
            {suffix}
          </Text>
        ) : (
          <Text style={[styles.placeholder, textStyle, chip && styles.chipPlaceholder]} numberOfLines={1}>
            {placeholder}
          </Text>
        )}
        {chip && <Ionicons name="pencil" size={11} color={colors.textMuted} style={styles.chipIcon} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flexShrink: 1,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  rowRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  // Shrinking lets a long text wrap inside the row instead of pushing past its edge.
  text: { color: colors.text, flexShrink: 1 },
  placeholder: { color: colors.textMuted },
  chip: {
    backgroundColor: colors.background,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipPlaceholder: { color: colors.primaryDark, fontWeight: '600' },
  chipIcon: { marginLeft: 4 },
  input: {
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryLight,
    color: colors.text,
    minWidth: 60,
  },
  alignRight: { textAlign: 'right' },
});
