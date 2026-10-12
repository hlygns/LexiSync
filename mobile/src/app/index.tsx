import { count, desc, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { db } from '@/db/client';
import { examName } from '@/db/exams';
import { cards, decks } from '@/db/schema';
import { colors, common } from '@/ui/styles';

export default function DecksScreen() {
  const { signOut } = useAuth();

  // Live queries: the list re-renders by itself whenever the table changes.
  const { data: deckRows } = useLiveQuery(
    db.select().from(decks).where(isNull(decks.deletedAt)).orderBy(desc(decks.id)),
  );
  const { data: cardCounts } = useLiveQuery(
    db
      .select({ deckId: cards.deckId, total: count() })
      .from(cards)
      .where(isNull(cards.deletedAt))
      .groupBy(cards.deckId),
  );
  const countByDeck = new Map(cardCounts.map((row) => [row.deckId, row.total]));

  return (
    <View style={common.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={signOut} hitSlop={12}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>Çıkış</Text>
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={deckRows}
        keyExtractor={(deck) => deck.id}
        ListEmptyComponent={<Text style={common.empty}>Henüz desten yok. İlk desteni oluştur.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={common.row}
            onPress={() => router.push({ pathname: '/deck/[id]', params: { id: item.id } })}
          >
            <Text style={common.rowTitle}>{item.name}</Text>
            <Text style={common.rowSubtitle}>
              {examName(item.examId)} · {countByDeck.get(item.id) ?? 0} kart
            </Text>
          </Pressable>
        )}
      />

      <View style={common.footer}>
        <Pressable style={common.button} onPress={() => router.push('/deck/new')}>
          <Text style={common.buttonText}>Yeni deste</Text>
        </Pressable>
      </View>
    </View>
  );
}
