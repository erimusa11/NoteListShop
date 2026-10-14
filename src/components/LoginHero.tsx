import { Image, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandBackdrop, BrandChip } from '@/components/BrandBackdrop';
import { ms } from '@/theme/motion';
import { brand, colors, shadow } from '@/theme/theme';

const HERO_HEIGHT = 190;
const ICON_SIZE = 124;

// The top of the sign-in page: the backdrop of the app icon, two small tags that hint at what each half is for, and the icon
// itself sitting on the edge.
export function LoginHero() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.frame}>
      <BrandBackdrop height={HERO_HEIGHT + insets.top}>
        {/* The tilt is on the chip inside: a view that has an entering animation cannot also carry a transform of its own. */}
        <Animated.View
          entering={FadeInDown.duration(ms(500)).delay(ms(300))}
          style={[styles.chipSlot, { top: insets.top + 22, left: 18 }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <BrandChip icon="checkmark-circle" iconColor={colors.success} text="Qumësht · 2 copë" rotate="-5deg" />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(ms(500)).delay(ms(420))}
          style={[styles.chipSlot, { bottom: 86, right: 16 }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <BrandChip
            icon="wallet"
            iconColor={brand.sageDark}
            text="Gjithsej 2.450 Lekë"
            textColor={brand.sageDark}
            rotate="4deg"
          />
        </Animated.View>
      </BrandBackdrop>

      <Animated.View entering={ZoomIn.duration(ms(700))} style={[styles.iconWrap, shadow]}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.icon}
          resizeMode="cover"
          accessibilityLabel="Note Shop List"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // On a wide window (the web) the hero keeps the shape it has on a phone instead of stretching across the screen.
  frame: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  iconWrap: {
    alignSelf: 'center',
    marginTop: -ICON_SIZE / 2,
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE * 0.26,
    backgroundColor: '#FFFFFF',
    padding: 4,
  },
  icon: { width: '100%', height: '100%', borderRadius: ICON_SIZE * 0.26 - 4 },
  chipSlot: { position: 'absolute' },
});
