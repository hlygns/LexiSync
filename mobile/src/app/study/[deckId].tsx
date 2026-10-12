import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getDueCards, recordReview, toSm2State } from '@/db/reviews';
import { Grade, review } from '@/srs/sm2';
import { colors, common } from '@/ui/styles';

const BUTTONS: { grade: Grade; label: string; color: string }[] = [
  { grade: Grade.Again, label: 'Bilmiyorum', color: '#b00020' },
  { grade: Grade.Hard, label: 'Zor', color: '#b45309' },
  { grade: Grade.Good, label: 'İyi', color: '#15803d' },
  { grade: Grade.Easy, label: 'Kolay', color: '#2563eb' },
];

export default function StudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();

  // The queue is read once when the session starts; reviewing a card does not reshuffle it.
  const [queue] = useState(() => getDueCards(deckId));
  const [position, setPosition] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const current = queue[position];

  if (!current) {
    return (
      <View style={[common.screen, styles.center]}>
        <Text style={styles.doneTitle}>{queue.length === 0 ? 'Bugün çalışılacak kart yok' : 'Bugünlük bu kadar'}</Text>
        {queue.length > 0 && <Text style={styles.doneSubtitle}>{queue.length} kart çalıştın.</Text>}
        <Pressable style={[common.button, styles.doneButton]} onPress={() => router.back()}>
          <Text style={common.buttonText}>Desteye dön</Text>
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

  return (
    <View style={common.screen}>
      <Text style={styles.progress}>
        {position + 1} / {queue.length}
      </Text>

      <Pressable style={styles.card} onPress={() => setIsFlipped(true)}>
        <Text style={styles.term}>{current.card.term}</Text>
        {isFlipped ? (
          <>
            <Text style={styles.meaning}>{current.card.meaning}</Text>
            {current.card.example && <Text style={styles.example}>{current.card.example}</Text>}
          </>
        ) : (
          <Text style={styles.hint}>Anlamı görmek için dokun</Text>
        )}
      </Pressable>

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
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  doneTitle: { fontSize: 22, fontWeight: '600', color: colors.text, textAlign: 'center' },
  doneSubtitle: { fontSize: 16, color: colors.muted, marginTop: 8 },
  doneButton: { marginTop: 32, alignSelf: 'stretch' },
  progress: { textAlign: 'center', color: colors.muted, marginTop: 12 },
  card: {
    flex: 1,
    margin: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  term: { fontSize: 32, fontWeight: '700', color: colors.text, textAlign: 'center' },
  meaning: { fontSize: 22, color: colors.text, textAlign: 'center', marginTop: 24 },
  example: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 16, fontStyle: 'italic' },
  hint: { fontSize: 14, color: colors.muted, marginTop: 24 },
  buttons: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 24 },
  gradeButton: { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  gradeLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  gradeInterval: { color: '#fff', fontSize: 12, marginTop: 2, opacity: 0.9 },
});
