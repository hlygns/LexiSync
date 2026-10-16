import { Ionicons } from '@expo/vector-icons';
import { asc, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { createCard } from '@/db/cards';
import { db } from '@/db/client';
import { createDeck } from '@/db/decks';
import { decks } from '@/db/schema';
import { colors, common } from '@/ui/styles';

// The app is YDS-only; 1 is the YDS row in the server's Exams table.
const YDS_EXAM_ID = 1;
// Marks the "create a new group" choice in the group picker.
const NEW_GROUP = 'new';

// Opened by the "+" button on the home screen: the one place where the user adds their own words.
// A word goes into an existing group or into a new one created here.
export default function AddWordScreen() {
  const { data: deckRows } = useLiveQuery(db.select().from(decks).where(isNull(decks.deletedAt)).orderBy(asc(decks.id)));

  const [groupId, setGroupId] = useState<string>(NEW_GROUP);
  const [groupName, setGroupName] = useState('');
  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example1, setExample1] = useState('');
  const [example2, setExample2] = useState('');
  const [addedTerm, setAddedTerm] = useState<string | null>(null);

  const isNewGroup = groupId === NEW_GROUP;
  const canSubmit =
    term.trim().length > 0 && meaning.trim().length > 0 && (!isNewGroup || groupName.trim().length > 0);

  function submit() {
    const deckId = isNewGroup ? createDeck({ name: groupName, examId: YDS_EXAM_ID }) : groupId;
    createCard(deckId, {
      term,
      meaning,
      // One sentence per line, the same format the built-in words use.
      example: [example1, example2].map((line) => line.trim()).filter((line) => line.length > 0).join('\n'),
      tags: [],
    });

    // Stay on the form, with the same group selected, so several words can be added in a row.
    setGroupId(deckId);
    setGroupName('');
    setAddedTerm(term.trim());
    setTerm('');
    setMeaning('');
    setExample1('');
    setExample2('');
  }

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.content} keyboardShouldPersistTaps="handled">
      {addedTerm && (
        <View style={styles.added}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.addedText}>“{addedTerm}” eklendi. Bir kelime daha ekleyebilirsin.</Text>
        </View>
      )}

      <Text style={common.label}>Hangi gruba eklensin?</Text>
      <View style={styles.chips}>
        {deckRows.map((deck) => (
          <Chip key={deck.id} label={deck.name} selected={groupId === deck.id} onPress={() => setGroupId(deck.id)} />
        ))}
        <Chip label="+ Yeni grup" selected={isNewGroup} onPress={() => setGroupId(NEW_GROUP)} />
      </View>

      {isNewGroup && (
        <>
          <Text style={common.label}>Yeni grubun adı</Text>
          <TextInput
            style={common.input}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Örn. Okuma parçası kelimelerim"
            placeholderTextColor={colors.muted}
          />
        </>
      )}

      <Text style={common.label}>Kelime (İngilizce)</Text>
      <TextInput style={common.input} value={term} onChangeText={setTerm} autoCapitalize="none" autoCorrect={false} />

      <Text style={common.label}>Türkçesi</Text>
      <TextInput style={common.input} value={meaning} onChangeText={setMeaning} autoCapitalize="none" />

      <Text style={common.label}>Örnek cümle 1 (isteğe bağlı)</Text>
      <TextInput style={common.input} value={example1} onChangeText={setExample1} multiline />

      <Text style={common.label}>Örnek cümle 2 (isteğe bağlı)</Text>
      <TextInput style={common.input} value={example2} onChangeText={setExample2} multiline />

      <Pressable style={[common.button, !canSubmit && common.buttonDisabled]} onPress={submit} disabled={!canSubmit}>
        <Text style={common.buttonText}>Kelimeyi ekle</Text>
      </Pressable>

      <Text style={styles.note}>
        Eklediğin kelime grubun son ünitesine girer ve Cloze Test, Kelime Testi ve Genel Test sorularında da kullanılır.
      </Text>
    </ScrollView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  added: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E3F2EA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  addedText: { flex: 1, color: colors.text, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text },
  chipTextSelected: { color: colors.onPrimary, fontWeight: '700' },
  note: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 16, lineHeight: 19 },
});
