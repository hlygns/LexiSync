import { and, desc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';

import { db } from '@/db/client';
import { deleteDeck } from '@/db/decks';
import { cards, decks } from '@/db/schema';
import { common } from '@/ui/styles';

export default function DeckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: deckRows } = useLiveQuery(db.select().from(decks).where(eq(decks.id, id)), [id]);
  const { data: cardRows } = useLiveQuery(
    db
      .select()
      .from(cards)
      .where(and(eq(cards.deckId, id), isNull(cards.deletedAt)))
      .orderBy(desc(cards.id)),
    [id],
  );
  const deck = deckRows[0];

  function confirmDelete() {
    Alert.alert('Desteyi sil', `"${deck?.name}" ve içindeki ${cardRows.length} kart silinecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          deleteDeck(id);
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={common.screen}>
      <Stack.Screen options={{ title: deck?.name ?? '' }} />

      <FlatList
        data={cardRows}
        keyExtractor={(card) => card.id}
        ListEmptyComponent={<Text style={common.empty}>Bu destede henüz kart yok.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={common.row}
            onPress={() => router.push({ pathname: '/card/[id]', params: { id: item.id } })}
          >
            <Text style={common.rowTitle}>{item.term}</Text>
            <Text style={common.rowSubtitle}>{item.meaning}</Text>
          </Pressable>
        )}
      />

      <View style={common.footer}>
        <Pressable
          style={common.button}
          onPress={() => router.push({ pathname: '/card/new', params: { deckId: id } })}
        >
          <Text style={common.buttonText}>Kart ekle</Text>
        </Pressable>
        <Pressable onPress={confirmDelete}>
          <Text style={common.dangerText}>Desteyi sil</Text>
        </Pressable>
      </View>
    </View>
  );
}
