import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { createDeck } from '@/db/decks';
import { common } from '@/ui/styles';

// The app is YDS-only; 1 is the YDS row in the server's Exams table.
const YDS_EXAM_ID = 1;

export default function NewDeckScreen() {
  const [name, setName] = useState('');

  const canSubmit = name.trim().length > 0;

  function submit() {
    const id = createDeck({ name, examId: YDS_EXAM_ID });
    // replace, not push: "back" from the new deck should go to the list, not to this form.
    router.replace({ pathname: '/cards/[deckId]', params: { deckId: id } });
  }

  return (
    <View style={[common.screen, common.content]}>
      <Text style={common.label}>Deste adı</Text>
      <TextInput style={common.input} value={name} onChangeText={setName} autoFocus placeholder="Örn. Okuma parçası kelimeleri" />

      <Pressable style={[common.button, !canSubmit && common.buttonDisabled]} onPress={submit} disabled={!canSubmit}>
        <Text style={common.buttonText}>Oluştur</Text>
      </Pressable>
    </View>
  );
}
