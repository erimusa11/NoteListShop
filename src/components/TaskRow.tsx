import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, radii, shadow, spacing } from '@/theme/theme';
import type { Task } from '@/types/models';
import { formatDateAlbanian } from '@/utils/dates';
import { priorityInfo } from '@/utils/priority';

interface TaskRowProps {
  task: Task;
  /** Checks the task off, or brings a done one back. */
  onToggle: (id: string) => void;
  /** Opens the task to change it. */
  onPress: (task: Task) => void;
  /** Asks to delete the task. */
  onDelete: (task: Task) => void;
}

// Checking a task off (or bringing it back): the check pops and a ring spreads, the row waits a moment so that it is seen,
// slides off to the side, and the gap closes; only then does the task move to the other tab. Real milliseconds, not the
// dial of motion.ts, because this one is meant to be seen. It only runs on the row that was tapped, on the UI thread.
const POP_MS = 200;
const RING_MS = 300;
const HOLD_MS = 260;
const SLIDE_MS = 220;
const COLLAPSE_AT_MS = HOLD_MS + 150;
const COLLAPSE_MS = 180;

// The stripe on the left and the flag on the right carry the importance, so the order of the list can be read at a glance.
export function TaskRow({ task, onToggle, onPress, onDelete }: TaskRowProps) {
  const reduced = useReducedMotion();
  const level = priorityInfo(task.importance);
  // From the moment of the tap the row already looks like what it is about to become.
  const [animating, setAnimating] = useState(false);
  const showDone = animating ? !task.done : task.done;
  const accent = showDone ? colors.border : level.color;
  const ringColor = showDone ? colors.success : level.color;
  // Checking slides the row to the right, bringing a done one back slides it to the left.
  const dir = task.done ? -1 : 1;

  const scale = useSharedValue(1);
  const ring = useSharedValue(1);
  const slide = useSharedValue(0);
  const collapse = useSharedValue(0);
  const fullH = useSharedValue(0);
  const rowW = useSharedValue(360);
  const busy = useRef(false);
  // Set from the tap until the task has moved. If the row goes away in between (another tab was opened), the move still happens.
  const pending = useRef(false);

  const finish = useCallback(() => {
    if (!pending.current) return;
    pending.current = false;
    onToggle(task.id);
  }, [onToggle, task.id]);
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });
  useEffect(() => () => finishRef.current(), []);

  const handleToggle = () => {
    if (busy.current) return;
    busy.current = true;
    pending.current = true;
    if (reduced) {
      finish();
      return;
    }
    setAnimating(true);
    scale.set(0.5);
    scale.set(withTiming(1, { duration: POP_MS, easing: Easing.out(Easing.back(2.4)) }));
    ring.set(0);
    ring.set(withTiming(1, { duration: RING_MS, easing: Easing.out(Easing.cubic) }));
    slide.set(withDelay(HOLD_MS, withTiming(1, { duration: SLIDE_MS, easing: Easing.in(Easing.cubic) })));
    collapse.set(
      withDelay(
        COLLAPSE_AT_MS,
        withTiming(1, { duration: COLLAPSE_MS, easing: Easing.inOut(Easing.quad) }, (done) => {
          if (done) scheduleOnRN(finish);
        }),
      ),
    );
  };

  // The gap closes by height; the row is only clipped while that happens, so its shadow is never cut off the rest of the time.
  const slotStyle = useAnimatedStyle(() =>
    collapse.get() === 0 ? {} : { height: fullH.get() * (1 - collapse.get()), overflow: 'hidden' },
  );
  // Only the position changes, never the opacity: on Android a see-through card turns its shadow into a gray box.
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dir * rowW.get() * slide.get() }] }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.get(), [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(ring.get(), [0, 1], [1, 2]) }],
  }));

  return (
    <Animated.View
      style={slotStyle}
      onLayout={(e) => {
        if (busy.current) return;
        fullH.set(e.nativeEvent.layout.height);
        rowW.set(e.nativeEvent.layout.width);
      }}
    >
      <Animated.View style={cardStyle}>
        <Pressable
          onPress={() => {
            if (!busy.current) onPress(task);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${task.title}. ${task.done ? 'E kryer' : level.label}. Ndrysho`}
          style={({ pressed }) => [styles.card, shadow, { borderLeftColor: accent }, pressed && styles.pressed]}
        >
          <Pressable
            onPress={handleToggle}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.done }}
            accessibilityLabel={task.done ? "Kthe te detyrat për t'u bërë" : 'Shëno si të kryer'}
            style={styles.check}
          >
            <Animated.View style={popStyle}>
              <Ionicons
                name={showDone ? 'checkmark-circle' : 'ellipse-outline'}
                size={28}
                color={showDone ? colors.success : level.color}
              />
            </Animated.View>
            <View style={styles.layer} pointerEvents="none">
              <Animated.View style={[styles.ring, { borderColor: ringColor }, ringStyle]} />
            </View>
          </Pressable>

          <View style={styles.text}>
            <Text style={[styles.title, showDone && styles.titleDone]} numberOfLines={2}>
              {task.title}
            </Text>
            {task.description ? (
              <Text style={styles.description} numberOfLines={3}>
                {task.description}
              </Text>
            ) : null}
            {task.done && task.doneAt != null && <Text style={styles.doneAt}>Kryer më {formatDateAlbanian(task.doneAt)}</Text>}
          </View>

          {!task.done && (
            <View style={[styles.badge, { backgroundColor: level.color + '22' }]}>
              <Ionicons name="flag" size={12} color={level.color} />
              <Text style={[styles.badgeText, { color: level.color }]}>{task.importance}</Text>
            </View>
          )}

          <Pressable
            onPress={() => {
              if (!busy.current) onDelete(task);
            }}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Fshi detyrën ${task.title}`}
            style={({ pressed }) => [styles.trash, pressed && styles.trashPressed]}
          >
            <Ionicons name="trash-outline" size={19} color={colors.textMuted} />
          </Pressable>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderLeftWidth: 4,
    paddingVertical: spacing.md,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  check: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '600', color: colors.text },
  titleDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  description: { fontSize: 13, color: colors.textMuted },
  doneAt: { fontSize: 11, color: colors.textMuted },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '800' },
  trash: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  trashPressed: { backgroundColor: '#FDE6E3' },
});
