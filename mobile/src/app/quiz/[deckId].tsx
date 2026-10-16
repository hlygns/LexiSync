import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { QuizSession, WrongAnswers, type Answer } from '@/components/QuizSession';
import { ResultHeader } from '@/components/ResultHeader';
import { getDeckCards, getUnits, saveQuizResult } from '@/db/units';
import { buildQuiz, PASS_RATIO } from '@/quiz/quiz';
import { translateSentence } from '@/starter/translate';
import { common } from '@/ui/styles';

// The test at the end of a unit: one question per word. Passing it unlocks the next unit.
export default function UnitQuizScreen() {
  const { deckId, unit: unitParam } = useLocalSearchParams<{ deckId: string; unit: string }>();
  const unitIndex = Number(unitParam);

  const [unit] = useState(() => getUnits(deckId)[unitIndex]);
  const makeQuestions = () => (unit ? buildQuiz(unit.cards, getDeckCards(deckId), Math.random, translateSentence) : []);

  const [questions, setQuestions] = useState(makeQuestions);
  // Changing the key gives QuizSession a clean start for a new attempt.
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ answers: Answer[]; passed: boolean } | null>(null);

  const title = `Ünite ${unitIndex + 1} testi`;

  if (!unit || unit.status === 'locked' || questions.length === 0) {
    return (
      <View style={[common.screen, common.center]}>
        <Text style={common.empty}>Bu test henüz açılmadı.</Text>
      </View>
    );
  }

  function finish(answers: Answer[]) {
    const passed = saveQuizResult(
      deckId,
      unitIndex,
      // Unit questions are always about a card.
      answers.map((answer) => ({ cardId: answer.question.cardId!, correct: answer.correct })),
    );
    setResult({ answers, passed });
  }

  function restart() {
    setQuestions(makeQuestions());
    setAttempt(attempt + 1);
    setResult(null);
  }

  if (!result) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <QuizSession key={attempt} questions={questions} onComplete={finish} />
      </>
    );
  }

  const score = result.answers.filter((answer) => answer.correct).length;
  const total = result.answers.length;
  const needed = Math.ceil(total * PASS_RATIO);

  return (
    <ScrollView style={common.screen} contentContainerStyle={styles.result}>
      <Stack.Screen options={{ title }} />
      <ResultHeader
        score={score}
        total={total}
        good={result.passed}
        title={result.passed ? 'Testi geçtin' : 'Henüz olmadı'}
        message={
          result.passed
            ? 'Sonraki ünite açıldı. Bu kelimeler tekrar takvimine girdi; zamanı gelince ana sayfadaki "Tekrar" bölümünde karşına çıkacak.'
            : `Sonraki üniteye geçmek için en az ${needed} doğru gerekiyor. Kelimelere bir daha bak ve testi tekrar çöz.`
        }
      />

      {result.passed ? (
        <Pressable
          style={[common.button, styles.wide]}
          onPress={() => router.dismissTo({ pathname: '/deck/[id]', params: { id: deckId } })}
        >
          <Text style={common.buttonText}>Ünitelere dön</Text>
        </Pressable>
      ) : (
        <>
          {/* Back to this unit's word list, which is the screen underneath. */}
          <Pressable style={[common.button, styles.wide]} onPress={() => router.back()}>
            <Text style={common.buttonText}>Kelime listesine dön</Text>
          </Pressable>
          <Pressable style={[common.outlineButton, styles.wide]} onPress={restart}>
            <Text style={common.outlineButtonText}>Testi tekrar çöz</Text>
          </Pressable>
        </>
      )}

      <WrongAnswers answers={result.answers} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wide: { alignSelf: 'stretch' },
  result: { alignItems: 'center', padding: 24, gap: 12 },
});
