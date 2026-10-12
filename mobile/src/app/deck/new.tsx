import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { createDeck } from '@/db/decks';
import { EXAMS } from '@/db/exams';
import { colors, common } from '@/ui/styles';

export default function NewDeckScreen() {
  const [name, setName] = useState('');
  const [examId, setExamId] = useState(EXAMS[0].id);

  const canSubmit = name.trim().length > 0;

  function submit() {
    const id = createDeck({ name, examId });
    // replace, not push: "back" from the new deck should go to the list, not to this form.
    router.replace({ pathname: '/deck/[id]', params: { id } });
  }

  return (
    <View style={[common.screen, common.content]}>
      <Text style={common.label}>Deste adı</Text>
      <TextInput style={common.input} value={name} onChangeText={setName} autoFocus placeholder="Örn. Akademik fiiller" />

      <Text style={common.label}>Sınav</Text>
      <View style={styles.chips}>
        {EXAMS.map((exam) => {
          const selected = exam.id === examId;
          return (
            <Pressable
              key={exam.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setExamId(exam.id)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{exam.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={[common.button, !canSubmit && common.buttonDisabled]} onPress={submit} disabled={!canSubmit}>
        <Text style={common.buttonText}>Oluştur</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 15, color: colors.text },
  chipTextSelected: { color: '#fff' },
});
