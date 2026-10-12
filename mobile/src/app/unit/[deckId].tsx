import { count } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { db } from '@/db/client';
import { cards, quizResults } from '@/db/schema';
import { getUnits } from '@/db/units';
import { colors, common } from '@/ui/styles';

// A unit's page: its 20 words as a list, and the unit's test underneath.
// Tapping a word opens it with its meaning and example sentences; the test unlocks the next unit.
export default function UnitScreen() {
  const { deckId, unit: unitParam } = useLocalSearchParams<{ deckId: string; unit: string }>();
  const unitIndex = Number(unitParam);

  // Re-render when a card is edited or a test result arrives.
  useLiveQuery(db.select({ total: count() }).from(cards));
  useLiveQuery(db.select({ total: count() }).from(quizResults));
  const unit = getUnits(deckId)[unitIndex];

  if (!unit || unit.status === 'locked') {
    return (
      <View style={[common.screen, styles.center]}>
        <Text style={common.empty}>Bu ünite henüz açılmadı. Önce bir önceki ünitenin testini geçmelisin.</Text>
      </View>
    );
  }

  const openWord = (cardId: string) =>
    router.push({ pathname: '/word/[cardId]', params: { cardId, deckId, unit: String(unitIndex) } });

  return (
    <View style={common.screen}>
      <Stack.Screen options={{ title: `Ünite ${unitIndex + 1}` }} />

      <FlatList
        data={unit.cards}
        keyExtractor={(card) => card.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Pressable style={[common.outlineButton, styles.startButton]} onPress={() => openWord(unit.cards[0].id)}>
              <Text style={common.outlineButtonText}>Kelimeleri sırayla çalış</Text>
            </Pressable>
            <Text style={common.sectionTitle}>Kelimeler ({unit.cards.length})</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Pressable style={[common.card, styles.word]} onPress={() => openWord(item.id)}>
            <Text style={styles.number}>{index + 1}</Text>
            <View style={styles.wordText}>
              <Text style={common.rowTitle}>{item.term}</Text>
              <Text style={common.rowSubtitle}>{item.meaning}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />

      {/* The unit's test, always reachable below the word list. */}
      <View style={styles.testBar}>
        <Text style={styles.testInfo}>
          {unit.status === 'passed'
            ? `Test geçildi · en iyi ${unit.best?.score}/${unit.best?.total}`
            : unit.best
              ? `Son deneme ${unit.best.score}/${unit.best.total} · sonraki ünite için testi geç`
              : `${unit.cards.length} soruluk test · geçince sonraki ünite açılır`}
        </Text>
        <Pressable
          style={common.button}
          onPress={() => router.push({ pathname: '/quiz/[deckId]', params: { deckId, unit: String(unitIndex) } })}
        >
          <Text style={common.buttonText}>{unit.status === 'passed' ? 'Testi tekrar çöz' : 'Teste başla'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  list: { paddingTop: 16, paddingBottom: 16 },
  startButton: { marginHorizontal: 16, marginBottom: 16 },
  word: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  number: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.pinkSoft,
    color: colors.primaryDark,
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 13,
    fontWeight: '800',
    overflow: 'hidden',
    marginRight: 12,
  },
  wordText: { flex: 1 },
  chevron: { fontSize: 24, color: colors.pink, marginLeft: 8 },
  testBar: {
    padding: 16,
    gap: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  testInfo: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
