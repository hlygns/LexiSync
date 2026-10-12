import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getUnits } from '@/db/units';
import { colors, common } from '@/ui/styles';

// What is visible on the current word: the word alone, then its meaning, then the example sentences.
type Step = 'term' | 'meaning' | 'examples';

// Learning a unit: go through its 20 words one by one, then take the test.
export default function UnitScreen() {
  const { deckId, unit: unitParam } = useLocalSearchParams<{ deckId: string; unit: string }>();
  const unitIndex = Number(unitParam);

  const [unit] = useState(() => getUnits(deckId)[unitIndex]);
  const [position, setPosition] = useState(0);
  const [step, setStep] = useState<Step>('term');

  if (!unit || unit.status === 'locked') {
    return (
      <View style={[common.screen, styles.center]}>
        <Text style={common.empty}>Bu ünite henüz açılmadı. Önce bir önceki ünitenin testini geçmelisin.</Text>
      </View>
    );
  }

  const title = `Ünite ${unitIndex + 1}`;
  const startQuiz = () => router.replace({ pathname: '/quiz/[deckId]', params: { deckId, unit: String(unitIndex) } });

  // All words seen: the test is the only way forward.
  if (position >= unit.cards.length) {
    return (
      <View style={[common.screen, styles.center]}>
        <Stack.Screen options={{ title }} />
        <Text style={styles.doneTitle}>{unit.cards.length} kelimeyi gördün</Text>
        <Text style={styles.doneText}>
          Şimdi bu kelimelerle ilgili {unit.cards.length} soruluk testi çöz. Testi geçince sonraki ünite açılır.
        </Text>
        <Pressable style={[common.button, styles.wide]} onPress={startQuiz}>
          <Text style={common.buttonText}>Teste başla</Text>
        </Pressable>
        <Pressable
          style={[common.outlineButton, styles.wide]}
          onPress={() => {
            setPosition(0);
            setStep('term');
          }}
        >
          <Text style={common.outlineButtonText}>Kelimeleri baştan gör</Text>
        </Pressable>
      </View>
    );
  }

  const card = unit.cards[position];
  const examples = (card.example ?? '').split('\n').filter((line) => line.trim().length > 0);

  function next() {
    if (step === 'term') {
      setStep('meaning');
    } else if (step === 'meaning' && examples.length > 0) {
      setStep('examples');
    } else {
      setPosition(position + 1);
      setStep('term');
    }
  }

  const nextLabel =
    step === 'term' ? 'Türkçesini göster' : step === 'meaning' && examples.length > 0 ? 'Örnek cümleleri göster' : 'Sonraki kelime';

  return (
    <View style={common.screen}>
      <Stack.Screen options={{ title }} />

      <View style={styles.progress}>
        <View style={common.progressTrack}>
          <View style={[common.progressFill, { width: `${(position / unit.cards.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {position + 1} / {unit.cards.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.cardArea}>
        <View style={styles.wordCard}>
          <Text style={styles.term}>{card.term}</Text>

          {step !== 'term' && (
            <View style={styles.meaningBox}>
              <Text style={styles.meaning}>{card.meaning}</Text>
            </View>
          )}

          {step === 'examples' &&
            examples.map((example, index) => (
              <View key={index} style={styles.example}>
                <Text style={styles.exampleNumber}>{index + 1}</Text>
                <Text style={styles.exampleText}>{example}</Text>
              </View>
            ))}
        </View>
      </ScrollView>

      <View style={common.footer}>
        <Pressable style={common.button} onPress={next}>
          <Text style={common.buttonText}>{nextLabel}</Text>
        </Pressable>
        {position > 0 && (
          <Pressable
            onPress={() => {
              setPosition(position - 1);
              setStep('examples');
            }}
          >
            <Text style={styles.back}>Önceki kelime</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  wide: { alignSelf: 'stretch' },
  doneTitle: { fontSize: 24, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  doneText: { fontSize: 16, color: colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  progress: { paddingHorizontal: 16, paddingTop: 16 },
  progressText: { textAlign: 'center', color: colors.muted, marginTop: 8, fontSize: 13 },
  cardArea: { padding: 16, flexGrow: 1, justifyContent: 'center' },
  wordCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    minHeight: 280,
    justifyContent: 'center',
  },
  term: { fontSize: 34, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  meaningBox: { backgroundColor: colors.pinkSoft, borderRadius: 12, padding: 14, marginTop: 20 },
  meaning: { fontSize: 20, fontWeight: '600', color: colors.text, textAlign: 'center' },
  example: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'flex-start' },
  exampleNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.pink,
    color: colors.primaryDark,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
  },
  exampleText: { flex: 1, fontSize: 16, color: colors.text, lineHeight: 22 },
  back: { color: colors.muted, textAlign: 'center', fontSize: 15, padding: 4 },
});
