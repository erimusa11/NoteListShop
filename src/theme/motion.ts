import { Easing, Keyframe, ReduceMotion } from 'react-native-reanimated';

// One dial for every animation in the app. 1 plays them at the length they were authored with;
// 0.25 plays them at a quarter of it, so nothing waits on an animation. Raise it to bring them back.
export const DURATION_SCALE = 0.25;

// `ms` and `spring` are worklets because animation callbacks (the check stamp's thud)
// call them on the UI thread, where a plain function throws and takes the app down.

/** A duration or delay in milliseconds, shortened by the dial. */
export function ms(value: number) {
  'worklet';
  return Math.round(value * DURATION_SCALE);
}

/** A spring with the same shape (overshoot, bounce) that plays `DURATION_SCALE` times as long. */
export function spring(config: { damping: number; stiffness: number; mass?: number }) {
  'worklet';
  return {
    ...config,
    damping: config.damping / DURATION_SCALE,
    stiffness: config.stiffness / DURATION_SCALE ** 2,
  };
}

// Overshoot is authored with explicit linear stops (no per-keyframe easing) so native and web
// render identically. Build a fresh Keyframe per use: Reanimated web mutates definitions in place.
export const dealIn = (i: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 26 }, { rotate: i % 2 ? '2.5deg' : '-2.5deg' }, { scale: 0.96 }] },
    60: { opacity: 1, transform: [{ translateY: -5 }, { rotate: i % 2 ? '-0.8deg' : '0.8deg' }, { scale: 1.01 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }, { rotate: '0deg' }, { scale: 1 }] },
  } as any)
    .duration(ms(220))
    .delay(ms(Math.min(i, 4) * 25))
    .reduceMotion(ReduceMotion.System);

// Switching category by swiping the lists sideways: they follow the finger, slide off the screen the way it went, and
// the next tab slides in from the other side. Only the position changes, never the opacity: on Android a see-through
// page turns the shadow (elevation) of every card into a gray box. Real milliseconds, not run through the dial above:
// the dial makes everything near-instant, and this one is meant to be seen.
export const TAB_SLIDE = {
  /** How much of the finger's movement the lists follow (the rest is resistance); much less at the first and last tab. */
  pull: 0.9,
  edgePull: 0.18,
  outMs: 140,
  inMs: 280,
  /** Back to place when the swipe was too short; no overshoot, so no gap opens at the edge. */
  spring: { damping: 26, stiffness: 260, mass: 0.8, overshootClamping: true },
};
export const TAB_SLIDE_OUT_EASING = Easing.in(Easing.quad);
export const TAB_SLIDE_IN_EASING = Easing.out(Easing.cubic);

export const STAMP_MS = ms(80);
export const TEAR = { fly: ms(130), collapseDelay: ms(80), collapse: ms(120) };
export const SUCK = { windup: ms(40), fly: ms(110), collapseDelay: ms(110), collapse: ms(110) };
