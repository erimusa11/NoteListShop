import type { ViewStyle } from 'react-native';

import { coloredShadow } from '@/theme/theme';

// The colors of the Note List Shop page, all in one place so the whole page can be tuned together. Four tones, each with the
// same five parts: green is the normal list, orange the shopping list (and Ushqime), violet Detergjente, blue the total.

export interface Tone {
  /** The strong fill: the + button, count badges (white digit), the progress bar, the edge of the open tab, rings and icons. */
  main: string;
  /** Text and icons of the tone on white or on its own tints. */
  dark: string;
  /** Chips, pills and the track behind a progress bar. */
  light: string;
  /** A barely-there tint: the sheet under the open tab and the open tab itself. */
  soft: string;
  /** The tab while it is closed. */
  idle: string;
}

export const tones = {
  green: { main: '#0EA257', dark: '#14744D', light: '#D6F8E2', soft: '#ECFCF2', idle: '#DCF2E4' },
  orange: { main: '#E06B0E', dark: '#A04915', light: '#FFE5CD', soft: '#FFF0E1', idle: '#FDE7D3' },
  violet: { main: '#936ED2', dark: '#6A4BAC', light: '#F0E8FF', soft: '#F8F5FF', idle: '#EEE7FA' },
  blue: { main: '#378FF3', dark: '#2164A6', light: '#DCF0FF', soft: '#EFF8FF', idle: '#DCEEFB' },
} satisfies Record<string, Tone>;

/** A checked item: the filled check, the double tick, the tag "Dërguar te lista", and the pill behind a checked amount. */
export const doneTone = { main: '#0EA257', light: '#D6F8E2' };

/** The five priority levels of a normal list, from 1 (normal) to 5 (urgent). */
export const priorityColors = ['#7E8791', '#458EBB', '#C68704', '#CA640B', '#CF4047'] as const;

/** The tone of each part of a shopping list, and of the total of both. */
export const partTones = { ushqime: tones.orange, detergjente: tones.violet, total: tones.blue };

/** The soft shadow of a card on the sheet of a tone: tinted with the tone instead of grey, so it sits in the color of the sheet. */
export const toneShadow = (tone: Tone): ViewStyle => coloredShadow(tone.dark, 0.12, 12, 4, 3);

/** The glow under a round button of a tone. */
export const toneGlow = (tone: Tone): ViewStyle => coloredShadow(tone.main, 0.38, 12, 6, 6);
