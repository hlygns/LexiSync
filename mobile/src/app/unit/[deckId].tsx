import { Ionicons } from '@expo/vector-icons';
import { count } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { db } from '@/db/client';
import { cards, quizResults } from '@/db/schema';
import { getUnits } from '@/db/units';
import { colors, common } from '@/ui/styles';

// A unit's page: its 20 words as a list, and the unit's test underneath.
// Only the English word is listed; its meaning appears when the word is opened and tapped.
export default function UnitScreen() {
  const { deckId, unit: unitParam } = useLocalSearchParams<{ deckId: string; unit: string }>();
  const unitIndex = Number(unitParam);

  // Re-render when a card changes or a test result arrives.
  useLiveQuery(db.select({ total: count() }).from(cards));
  useLiveQuery(db.select({ total: count() }).from(quizResults));
  const unit = getUnits(deckId)[unitIndex];

  if (!unit || unit.status === 'locked') {
    return (
      <View style={[common.screen, common.center]}>
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
            <Pressable style={[common.button, styles.startButton]} onPress={() => openWord(unit.cards[0].id)}>
              <Ionicons name="play" size={18} color={colors.onPrimary} />
              <Text style={common.buttonText}>Kelimeleri sırayla çalış</Text>
            </Pressable>
            <Text style={common.sectionTitle}>Kelimeler ({unit.cards.length})</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Pressable style={[common.card, styles.word]} onPress={() => openWord(item.id)}>
            <View style={styles.number}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <Text style={[common.rowTitle, styles.term]}>{item.term}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.pink} />
          </Pressable>
        )}
      />

      {/* The unit's test, always reachable below the word list. */}
      <View style={styles.testBar}>
        <Text style={styles.testInfo}>
          {unit.status === 'passed'
            ? `Test geçildi · en iyi ${unit.best?.score}/${unit.best?.total}`
            : unit.best
              ? `Son en iyi deneme ${unit.best.score}/${unit.best.total} · sonraki ünite için testi geç`
              : `${unit.cards.length} soruluk test · geçince sonraki ünite açılır`}
        </Text>
        <Pressable
          style={common.outlineButton}
          onPress={() => router.push({ pathname: '/quiz/[deckId]', params: { deckId, unit: String(unitIndex) } })}
        >
          <Text style={common.outlineButtonText}>{unit.status === 'passed' ? 'Testi tekrar çöz' : 'Teste başla'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 16, paddingBottom: 16 },
  startButton: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginHorizontal: 16, marginBottom: 16 },
  word: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  number: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: colors.primaryDark, fontSize: 13, fontWeight: '800' },
  term: { flex: 1 },
  testBar: {
    padding: 16,
    gap: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  testInfo: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
