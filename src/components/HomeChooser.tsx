import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, type ImageSourcePropType, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { spring } from '@/theme/motion';
import { colors, radii, shadow, spacing } from '@/theme/theme';
import { formatDateAlbanian } from '@/utils/dates';

export type Section = 'shop' | 'notes';

// How far below its place a card starts before it rises into it.
const RISE_FROM = 48;

interface HomeChooserProps {
  /** The name shown under the greeting: first name and surname. */
  name: string;
  /** The letter in the big round avatar. */
  initial: string;
  /** Demo mode: nothing is saved, and the greeting says so. */
  demo: boolean;
  /** Tapping the avatar opens the profile page. */
  onOpenProfile: () => void;
  onChoose: (section: Section) => void;
}

interface Choice {
  section: Section;
  name: string;
  description: string;
  logo: ImageSourcePropType;
  logoSize: number;
  /** The card's own colors: its background, two soft shapes behind the text, and the button. */
  tint: string;
  shapeA: string;
  shapeB: string;
  accent: string;
}

// Each part of the app has its own look, taken from its logo: the shop is orange like its cart, the to-do list
// is sage, pink and pencil yellow like its notepad.
const CHOICES: Choice[] = [
  {
    section: 'shop',
    name: 'Note Shop List',
    description: 'Listat e blerjeve, raportet dhe qokat',
    logo: require('@/assets/images/logo-mark.png'),
    // The cart has a wide empty margin around it, so it is drawn bigger to look as large as the notepad.
    logoSize: 104,
    tint: '#FFE8CF',
    shapeA: '#FFC98F',
    shapeB: '#FFF4E8',
    accent: colors.primaryDark,
  },
  {
    section: 'notes',
    name: 'Note List Shop',
    description: 'Detyrat e tua, me rëndësi nga 1 deri në 5',
    logo: require('@/assets/images/note-list-icon.png'),
    logoSize: 76,
    tint: '#E4EEE9',
    shapeA: '#F3CDBF',
    shapeB: '#F6E7A6',
    accent: '#5F7F77',
  },
];

// What the app opens on: its two parts, each a big card with its own logo, and the user taps the one to go to.
export function HomeChooser({ name, initial, demo, onOpenProfile, onChoose }: HomeChooserProps) {
  // Read once when the chooser appears; it is built again every time the user comes back to it.
  const [today] = useState(() => formatDateAlbanian(Date.now()));
  // The avatar fills the room above the greeting, a bit smaller on a short screen so the cards still fit.
  const { height } = useWindowDimensions();
  const avatarSize = height < 700 ? 84 : 112;
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Pressable
          onPress={onOpenProfile}
          accessibilityRole="button"
          accessibilityLabel="Profili"
          style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
        >
          <View
            style={[styles.avatar, shadow, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
          >
            <Text style={[styles.avatarText, { fontSize: Math.round(avatarSize * 0.42) }]}>{initial}</Text>
          </View>
          <View style={styles.editBadge}>
            <Ionicons name="pencil" size={13} color="#FFFFFF" />
          </View>
        </Pressable>
        <Text style={styles.greeting}>Mirë se erdhe,</Text>
        <Text style={styles.heroName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
          {name}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={styles.meta}>{today}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>Zgjidh ku do të shkosh</Text>
        </View>
        {demo && (
          <View style={styles.demoPill}>
            <Ionicons name="flask-outline" size={13} color={colors.primaryDark} />
            <Text style={styles.demoText}>Modalitet demo · ndryshimet nuk ruhen</Text>
          </View>
        )}
      </View>

      {CHOICES.map((choice, index) => (
        <ChoiceCard key={choice.section} choice={choice} index={index} onPress={() => onChoose(choice.section)} />
      ))}
    </View>
  );
}

function ChoiceCard({ choice, index, onPress }: { choice: Choice; index: number; onPress: () => void }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  // 1 while the card waits below its place, 0 once it has risen into it.
  const rise = useSharedValue(reduced ? 0 : 1);
  // The cards rise into place one after the other. Only the position is animated, never the opacity: on Android a
  // see-through card turns its shadow into a gray box (see TAB_SLIDE). It is a plain transform on purpose: a layout
  // `entering` animation takes the card out of the layout on web (position: absolute) and it ends up over the greeting.
  useEffect(() => {
    if (reduced) return;
    rise.set(withDelay(index * 110, withTiming(0, { duration: 460, easing: Easing.out(Easing.back(1.3)) })));
  }, [index, reduced, rise]);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rise.value * RISE_FROM }, { scale: scale.value }],
  }));
  const squeeze = (to: number) => scale.set(reduced ? to : withSpring(to, spring({ damping: 14, stiffness: 420, mass: 0.6 })));

  return (
    <View style={styles.slot}>
      <Animated.View style={[styles.card, shadow, { backgroundColor: choice.tint }, cardStyle]}>
        <View style={styles.clip} pointerEvents="none">
          <View style={[styles.shape, styles.shapeBig, { backgroundColor: choice.shapeA }]} />
          <View style={[styles.shape, styles.shapeSmall, { backgroundColor: choice.shapeB }]} />
        </View>

        <Pressable
          onPress={onPress}
          onPressIn={() => squeeze(0.97)}
          onPressOut={() => squeeze(1)}
          accessibilityRole="button"
          accessibilityLabel={`${choice.name}. ${choice.description}. Hap`}
          style={styles.cardPress}
        >
          <View style={styles.cardText}>
            <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {choice.name}
            </Text>
            <Text style={styles.description}>{choice.description}</Text>
            <View style={[styles.go, { backgroundColor: choice.accent }]}>
              <Text style={styles.goText}>Hap</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </View>
          {/* The shadow sits on the circle, the picture is cut to it by the inner one (a logo with a white square behind it). */}
          <View style={[styles.logoCircle, shadow]}>
            <View style={styles.logoClip}>
              <Image source={choice.logo} style={{ width: choice.logoSize, height: choice.logoSize }} resizeMode="contain" />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  hero: { alignItems: 'center', gap: 2, marginBottom: spacing.xs },
  avatarButton: { marginBottom: spacing.sm },
  pressed: { opacity: 0.85 },
  avatar: {
    backgroundColor: colors.primaryLight,
    borderWidth: 5,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', color: colors.primaryDark },
  // A small pencil on the avatar says that it can be tapped to change the name.
  editBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { fontSize: 16, color: colors.textMuted, textAlign: 'center' },
  heroName: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: colors.text, textAlign: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 2 },
  meta: { fontSize: 13, color: colors.textMuted },
  metaDot: { fontSize: 13, color: colors.textMuted },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 5,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: spacing.sm,
  },
  demoText: { fontSize: 12, fontWeight: '600', color: colors.primaryDark },
  slot: { flex: 1, minHeight: 140, maxHeight: 210 },
  card: { flex: 1, borderRadius: radii.lg },
  // The soft shapes are cut off by the card's rounded corners; the shadow stays on the card itself, which cannot clip.
  clip: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: radii.lg, overflow: 'hidden' },
  shape: { position: 'absolute', borderRadius: 999 },
  shapeBig: { width: 210, height: 210, right: -60, top: -70, opacity: 0.55 },
  shapeSmall: { width: 120, height: 120, left: -35, bottom: -45, opacity: 0.9 },
  cardPress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg - 4 },
  cardText: { flex: 1, gap: 4 },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  description: { fontSize: 13, lineHeight: 18, color: 'rgba(35, 31, 32, 0.65)' },
  go: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingLeft: 16,
    paddingRight: 12,
    marginTop: spacing.sm,
  },
  goText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  logoCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoClip: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
