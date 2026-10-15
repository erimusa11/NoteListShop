import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { NoteListBody } from '@/components/NoteListBody';
import { useNoteLists } from '@/hooks/useNoteLists';
import { type Tone, tones } from '@/theme/noteTones';
import { radii, spacing } from '@/theme/theme';
import type { NoteListKind } from '@/types/models';
import { isProductList, newestFirst } from '@/utils/noteLists';

// Each tab has its own tone: green for the normal list, orange for the shopping list.
const TABS: { kind: NoteListKind; title: string; icon: 'list' | 'cart'; accent: Tone }[] = [
  { kind: 'work', title: 'Listat normale', icon: 'list', accent: tones.green },
  { kind: 'products', title: 'Listat e blerjeve', icon: 'cart', accent: tones.orange },
];

// The Note List Shop page: two folder tabs, the normal list and the shopping list. The open tab is joined to the colored sheet
// under it, which holds that one list (made by itself the first time), so its items are right on the page. The page is only
// built when its menu is opened, so the rest of the app does not pay for it.
export function NotesView() {
  const { lists, addList, resetRepeating, clearStale } = useNoteLists();
  const [tab, setTab] = useState<NoteListKind>('work');
  const created = useRef<Set<NoteListKind>>(new Set());

  // The one list of each tab; when there are older extra ones of a kind, the newest is the one shown.
  const listOf = (kind: NoteListKind) => newestFirst(lists ?? []).find((list) => isProductList(list) === (kind === 'products'));

  useEffect(() => {
    if (!lists) return;
    for (const { kind, title } of TABS) {
      if (created.current.has(kind)) continue;
      if (!lists.some((list) => isProductList(list) === (kind === 'products'))) {
        created.current.add(kind);
        addList(title, kind);
      }
    }
  }, [lists, addList]);

  // Repeating items (a weekly reminder) come back unchecked once their days have passed, and checked items that do not repeat
  // are cleared after a month so the lists (and the copy in the cloud) stay small. Both run when the lists load, when the app is
  // opened again and every hour while it stays open.
  const hasLists = lists !== null;
  useEffect(() => {
    if (!hasLists) return;
    const maintain = () => {
      resetRepeating();
      clearStale();
    };
    maintain();
    const timer = setInterval(maintain, 60 * 60 * 1000);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && maintain());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [hasLists, resetRepeating, clearStale]);

  const current = listOf(tab);
  const activeIndex = TABS.findIndex((t) => t.kind === tab);
  const accent = TABS[activeIndex].accent;

  return (
    <View style={styles.flex}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => {
          const active = t.kind === tab;
          const left = listOf(t.kind)?.items.filter((item) => !item.done).length ?? 0;
          return (
            <Pressable
              key={t.kind}
              onPress={() => setTab(t.kind)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={left > 0 ? `${t.title}, ${left} mbeten` : t.title}
              style={[
                styles.tab,
                active
                  ? { backgroundColor: t.accent.soft, borderTopColor: t.accent.main }
                  : [styles.tabIdle, { backgroundColor: t.accent.idle }],
              ]}
            >
              <Ionicons name={t.icon} size={active ? 20 : 17} color={active ? t.accent.dark : t.accent.main} />
              <Text style={[styles.tabText, { color: t.accent.dark }, active && styles.tabTextActive]} numberOfLines={1}>
                {t.title}
              </Text>
              {left > 0 && (
                <View style={[styles.badge, { backgroundColor: active ? t.accent.main : t.accent.light }]}>
                  <Text style={[styles.badgeText, { color: active ? '#FFFFFF' : t.accent.dark }]}>{left}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <View
        style={[
          styles.sheet,
          { backgroundColor: accent.soft },
          activeIndex === 0 ? styles.sheetSquareLeft : styles.sheetSquareRight,
        ]}
      >
        {/* Two soft circles behind the cards, the same shapes as on the cards of the home screen. */}
        <View style={[styles.blobs, activeIndex === 0 ? styles.sheetSquareLeft : styles.sheetSquareRight]}>
          <View style={[styles.blob, styles.blobBig, { backgroundColor: accent.light }]} />
          <View style={[styles.blob, styles.blobSmall, { backgroundColor: accent.light }]} />
        </View>
        {current ? <NoteListBody key={current.id} listId={current.id} accent={accent} /> : <View style={styles.flex} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, zIndex: 1 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 4,
    borderTopWidth: 3,
    borderTopColor: 'transparent',
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    marginBottom: -1,
  },
  tabIdle: { paddingVertical: spacing.sm + 1, borderTopWidth: 0 },
  tabText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  tabTextActive: { fontWeight: '800' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  sheet: { flex: 1, borderRadius: radii.lg, padding: spacing.md, paddingBottom: spacing.sm },
  // The circles are clipped by their own layer, not by the sheet, so nothing inside the sheet can be scrolled by accident.
  blobs: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radii.lg, overflow: 'hidden', pointerEvents: 'none' },
  blob: { position: 'absolute', borderRadius: radii.pill },
  blobBig: { width: 240, height: 240, top: -90, right: -80, opacity: 0.6 },
  blobSmall: { width: 160, height: 160, bottom: -56, left: -56, opacity: 0.45 },
  sheetSquareLeft: { borderTopLeftRadius: 0 },
  sheetSquareRight: { borderTopRightRadius: 0 },
});
