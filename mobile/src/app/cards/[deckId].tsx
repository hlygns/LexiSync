import { and, asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { db } from '@/db/client';
import { cards } from '@/db/schema';
import { UNIT_SIZE } from '@/quiz/quiz';
import { colors, common } from '@/ui/styles';

// All cards of a deck, in unit order, for adding and editing.
export default function CardsScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();

  const { data: cardRows } = useLiveQuery(
    db
      .select()
      .from(cards)
      .where(and(eq(cards.deckId, deckId), isNull(cards.deletedAt)))
      .orderBy(asc(cards.id)),
    [deckId],
  );

  return (
    <View style={common.screen}>
      <FlatList
        data={cardRows}
        keyExtractor={(card) => card.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={common.empty}>Bu destede henüz kart yok. + ile ilk kartını ekle.</Text>}
        renderItem={({ item, index }) => (
          <View>
            {index % UNIT_SIZE === 0 && <Text style={common.sectionTitle}>Ünite {index / UNIT_SIZE + 1}</Text>}
            <Pressable
              style={common.card}
              onPress={() => router.push({ pathname: '/card/[id]', params: { id: item.id } })}
            >
              <Text style={common.rowTitle}>{item.term}</Text>
              <Text style={common.rowSubtitle}>{item.meaning}</Text>
            </Pressable>
          </View>
        )}
      />

      <Pressable
        style={styles.fab}
        onPress={() => router.push({ pathname: '/card/new', params: { deckId } })}
        accessibilityLabel="Kart ekle"
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 12, paddingBottom: 96 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabPlus: { color: colors.onPrimary, fontSize: 32, lineHeight: 34 },
});
