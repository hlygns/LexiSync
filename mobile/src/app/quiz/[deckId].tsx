import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getDeckCards, getUnits, saveQuizResult, type QuizAnswer } from '@/db/units';
import { buildQuiz, PASS_RATIO, type Question } from '@/quiz/quiz';
import { colors, common } from '@/ui/styles';

// The test at the end of a unit: one question per word. Passing it unlocks the next unit.
export default function QuizScreen() {
  const { deckId, unit: unitParam } = useLocalSearchParams<{ deckId: string; unit: string }>();
  const unitIndex = Number(unitParam);

  const [unit] = useState(() => getUnits(deckId)[unitIndex]);
  const makeQuestions = () => (unit ? buildQuiz(unit.cards, getDeckCards(deckId)) : []);

  const [questions, setQuestions] = useState<Question[]>(makeQuestions);
  const [position, setPosition] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  // Set once the last question is answered and the result has been saved.
  const [passed, setPassed] = useState<boolean | null>(null);

  const title = `Ünite ${unitIndex + 1} testi`;

  if (!unit || unit.status === 'locked') {
    return (
      <View style={[common.screen, styles.center]}>
        <Text style={common.empty}>Bu test henüz açılmadı.</Text>
      </View>
    );
  }

  function restart() {
    setQuestions(makeQuestions());
    setPosition(0);
    setSelected(null);
    setAnswers([]);
    setPassed(null);
  }

  if (passed !== null) {
    const score = answers.filter((answer) => answer.correct).length;
    const needed = Math.ceil(answers.length * PASS_RATIO);
    return (
      <View style={[common.screen, styles.center]}>
        <Stack.Screen options={{ title }} />
        <Text style={[styles.score, { color: passed ? colors.success : colors.danger }]}>
          {score} / {answers.length}
        </Text>
        <Text style={styles.resultTitle}>{passed ? 'Testi geçtin' : 'Henüz olmadı'}</Text>
        <Text style={styles.resultText}>
          {passed
            ? 'Sonraki ünite açıldı. Bu kelimeler artık tekrar takvimine girdi; zamanı gelince "Tekrar et" altında karşına çıkacak.'
            : `Sonraki üniteye geçmek için en az ${needed} doğru gerekiyor. Kelimelere bir daha bak ve testi tekrar çöz.`}
        </Text>

        {passed ? (
          <Pressable style={[common.button, styles.wide]} onPress={() => router.back()}>
            <Text style={common.buttonText}>Desteye dön</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              style={[common.button, styles.wide]}
              onPress={() => router.replace({ pathname: '/unit/[deckId]', params: { deckId, unit: String(unitIndex) } })}
            >
              <Text style={common.buttonText}>Kelimeleri tekrar çalış</Text>
            </Pressable>
            <Pressable style={[common.outlineButton, styles.wide]} onPress={restart}>
              <Text style={common.outlineButtonText}>Testi tekrar çöz</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const question = questions[position];
  const isLast = position === questions.length - 1;

  function goOn() {
    const all = [...answers, { cardId: question.cardId, correct: selected === question.answer }];
    setAnswers(all);
    if (isLast) {
      setPassed(saveQuizResult(deckId, unitIndex, all));
    } else {
      setPosition(position + 1);
      setSelected(null);
    }
  }

  return (
    <View style={common.screen}>
      <Stack.Screen options={{ title }} />

      <View style={styles.progress}>
        <View style={common.progressTrack}>
          <View style={[common.progressFill, { width: `${(position / questions.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Soru {position + 1} / {questions.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.instruction}>
          {question.kind === 'meaning' ? 'Bu kelimenin Türkçesi hangisi?' : 'Boşluğa hangi kelime gelmeli?'}
        </Text>
        <View style={styles.promptBox}>
          <Text style={question.kind === 'meaning' ? styles.promptWord : styles.promptSentence}>{question.prompt}</Text>
        </View>

        {question.options.map((option) => {
          // After answering: the right option turns green, a wrong pick turns red.
          const answered = selected !== null;
          const isAnswer = option === question.answer;
          const isWrongPick = answered && option === selected && !isAnswer;
          return (
            <Pressable
              key={option}
              style={[styles.option, answered && isAnswer && styles.optionCorrect, isWrongPick && styles.optionWrong]}
              disabled={answered}
              onPress={() => setSelected(option)}
            >
              <Text style={[styles.optionText, answered && (isAnswer || isWrongPick) && styles.optionTextOn]}>{option}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={common.footer}>
        <Pressable style={[common.button, selected === null && common.buttonDisabled]} disabled={selected === null} onPress={goOn}>
          <Text style={common.buttonText}>{isLast ? 'Testi bitir' : 'Sonraki soru'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  wide: { alignSelf: 'stretch' },
  score: { fontSize: 56, fontWeight: '800' },
  resultTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  resultText: { fontSize: 16, color: colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  progress: { paddingHorizontal: 16, paddingTop: 16 },
  progressText: { textAlign: 'center', color: colors.muted, marginTop: 8, fontSize: 13 },
  body: { padding: 16 },
  instruction: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 12 },
  promptBox: { backgroundColor: colors.pinkSoft, borderRadius: 16, padding: 20, marginBottom: 20 },
  promptWord: { fontSize: 30, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  promptSentence: { fontSize: 19, color: colors.text, textAlign: 'center', lineHeight: 27 },
  option: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  optionCorrect: { backgroundColor: colors.success, borderColor: colors.success },
  optionWrong: { backgroundColor: colors.danger, borderColor: colors.danger },
  optionText: { fontSize: 16, color: colors.text, textAlign: 'center' },
  optionTextOn: { color: colors.onPrimary, fontWeight: '700' },
});
