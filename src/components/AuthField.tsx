import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, radii, spacing } from '@/theme/theme';

interface AuthFieldProps extends TextInputProps {
  label: string;
  password?: boolean;
}

export function AuthField({ label, password = false, style, ...rest }: AuthFieldProps) {
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          {...rest}
          secureTextEntry={password && hidden}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
        />
        {password && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Shfaq fjalëkalimin' : 'Fshih fjalëkalimin'}
            style={styles.eye}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 4,
    color: colors.text,
    fontSize: 16,
  },
  eye: { paddingHorizontal: spacing.md - 2 },
});
