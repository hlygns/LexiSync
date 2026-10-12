import { and, desc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { db } from '@/db/client';
import { deleteDeck } from '@/db/decks';
import { getDueCards } from '@/db/reviews';
import { cards, decks } from '@/db/schema';
import { colors, common } from '@/ui/styles';

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

  // Recounted every time the screen comes into view, e.g. when returning from a study session.
  const [dueCount, setDueCount] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setDueCount(getDueCards(id).length);
    }, [id, cardRows.length]),
  );

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

      <View style={common.footer}>
        <Pressable
          style={[common.button, dueCount === 0 && common.buttonDisabled]}
          disabled={dueCount === 0}
          onPress={() => router.push({ pathname: '/study/[deckId]', params: { deckId: id } })}
        >
          <Text style={common.buttonText}>
            {dueCount === 0 ? 'Bugün çalışılacak kart yok' : `Çalış (${dueCount} kart)`}
          </Text>
        </Pressable>
      </View>

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
          style={[common.button, styles.secondaryButton]}
          onPress={() => router.push({ pathname: '/card/new', params: { deckId: id } })}
        >
          <Text style={[common.buttonText, styles.secondaryButtonText]}>Kart ekle</Text>
        </Pressable>
        <Pressable onPress={confirmDelete}>
          <Text style={common.dangerText}>Desteyi sil</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  secondaryButton: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.primary },
  secondaryButtonText: { color: colors.primary },
});
