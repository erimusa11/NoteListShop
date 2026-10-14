import { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

// Holding an item this long asks whether to delete it; a whole list needs a little longer, since it holds many.
export const HOLD_ITEM_TO_DELETE_MS = 1500;
export const HOLD_LIST_TO_DELETE_MS = 2200;
// A thin red line fills along the bottom of the card while it is held, but only after a moment, so a tap shows nothing.
const HOLD_SHOWS_AFTER_MS = 350;

/**
 * For a card that is deleted by holding it: put `holdStyle` on the red line, `begin` / `end` on the press in / out of the
 * card, and the same `ms` as the `delayLongPress` of the card that asks to delete.
 */
export function useHoldToDelete(ms: number = HOLD_LIST_TO_DELETE_MS) {
  const hold = useSharedValue(0);
  const holdStyle = useAnimatedStyle(() => ({ width: `${hold.value * 100}%` }) as any);

  const begin = () => {
    hold.value = withDelay(HOLD_SHOWS_AFTER_MS, withTiming(1, { duration: ms - HOLD_SHOWS_AFTER_MS, easing: Easing.linear }));
  };
  const end = () => {
    hold.value = withTiming(0, { duration: 150 });
  };

  return { holdStyle, begin, end };
}
