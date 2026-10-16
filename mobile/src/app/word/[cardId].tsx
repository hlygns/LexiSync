import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bubbles } from '@/components/Decor';
import { getUnits } from '@/db/units';
import { translateSentence } from '@/starter/translate';
import { colors, common } from '@/ui/styles';

// One word of a unit. Only the English word is shown at first; tapping the card turns it over
// and shows the Turkish meaning with the example sentences underneath.
export default function WordScreen() {
  const { cardId, deckId, unit: unitParam } = useLocalSearchParams<{ cardId: string; deckId: string; unit: string }>();
  const unitIndex = Number(unitParam);

  const [unitCards] = useState(() => getUnits(deckId)[unitIndex]?.cards ?? []);
  // The id of the card that has been turned over. Moving to another word hides the meaning again.
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const position = unitCards.findIndex((card) => card.id === cardId);
  const card = unitCards[position];

  if (!card) {
    return (
      <View style={[common.screen, common.center]}>
        <Text style={common.empty}>Kelime bulunamadı.</Text>
      </View>
    );
  }

  const revealed = revealedId === card.id;
  const examples = (card.example ?? '').split('\n').filter((line) => line.trim().length > 0);
  const previous = unitCards[position - 1];
  const next = unitCards[position + 1];

  // setParams, not push: moving between words stays on this one screen, so "back" always returns to the list.
  const goTo = (id: string) => router.setParams({ cardId: id });

  return (
    <View style={common.screen}>
      <Stack.Screen options={{ title: `Ünite ${unitIndex + 1} · ${position + 1}/${unitCards.length}` }} />

      <ScrollView contentContainerStyle={styles.body}>
        <Pressable style={[styles.wordCard, revealed && styles.wordCardRevealed]} onPress={() => setRevealedId(card.id)}>
          <Bubbles tint={revealed ? colors.primary : '#FFFFFF'} />
          <Text style={[styles.term, revealed && styles.termRevealed]}>{card.term}</Text>

          {revealed ? (
            <View style={styles.meaningBox}>
              <Text style={styles.meaning}>{card.meaning}</Text>
            </View>
          ) : (
            <View style={styles.hint}>
              <Ionicons name="hand-left" size={16} color={colors.onPrimary} />
              <Text style={styles.hintText}>Türkçesini görmek için karta dokun</Text>
            </View>
          )}
        </Pressable>

        {revealed && examples.length > 0 && <Text style={common.sectionTitle}>Örnek cümleler</Text>}
        {revealed &&
          examples.map((example, index) => (
            <View key={index} style={[common.card, styles.example]}>
              <View style={styles.exampleNumber}>
                <Text style={styles.exampleNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.exampleBody}>
                <Text style={styles.exampleText}>{example}</Text>
                {translateSentence(card.term, index) && (
                  <Text style={styles.exampleTurkish}>{translateSentence(card.term, index)}</Text>
                )}
              </View>
            </View>
          ))}
      </ScrollView>

      <View style={common.footer}>
        <View style={styles.nav}>
          <Pressable
            style={[common.outlineButton, styles.navButton, !previous && common.buttonDisabled]}
            disabled={!previous}
            onPress={() => previous && goTo(previous.id)}
          >
            <Text style={common.outlineButtonText}>‹ Önceki</Text>
          </Pressable>
          <Pressable
            style={[common.outlineButton, styles.navButton, !next && common.buttonDisabled]}
            disabled={!next}
            onPress={() => next && goTo(next.id)}
          >
            <Text style={common.outlineButtonText}>Sonraki ›</Text>
          </Pressable>
        </View>
        <Pressable style={common.button} onPress={() => router.back()}>
          <Text style={common.buttonText}>{next ? 'Kelime listesine dön' : 'Bitti, kelime listesine dön'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingVertical: 16 },
  // Front of the card: solid colour, word only.
  wordCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 28,
    marginHorizontal: 16,
    marginBottom: 20,
    minHeight: 220,
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  // Back of the card: light, with the meaning.
  wordCardRevealed: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.pink },
  term: { fontSize: 36, fontWeight: '800', color: colors.onPrimary, textAlign: 'center' },
  termRevealed: { color: colors.primary },
  hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, opacity: 0.9 },
  hintText: { color: colors.onPrimary, fontSize: 14 },
  meaningBox: { backgroundColor: colors.pinkSoft, borderRadius: 14, padding: 14, marginTop: 18 },
  meaning: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  example: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  exampleNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exampleNumberText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  exampleBody: { flex: 1 },
  exampleText: { fontSize: 17, color: colors.text, lineHeight: 24 },
  exampleTurkish: { fontSize: 15, color: colors.muted, lineHeight: 21, marginTop: 6, fontStyle: 'italic' },
  nav: { flexDirection: 'row', gap: 10 },
  navButton: { flex: 1 },
});
