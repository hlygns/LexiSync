import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getDueCards, recordReview, toSm2State } from '@/db/reviews';
import { Grade, review } from '@/srs/sm2';
import { colors, common } from '@/ui/styles';

const BUTTONS: { grade: Grade; label: string; color: string }[] = [
  { grade: Grade.Again, label: 'Bilmiyorum', color: colors.danger },
  { grade: Grade.Hard, label: 'Zor', color: '#D9822B' },
  { grade: Grade.Good, label: 'İyi', color: colors.success },
  { grade: Grade.Easy, label: 'Kolay', color: colors.primary },
];

// "Tekrar": words learned earlier that are due again today (SM-2), from all groups.
export default function ReviewScreen() {
  // The queue is read once when the session starts; reviewing a card does not reshuffle it.
  const [queue] = useState(() => getDueCards());
  const [position, setPosition] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const current = queue[position];

  if (!current) {
    const nothingDue = queue.length === 0;
    return (
      <View style={[common.screen, common.center]}>
        <Ionicons name={nothingDue ? 'cafe' : 'checkmark-done-circle'} size={72} color={colors.pink} />
        <Text style={styles.doneTitle}>{nothingDue ? 'Bugün tekrar edilecek kelime yok' : 'Bugünlük bu kadar'}</Text>
        <Text style={styles.doneSubtitle}>
          {nothingDue
            ? 'Bir ünite testini geçtiğinde o kelimeler zamanı gelince burada karşına çıkar.'
            : `${queue.length} kelime tekrar ettin.`}
        </Text>
        <Pressable style={[common.button, styles.doneButton]} onPress={() => router.back()}>
          <Text style={common.buttonText}>Ana sayfaya dön</Text>
        </Pressable>
      </View>
    );
  }

  function grade(value: Grade) {
    recordReview(current.card.id, value);
    setIsFlipped(false);
    setPosition(position + 1);
  }

  const sm2State = toSm2State(current.state);
  const examples = (current.card.example ?? '').split('\n').filter((line) => line.trim().length > 0);

  return (
    <View style={common.screen}>
      <View style={styles.progress}>
        <View style={common.progressTrack}>
          <View style={[common.progressFill, { width: `${(position / queue.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {position + 1} / {queue.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.cardArea}>
        <Pressable style={[styles.card, isFlipped && styles.cardFlipped]} onPress={() => setIsFlipped(true)}>
          <Text style={[styles.term, isFlipped && styles.termFlipped]}>{current.card.term}</Text>
          {isFlipped ? (
            <>
              <View style={styles.meaningBox}>
                <Text style={styles.meaning}>{current.card.meaning}</Text>
              </View>
              {examples.map((example, index) => (
                <Text key={index} style={styles.example}>
                  {example}
                </Text>
              ))}
            </>
          ) : (
            <Text style={styles.hint}>Hatırlamaya çalış, sonra karta dokun</Text>
          )}
        </Pressable>
      </ScrollView>

      {isFlipped && (
        <View style={styles.buttons}>
          {BUTTONS.map((button) => (
            <Pressable
              key={button.grade}
              style={[styles.gradeButton, { backgroundColor: button.color }]}
              onPress={() => grade(button.grade)}
            >
              <Text style={styles.gradeLabel}>{button.label}</Text>
              {/* Preview: when the card would come back if this button is pressed. */}
              <Text style={styles.gradeInterval}>{review(sm2State, button.grade).intervalDays} gün</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  doneTitle: { fontSize: 22, fontWeight: '800', color: colors.primary, textAlign: 'center', marginTop: 16 },
  doneSubtitle: { fontSize: 16, color: colors.muted, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  doneButton: { marginTop: 28, alignSelf: 'stretch' },
  progress: { paddingHorizontal: 16, paddingTop: 16 },
  progressText: { textAlign: 'center', color: colors.muted, marginTop: 8, fontSize: 13 },
  cardArea: { padding: 16, flexGrow: 1, justifyContent: 'center' },
  card: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 28,
    minHeight: 280,
    justifyContent: 'center',
    elevation: 4,
  },
  cardFlipped: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.pink },
  term: { fontSize: 36, fontWeight: '800', color: colors.onPrimary, textAlign: 'center' },
  termFlipped: { color: colors.primary },
  meaningBox: { backgroundColor: colors.pinkSoft, borderRadius: 14, padding: 14, marginTop: 20 },
  meaning: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  example: { fontSize: 16, color: colors.text, textAlign: 'center', marginTop: 14, lineHeight: 22, fontStyle: 'italic' },
  hint: { fontSize: 14, color: colors.onPrimary, opacity: 0.9, marginTop: 24, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 24 },
  gradeButton: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  gradeLabel: { color: colors.onPrimary, fontSize: 13, fontWeight: '700' },
  gradeInterval: { color: colors.onPrimary, fontSize: 12, marginTop: 2, opacity: 0.9 },
});
