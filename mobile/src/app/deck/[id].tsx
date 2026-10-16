import { Ionicons } from '@expo/vector-icons';
import { count, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { db } from '@/db/client';
import { cards, decks, quizResults } from '@/db/schema';
import { getUnits, type Unit } from '@/db/units';
import type { IconName } from '@/practice/modes';
import { colors, common } from '@/ui/styles';

// A word group: its units in order. A unit opens when the test of the one before it is passed.
export default function DeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Subscriptions: re-render when the deck, its cards or a test result changes.
  const { data: deckRows } = useLiveQuery(db.select().from(decks).where(eq(decks.id, id)), [id]);
  useLiveQuery(db.select({ total: count() }).from(cards));
  useLiveQuery(db.select({ total: count() }).from(quizResults));
  const deck = deckRows[0];

  const units = getUnits(id);
  const passed = units.filter((unit) => unit.status === 'passed').length;

  function openUnit(unit: Unit) {
    if (unit.status === 'locked') {
      Alert.alert('Ünite kilitli', `Önce Ünite ${unit.index} testini geçmelisin.`);
      return;
    }
    router.push({ pathname: '/unit/[deckId]', params: { deckId: id, unit: String(unit.index) } });
  }

  return (
    <ScrollView style={common.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: deck?.name ?? '' }} />

      <View style={styles.summary}>
        <Text style={styles.summaryValue}>
          {passed}/{units.length}
        </Text>
        <Text style={styles.summaryLabel}>ünite tamamlandı</Text>
        <View style={[common.progressTrack, styles.summaryTrack]}>
          <View style={[common.progressFill, { width: `${units.length === 0 ? 0 : (passed / units.length) * 100}%` }]} />
        </View>
      </View>

      <Text style={common.sectionTitle}>Üniteler</Text>
      {units.length === 0 && <Text style={common.empty}>Bu grupta henüz kelime yok.</Text>}
      {units.map((unit) => (
        <UnitRow key={unit.index} unit={unit} onPress={() => openUnit(unit)} />
      ))}
    </ScrollView>
  );
}

const STATUS: Record<Unit['status'], { label: string; icon: IconName; color: string; background: string }> = {
  passed: { label: 'Tamamlandı', icon: 'checkmark-circle', color: colors.success, background: '#E3F2EA' },
  current: { label: 'Sıradaki', icon: 'play-circle', color: colors.primary, background: colors.pinkSoft },
  locked: { label: 'Kilitli', icon: 'lock-closed', color: colors.muted, background: '#F1E9EA' },
};

function UnitRow({ unit, onPress }: { unit: Unit; onPress: () => void }) {
  const status = STATUS[unit.status];
  return (
    <Pressable
      style={[common.card, styles.unit, unit.status === 'current' && styles.unitCurrent, unit.status === 'locked' && styles.unitLocked]}
      onPress={onPress}
    >
      <View style={[styles.number, { backgroundColor: status.background }]}>
        <Text style={[styles.numberText, { color: status.color }]}>{unit.index + 1}</Text>
      </View>
      <View style={styles.unitText}>
        <Text style={common.rowTitle}>Ünite {unit.index + 1}</Text>
        <Text style={common.rowSubtitle}>
          {unit.cards.length} kelime
          {unit.best ? ` · en iyi test ${unit.best.score}/${unit.best.total}` : ''}
        </Text>
      </View>
      <View style={styles.status}>
        <Ionicons name={status.icon} size={26} color={status.color} />
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  summary: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
  },
  summaryValue: { fontSize: 34, fontWeight: '800', color: colors.primary },
  summaryLabel: { fontSize: 14, color: colors.muted, marginBottom: 12 },
  summaryTrack: { alignSelf: 'stretch' },
  unit: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  unitCurrent: { borderWidth: 2, borderColor: colors.primary },
  unitLocked: { opacity: 0.6 },
  number: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontSize: 18, fontWeight: '800' },
  unitText: { flex: 1 },
  status: { alignItems: 'center', width: 76 },
  statusText: { fontSize: 11, fontWeight: '700', marginTop: 2 },
});
