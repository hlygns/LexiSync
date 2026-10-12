import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';

import type { CardInput } from '@/db/cards';
import { common } from '@/ui/styles';

type Props = {
  initial?: CardInput;
  submitLabel: string;
  onSubmit: (input: CardInput) => void;
};

// Used by both the "new card" and "edit card" screens.
export function CardForm({ initial, submitLabel, onSubmit }: Props) {
  const [term, setTerm] = useState(initial?.term ?? '');
  const [meaning, setMeaning] = useState(initial?.meaning ?? '');
  const [example, setExample] = useState(initial?.example ?? '');
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '');

  const canSubmit = term.trim().length > 0 && meaning.trim().length > 0;

  function submit() {
    onSubmit({
      term,
      meaning,
      example,
      // "verb, academic" -> ["verb", "academic"]
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    });
  }

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.content} keyboardShouldPersistTaps="handled">
      <Text style={common.label}>Kelime</Text>
      <TextInput style={common.input} value={term} onChangeText={setTerm} autoCapitalize="none" autoFocus={!initial} />

      <Text style={common.label}>Anlam</Text>
      <TextInput style={common.input} value={meaning} onChangeText={setMeaning} autoCapitalize="none" />

      <Text style={common.label}>Örnek cümle (isteğe bağlı)</Text>
      <TextInput style={common.input} value={example} onChangeText={setExample} multiline />

      <Text style={common.label}>Etiketler (virgülle ayır)</Text>
      <TextInput style={common.input} value={tags} onChangeText={setTags} autoCapitalize="none" />

      <Pressable style={[common.button, !canSubmit && common.buttonDisabled]} onPress={submit} disabled={!canSubmit}>
        <Text style={common.buttonText}>{submitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}
