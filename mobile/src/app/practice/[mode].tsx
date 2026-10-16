import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bubbles } from '@/components/Decor';
import { QuizSession, WrongAnswers, type Answer } from '@/components/QuizSession';
import { ResultHeader } from '@/components/ResultHeader';
import { getAllCards, savePracticeResult } from '@/db/practice';
import type { PracticeMode } from '@/db/schema';
import { MODES } from '@/practice/modes';
import { TRANSLATIONS } from '@/practice/translations';
import { translateSentence } from '@/starter/translate';
import { buildPractice, PASS_RATIO, PRACTICE_SIZE, type Question } from '@/quiz/quiz';
import { accents, colors, common } from '@/ui/styles';

type Phase = 'intro' | 'questions' | 'result';

// A free practice session: Kelime Testi, Cloze Test, Çeviri or the mixed Genel Test.
// Open to all words at any time; the result is saved to the progress history.
export default function PracticeScreen() {
  const { mode: modeParam } = useLocalSearchParams<{ mode: string }>();
  const mode = (modeParam in MODES ? modeParam : 'general') as PracticeMode;
  const info = MODES[mode];
  const accent = accents[info.accent];

  const [phase, setPhase] = useState<Phase>('intro');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  // Changing the key gives QuizSession a clean start for a new attempt.
  const [attempt, setAttempt] = useState(0);

  function start() {
    // New questions every time, drawn from every word on the device.
    setQuestions(buildPractice(mode, getAllCards(), TRANSLATIONS, Math.random, translateSentence));
    setAttempt(attempt + 1);
    setPhase('questions');
  }

  function finish(all: Answer[]) {
    savePracticeResult(mode, all.filter((answer) => answer.correct).length, all.length);
    setAnswers(all);
    setPhase('result');
  }

  if (phase === 'intro') {
    return (
      <View style={common.screen}>
        <Stack.Screen options={{ title: info.title }} />
        <View style={[styles.introCard, { backgroundColor: accent.main }]}>
          <Bubbles />
          <View style={styles.introIcon}>
            <Ionicons name={info.icon} size={40} color={colors.onPrimary} />
          </View>
          <Text style={styles.introTitle}>{info.title}</Text>
          <Text style={styles.introText}>{info.description}</Text>
          <Text style={styles.introCount}>{PRACTICE_SIZE[mode]} soru · süre yok</Text>
        </View>
        <View style={common.footer}>
          <Pressable style={common.button} onPress={start}>
            <Text style={common.buttonText}>Başla</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === 'questions') {
    if (questions.length === 0) {
      return (
        <View style={[common.screen, common.center]}>
          <Stack.Screen options={{ title: info.title }} />
          <Text style={common.empty}>Bu bölüm için henüz yeterli kelime yok. Kelimeler yüklendikten sonra tekrar dene.</Text>
        </View>
      );
    }
    return (
      <>
        <Stack.Screen options={{ title: info.title }} />
        <QuizSession key={attempt} questions={questions} onComplete={finish} />
      </>
    );
  }

  const score = answers.filter((answer) => answer.correct).length;
  const good = score / answers.length >= PASS_RATIO;

  return (
    <ScrollView style={common.screen} contentContainerStyle={styles.result}>
      <Stack.Screen options={{ title: info.title }} />
      <ResultHeader
        score={score}
        total={answers.length}
        good={good}
        title={good ? 'Harika gidiyorsun' : 'Biraz daha çalışmalı'}
        message={
          good
            ? 'Sonucun gelişim geçmişine kaydedildi.'
            : 'Sonucun kaydedildi. Yanlışlarına aşağıdan bak, sonra bir daha dene.'
        }
      />

      <Pressable style={[common.button, styles.wide]} onPress={start}>
        <Text style={common.buttonText}>Yeni sorularla tekrar çöz</Text>
      </Pressable>
      <Pressable style={[common.outlineButton, styles.wide]} onPress={() => router.replace('/progress')}>
        <Text style={common.outlineButtonText}>Gelişimimi gör</Text>
      </Pressable>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.homeLink}>Ana sayfaya dön</Text>
      </Pressable>

      <WrongAnswers answers={answers} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  introCard: { margin: 16, borderRadius: 24, padding: 28, alignItems: 'center', overflow: 'hidden' },
  introIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  introTitle: { color: colors.onPrimary, fontSize: 26, fontWeight: '800' },
  introText: { color: colors.onPrimary, fontSize: 16, opacity: 0.92, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  introCount: { color: colors.onPrimary, fontSize: 14, fontWeight: '700', marginTop: 18, opacity: 0.9 },
  wide: { alignSelf: 'stretch' },
  result: { alignItems: 'center', padding: 24, gap: 12 },
  homeLink: { color: colors.muted, fontSize: 15, padding: 6 },
});
