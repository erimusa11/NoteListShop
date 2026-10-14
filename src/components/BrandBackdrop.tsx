import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polygon, Rect } from 'react-native-svg';

import { brand, coloredShadow, colors, radii } from '@/theme/theme';

interface BrandBackdropProps {
  height: number;
  /** Laid over the backdrop, positioned by the caller (chips, a back button…). */
  children?: ReactNode;
}

// The top of a page in the look of the app icon: the same diagonal split (peach for the shopping half, sage green for the notes
// half, a white line between), with a rounded bottom edge. It is shared by the sign-in page, the home page and the profile page.
export function BrandBackdrop({ height, children }: BrandBackdropProps) {
  return (
    <View style={[styles.frame, { height }]}>
      <View style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
          <Rect width="100" height="100" fill={brand.peach} />
          <Polygon points="100,0 100,100 0,100" fill={brand.sage} />
          <Line x1="0" y1="100" x2="100" y2="0" stroke="#FFFFFF" strokeWidth="2.4" />
        </Svg>
      </View>
      {children}
    </View>
  );
}

interface BrandChipProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  text: string;
  textColor?: string;
  /** A slight tilt, like a sticker, e.g. '-5deg'. */
  rotate?: string;
}

// A small white tag that sits on the backdrop, a little tilted.
export function BrandChip({ icon, iconColor, text, textColor = colors.text, rotate = '0deg' }: BrandChipProps) {
  return (
    <View style={[styles.chip, { transform: [{ rotate }] }]}>
      <Ionicons name={icon} size={15} color={iconColor} />
      <Text style={[styles.chipText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
    backgroundColor: brand.peach,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
    ...coloredShadow('#231F20', 0.12, 8, 3, 3),
  },
  chipText: { fontSize: 12, fontWeight: '700' },
});
