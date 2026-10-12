import { eq } from 'drizzle-orm';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { CardForm } from '@/components/CardForm';
import { deleteCard, updateCard } from '@/db/cards';
import { db } from '@/db/client';
import { cards } from '@/db/schema';
import { common } from '@/ui/styles';

export default function EditCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // Read once when the screen opens; the form owns the values after that.
  const [card] = useState(() => db.select().from(cards).where(eq(cards.id, id)).get());

  if (!card) {
    return (
      <View style={common.screen}>
        <Text style={common.empty}>Kart bulunamadı.</Text>
      </View>
    );
  }

  function confirmDelete() {
    Alert.alert('Kartı sil', 'Bu kart silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          deleteCard(id);
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={common.screen}>
      <CardForm
        initial={{ term: card.term, meaning: card.meaning, example: card.example ?? '', tags: card.tags }}
        submitLabel="Kaydet"
        onSubmit={(input) => {
          updateCard(id, input);
          router.back();
        }}
      />
      <Pressable onPress={confirmDelete}>
        <Text style={common.dangerText}>Kartı sil</Text>
      </Pressable>
    </View>
  );
}
