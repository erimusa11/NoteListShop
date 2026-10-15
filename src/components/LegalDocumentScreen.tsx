import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/theme';
import { LEGAL_UPDATED, type LegalDocument } from '@/utils/legal';
import { goBackOrHome } from '@/utils/navigation';

// One of the legal documents as a page of its own: a back button, the title, the date, and the numbered sections.
export function LegalDocumentScreen({ document }: { document: LegalDocument }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={goBackOrHome}
          hitSlop={8}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Kthehu"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header" numberOfLines={1}>
          {document.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Përditësuar më {LEGAL_UPDATED}</Text>
        <Text style={styles.intro}>{document.intro}</Text>
        {document.sections.map((section, index) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {index + 1}. {section.title}
            </Text>
            {section.body.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  updated: { fontSize: 12, color: colors.textMuted },
  intro: { fontSize: 15, lineHeight: 22, color: colors.text },
  section: { gap: spacing.xs + 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  paragraph: { fontSize: 14, lineHeight: 21, color: colors.text },
});
