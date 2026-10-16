import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Question } from '@/quiz/quiz';
import { colors, common } from '@/ui/styles';

// chosen is null when the question was left blank. A blank answer counts as not correct,
// as in the real exam (no negative marking, but no point either).
export type Answer = { question: Question; chosen: string | null; correct: boolean };

type Props = {
  questions: Question[];
  // Called once, after the last question has been answered or skipped.
  onComplete: (answers: Answer[]) => void;
};

// Picked and not yet confirmed: the option text, or BLANK when "Boş bırak" was pressed.
const BLANK = Symbol('blank');

// Asks the questions one by one. After each answer the right option turns green and a wrong pick
// turns red; the user then moves on. Used by unit tests and by every practice mode.
export function QuizSession({ questions, onComplete }: Props) {
  const [position, setPosition] = useState(0);
  const [selected, setSelected] = useState<string | typeof BLANK | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const question = questions[position];
  const isLast = position === questions.length - 1;
  const answered = selected !== null;
  const skipped = selected === BLANK;
  // Long options (whole sentences) get a smaller font so they stay readable.
  const longOptions = question.kind === 'translation';

  function goOn() {
    const chosen = selected === BLANK || selected === null ? null : selected;
    const all = [...answers, { question, chosen, correct: chosen === question.answer }];
    setAnswers(all);
    if (isLast) {
      onComplete(all);
    } else {
      setPosition(position + 1);
      setSelected(null);
    }
  }

  return (
    <View style={common.screen}>
      <View style={styles.progress}>
        <View style={common.progressTrack}>
          <View style={[common.progressFill, { width: `${(position / questions.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Soru {position + 1} / {questions.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.instruction}>{question.instruction}</Text>
        <View style={styles.promptBox}>
          <Text style={question.kind === 'meaning' ? styles.promptWord : styles.promptSentence}>{question.prompt}</Text>
        </View>

        {question.options.map((option, index) => {
          const isAnswer = option === question.answer;
          const isWrongPick = answered && option === selected && !isAnswer;
          const highlighted = answered && (isAnswer || isWrongPick);
          return (
            <Pressable
              key={option}
              style={[styles.option, answered && isAnswer && styles.optionCorrect, isWrongPick && styles.optionWrong]}
              disabled={answered}
              onPress={() => setSelected(option)}
            >
              <View style={[styles.letter, highlighted && styles.letterOn]}>
                <Text style={[styles.letterText, highlighted && styles.optionTextOn]}>{'ABCD'[index]}</Text>
              </View>
              <Text
                style={[styles.optionText, longOptions && styles.optionTextLong, highlighted && styles.optionTextOn]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}

        {skipped && <Text style={styles.skippedNote}>Boş bıraktın. Doğru cevap yeşille gösterildi.</Text>}
      </ScrollView>

      <View style={common.footer}>
        {answered ? (
          <Pressable style={common.button} onPress={goOn}>
            <Text style={common.buttonText}>{isLast ? 'Testi bitir' : 'Sonraki soru'}</Text>
          </Pressable>
        ) : (
          <Pressable style={common.outlineButton} onPress={() => setSelected(BLANK)}>
            <Text style={common.outlineButtonText}>Boş bırak</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// The list shown on a result screen: every wrong or blank question with the right answer and why.
export function WrongAnswers({ answers }: { answers: Answer[] }) {
  const missed = answers.filter((answer) => !answer.correct);
  if (missed.length === 0) return null;

  const blanks = missed.filter((answer) => answer.chosen === null).length;

  return (
    <View style={styles.wrongList}>
      <Text style={[common.sectionTitle, styles.wrongTitle]}>
        Yanlışların ve boşların ({missed.length - blanks} yanlış, {blanks} boş)
      </Text>
      {missed.map(({ question, chosen }) => (
        <View key={question.id} style={[styles.wrongRow, chosen === null && styles.blankRow]}>
          <Text style={styles.wrongPrompt}>{question.prompt}</Text>

          <View style={styles.answerLine}>
            <Ionicons name={chosen === null ? 'remove-circle' : 'close-circle'} size={18} color={chosen === null ? colors.muted : colors.danger} />
            <Text style={styles.yourAnswer}>{chosen === null ? 'Boş bıraktın' : `Senin cevabın: ${chosen}`}</Text>
          </View>
          <View style={styles.answerLine}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.rightAnswer}>Doğru cevap: {question.answer}</Text>
          </View>

          <View style={styles.explanation}>
            <View style={styles.explanationTitle}>
              <Ionicons name="bulb" size={16} color={colors.primary} />
              <Text style={styles.explanationTitleText}>Neden?</Text>
            </View>
            {question.explanation.map((line, index) => (
              <Text key={index} style={styles.explanationText}>
                {line}
              </Text>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { paddingHorizontal: 16, paddingTop: 16 },
  progressText: { textAlign: 'center', color: colors.muted, marginTop: 8, fontSize: 13 },
  body: { padding: 16 },
  instruction: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 12 },
  promptBox: { backgroundColor: colors.pinkSoft, borderRadius: 18, padding: 22, marginBottom: 20 },
  promptWord: { fontSize: 30, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  promptSentence: { fontSize: 18, color: colors.text, textAlign: 'center', lineHeight: 26 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  optionCorrect: { backgroundColor: colors.success, borderColor: colors.success },
  optionWrong: { backgroundColor: colors.danger, borderColor: colors.danger },
  letter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterOn: { backgroundColor: 'rgba(255,255,255,0.25)' },
  letterText: { fontSize: 14, fontWeight: '800', color: colors.primary },
  optionText: { flex: 1, fontSize: 16, color: colors.text },
  optionTextLong: { fontSize: 15, lineHeight: 21 },
  optionTextOn: { color: colors.onPrimary, fontWeight: '700' },
  skippedNote: { textAlign: 'center', color: colors.muted, fontSize: 14, marginTop: 4 },
  wrongList: { alignSelf: 'stretch' },
  wrongTitle: { marginHorizontal: 0, marginTop: 20 },
  wrongRow: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderLeftWidth: 5,
    borderLeftColor: colors.danger,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  blankRow: { borderLeftColor: colors.muted },
  wrongPrompt: { fontSize: 15, color: colors.text, lineHeight: 21, fontWeight: '600', marginBottom: 4 },
  answerLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  yourAnswer: { flex: 1, fontSize: 14, color: colors.muted, lineHeight: 19 },
  rightAnswer: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.success, lineHeight: 19 },
  explanation: { backgroundColor: colors.pinkSoft, borderRadius: 12, padding: 12, marginTop: 6, gap: 6 },
  explanationTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  explanationTitleText: { fontSize: 13, fontWeight: '800', color: colors.primary },
  explanationText: { fontSize: 14, color: colors.text, lineHeight: 20 },
});
