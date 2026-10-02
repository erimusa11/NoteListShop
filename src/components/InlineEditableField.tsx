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
  prefix?: string;
  suffix?: string;
  textStyle?: StyleProp<TextStyle>;
  align?: 'left' | 'right';
  chip?: boolean;
}

export function InlineEditableField({
  value,
  displayValue,
  placeholder,
  onChange,
  keyboardType = 'default',
  prefix,
  suffix,
  textStyle,
  align = 'left',
  chip = false,
}: InlineEditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  if (editing) {
    return (
      <TextInput
        value={draft}
        onChangeText={setDraft}
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
      }}
      style={[styles.pressable, chip && styles.chip]}
    >
      <View style={align === 'right' ? styles.rowRight : styles.rowLeft}>
        {value ? (
          <Text style={[styles.text, textStyle]} numberOfLines={1}>
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
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  rowRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  text: { color: colors.text },
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
