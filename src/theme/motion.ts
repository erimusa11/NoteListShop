import { Keyframe, ReduceMotion } from 'react-native-reanimated';

// Overshoot is authored with explicit linear stops (no per-keyframe easing) so native and web
// render identically. Build a fresh Keyframe per use: Reanimated web mutates definitions in place.
export const makeSlap = () =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: -14 }, { scale: 1.2 }, { rotate: '-3deg' }] },
    45: { opacity: 1, transform: [{ translateY: 0 }, { scale: 0.95 }, { rotate: '0.8deg' }] },
    75: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1.03 }, { rotate: '-0.3deg' }] },
    100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }, { rotate: '0deg' }] },
  } as any)
    .duration(320)
    .reduceMotion(ReduceMotion.System);

export const dealIn = (i: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 26 }, { rotate: i % 2 ? '2.5deg' : '-2.5deg' }, { scale: 0.96 }] },
    60: { opacity: 1, transform: [{ translateY: -5 }, { rotate: i % 2 ? '-0.8deg' : '0.8deg' }, { scale: 1.01 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }, { rotate: '0deg' }, { scale: 1 }] },
  } as any)
    .duration(380)
    .delay(Math.min(i, 6) * 45)
    .reduceMotion(ReduceMotion.System);

export const STAMP_MS = 110;
export const TEAR = { fly: 210, collapseDelay: 140, collapse: 200 };
export const SUCK = { windup: 60, fly: 170, collapseDelay: 170, collapse: 180 };
