import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { TAB_SLIDE, TAB_SLIDE_IN_EASING, TAB_SLIDE_OUT_EASING } from '@/theme/motion';

// Swiping sideways opens the neighbouring tab. It starts after this much sideways movement, is dropped when the finger
// goes up or down first (that is the list scrolling), and counts when it went far or fast enough.
const SWIPE_START_X = 24;
const SWIPE_CANCEL_Y = 14;
const SWIPE_MIN_DISTANCE = 50;
const SWIPE_MIN_VELOCITY = 600;

// On the web a mouse (or finger) that goes down on a card and up on the same card still sends it a click after the swipe, which
// would open the card. The first click right after a swipe is stopped before it reaches anything.
function swallowNextClick() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const stop = (event: Event) => {
    event.stopPropagation();
    event.preventDefault();
  };
  window.addEventListener('click', stop, { capture: true, once: true });
  setTimeout(() => window.removeEventListener('click', stop, true), 400);
}

/**
 * Swipe left for the next tab of `order`, right for the previous one; nothing happens past either end.
 * The lists follow the finger, slide off the screen the way it went, and the next tab slides in from the other side.
 * Only the position is animated: a see-through page makes the shadow of every card show as a gray box on Android.
 * Put `gesture` on a GestureDetector and `slideStyle` on the animated view that holds the tabs; `onSelect` is called
 * when the old tab has slid out, to show the new one.
 * Past either end, `onEdge` (when given) is called with the direction (1: left swipe, -1: right swipe), so tabs inside a
 * page can hand the swipe over to the pages around it. `go` does the same slide as a swipe, from code.
 */
export function useTabSwipe<T extends string>(
  order: T[],
  current: T,
  onSelect: (next: T) => void,
  onEdge?: (dir: number) => void,
) {
  const reduced = useReducedMotion();
  const { width: screenW } = useWindowDimensions();
  const slideX = useSharedValue(0);
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: slideX.value }] }));
  // Set when the old tab has slid out and the next one was swapped in: the side it slides in from (1: from the right,
  // -1: from the left, 0: no animation). A new object every time, so the effect below always runs once the tab is on screen.
  const [slideIn, setSlideIn] = useState<{ dir: number } | null>(null);
  const swapTab = useCallback(
    (next: T, dir: number) => {
      onSelect(next);
      setSlideIn({ dir });
    },
    [onSelect],
  );
  useEffect(() => {
    if (!slideIn) return;
    if (slideIn.dir === 0) {
      slideX.set(0);
      return;
    }
    slideX.set(slideIn.dir * screenW);
    slideX.set(withTiming(0, { duration: TAB_SLIDE.inMs, easing: TAB_SLIDE_IN_EASING }));
  }, [slideIn, slideX, screenW]);

  // Slides to the neighbouring tab the way a swipe does (dir 1: the next one, -1: the previous one).
  const go = useCallback(
    (dir: number) => {
      const next = order[order.indexOf(current) + dir];
      if (next === undefined) return;
      if (reduced) {
        swapTab(next, 0);
        return;
      }
      slideX.set(
        withTiming(-dir * screenW, { duration: TAB_SLIDE.outMs, easing: TAB_SLIDE_OUT_EASING }, (done) => {
          if (done) scheduleOnRN(swapTab, next, dir);
        }),
      );
    },
    [order, current, reduced, swapTab, slideX, screenW],
  );

  const gesture = useMemo(() => {
    const index = order.indexOf(current);
    return Gesture.Pan()
      .activeOffsetX([-SWIPE_START_X, SWIPE_START_X])
      .failOffsetY([-SWIPE_CANCEL_Y, SWIPE_CANCEL_Y])
      .onStart(() => {
        scheduleOnRN(swallowNextClick);
      })
      .onUpdate((e) => {
        if (reduced) return;
        const hasNeighbour = order[index + (e.translationX < 0 ? 1 : -1)] !== undefined;
        slideX.set(e.translationX * (hasNeighbour ? TAB_SLIDE.pull : TAB_SLIDE.edgePull));
      })
      .onEnd((e, success) => {
        const dir = e.translationX < 0 ? 1 : -1;
        const next = order[index + dir];
        const far = Math.abs(e.translationX) >= SWIPE_MIN_DISTANCE || Math.abs(e.velocityX) >= SWIPE_MIN_VELOCITY;
        if (success && far && next === undefined && onEdge) {
          // Nothing further in this page: the page around it takes the swipe, and this one settles back.
          slideX.set(withSpring(0, TAB_SLIDE.spring));
          scheduleOnRN(onEdge, dir);
          return;
        }
        if (!success || !far || next === undefined) {
          slideX.set(withSpring(0, TAB_SLIDE.spring));
          return;
        }
        if (reduced) {
          scheduleOnRN(swapTab, next, 0);
          return;
        }
        slideX.set(
          withTiming(-dir * screenW, { duration: TAB_SLIDE.outMs, easing: TAB_SLIDE_OUT_EASING }, (done) => {
            if (done) scheduleOnRN(swapTab, next, dir);
          }),
        );
      });
  }, [order, current, reduced, swapTab, slideX, screenW, onEdge]);

  return { gesture, slideStyle, go };
}
