import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getUnits } from '@/db/units';
import { colors, common } from '@/ui/styles';

// One word of a unit: the word, its Turkish meaning and its example sentences.
export default function WordScreen() {
  const { cardId, deckId, unit: unitParam } = useLocalSearchParams<{ cardId: string; deckId: string; unit: string }>();
  const unitIndex = Number(unitParam);

  const [unitCards] = useState(() => getUnits(deckId)[unitIndex]?.cards ?? []);
  const position = unitCards.findIndex((card) => card.id === cardId);
  const card = unitCards[position];

  if (!card) {
    return (
      <View style={[common.screen, styles.center]}>
        <Text style={common.empty}>Kelime bulunamadı.</Text>
      </View>
    );
  }

  const examples = (card.example ?? '').split('\n').filter((line) => line.trim().length > 0);
  const previous = unitCards[position - 1];
  const next = unitCards[position + 1];

  // replace, not push: moving between words must not pile up screens, so "back" always returns to the list.
  const goTo = (id: string) =>
    router.replace({ pathname: '/word/[cardId]', params: { cardId: id, deckId, unit: String(unitIndex) } });

  return (
    <View style={common.screen}>
      <Stack.Screen options={{ title: `Ünite ${unitIndex + 1} · ${position + 1}/${unitCards.length}` }} />

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.wordCard}>
          <Text style={styles.term}>{card.term}</Text>
          <View style={styles.meaningBox}>
            <Text style={styles.meaning}>{card.meaning}</Text>
          </View>
        </View>

        {examples.length > 0 && <Text style={common.sectionTitle}>Örnek cümleler</Text>}
        {examples.map((example, index) => (
          <View key={index} style={[common.card, styles.example]}>
            <Text style={styles.exampleNumber}>{index + 1}</Text>
            <Text style={styles.exampleText}>{example}</Text>
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
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  body: { paddingVertical: 16 },
  wordCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  term: { fontSize: 34, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  meaningBox: { backgroundColor: colors.pinkSoft, borderRadius: 12, padding: 14, marginTop: 16 },
  meaning: { fontSize: 20, fontWeight: '600', color: colors.text, textAlign: 'center' },
  example: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  exampleNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.pink,
    color: colors.primaryDark,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
  },
  exampleText: { flex: 1, fontSize: 17, color: colors.text, lineHeight: 24 },
  nav: { flexDirection: 'row', gap: 10 },
  navButton: { flex: 1 },
});
