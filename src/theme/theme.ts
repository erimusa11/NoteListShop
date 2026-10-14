import { Platform, type ViewStyle } from 'react-native';

export const colors = {
  primary: '#FF7F00',
  primaryDark: '#E06A00',
  primaryLight: '#FFE4C7',
  background: '#FFF8F2',
  card: '#FFFFFF',
  text: '#231F20',
  textMuted: '#8A7E76',
  success: '#2FA96B',
  successLight: '#E3F6EC',
  danger: '#E2574C',
  border: '#F0E3D8',
};

/** The two halves of the app icon: the peach of the shopping side and the sage green of the notes side. */
export const brand = { peach: '#FFDFBD', sage: '#7BA596', sageDark: '#3F6B5C', sageLight: '#E1EEE9' };

export const radii ={ sm: 10, md: 16, lg: 24, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

// The web no longer takes the shadow* props (it warns about each one); there the same shadow is a boxShadow.
export const shadow: ViewStyle = Platform.select<ViewStyle>({
  web: { boxShadow: '0px 4px 10px rgba(35, 31, 32, 0.08)' },
  default: {
    shadowColor: '#231F20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
});

/** A soft shadow in the given color (a `#RRGGBB` one), like the lifted tab's. */
export function coloredShadow(color: string, opacity: number, radius: number, offsetY: number, elevation: number): ViewStyle {
  return Platform.select<ViewStyle>({
    web: { boxShadow: `0px ${offsetY}px ${radius}px ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` },
    default: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY },
      elevation,
    },
  });
}
