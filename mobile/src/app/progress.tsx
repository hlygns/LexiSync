import { Ionicons } from '@expo/vector-icons';
import { count, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { db } from '@/db/client';
import { getProgress, type ModeProgress } from '@/db/practice';
import { decks, practiceResults, quizResults, reviewLogs } from '@/db/schema';
import { getStats } from '@/db/stats';
import { getUnits } from '@/db/units';
import { MODES } from '@/practice/modes';
import { accents, colors, common } from '@/ui/styles';

// "Gelişimim": how the user is doing, per study area, from the saved test results.
export default function ProgressScreen() {
  // Re-render when a result is saved here or arrives from another device.
  useLiveQuery(db.select({ total: count() }).from(practiceResults));
  useLiveQuery(db.select({ total: count() }).from(quizResults));
  useLiveQuery(db.select({ total: count() }).from(reviewLogs));
  const { data: deckRows } = useLiveQuery(db.select().from(decks).where(isNull(decks.deletedAt)));

  const stats = getStats();
  const progress = getProgress();
  const units = deckRows.flatMap((deck) => getUnits(deck.id));
  const unitsPassed = units.filter((unit) => unit.status === 'passed').length;
  const totalWords = units.reduce((total, unit) => total + unit.cards.length, 0);

  return (
    <ScrollView style={common.screen} contentContainerStyle={styles.content}>
      <View style={styles.summary}>
        <Summary value={`${stats.learned}/${totalWords}`} label="kelime öğrenildi" />
        <Summary value={`${unitsPassed}/${units.length}`} label="ünite tamamlandı" />
        <Summary value={String(stats.streak)} label="gün seri" />
      </View>

      <Text style={common.sectionTitle}>Test sonuçlarım</Text>
      {progress.map((item) => (
        <ModeCard key={item.mode} item={item} />
      ))}
    </ScrollView>
  );
}

function Summary({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ModeCard({ item }: { item: ModeProgress }) {
  const info = MODES[item.mode];
  const accent = accents[info.accent];

  return (
    <View style={common.card}>
      <View style={styles.modeHeader}>
        <View style={[styles.modeIcon, { backgroundColor: accent.soft }]}>
          <Ionicons name={info.icon} size={22} color={accent.main} />
        </View>
        <View style={styles.modeTitle}>
          <Text style={common.rowTitle}>{info.title}</Text>
          <Text style={common.rowSubtitle}>
            {item.attempts === 0 ? 'Henüz çözülmedi' : `${item.attempts} deneme`}
          </Text>
        </View>
        <Pressable
          style={[styles.solve, { backgroundColor: accent.main }]}
          onPress={() => router.push({ pathname: '/practice/[mode]', params: { mode: item.mode } })}
        >
          <Text style={styles.solveText}>Çöz</Text>
        </Pressable>
      </View>

      {item.attempts > 0 && (
        <>
          <View style={styles.numbers}>
            <Number value={`%${item.average}`} label="ortalama" color={accent.main} />
            <Number value={`%${item.best}`} label="en iyi" color={accent.main} />
          </View>

          <Text style={styles.recentTitle}>Son denemeler</Text>
          {item.recent.map((result) => (
            <View key={result.id} style={styles.recentRow}>
              <Text style={styles.recentDate}>
                {new Date(result.completedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
              </Text>
              <View style={[common.progressTrack, styles.recentTrack, { backgroundColor: accent.soft }]}>
                <View
                  style={[
                    common.progressFill,
                    { width: `${(result.score / result.total) * 100}%`, backgroundColor: accent.main },
                  ]}
                />
              </View>
              <Text style={styles.recentScore}>
                {result.score}/{result.total}
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function Number({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.number}>
      <Text style={[styles.numberValue, { color }]}>{value}</Text>
      <Text style={styles.numberLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  summary: { flexDirection: 'row', gap: 8, padding: 16 },
  summaryTile: { flex: 1, backgroundColor: colors.pinkSoft, borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
  summaryLabel: { fontSize: 12, color: colors.muted, marginTop: 4, textAlign: 'center' },
  modeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modeTitle: { flex: 1 },
  solve: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16 },
  solveText: { color: colors.onPrimary, fontWeight: '700', fontSize: 14 },
  numbers: { flexDirection: 'row', gap: 10, marginTop: 16 },
  number: { flex: 1, backgroundColor: colors.background, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  numberValue: { fontSize: 24, fontWeight: '800' },
  numberLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  recentTitle: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 16, marginBottom: 6 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  recentDate: { width: 52, fontSize: 13, color: colors.muted },
  recentTrack: { flex: 1 },
  recentScore: { width: 44, fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'right' },
});
