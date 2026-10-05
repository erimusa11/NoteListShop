import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { useBills } from '@/context/BillsContext';
import { useSupplies } from '@/context/SuppliesContext';
import { useTrips } from '@/context/TripsContext';
import { useWishlist } from '@/context/WishlistContext';
import { db } from '@/lib/firebase';
import { colors, radii, spacing } from '@/theme/theme';

const SAVE_DELAY_MS = 700;

export function CloudSyncGate({ children }: { children: ReactNode }) {
  const { user, hasPassword, loading, signOut } = useAuth();
  const { trips, hydrate: hydrateTrips } = useTrips();
  const { bills, hydrate: hydrateBills } = useBills();
  const { supplies, hydrate: hydrateSupplies } = useSupplies();
  const { wishlist, hydrate: hydrateWishlist } = useWishlist();

  const uid = user && hasPassword && db ? user.uid : null;
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const lastSaved = useRef('');
  const previousUid = useRef<string | null>(null);

  const hydrators = useRef({ hydrateTrips, hydrateBills, hydrateSupplies, hydrateWishlist });
  hydrators.current = { hydrateTrips, hydrateBills, hydrateSupplies, hydrateWishlist };

  useEffect(() => {
    if (!uid || !db) {
      if (previousUid.current) {
        hydrators.current.hydrateTrips([]);
        hydrators.current.hydrateBills([]);
        hydrators.current.hydrateSupplies([]);
        hydrators.current.hydrateWishlist([]);
        lastSaved.current = '';
      }
      previousUid.current = null;
      setLoadedUid(null);
      return;
    }

    previousUid.current = uid;
    let cancelled = false;
    setLoadError(null);

    getDoc(doc(db, 'users', uid))
      .then((snap) => {
        if (cancelled) return;
        const data = snap.exists() ? snap.data() : {};
        const next = {
          trips: data.trips ?? [],
          bills: data.bills ?? [],
          supplies: data.supplies ?? [],
          wishlist: data.wishlist ?? [],
        };
        lastSaved.current = JSON.stringify(next);
        hydrators.current.hydrateTrips(next.trips);
        hydrators.current.hydrateBills(next.bills);
        hydrators.current.hydrateSupplies(next.supplies);
        hydrators.current.hydrateWishlist(next.wishlist);
        setLoadedUid(uid);
      })
      .catch((e: { code?: string; message?: string }) => {
        if (cancelled) return;
        setLoadError(
          e?.code === 'permission-denied'
            ? 'Firestore nuk lejon leximin. Vendos rregullat nga skedari firestore.rules në Firebase (Firestore Database > Rules).'
            : 'Nuk mund t\'i ngarkojmë të dhënat. Kontrollo internetin dhe provo përsëri.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  useEffect(() => {
    if (!uid || !db || loadedUid !== uid) return;
    const payload = { trips, bills, supplies, wishlist };
    const json = JSON.stringify(payload);
    if (json === lastSaved.current) return;

    const timer = setTimeout(() => {
      setDoc(doc(db!, 'users', uid), { ...payload, updatedAt: serverTimestamp() })
        .then(() => {
          lastSaved.current = json;
          setSaveError(null);
        })
        .catch(() => setSaveError('Ruajtja në llogari dështoi. Do të provojmë përsëri kur të ndryshosh diçka.'));
    }, SAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [uid, loadedUid, trips, bills, supplies, wishlist]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (uid && loadedUid !== uid) {
    return (
      <View style={styles.center}>
        {loadError ? (
          <View style={styles.errorPanel}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable onPress={() => setAttempt((n) => n + 1)} accessibilityRole="button" style={styles.button}>
              <Text style={styles.buttonText}>Provo përsëri</Text>
            </Pressable>
            <Pressable onPress={signOut} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.link}>Dil</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Duke ngarkuar të dhënat e tua…</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {children}
      {saveError && (
        <View style={styles.banner} pointerEvents="none">
          <Text style={styles.bannerText}>{saveError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  loadingText: { fontSize: 14, color: colors.textMuted },
  errorPanel: { maxWidth: 420, alignItems: 'center', gap: spacing.md },
  errorText: { fontSize: 14, color: colors.text, textAlign: 'center' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  link: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.danger,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  bannerText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
