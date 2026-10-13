import { Ionicons } from '@expo/vector-icons';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadow, spacing } from '@/theme/theme';

/** How long the "Kthe" button stays on screen after something is deleted. */
const UNDO_MS = 7000;

interface UndoValue {
  /** Tells the user something was deleted and, for a few seconds, lets them take it back with `onUndo`. */
  showUndo: (message: string, onUndo: () => void) => void;
}

interface Pending {
  key: number;
  message: string;
  onUndo: () => void;
}

const UndoContext = createContext<UndoValue | null>(null);

export function UndoProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState<Pending | null>(null);
  const counter = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPending(null);
  }, []);

  const showUndo = useCallback(
    (message: string, onUndo: () => void) => {
      if (timer.current) clearTimeout(timer.current);
      counter.current += 1;
      setPending({ key: counter.current, message, onUndo });
      timer.current = setTimeout(dismiss, UNDO_MS);
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo<UndoValue>(() => ({ showUndo }), [showUndo]);

  return (
    <UndoContext.Provider value={value}>
      {children}
      {pending && (
        <Animated.View
          key={pending.key}
          entering={FadeInDown.duration(160)}
          exiting={FadeOutDown.duration(120)}
          style={[styles.wrap, { bottom: spacing.md + insets.bottom }]}
          pointerEvents="box-none"
        >
          <View style={[styles.bar, shadow]} accessibilityLiveRegion="polite">
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={styles.message} numberOfLines={2}>
              {pending.message}
            </Text>
            <Pressable
              onPress={() => {
                const undo = pending.onUndo;
                dismiss();
                undo();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Kthe fshirjen"
              style={styles.button}
            >
              <Text style={styles.buttonText}>Kthe</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </UndoContext.Provider>
  );
}

export function useUndo(): UndoValue {
  const value = useContext(UndoContext);
  if (!value) throw new Error('useUndo must be used inside UndoProvider');
  return value;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.text,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 4,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm + 4,
  },
  message: { flex: 1, fontSize: 14, color: '#FFFFFF' },
  button: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: colors.primary },
  buttonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
