import { count, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { db } from '@/db/client';
import { deleteDeck } from '@/db/decks';
import { getDueCards } from '@/db/reviews';
import { cards, decks, quizResults, reviewLogs } from '@/db/schema';
import { getUnits, type Unit } from '@/db/units';
import { colors, common } from '@/ui/styles';

export default function DeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Subscriptions: re-render when the deck, its cards, a review or a test result changes.
  const { data: deckRows } = useLiveQuery(db.select().from(decks).where(eq(decks.id, id)), [id]);
  useLiveQuery(db.select({ total: count() }).from(cards));
  useLiveQuery(db.select({ total: count() }).from(reviewLogs));
  useLiveQuery(db.select({ total: count() }).from(quizResults));
  const deck = deckRows[0];

  const units = getUnits(id);
  const wordCount = units.reduce((total, unit) => total + unit.cards.length, 0);
  const dueCount = getDueCards(id).length;

  function openUnit(unit: Unit) {
    if (unit.status === 'locked') {
      Alert.alert('Ünite kilitli', `Önce Ünite ${unit.index} testini geçmelisin.`);
      return;
    }
    router.push({ pathname: '/unit/[deckId]', params: { deckId: id, unit: String(unit.index) } });
  }

  function confirmDelete() {
    Alert.alert('Desteyi sil', `"${deck?.name}" ve içindeki ${wordCount} kelime silinecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          deleteDeck(id);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView style={common.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: deck?.name ?? '' }} />

      {/* Words already learned that are due again today (SM-2). */}
      <View style={styles.reviewBox}>
        <Pressable
          style={[common.button, dueCount === 0 && common.buttonDisabled]}
          disabled={dueCount === 0}
          onPress={() => router.push({ pathname: '/study/[deckId]', params: { deckId: id } })}
        >
          <Text style={common.buttonText}>
            {dueCount === 0 ? 'Bugün tekrar edilecek kelime yok' : `Tekrar et (${dueCount} kelime)`}
          </Text>
        </Pressable>
      </View>

      <Text style={common.sectionTitle}>Üniteler</Text>
      {units.length === 0 && <Text style={common.empty}>Bu destede henüz kelime yok. Aşağıdan kart ekle.</Text>}
      {units.map((unit) => (
        <UnitRow key={unit.index} unit={unit} onPress={() => openUnit(unit)} />
      ))}

      <View style={common.footer}>
        <Pressable
          style={common.outlineButton}
          onPress={() => router.push({ pathname: '/cards/[deckId]', params: { deckId: id } })}
        >
          <Text style={common.outlineButtonText}>Kartları düzenle ({wordCount})</Text>
        </Pressable>
        <Pressable onPress={confirmDelete}>
          <Text style={common.dangerText}>Desteyi sil</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const STATUS: Record<Unit['status'], { label: string; background: string; text: string }> = {
  passed: { label: 'Tamamlandı', background: '#E3F2EA', text: colors.success },
  current: { label: 'Sıradaki', background: colors.primary, text: colors.onPrimary },
  locked: { label: 'Kilitli', background: colors.pinkSoft, text: colors.muted },
};

function UnitRow({ unit, onPress }: { unit: Unit; onPress: () => void }) {
  const status = STATUS[unit.status];
  return (
    <Pressable style={[common.card, styles.unit, unit.status === 'locked' && styles.unitLocked]} onPress={onPress}>
      <View style={styles.unitText}>
        <Text style={common.rowTitle}>Ünite {unit.index + 1}</Text>
        <Text style={common.rowSubtitle}>
          {unit.cards.length} kelime
          {unit.best ? ` · en iyi test ${unit.best.score}/${unit.best.total}` : ''}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: status.background }]}>
        <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  reviewBox: { padding: 16 },
  unit: { flexDirection: 'row', alignItems: 'center' },
  unitLocked: { opacity: 0.6 },
  unitText: { flex: 1 },
  badge: { borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12 },
  badgeText: { fontSize: 13, fontWeight: '700' },
});
